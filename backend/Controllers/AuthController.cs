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
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return BadRequest(new { message = "Email already exists" });
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // Frontend sends roles like "gym_owner"; normalize to match the UserRole enum.
        var normalizedRole = (request.Role ?? "").Replace("_", "");
        if (!Enum.TryParse<UserRole>(normalizedRole, ignoreCase: true, out var role))
        {
            return BadRequest(new { message = $"Invalid role '{request.Role}'" });
        }

        var user = new User
        {
            Email = request.Email,
            Name = request.Name,
            PasswordHash = passwordHash,
            Role = role
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user);

        return Ok(new
        {
            message = "Registration successful",
            user = new { id = user.Id, email = user.Email, name = user.Name, role = user.Role.ToString() },
            token
        });
    }

    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        var token = GenerateJwtToken(user);

        return Ok(new
        {
            message = "Login successful",
            user = new { id = user.Id, email = user.Email, name = user.Name, role = user.Role.ToString() },
            token
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim?.Value, out var userId))
        {
            return Unauthorized();
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound();
        }

        return Ok(new { id = user.Id, email = user.Email, name = user.Name, role = user.Role.ToString() });
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim?.Value, out var userId))
            return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Email) && request.Email != user.Email)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email && u.Id != userId))
                return BadRequest(new { message = "Email already exists" });
            user.Email = request.Email;
        }
        if (!string.IsNullOrWhiteSpace(request.Name))
            user.Name = request.Name;

        await _context.SaveChangesAsync();
        return Ok(new { id = user.Id, email = user.Email, name = user.Name, role = user.Role.ToString() });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim?.Value, out var userId))
            return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Fjalëkalimi aktual është gabim" });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
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
}

public class RegisterRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = null!;
    [Required, MinLength(6), MaxLength(128)]
    public string Password { get; set; } = null!;
    [Required, MaxLength(120)]
    public string Name { get; set; } = null!;
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
    [Required, MinLength(6), MaxLength(128)]
    public string NewPassword { get; set; } = null!;
}
