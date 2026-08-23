using System.Security.Claims;
using Bloom.Application.Entries;
using Bloom.Contracts.Entries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bloom.Api.Controllers;

/// <summary>Provides authorized, post-bloom timeline reads.</summary>
[ApiController]
[Route("api/v1/circles/{circleId:guid}/timeline")]
[Authorize]
public sealed class TimelineController(IEntryService entryService) : ControllerBase
{
    private readonly IEntryService _entryService = entryService ?? throw new ArgumentNullException(nameof(entryService));

    /// <summary>Gets a cursor-paginated timeline for a bloomed circle.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(TimelineResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status423Locked)]
    public async Task<ActionResult<TimelineResponse>> GetAsync(Guid circleId, [FromQuery] string? cursor, [FromQuery] DateOnly? date, [FromQuery] Guid? authorUserId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        try
        {
            var page = await _entryService.GetTimelineAsync(userId, circleId, cursor, date, authorUserId, cancellationToken).ConfigureAwait(false);
            return Ok(new TimelineResponse(
                page.Days.Select(day => new TimelineDayResponse(day.Date, day.Entries.Select(ToResponse).ToArray())).ToArray(),
                page.NextCursor));
        }
        catch (CircleNotBloomedException)
        {
            return StatusCode(StatusCodes.Status423Locked, new { code = "circle_not_bloomed" });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException exception)
        {
            return BadRequest(exception.Message);
        }
    }

    private static TimelineEntryResponse ToResponse(TimelineEntry item) => new(
        item.PublicationId,
        item.DiaryEntryId,
        item.AuthorUserId,
        item.AuthorDisplayName,
        item.AuthorAvatarUrl,
        item.AuthorLocalDate,
        item.SubmittedAtUtc,
        item.Text,
        item.Mood,
        item.MediaIds,
        item.Reactions.Select(reaction => new ReactionResponse(reaction.EmojiCode, reaction.Count, reaction.ReactedByCurrentUser)).ToArray(),
        item.CommentCount);

    private bool TryGetUserId(out Guid userId)
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(subject, out userId);
    }
}
