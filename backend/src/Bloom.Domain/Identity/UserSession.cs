using Bloom.Domain.Common;

namespace Bloom.Domain.Identity;

/// <summary>Persists a hashed, rotating Bloom refresh token.</summary>
public sealed class UserSession : AuditableEntity
{
    private UserSession()
    {
    }

    /// <summary>Gets the owner of the session.</summary>
    public Guid UserId { get; private set; }

    /// <summary>Gets the SHA-256 hash of the refresh token.</summary>
    public string RefreshTokenHash { get; private set; } = string.Empty;

    /// <summary>Gets the refresh-token expiration instant.</summary>
    public DateTimeOffset ExpiresAtUtc { get; private set; }

    /// <summary>Gets the revocation instant, when revoked.</summary>
    public DateTimeOffset? RevokedAtUtc { get; private set; }

    /// <summary>Creates an active refresh-token session.</summary>
    public static UserSession Create(Guid userId, string refreshTokenHash, DateTimeOffset expiresAtUtc)
    {
        if (userId == Guid.Empty) throw new ArgumentException("User is required.", nameof(userId));
        ArgumentException.ThrowIfNullOrWhiteSpace(refreshTokenHash);
        return new UserSession
        {
            UserId = userId,
            RefreshTokenHash = refreshTokenHash,
            ExpiresAtUtc = expiresAtUtc.ToUniversalTime(),
        };
    }

    /// <summary>Gets whether this session can still be rotated.</summary>
    public bool IsActive(DateTimeOffset nowUtc) => RevokedAtUtc is null && ExpiresAtUtc > nowUtc;

    /// <summary>Revokes this session.</summary>
    public void Revoke(DateTimeOffset revokedAtUtc) => RevokedAtUtc = revokedAtUtc.ToUniversalTime();
}
