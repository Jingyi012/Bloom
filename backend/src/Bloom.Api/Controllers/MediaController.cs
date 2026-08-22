using System.Security.Claims;
using Bloom.Application.Entries;
using Bloom.Application.Media;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bloom.Api.Controllers;

/// <summary>Streams encrypted project-local media after timeline authorization.</summary>
[ApiController]
[Route("api/v1/media")]
[Authorize]
public sealed class MediaController(IMediaService mediaService) : ControllerBase
{
    private readonly IMediaService _mediaService = mediaService ?? throw new ArgumentNullException(nameof(mediaService));

    /// <summary>Gets one authorized media asset.</summary>
    [HttpGet("{mediaId:guid}/content")]
    public async Task<IActionResult> GetAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(subject, out var userId)) return Unauthorized();
        try
        {
            var content = await _mediaService.GetContentAsync(userId, mediaId, cancellationToken).ConfigureAwait(false);
            return content is null ? NotFound() : File(content.Bytes, content.ContentType);
        }
        catch (CircleNotBloomedException) { return StatusCode(StatusCodes.Status423Locked, new { code = "circle_not_bloomed" }); }
        catch (PublicationNotVisibleException) { return NotFound(); }
        catch (FileNotFoundException) { return NotFound(); }
    }
}
