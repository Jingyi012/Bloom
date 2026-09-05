using System.Security.Claims;
using Bloom.Application.Identity;
using Bloom.Application.Media;
using Bloom.Contracts.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bloom.Api.Controllers;

/// <summary>Provides the authenticated user's safe profile.</summary>
[ApiController]
[Route("api/v1/me")]
[Authorize]
public sealed class MeController(IGoogleUserService googleUserService) : ControllerBase
{
    private readonly IGoogleUserService _googleUserService = googleUserService ?? throw new ArgumentNullException(nameof(googleUserService));

    /// <summary>Gets the current Bloom profile.</summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The current user's profile.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(CurrentUserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CurrentUserResponse>> GetAsync(CancellationToken cancellationToken)
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return !Guid.TryParse(subject, out var userId)
            ? Unauthorized()
            : await GetUserAsync(userId, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Updates the current user's display name and time zone.</summary>
    [HttpPatch]
    public async Task<ActionResult<CurrentUserResponse>> UpdateAsync(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (request is null) return BadRequest();
        try
        {
            var user = await _googleUserService.UpdateProfileAsync(userId, request.DisplayName, request.TimeZoneId, cancellationToken).ConfigureAwait(false);
            return user is null ? NotFound() : Ok(ToResponse(user));
        }
        catch (ArgumentException exception) { return BadRequest(exception.Message); }
    }

    /// <summary>Uploads a Bloom-managed profile avatar.</summary>
    [HttpPost("avatar")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<ActionResult<CurrentUserResponse>> UploadAvatarAsync(IFormFile? avatar, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (avatar is null || avatar.Length == 0) return BadRequest("An avatar image is required.");
        try
        {
            await using var stream = avatar.OpenReadStream();
            var user = await _googleUserService.UpdateAvatarAsync(userId, new ImageUpload(stream, avatar.ContentType), cancellationToken).ConfigureAwait(false);
            return user is null ? NotFound() : Ok(ToResponse(user));
        }
        catch (ArgumentException exception) { return BadRequest(exception.Message); }
        catch (InvalidOperationException exception) { return BadRequest(exception.Message); }
    }

    /// <summary>Gets the current user's safe writing statistics.</summary>
    [HttpGet("stats")]
    public async Task<ActionResult<UserStatsResponse>> StatsAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var stats = await _googleUserService.GetStatsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(new UserStatsResponse(stats.TotalEntries, stats.ActiveCircles, stats.BloomedCircles, stats.CurrentStreak));
    }

    /// <summary>Lists friends previously connected through Bloom.</summary>
    [HttpGet("friends")]
    public async Task<ActionResult<IReadOnlyList<FriendResponse>>> FriendsAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var friends = await _googleUserService.ListFriendsAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(friends.Select(friend => new FriendResponse(friend.UserId, friend.DisplayName, friend.Email, friend.AvatarUrl, friend.LastSeenAtUtc)).ToArray());
    }

    /// <summary>Soft-deletes the current user's account.</summary>
    [HttpDelete]
    public async Task<ActionResult> DeleteAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        return await _googleUserService.DeleteAsync(userId, cancellationToken).ConfigureAwait(false) ? NoContent() : NotFound();
    }

    private async Task<ActionResult<CurrentUserResponse>> GetUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _googleUserService.FindByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        return user is null
            ? NotFound()
            : Ok(ToResponse(user));
    }

    private static CurrentUserResponse ToResponse(Bloom.Domain.Identity.User user) =>
        new(user.Id, user.DisplayName, user.Email, user.GetAvatarReference(), user.TimeZoneId);

    private bool TryGetUserId(out Guid userId)
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(subject, out userId);
    }
}
