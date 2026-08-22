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

    private bool TryGetUserId(out Guid userId)
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(subject, out userId);
    }
}
