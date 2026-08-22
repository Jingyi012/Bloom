using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Bloom.Api.Configuration;
using Bloom.Application.Identity;
using Bloom.Domain.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Bloom.Api.Security;

/// <summary>
/// Creates short-lived Bloom access tokens and rotating in-memory refresh tokens.
/// Replace the refresh-token store with a database adapter before multi-instance deployment.
/// </summary>
public sealed class SessionTokenService(
    IOptions<BloomOptions> options,
    TimeProvider timeProvider) : ISessionTokenService
{
    private readonly BloomOptions _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
    private readonly TimeProvider _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
    private readonly ConcurrentDictionary<string, SessionRecord> _refreshTokens = new(StringComparer.Ordinal);

    /// <inheritdoc />
    public Task<SessionTokenPair> CreateAsync(User user, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(user);
        cancellationToken.ThrowIfCancellationRequested();

        var now = _timeProvider.GetUtcNow();
        var accessExpires = now.AddMinutes(_options.AccessTokenMinutes);
        var refreshExpires = now.AddDays(_options.RefreshTokenDays);
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        _refreshTokens[Hash(refreshToken)] = new SessionRecord(user, refreshExpires);

        return Task.FromResult(new SessionTokenPair(CreateAccessToken(user, accessExpires), refreshToken, accessExpires));
    }

    /// <inheritdoc />
    public async Task<SessionTokenPair?> RefreshAsync(string refreshToken, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(refreshToken);
        cancellationToken.ThrowIfCancellationRequested();

        if (!_refreshTokens.TryRemove(Hash(refreshToken), out var record) || record.ExpiresAtUtc <= _timeProvider.GetUtcNow())
        {
            return null;
        }

        return await CreateAsync(record.User, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public void Revoke(string refreshToken)
    {
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            _refreshTokens.TryRemove(Hash(refreshToken), out _);
        }
    }

    private string CreateAccessToken(User user, DateTimeOffset expiresAtUtc)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SessionSigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name, user.DisplayName),
        };
        var token = new JwtSecurityToken(
            issuer: _options.SessionIssuer,
            audience: "bloom-mobile",
            claims: claims,
            notBefore: _timeProvider.GetUtcNow().UtcDateTime,
            expires: expiresAtUtc.UtcDateTime,
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private sealed record SessionRecord(User User, DateTimeOffset ExpiresAtUtc);
}
