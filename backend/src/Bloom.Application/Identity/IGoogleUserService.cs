using Bloom.Domain.Identity;
using Bloom.Application.Media;

namespace Bloom.Application.Identity;

/// <summary>Finds or provisions local users from validated Google identities.</summary>
public interface IGoogleUserService
{
    /// <summary>Gets an existing user or creates one for a verified Google identity.</summary>
    /// <param name="identity">The validated provider identity.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The local user.</returns>
    Task<User> FindOrProvisionAsync(GoogleIdentity identity, CancellationToken cancellationToken);

    /// <summary>Finds a local user by Bloom identifier.</summary>
    /// <param name="userId">The Bloom user identifier.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The local user, or null when it does not exist.</returns>
    Task<User?> FindByIdAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Finds an existing Bloom user by normalized email address.</summary>
    /// <param name="email">The email address to search.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The matching user, or null when no user exists.</returns>
    Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken);

    /// <summary>Updates user-editable profile fields.</summary>
    Task<User?> UpdateProfileAsync(Guid userId, string displayName, string timeZoneId, CancellationToken cancellationToken);

    /// <summary>Stores a new user avatar outside the database.</summary>
    Task<User?> UpdateAvatarAsync(Guid userId, ImageUpload upload, CancellationToken cancellationToken);

    /// <summary>Records that two Bloom users have been connected.</summary>
    Task RecordFriendshipAsync(Guid userId, Guid friendUserId, CancellationToken cancellationToken);

    /// <summary>Lists people previously connected to the current user.</summary>
    Task<IReadOnlyList<FriendSummary>> ListFriendsAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Gets safe profile statistics.</summary>
    Task<UserStats> GetStatsAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Soft-deletes a user and revokes their sessions.</summary>
    Task<bool> DeleteAsync(Guid userId, CancellationToken cancellationToken);
}

/// <summary>Safe writing statistics for a profile.</summary>
public sealed record UserStats(int TotalEntries, int ActiveCircles, int BloomedCircles, int CurrentStreak);

/// <summary>Safe summary of a previously connected friend.</summary>
public sealed record FriendSummary(Guid UserId, string DisplayName, string Email, string? AvatarUrl, DateTimeOffset LastSeenAtUtc);
