using System.Security.Claims;
using Bloom.Application.Entries;
using Bloom.Application.Media;
using Bloom.Contracts.Entries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bloom.Api.Controllers;

/// <summary>Seals private diary entries into selected circles.</summary>
[ApiController]
[Route("api/v1/entries")]
[Authorize]
public sealed class EntriesController(IEntryService entryService) : ControllerBase
{
    private readonly IEntryService _entryService = entryService ?? throw new ArgumentNullException(nameof(entryService));

    /// <summary>Gets the current user's sealed-entry status for today.</summary>
    [HttpGet("today")]
    [ProducesResponseType(typeof(TodayEntryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TodayEntryResponse>> GetTodayAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        try
        {
            var status = await _entryService.GetTodayStatusAsync(userId, cancellationToken).ConfigureAwait(false);
            return Ok(ToTodayResponse(status));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>Updates the current user's diary while today's edit window is open.</summary>
    [HttpPatch("today")]
    [ProducesResponseType(typeof(TodayEntryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TodayEntryResponse>> UpdateTodayAsync(UpdateTodayEntryRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (request is null) return BadRequest();
        try
        {
            var status = await _entryService.UpdateTodayAsync(userId, request.Text, request.Mood, request.PromptKey, cancellationToken).ConfigureAwait(false);
            return Ok(ToTodayResponse(status));
        }
        catch (ArgumentException exception) { return BadRequest(exception.Message); }
        catch (KeyNotFoundException exception) { return NotFound(exception.Message); }
        catch (InvalidOperationException exception) { return Conflict(exception.Message); }
    }

    /// <summary>Permanently deletes the current user's diary while today's edit window is open.</summary>
    [HttpDelete("today")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult> DeleteTodayAsync(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        try
        {
            return await _entryService.DeleteTodayAsync(userId, cancellationToken).ConfigureAwait(false) ? NoContent() : NotFound();
        }
        catch (KeyNotFoundException exception) { return NotFound(exception.Message); }
        catch (InvalidOperationException exception) { return Conflict(exception.Message); }
    }

    /// <summary>Submits one text entry to one or more sealed circles.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(EntrySubmissionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EntrySubmissionResponse>> SubmitAsync(SubmitEntryRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (request is null || request.CircleIds is null || request.CircleIds.Count == 0)
            return BadRequest("Select at least one circle.");

        try
        {
            var result = await _entryService.SubmitAsync(
                userId,
                request.ClientEntryId,
                request.AuthorLocalDate,
                request.AuthorTimeZoneId,
                request.Text,
                request.Mood,
                request.PromptKey,
                request.CircleIds,
                cancellationToken).ConfigureAwait(false);

            return StatusCode(StatusCodes.Status201Created, new EntrySubmissionResponse(
                result.DiaryEntryId,
                result.PublicationIds,
                result.CircleIds,
                result.AuthorLocalDate,
                result.SubmittedAtUtc));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(exception.Message);
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

    /// <summary>Submits an entry with optional local images.</summary>
    [HttpPost("with-media")]
    [RequestSizeLimit(51 * 1024 * 1024)]
    public async Task<ActionResult<EntrySubmissionResponse>> SubmitWithMediaAsync(
        [FromForm] string clientEntryId,
        [FromForm] DateOnly authorLocalDate,
        [FromForm] string authorTimeZoneId,
        [FromForm] string text,
        [FromForm] string? mood,
        [FromForm] string? promptKey,
        [FromForm] string circleIds,
        List<IFormFile>? images,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (images is null || images.Count == 0) return BadRequest("At least one image is required.");
        if (images.Count > 10) return BadRequest("You can attach up to 10 images.");
        Guid[] parsedCircleIds;
        try { parsedCircleIds = circleIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(Guid.Parse).ToArray(); }
        catch (FormatException) { return BadRequest("Circle ids are invalid."); }
        try
        {
            var uploads = images.Select(image => new ImageUpload(image.OpenReadStream(), image.ContentType)).ToArray();
            var result = await _entryService.SubmitWithMediaAsync(userId, clientEntryId, authorLocalDate, authorTimeZoneId, text, mood, promptKey, parsedCircleIds, uploads, cancellationToken).ConfigureAwait(false);
            return StatusCode(StatusCodes.Status201Created, new EntrySubmissionResponse(result.DiaryEntryId, result.PublicationIds, result.CircleIds, result.AuthorLocalDate, result.SubmittedAtUtc));
        }
        catch (ArgumentException exception) { return BadRequest(exception.Message); }
        catch (KeyNotFoundException exception) { return NotFound(exception.Message); }
        catch (UnauthorizedAccessException exception) { return StatusCode(StatusCodes.Status403Forbidden, exception.Message); }
        catch (InvalidOperationException exception) { return Conflict(exception.Message); }
    }

    /// <summary>Gets one entry after its circle has bloomed.</summary>
    [HttpGet("{publicationId:guid}")]
    [ProducesResponseType(typeof(TimelineEntryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status423Locked)]
    public async Task<ActionResult<TimelineEntryResponse>> GetAsync(Guid publicationId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        try
        {
            var item = await _entryService.GetPublicationAsync(userId, publicationId, cancellationToken).ConfigureAwait(false);
            return Ok(ToResponse(item));
        }
        catch (CircleNotBloomedException)
        {
            return StatusCode(StatusCodes.Status423Locked, new { code = "circle_not_bloomed" });
        }
        catch (PublicationNotVisibleException)
        {
            return NotFound();
        }
    }

    /// <summary>Adds the current user's reaction.</summary>
    [HttpPut("{publicationId:guid}/reactions/{emojiCode}")]
    public async Task<ActionResult<ReactionResponse>> AddReactionAsync(Guid publicationId, string emojiCode, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        try
        {
            var result = await _entryService.AddReactionAsync(userId, publicationId, emojiCode, cancellationToken).ConfigureAwait(false);
            return Ok(new ReactionResponse(result.EmojiCode, result.Count, result.ReactedByCurrentUser));
        }
        catch (CircleNotBloomedException) { return StatusCode(StatusCodes.Status423Locked, new { code = "circle_not_bloomed" }); }
        catch (PublicationNotVisibleException) { return NotFound(); }
        catch (ArgumentException exception) { return BadRequest(exception.Message); }
    }

    /// <summary>Removes the current user's reaction.</summary>
    [HttpDelete("{publicationId:guid}/reactions/{emojiCode}")]
    public async Task<ActionResult<ReactionResponse>> RemoveReactionAsync(Guid publicationId, string emojiCode, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        try
        {
            var result = await _entryService.RemoveReactionAsync(userId, publicationId, emojiCode, cancellationToken).ConfigureAwait(false);
            return Ok(new ReactionResponse(result.EmojiCode, result.Count, result.ReactedByCurrentUser));
        }
        catch (CircleNotBloomedException) { return StatusCode(StatusCodes.Status423Locked, new { code = "circle_not_bloomed" }); }
        catch (PublicationNotVisibleException) { return NotFound(); }
        catch (ArgumentException exception) { return BadRequest(exception.Message); }
    }

    /// <summary>Gets comments for a visible publication.</summary>
    [HttpGet("{publicationId:guid}/comments")]
    public async Task<ActionResult<CommentPageResponse>> GetCommentsAsync(Guid publicationId, [FromQuery] string? cursor, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        try
        {
            var page = await _entryService.GetCommentsAsync(userId, publicationId, cursor, cancellationToken).ConfigureAwait(false);
            return Ok(new CommentPageResponse(page.Items.Select(comment => new CommentResponse(comment.Id, comment.AuthorUserId, comment.AuthorDisplayName, comment.AuthorAvatarUrl, comment.Body, comment.CreatedAtUtc, comment.IsMine)).ToArray(), page.NextCursor));
        }
        catch (CircleNotBloomedException) { return StatusCode(StatusCodes.Status423Locked, new { code = "circle_not_bloomed" }); }
        catch (PublicationNotVisibleException) { return NotFound(); }
    }

    /// <summary>Adds a comment to a visible publication.</summary>
    [HttpPost("{publicationId:guid}/comments")]
    public async Task<ActionResult<CommentResponse>> AddCommentAsync(Guid publicationId, CreateCommentRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (request is null) return BadRequest();
        try
        {
            var comment = await _entryService.AddCommentAsync(userId, publicationId, request.Body, cancellationToken).ConfigureAwait(false);
            // The collection endpoint has an optional query-only cursor parameter. Using
            // CreatedAtAction here makes MVC try to satisfy that action's route values
            // while formatting the response, which can fail with "No route matches".
            // The resource location is stable and explicit, so return it directly.
            return Created($"/api/v1/entries/{publicationId:D}/comments", new CommentResponse(comment.Id, comment.AuthorUserId, comment.AuthorDisplayName, comment.AuthorAvatarUrl, comment.Body, comment.CreatedAtUtc, true));
        }
        catch (CircleNotBloomedException) { return StatusCode(StatusCodes.Status423Locked, new { code = "circle_not_bloomed" }); }
        catch (PublicationNotVisibleException) { return NotFound(); }
        catch (ArgumentException exception) { return BadRequest(exception.Message); }
    }

    /// <summary>Deletes one of the current user's comments.</summary>
    [HttpDelete("comments/{commentId:guid}")]
    public async Task<ActionResult> DeleteCommentAsync(Guid commentId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        try
        {
            return await _entryService.DeleteCommentAsync(userId, commentId, cancellationToken).ConfigureAwait(false) ? NoContent() : NotFound();
        }
        catch (CircleNotBloomedException) { return StatusCode(StatusCodes.Status423Locked, new { code = "circle_not_bloomed" }); }
        catch (PublicationNotVisibleException) { return NotFound(); }
    }

    private bool TryGetUserId(out Guid userId)
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(subject, out userId);
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

    private static TodayEntryResponse ToTodayResponse(TodayEntryStatus status) => new(
        status.HasEntry,
        status.AuthorLocalDate,
        status.DiaryEntryId,
        status.SubmittedAtUtc,
        status.CircleIds,
        status.Text,
        status.Mood,
        status.PromptKey,
        status.CanModify,
        status.ModificationEndsAtUtc);
}
