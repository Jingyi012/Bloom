using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Bloom.Api.Configuration;
using Bloom.Application.Auditing;
using Bloom.Application.Identity;
using Bloom.Domain.Identity;
using Bloom.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Bloom.Api.Security;

/// <summary>Creates Bloom access tokens and persists rotating refresh sessions in PostgreSQL.</summary>
public sealed class SessionTokenService(
    IOptions<BloomOptions> options,
    BloomDbContext db,
    IAuditStampWriter auditStampWriter,
    TimeProvider timeProvider) : ISessionTokenService
{
    private readonly BloomOptions _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
    private readonly BloomDbContext _db = db ?? throw new ArgumentNullException(nameof(db));
    private readonly IAuditStampWriter _auditStampWriter = auditStampWriter ?? throw new ArgumentNullException(nameof(auditStampWriter));
    private readonly TimeProvider _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));

    /// <inheritdoc />
    public async Task<SessionTokenPair> CreateAsync(User user, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(user);
        var now = _timeProvider.GetUtcNow();
        var accessExpires = now.AddMinutes(_options.AccessTokenMinutes);
        var refreshExpires = now.AddDays(_options.RefreshTokenDays);
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        var session = UserSession.Create(user.Id, Hash(refreshToken), refreshExpires);
        _auditStampWriter.StampCreated(session, user.Id);
        _db.UserSessions.Add(session);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new SessionTokenPair(CreateAccessToken(user, accessExpires), refreshToken, accessExpires);
    }

    /// <inheritdoc />
    public async Task<SessionTokenPair?> RefreshAsync(string refreshToken, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(refreshToken);
        var session = await _db.UserSessions.SingleOrDefaultAsync(candidate => candidate.RefreshTokenHash == Hash(refreshToken), cancellationToken).ConfigureAwait(false);
        if (session is null || !session.IsActive(_timeProvider.GetUtcNow())) return null;

        var user = await _db.Users.SingleOrDefaultAsync(candidate => candidate.Id == session.UserId, cancellationToken).ConfigureAwait(false);
        if (user is null) return null;
        session.Revoke(_timeProvider.GetUtcNow());
        _auditStampWriter.StampModified(session, user.Id);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await CreateAsync(user, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task RevokeAsync(string refreshToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken)) return;
        var session = await _db.UserSessions.SingleOrDefaultAsync(candidate => candidate.RefreshTokenHash == Hash(refreshToken), cancellationToken).ConfigureAwait(false);
        if (session is null || session.RevokedAtUtc is not null) return;
        session.Revoke(_timeProvider.GetUtcNow());
        _auditStampWriter.StampModified(session, session.UserId);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
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
}
