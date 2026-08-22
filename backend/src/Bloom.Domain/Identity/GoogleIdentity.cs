namespace Bloom.Domain.Identity;

/// <summary>
/// Claims extracted only after a Google identity token has been validated.
/// </summary>
public sealed record GoogleIdentity(
    string Subject,
    string Email,
    bool EmailVerified,
    string DisplayName,
    string? AvatarUrl);
