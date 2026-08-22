using System.Security.Claims;
using Bloom.Application.Identity;
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

    private async Task<ActionResult<CurrentUserResponse>> GetUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _googleUserService.FindByIdAsync(userId, cancellationToken).ConfigureAwait(false);
        return user is null
            ? NotFound()
            : Ok(new CurrentUserResponse(user.Id, user.DisplayName, user.Email, user.GoogleAvatarUrl, user.TimeZoneId));
    }
}
