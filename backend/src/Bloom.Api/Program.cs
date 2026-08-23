using System.Text;
using System.Threading.RateLimiting;
using Bloom.Api.Configuration;
using Bloom.Api.Security;
using Bloom.Application.Identity;
using Bloom.Infrastructure;
using Bloom.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddSimpleConsole(options => options.SingleLine = true);

var localKeyPath = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "keys");
Directory.CreateDirectory(localKeyPath);
builder.Services
    .AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(localKeyPath))
    .SetApplicationName("Bloom");

builder.Services
    .AddOptions<GoogleOptions>()
    .Bind(builder.Configuration.GetSection(GoogleOptions.SectionName))
    .Validate(options =>
        !string.IsNullOrWhiteSpace(options.IosClientId)
        || !string.IsNullOrWhiteSpace(options.AndroidClientId)
        || !string.IsNullOrWhiteSpace(options.WebClientId),
        "At least one Google OAuth client ID must be configured.")
    .ValidateOnStart();
builder.Services
    .AddOptions<BloomOptions>()
    .Bind(builder.Configuration.GetSection(BloomOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddBloomInfrastructure(builder.Configuration);
builder.Services.AddScoped<ISessionTokenService, SessionTokenService>();

var googleOptions = builder.Configuration.GetSection(GoogleOptions.SectionName).Get<GoogleOptions>() ?? new GoogleOptions();
var googleClientIds = new[]
    {
        googleOptions.IosClientId,
        googleOptions.AndroidClientId,
        googleOptions.WebClientId,
    }
    .Where(static clientId => !string.IsNullOrWhiteSpace(clientId))
    .Distinct(StringComparer.Ordinal)
    .ToArray();
var bloomOptions = builder.Configuration.GetSection(BloomOptions.SectionName).Get<BloomOptions>() ?? new BloomOptions();
var bloomSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(bloomOptions.SessionSigningKey));

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("api", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 120, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = "Bloom";
        options.DefaultChallengeScheme = "Bloom";
    })
    .AddJwtBearer("Bloom", options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = bloomOptions.SessionIssuer,
            ValidateAudience = true,
            ValidAudience = "bloom-mobile",
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = bloomSigningKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "name",
        };
    })
    .AddJwtBearer("Google", options =>
    {
        options.Authority = "https://accounts.google.com";
        options.RequireHttpsMetadata = true;
        options.SaveToken = false;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuers = ["https://accounts.google.com", "accounts.google.com"],
            ValidateAudience = true,
            ValidAudiences = googleClientIds,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseExceptionHandler();

if (builder.Configuration.GetValue<bool>("Bloom:ApplyMigrationsOnStartup"))
{
    await app.ApplyBloomMigrationsAsync();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers().RequireRateLimiting("api");
app.MapGet("/health", async (BloomDbContext db, CancellationToken cancellationToken) =>
{
    var databaseAvailable = await db.Database.CanConnectAsync(cancellationToken).ConfigureAwait(false);
    return databaseAvailable ? Results.Ok(new { status = "ok" }) : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
});

app.Run();
