using System.Text;
using Bloom.Api.Configuration;
using Bloom.Api.Security;
using Bloom.Application.Identity;
using Bloom.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.IdentityModel.Tokens;

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
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services
    .AddOptions<BloomOptions>()
    .Bind(builder.Configuration.GetSection(BloomOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddBloomInfrastructure();
builder.Services.AddSingleton<ISessionTokenService, SessionTokenService>();

var googleOptions = builder.Configuration.GetSection(GoogleOptions.SectionName).Get<GoogleOptions>() ?? new GoogleOptions();
var googleClientIds = new[]
    {
        googleOptions.ClientId,
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

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
