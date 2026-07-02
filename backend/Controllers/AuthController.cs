using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly FitnessContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(FitnessContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [EnableRateLimiting("auth")]
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var name = request.Name.Trim();
        if (await _context.Users.AnyAsync(u => u.Email == email))
        {
            return BadRequest(new { message = "Unable to create account with the provided details" });
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // Public signup is intentionally limited to client accounts. Staff,
        // trainers, owners, and cashiers must be created by authorized admins.
        var normalizedRole = (request.Role ?? "").Replace("_", "");
        if (!Enum.TryParse<UserRole>(normalizedRole, ignoreCase: true, out var role))
        {
            return BadRequest(new { message = $"Invalid role '{request.Role}'" });
        }
        if (role != UserRole.Client)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only client self-registration is allowed" });
        }

        var user = new User
        {
            Email = email,
            Name = name,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            PasswordHash = passwordHash,
            Role = role
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _context.Clients.Add(new Client
        {
            UserId = user.Id,
            MembershipType = "unassigned",
            IsActive = false
        });
        await _context.SaveChangesAsync();

        return Ok(await BuildAuthResponseAsync(user, "Registration successful"));
    }

    [EnableRateLimiting("auth")]
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == email);

        if (user == null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        return Ok(await BuildAuthResponseAsync(user, "Login successful"));
    }

    [EnableRateLimiting("auth")]
    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        var stored = await _context.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == HashRefreshToken(request.RefreshToken));

        if (stored == null || !stored.IsActive || !stored.User.IsActive)
            return Unauthorized(new { message = "Invalid or expired refresh token" });

        stored.RevokedAt = DateTime.UtcNow; // rotate: one-time use
        var response = await BuildAuthResponseAsync(stored.User, "Token refreshed");
        return Ok(response);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        var stored = await _context.RefreshTokens.FirstOrDefaultAsync(r => r.Token == HashRefreshToken(request.RefreshToken));
        if (stored != null && stored.RevokedAt == null)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        return Ok(new { message = "Logged out" });
    }

    [Authorize]
    [HttpPost("logout-all")]
    public async Task<IActionResult> LogoutAll()
    {
        var userId = User.CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var tokens = await _context.RefreshTokens.Where(r => r.UserId == userId.Value && r.RevokedAt == null).ToListAsync();
        foreach (var t in tokens) t.RevokedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "All sessions revoked", count = tokens.Count });
    }

    private async Task<object> BuildAuthResponseAsync(User user, string message)
    {
        var accessToken = GenerateJwtToken(user);
        var raw = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
        var days = int.TryParse(_configuration["JwtSettings:RefreshTokenDays"], out var d) ? d : 7;
        _context.RefreshTokens.Add(new RefreshToken { UserId = user.Id, Token = HashRefreshToken(raw), ExpiresAt = DateTime.UtcNow.AddDays(days) });
        await _context.SaveChangesAsync();
        var permissions = await EffectivePermissionsAsync(user);

        return new
        {
            message,
            user = new { id = user.Id, email = user.Email, name = user.Name, role = user.Role.ToString(), permissions },
            token = accessToken,
            refreshToken = raw
        };
    }

    private async Task<string[]> EffectivePermissionsAsync(User user)
    {
        var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (RbacCatalog.BaselinePermissions.TryGetValue(user.Role.ToString(), out var baseline))
        {
            foreach (var key in baseline) keys.Add(key);
        }

        var dynamicKeys = await _context.UserRoleAssignments
            .Where(ur => ur.UserId == user.Id && ur.DynamicRole.IsActive)
            .SelectMany(ur => ur.DynamicRole.Permissions.Select(rp => rp.Permission.Key))
            .Distinct()
            .ToListAsync();
        foreach (var key in dynamicKeys) keys.Add(key);

        return keys.OrderBy(k => k).ToArray();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.CurrentUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null)
        {
            return NotFound();
        }

        return Ok(new { id = user.Id, email = user.Email, name = user.Name, role = user.Role.ToString(), permissions = await EffectivePermissionsAsync(user) });
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null) return NotFound();

        var email = request.Email?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(email) && email != user.Email)
        {
            if (await _context.Users.AnyAsync(u => u.Email == email && u.Id != userId.Value))
                return BadRequest(new { message = "Email already exists" });
            user.Email = email;
        }
        if (!string.IsNullOrWhiteSpace(request.Name))
            user.Name = request.Name.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { id = user.Id, email = user.Email, name = user.Name, role = user.Role.ToString(), permissions = await EffectivePermissionsAsync(user) });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Fjalëkalimi aktual është gabim" });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        var activeTokens = await _context.RefreshTokens.Where(r => r.UserId == userId.Value && r.RevokedAt == null).ToListAsync();
        foreach (var token in activeTokens)
            token.RevokedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Fjalëkalimi u ndryshua" });
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!));
        var signingCredentials = new SigningCredentials(secretKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<System.Security.Claims.Claim>
        {
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, user.Id.ToString()),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, user.Email),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, user.Name),
            new System.Security.Claims.Claim("role", user.Role.ToString())
        };

        var expiryMinutes = int.Parse(jwtSettings["ExpiryMinutes"]!);
        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: signingCredentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string HashRefreshToken(string refreshToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
        return Convert.ToBase64String(bytes);
    }
}

public class RegisterRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = null!;
    [Required, MinLength(8), MaxLength(128)]
    public string Password { get; set; } = null!;
    [Required, MaxLength(120)]
    public string Name { get; set; } = null!;
    [Phone, MaxLength(40)]
    public string? Phone { get; set; }
    [Required, MaxLength(40)]
    public string Role { get; set; } = "client";
}

public class LoginRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = null!;
    [Required, MaxLength(128)]
    public string Password { get; set; } = null!;
}

public class UpdateProfileRequest
{
    [MaxLength(120)]
    public string? Name { get; set; }
    [EmailAddress, MaxLength(256)]
    public string? Email { get; set; }
}

public class ChangePasswordRequest
{
    [Required, MaxLength(128)]
    public string CurrentPassword { get; set; } = null!;
    [Required, MinLength(8), MaxLength(128)]
    public string NewPassword { get; set; } = null!;
}

public class RefreshRequest
{
    [Required, MaxLength(256)]
    public string RefreshToken { get; set; } = null!;
}
