using Bloom.Application.Identity;
using Bloom.Application.Media;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bloom.Api.Controllers;

/// <summary>Serves Bloom-managed profile avatar files.</summary>
[ApiController]
[Route("api/v1/users/{userId:guid}/avatar")]
[AllowAnonymous]
public sealed class UserAvatarController(
    IGoogleUserService googleUserService,
    IImageStorage imageStorage) : ControllerBase
{
    private readonly IGoogleUserService _googleUserService = googleUserService ?? throw new ArgumentNullException(nameof(googleUserService));
    private readonly IImageStorage _imageStorage = imageStorage ?? throw new ArgumentNullException(nameof(imageStorage));

    /// <summary>Reads a user's Bloom-managed avatar.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _googleUserService.FindByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        if (user?.AvatarPath is null || string.IsNullOrWhiteSpace(user.AvatarContentType)) return NotFound();
        try
        {
            var bytes = await _imageStorage.ReadAsync(user.AvatarPath, cancellationToken).ConfigureAwait(false);
            return File(bytes, user.AvatarContentType);
        }
        catch (FileNotFoundException) { return NotFound(); }
    }
}
