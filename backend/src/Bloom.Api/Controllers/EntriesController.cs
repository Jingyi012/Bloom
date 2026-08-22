using System.Security.Claims;
using Bloom.Application.Entries;
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
            return CreatedAtAction(nameof(GetCommentsAsync), new { publicationId }, new CommentResponse(comment.Id, comment.AuthorUserId, comment.AuthorDisplayName, comment.AuthorAvatarUrl, comment.Body, comment.CreatedAtUtc, true));
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
        item.Reactions.Select(reaction => new ReactionResponse(reaction.EmojiCode, reaction.Count, reaction.ReactedByCurrentUser)).ToArray(),
        item.CommentCount);
}
