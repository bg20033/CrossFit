using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Diagnostics;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.Extensions.Configuration;
using StandUpFitness.Data;
using StandUpFitness.Services;

// One-shot migration runner: `dotnet StandUpFitness.dll --migrate` applies pending
// EF Core migrations + seeds the RBAC baseline, then exits — no Kestrel, no CORS/JWT
// validation needed. This is the deploy pipeline's job (e.g. Fly.io `release_command`),
// run once before new machines start, instead of every instance racing to migrate on
// boot. See Program.cs's normal Development-only auto-migrate below for local dev.
if (args.Contains("--migrate"))
{
    var migrateConfig = new ConfigurationBuilder()
        .AddJsonFile("appsettings.json", optional: true)
        .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
        .AddEnvironmentVariables()
        .Build();

    var migrateConnectionString = migrateConfig.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(migrateConnectionString))
        throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required to run migrations (env var ConnectionStrings__DefaultConnection).");

    var migrateOptions = new DbContextOptionsBuilder<FitnessContext>()
        .UseMySql(migrateConnectionString, ServerVersion.AutoDetect(migrateConnectionString))
        .Options;

    using (var migrateContext = new FitnessContext(migrateOptions))
    {
        Console.WriteLine("Applying pending migrations...");
        migrateContext.Database.Migrate();
        Console.WriteLine("Seeding RBAC baseline (roles/permissions)...");
        await RbacSeeder.SeedAsync(migrateContext);
        await RbacSeeder.SeedBootstrapAdminAsync(migrateContext, migrateConfig);
        Console.WriteLine("Migration complete.");
    }
    return;
}

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    options.Filters.Add<StandUpFitness.Infrastructure.AuditActionFilter>();
});
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(kvp => kvp.Value?.Errors.Count > 0)
            .ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value!.Errors.Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Invalid value" : e.ErrorMessage).ToArray()
            );

        return new BadRequestObjectResult(new
        {
            success = false,
            data = (object?)null,
            error = "Validation failed",
            errors
        });
    };
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISmsService, SmsService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddHostedService<ClassReminderService>();
builder.Services.AddScoped<IPaymentGatewayService, PaymentGatewayService>();
builder.Services.AddScoped<IClaimsTransformation, PermissionClaimsTransformation>();

// Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required. Set it via env var ConnectionStrings__DefaultConnection.");
builder.Services.AddDbContext<FitnessContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString))
);

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secret = jwtSettings["SecretKey"] ?? "";
if (secret.Length < 32)
    throw new InvalidOperationException("JwtSettings:SecretKey must be at least 32 chars. Set it via env var JwtSettings__SecretKey in production.");
// Refuse to boot in production with the shipped placeholder secret.
if (!builder.Environment.IsDevelopment() &&
    (secret.Contains("change-in-production", StringComparison.OrdinalIgnoreCase) ||
     secret.Contains("dev-only", StringComparison.OrdinalIgnoreCase)))
    throw new InvalidOperationException("JwtSettings:SecretKey is still the default placeholder. Set a strong secret via env var JwtSettings__SecretKey before deploying.");
if (string.IsNullOrWhiteSpace(jwtSettings["Issuer"]))
    throw new InvalidOperationException("JwtSettings:Issuer is required.");
if (string.IsNullOrWhiteSpace(jwtSettings["Audience"]))
    throw new InvalidOperationException("JwtSettings:Audience is required.");
if (!int.TryParse(jwtSettings["ExpiryMinutes"], out var expiryMinutes) || expiryMinutes < 5 || expiryMinutes > 240)
    throw new InvalidOperationException("JwtSettings:ExpiryMinutes must be between 5 and 240.");
if (!int.TryParse(jwtSettings["RefreshTokenDays"], out var refreshTokenDays) || refreshTokenDays < 1 || refreshTokenDays > 30)
    throw new InvalidOperationException("JwtSettings:RefreshTokenDays must be between 1 and 30.");
var secretKey = Encoding.UTF8.GetBytes(secret);

builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    x.SaveToken = true;
    x.MapInboundClaims = false; // keep "role"/nameidentifier claim types exactly as issued
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(secretKey),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1),
        RoleClaimType = "role" // tokens carry the role under the "role" claim
    };
    x.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/api/notifications/stream"))
                context.Token = accessToken;
            return Task.CompletedTask;
        }
    };
});

// Authorization policies (role-based access control)
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.AddPolicy("AdminOnly", p => p.RequireAssertion(ctx =>
        HasRole(ctx, "Admin", "GymOwner") || HasPermission(ctx, "system.admin", "roles.manage")));
    options.AddPolicy("AdminStaff", p => p.RequireAssertion(ctx =>
        HasRole(ctx, "Admin", "GymOwner", "Staff") || HasPermission(ctx, "system.admin", "clients.write", "finance.write")));
    options.AddPolicy("AdminTrainer", p => p.RequireAssertion(ctx =>
        HasRole(ctx, "Admin", "GymOwner", "Trainer") || HasPermission(ctx, "system.admin", "schedule.write", "workouts.write", "nutrition.write", "reports.read")));
    options.AddPolicy("AnyStaff", p => p.RequireAssertion(ctx =>
        HasRole(ctx, "Admin", "GymOwner", "Staff", "Trainer") || HasPermission(ctx, "system.admin", "clients.read")));
    // Front desk / Arka: cashier + staff + admins operate POS and QR access.
    options.AddPolicy("Desk", p => p.RequireAssertion(ctx =>
        HasRole(ctx, "Admin", "GymOwner", "Staff", "Cashier") || HasPermission(ctx, "system.admin", "access.scan", "finance.write")));
    // Rental tenant trainers — isolated micro-gym space.
    options.AddPolicy("TenantOnly", p => p.RequireAssertion(ctx =>
        HasRole(ctx, "TrainerTenant") || HasPermission(ctx, "rental.manage")));
    // Client-facing area (core client or tenant client) for nutrition/profile.
    options.AddPolicy("ClientArea", p => p.RequireRole("Client", "TenantClient"));
});

// CORS — restricted to known origins (configurable via Cors:AllowedOrigins)
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
var allowedOrigins = configuredOrigins
    .Select(o => o.Trim().TrimEnd('/'))
    .Where(o => !string.IsNullOrWhiteSpace(o))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();
if (builder.Environment.IsDevelopment() && allowedOrigins.Length == 0)
    allowedOrigins = new[] { "http://localhost:5180", "http://localhost:5173", "http://localhost:5174" };
if (!builder.Environment.IsDevelopment() && allowedOrigins.Length == 0)
    throw new InvalidOperationException("Cors:AllowedOrigins must include the production frontend origin.");
if (allowedOrigins.Any(o => o == "*" || o.Contains('*')))
    throw new InvalidOperationException("Cors:AllowedOrigins cannot contain wildcard origins.");
if (!builder.Environment.IsDevelopment() && allowedOrigins.Any(o => !o.StartsWith("https://", StringComparison.OrdinalIgnoreCase)))
    throw new InvalidOperationException("Production Cors:AllowedOrigins entries must use HTTPS.");
builder.Services.AddCors(options =>
{
    options.AddPolicy("App", policy => policy.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader());
});

var allowedHosts = builder.Configuration["AllowedHosts"] ?? "";
if (!builder.Environment.IsDevelopment() && (string.IsNullOrWhiteSpace(allowedHosts) || allowedHosts.Trim() == "*"))
    throw new InvalidOperationException("AllowedHosts must be restricted in production. Set AllowedHosts to your API host/domain.");

// Rate limiting (basic DoS protection)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 120, Window = TimeSpan.FromSeconds(10), QueueLimit = 0 }));
    options.AddFixedWindowLimiter("auth", o =>
    {
        o.PermitLimit = 10;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueLimit = 0;
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            var feature = context.Features.Get<IExceptionHandlerFeature>();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            app.Logger.LogError(feature?.Error, "Unhandled API exception");
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                data = (object?)null,
                error = "An unexpected server error occurred"
            });
        });
    });
    app.UseHsts();
}

app.UseHttpsRedirection();
app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        var headers = context.Response.Headers;
        headers.TryAdd("X-Content-Type-Options", "nosniff");
        headers.TryAdd("X-Frame-Options", "DENY");
        headers.TryAdd("Referrer-Policy", "no-referrer");
        headers.TryAdd("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        headers.TryAdd("Cross-Origin-Resource-Policy", "same-site");
        if (context.Request.Path.StartsWithSegments("/api"))
            headers.TryAdd("Cache-Control", "no-store");
        return Task.CompletedTask;
    });

    await next();
});
app.UseCors("App");
app.UseRateLimiter();
app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    try
    {
        await next();
    }
    finally
    {
        sw.Stop();
        app.Logger.LogInformation("HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs} ms",
            context.Request.Method,
            context.Request.Path.Value,
            context.Response.StatusCode,
            sw.ElapsedMilliseconds);
    }
});
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health").AllowAnonymous();

// Apply migrations automatically only in Development; production migrates via deploy pipeline.
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<FitnessContext>();
    db.Database.Migrate();
    await RbacSeeder.SeedAsync(db);
    await RbacSeeder.SeedBootstrapAdminAsync(db, app.Configuration);
}
else
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FitnessContext>();
        await RbacSeeder.SeedAsync(db);
        await RbacSeeder.SeedBootstrapAdminAsync(db, app.Configuration);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "RBAC seed skipped. Ensure migrations are applied before production startup.");
    }
}

app.Run();

static bool HasRole(Microsoft.AspNetCore.Authorization.AuthorizationHandlerContext ctx, params string[] roles) =>
    roles.Any(ctx.User.IsInRole);

static bool HasPermission(Microsoft.AspNetCore.Authorization.AuthorizationHandlerContext ctx, params string[] permissions) =>
    permissions.Any(permission => ctx.User.HasClaim("permission", permission));
