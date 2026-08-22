namespace Bloom.Contracts.Auth;

/// <summary>Metadata sent with the native Google sign-in exchange.</summary>
public sealed record GoogleSignInRequest(string Platform, string? Nonce);

/// <summary>Bloom session returned after Google authentication.</summary>
public sealed record GoogleSignInResponse(
    Guid UserId,
    string DisplayName,
    string Email,
    string AccessToken,
    string RefreshToken,
    DateTimeOffset AccessTokenExpiresAtUtc);

/// <summary>Request to rotate a Bloom refresh token.</summary>
public sealed record SessionRefreshRequest(string RefreshToken);

/// <summary>Bloom session returned after refresh.</summary>
public sealed record SessionRefreshResponse(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset AccessTokenExpiresAtUtc);
