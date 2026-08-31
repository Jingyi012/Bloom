using System.Security.Claims;
using Bloom.Application.Circles;
using Bloom.Application.Identity;
using Bloom.Contracts.Circles;
using Bloom.Domain.Circles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bloom.Api.Controllers;

/// <summary>Manages private Bloom circles and invitations.</summary>
[ApiController]
[Route("api/v1/circles")]
[Authorize]
public sealed class CirclesController(
    ICircleService circleService,
    IGoogleUserService googleUserService,
    TimeProvider timeProvider) : ControllerBase
{
    private readonly ICircleService _circleService = circleService ?? throw new ArgumentNullException(nameof(circleService));
    private readonly IGoogleUserService _googleUserService = googleUserService ?? throw new ArgumentNullException(nameof(googleUserService));
    private readonly TimeProvider _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));

    /// <summary>Lists active circles for the current user.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CircleSummaryResponse>>> ListAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var circles = await _circleService.ListForUserAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(circles.Select(circle => ToSummary(circle, userId)).ToArray());
    }

    /// <summary>Lists archived circles that remain visible to the current user.</summary>
    [HttpGet("archived")]
    public async Task<ActionResult<IReadOnlyList<CircleSummaryResponse>>> ListArchivedAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var circles = await _circleService.ListArchivedForUserAsync(userId, cancellationToken).ConfigureAwait(false);
        return Ok(circles.Select(circle => ToSummary(circle, userId)).ToArray());
    }

    /// <summary>Plants a new sealed circle.</summary>
    [HttpPost]
    public async Task<ActionResult<CircleDetailResponse>> CreateAsync(CreateCircleRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (request is null || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.TimeZoneId))
            return BadRequest("Name and time zone are required.");
        var bloomAtUtc = request.BloomAtUtc;
        if (bloomAtUtc is null && request.DurationMonths is int legacyDuration)
        {
            if (legacyDuration is not (1 or 3 or 6 or 12))
                return BadRequest("Choose a future bloom date and time.");
            bloomAtUtc = _timeProvider.GetUtcNow().AddMonths(legacyDuration);
        }
        if (bloomAtUtc is null)
            return BadRequest("Choose a future bloom date and time.");
        try
        {
            var circle = await _circleService.CreateAsync(userId, request.Name, request.Emoji, bloomAtUtc.Value, request.TimeZoneId, cancellationToken).ConfigureAwait(false);
            return Created($"/api/v1/circles/{circle.Id:D}", await ToDetailAsync(circle, userId, cancellationToken).ConfigureAwait(false));
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(exception.Message);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(exception.Message);
        }
    }

    /// <summary>Gets one circle for an active member.</summary>
    [HttpGet("{circleId:guid}")]
    public async Task<ActionResult<CircleDetailResponse>> GetAsync(Guid circleId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var circle = await _circleService.GetVisibleForUserAsync(circleId, userId, cancellationToken).ConfigureAwait(false);
        return circle is null ? NotFound() : Ok(await ToDetailAsync(circle, userId, cancellationToken).ConfigureAwait(false));
    }

    /// <summary>Updates creator-controlled details for a circle before it blooms.</summary>
    [HttpPatch("{circleId:guid}")]
    [ProducesResponseType(typeof(CircleDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CircleDetailResponse>> UpdateAsync(Guid circleId, UpdateCircleRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (request is null || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.TimeZoneId))
            return BadRequest("Name and time zone are required.");
        try
        {
            var circle = await _circleService.UpdateAsync(circleId, userId, request.Name, request.Emoji, request.BloomAtUtc, request.TimeZoneId, cancellationToken).ConfigureAwait(false);
            return circle is null ? NotFound() : Ok(await ToDetailAsync(circle, userId, cancellationToken).ConfigureAwait(false));
        }
        catch (UnauthorizedAccessException exception) { return StatusCode(StatusCodes.Status403Forbidden, exception.Message); }
        catch (ArgumentException exception) { return BadRequest(exception.Message); }
        catch (InvalidOperationException exception) { return Conflict(exception.Message); }
    }

    /// <summary>Deletes an empty sealed circle or archives one containing publications.</summary>
    [HttpDelete("{circleId:guid}")]
    [ProducesResponseType(typeof(CircleDeleteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CircleDeleteResponse>> DeleteAsync(Guid circleId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        try
        {
            var result = await _circleService.DeleteAsync(circleId, userId, cancellationToken).ConfigureAwait(false);
            return result is null ? NotFound() : Ok(new CircleDeleteResponse(result.WasArchived));
        }
        catch (UnauthorizedAccessException exception) { return StatusCode(StatusCodes.Status403Forbidden, exception.Message); }
        catch (InvalidOperationException exception) { return Conflict(exception.Message); }
    }

    /// <summary>Invites an existing Bloom user.</summary>
    [HttpPost("{circleId:guid}/invitations")]
    public async Task<ActionResult> InviteAsync(Guid circleId, InviteCircleMemberRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (request is null || string.IsNullOrWhiteSpace(request.Email)) return BadRequest("Email is required.");
        try
        {
            var invitation = await _circleService.InviteAsync(circleId, userId, request.Email, cancellationToken).ConfigureAwait(false);
            return Ok(new { invitationId = invitation.Id, status = invitation.Status.ToString() });
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(exception.Message);
        }
        catch (UnauthorizedAccessException exception)
        {
            return StatusCode(StatusCodes.Status403Forbidden, exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(exception.Message);
        }
    }

    /// <summary>Lists invitations awaiting the current user's response.</summary>
    [HttpGet("invitations")]
    public async Task<ActionResult<IReadOnlyList<CircleInvitationResponse>>> InvitationsAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var invitations = await _circleService.ListInvitationsAsync(userId, cancellationToken).ConfigureAwait(false);
        var response = new List<CircleInvitationResponse>(invitations.Count);
        foreach (var invitation in invitations)
        {
              var circle = await _circleService.GetByIdAsync(invitation.CircleId, cancellationToken).ConfigureAwait(false);
            if (circle is not null)
                response.Add(new CircleInvitationResponse(invitation.Id, circle.Id, circle.Name, circle.Emoji, invitation.CreatedAtUtc));
        }
        return Ok(response);
    }

    /// <summary>Accepts or declines a pending invitation.</summary>
    [HttpPost("invitations/{invitationId:guid}/response")]
    public async Task<ActionResult> RespondToInvitationAsync(Guid invitationId, RespondToInvitationRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (request is null) return BadRequest();
        var changed = await _circleService.RespondToInvitationAsync(invitationId, userId, request.Accept, cancellationToken).ConfigureAwait(false);
        return changed ? NoContent() : NotFound();
    }

    /// <summary>Leaves a circle before bloom.</summary>
    [HttpPost("{circleId:guid}/leave")]
    public async Task<ActionResult> LeaveAsync(Guid circleId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        try
        {
            var left = await _circleService.LeaveAsync(circleId, userId, cancellationToken).ConfigureAwait(false);
            return left ? NoContent() : NotFound();
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(exception.Message);
        }
    }

    private bool TryGetUserId(out Guid userId)
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(subject, out userId);
    }

    private CircleSummaryResponse ToSummary(Circle circle, Guid userId)
    {
        var member = circle.FindMember(userId);
        var currentStatus = circle.GetCurrentStatus(_timeProvider.GetUtcNow());
        return new CircleSummaryResponse(
            circle.Id,
            circle.Name,
            circle.Emoji,
            currentStatus.ToString(),
            circle.BloomAtUtc,
            circle.TimeZoneId,
            circle.Members.Count(member => member.LeftAtUtc is null),
            circle.CreatorUserId == userId,
            member?.Role != CircleMemberRole.Creator && currentStatus == CircleStatus.Sealed);
    }

    private async Task<CircleDetailResponse> ToDetailAsync(Circle circle, Guid userId, CancellationToken cancellationToken)
    {
        var activeMembers = circle.Members.Where(member => member.LeftAtUtc is null).ToArray();
        var members = new List<CircleMemberResponse>(activeMembers.Length);
        foreach (var member in activeMembers)
        {
            var user = await _googleUserService.FindByIdAsync(member.UserId, cancellationToken).ConfigureAwait(false);
            if (user is not null)
                members.Add(new CircleMemberResponse(user.Id, user.DisplayName, user.GoogleAvatarUrl, member.Role.ToString(), member.JoinedAtUtc, true));
        }
        return new CircleDetailResponse(ToSummary(circle, userId), members);
    }
}
