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

    /// <summary>Plants a new sealed circle.</summary>
    [HttpPost]
    public async Task<ActionResult<CircleDetailResponse>> CreateAsync(CreateCircleRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (request is null || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.TimeZoneId))
            return BadRequest("Name and time zone are required.");
        try
        {
            var circle = await _circleService.CreateAsync(userId, request.Name, request.Emoji, request.DurationMonths, request.TimeZoneId, cancellationToken).ConfigureAwait(false);
            return CreatedAtAction(nameof(GetAsync), new { circleId = circle.Id }, await ToDetailAsync(circle, userId, cancellationToken).ConfigureAwait(false));
        }
        catch (ArgumentOutOfRangeException exception)
        {
            return BadRequest(exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(exception.Message);
        }
    }

    /// <summary>Gets one circle for an active member.</summary>
    [HttpGet("{circleId:guid}")]
    public async Task<ActionResult<CircleDetailResponse>> GetAsync(Guid circleId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var circle = await _circleService.GetForUserAsync(circleId, userId, cancellationToken).ConfigureAwait(false);
        return circle is null ? NotFound() : Ok(await ToDetailAsync(circle, userId, cancellationToken).ConfigureAwait(false));
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
            member?.Role != CircleMemberRole.Creator && currentStatus != CircleStatus.Bloomed);
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
