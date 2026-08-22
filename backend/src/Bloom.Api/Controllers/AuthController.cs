using System.Security.Claims;
using Bloom.Application.Identity;
using Bloom.Contracts.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bloom.Api.Controllers;

/// <summary>Exchanges a validated Google identity for a Bloom application session.</summary>
[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(
    IGoogleUserService googleUserService,
    ISessionTokenService sessionTokenService) : ControllerBase
{
    private readonly IGoogleUserService _googleUserService = googleUserService ?? throw new ArgumentNullException(nameof(googleUserService));
    private readonly ISessionTokenService _sessionTokenService = sessionTokenService ?? throw new ArgumentNullException(nameof(sessionTokenService));

    /// <summary>Creates a Bloom session from the validated Google bearer identity.</summary>
    /// <param name="request">The client platform and OAuth nonce metadata.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>Bloom access and refresh tokens.</returns>
    [HttpPost("google")]
    [Authorize(AuthenticationSchemes = AuthenticationSchemes.Google)]
    [ProducesResponseType(typeof(GoogleSignInResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<GoogleSignInResponse>> GoogleAsync(
        GoogleSignInRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized();
        }

        if (request.Platform is not ("ios" or "android" or "web"))
        {
            return BadRequest("Unsupported sign-in platform.");
        }

        // Native Expo Google sign-in uses authorization code + PKCE and does not
        // include an ID-token nonce. Web ID-token sign-in does, so retain strict
        // nonce validation for web and validate it when native clients provide one.
        var tokenNonce = User.FindFirstValue("nonce");
        var nonceMatches = !string.IsNullOrWhiteSpace(request.Nonce)
            && string.Equals(tokenNonce, request.Nonce, StringComparison.Ordinal);
        if (request.Platform == "web" ? !nonceMatches : !string.IsNullOrWhiteSpace(request.Nonce) && !nonceMatches)
        {
            return Unauthorized();
        }

        var subject = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue("email") ?? string.Empty;
        var verified = bool.TryParse(User.FindFirstValue("email_verified"), out var isVerified) && isVerified;
        var displayName = User.FindFirstValue("name") ?? email;
        var avatarUrl = User.FindFirstValue("picture");

        if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(email) || !verified)
        {
            return Unauthorized();
        }

        var user = await _googleUserService.FindOrProvisionAsync(
            new Bloom.Domain.Identity.GoogleIdentity(subject, email, verified, displayName, avatarUrl),
            cancellationToken).ConfigureAwait(false);
        var tokens = await _sessionTokenService.CreateAsync(user, cancellationToken).ConfigureAwait(false);

        return Ok(new GoogleSignInResponse(user.Id, user.DisplayName, user.Email, tokens.AccessToken, tokens.RefreshToken, tokens.AccessTokenExpiresAtUtc));
    }

    /// <summary>Rotates a Bloom refresh token.</summary>
    /// <param name="request">The refresh token.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A new Bloom session.</returns>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(SessionRefreshResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<SessionRefreshResponse>> RefreshAsync(
        SessionRefreshRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var tokens = await _sessionTokenService.RefreshAsync(request.RefreshToken, cancellationToken).ConfigureAwait(false);
        return tokens is null
            ? Unauthorized()
            : Ok(new SessionRefreshResponse(tokens.AccessToken, tokens.RefreshToken, tokens.AccessTokenExpiresAtUtc));
    }

    /// <summary>Revokes the current refresh token.</summary>
    /// <param name="request">The refresh token to revoke.</param>
    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout(SessionRefreshRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        _sessionTokenService.Revoke(request.RefreshToken);
        return NoContent();
    }
}

internal static class AuthenticationSchemes
{
    public const string Google = "Google";
}
