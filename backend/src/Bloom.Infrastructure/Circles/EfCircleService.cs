using Bloom.Application.Auditing;
using Bloom.Application.Circles;
using Bloom.Application.Identity;
using Bloom.Domain.Circles;
using Bloom.Domain.Entries;
using Bloom.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bloom.Infrastructure.Circles;

/// <summary>Persists circles, memberships, and invitations in PostgreSQL.</summary>
public sealed class EfCircleService(
    BloomDbContext db,
    IGoogleUserService googleUserService,
    IAuditStampWriter auditStampWriter,
    TimeProvider timeProvider) : ICircleService
{
    private readonly BloomDbContext _db = db ?? throw new ArgumentNullException(nameof(db));
    private readonly IGoogleUserService _googleUserService = googleUserService ?? throw new ArgumentNullException(nameof(googleUserService));
    private readonly IAuditStampWriter _auditStampWriter = auditStampWriter ?? throw new ArgumentNullException(nameof(auditStampWriter));
    private readonly TimeProvider _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));

    /// <inheritdoc />
    public async Task<Circle> CreateAsync(Guid creatorUserId, string name, string emoji, int durationMonths, string timeZoneId, CancellationToken cancellationToken)
    {
        if (await _googleUserService.FindByIdAsync(creatorUserId, cancellationToken).ConfigureAwait(false) is null)
            throw new InvalidOperationException("The creator does not exist.");
        if (durationMonths is not (1 or 3 or 6 or 12))
            throw new ArgumentOutOfRangeException(nameof(durationMonths), "Duration must be 1, 3, 6, or 12 months.");

        var now = _timeProvider.GetUtcNow();
        var circle = Circle.Create(creatorUserId, name, emoji, now.AddMonths(durationMonths), timeZoneId, now);
        _auditStampWriter.StampCreated(circle, creatorUserId);
        var creator = circle.FindMember(creatorUserId) ?? throw new InvalidOperationException("Circle creator membership was not created.");
        _auditStampWriter.StampCreated(creator, creatorUserId);
        _db.Circles.Add(circle);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return circle;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<Circle>> ListForUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var circles = await _db.Circles
            .Include(circle => circle.Members)
            .Where(circle => circle.Members.Any(member => member.UserId == userId && member.LeftAtUtc == null))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var now = _timeProvider.GetUtcNow();
        return circles
            .OrderBy(circle => circle.GetCurrentStatus(now) == CircleStatus.Bloomed)
            .ThenBy(circle => circle.BloomAtUtc)
            .ToArray();
    }

    /// <inheritdoc />
    public Task<Circle?> GetForUserAsync(Guid circleId, Guid userId, CancellationToken cancellationToken) =>
        _db.Circles.Include(circle => circle.Members)
            .SingleOrDefaultAsync(circle => circle.Id == circleId && circle.Members.Any(member => member.UserId == userId && member.LeftAtUtc == null), cancellationToken);

    /// <inheritdoc />
    public Task<Circle?> GetByIdAsync(Guid circleId, CancellationToken cancellationToken) =>
        _db.Circles.Include(circle => circle.Members).SingleOrDefaultAsync(circle => circle.Id == circleId, cancellationToken);

    /// <inheritdoc />
    public async Task<CircleInvitation> InviteAsync(Guid circleId, Guid inviterUserId, string inviteeEmail, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(inviteeEmail);
        var invitee = await _googleUserService.FindByEmailAsync(inviteeEmail, cancellationToken).ConfigureAwait(false)
            ?? throw new KeyNotFoundException("No Bloom user exists with that email.");
        var circle = await GetForUserAsync(circleId, inviterUserId, cancellationToken).ConfigureAwait(false)
            ?? throw new KeyNotFoundException("Circle not found.");
        if (circle.CreatorUserId != inviterUserId)
            throw new UnauthorizedAccessException("Only the circle creator can invite members.");
        if (circle.GetCurrentStatus(_timeProvider.GetUtcNow()) == CircleStatus.Bloomed)
            throw new InvalidOperationException("A bloomed circle cannot accept invitations.");
        if (invitee.Id == inviterUserId)
            throw new InvalidOperationException("You cannot invite yourself.");
        if (circle.HasActiveMember(invitee.Id))
            throw new InvalidOperationException("That user is already a circle member.");
        if (await _db.CircleInvitations.AnyAsync(invitation => invitation.CircleId == circleId && invitation.InviteeUserId == invitee.Id && invitation.Status == CircleInvitationStatus.Pending, cancellationToken).ConfigureAwait(false))
            throw new InvalidOperationException("An invitation is already pending.");

        var invitation = CircleInvitation.Create(circleId, inviterUserId, invitee.Id);
        _auditStampWriter.StampCreated(invitation, inviterUserId);
        _db.CircleInvitations.Add(invitation);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return invitation;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<CircleInvitation>> ListInvitationsAsync(Guid inviteeUserId, CancellationToken cancellationToken)
    {
        var invitations = await _db.CircleInvitations.AsNoTracking()
            .Where(invitation => invitation.InviteeUserId == inviteeUserId && invitation.Status == CircleInvitationStatus.Pending)
            .OrderByDescending(invitation => invitation.CreatedAtUtc)
            .ToArrayAsync(cancellationToken)
            .ConfigureAwait(false);
        return invitations;
    }

    /// <inheritdoc />
    public async Task<bool> RespondToInvitationAsync(Guid invitationId, Guid inviteeUserId, bool accept, CancellationToken cancellationToken)
    {
        var invitation = await _db.CircleInvitations.SingleOrDefaultAsync(candidate => candidate.Id == invitationId && candidate.InviteeUserId == inviteeUserId && candidate.Status == CircleInvitationStatus.Pending, cancellationToken).ConfigureAwait(false);
        if (invitation is null) return false;
        var circle = await _db.Circles.Include(candidate => candidate.Members).SingleOrDefaultAsync(candidate => candidate.Id == invitation.CircleId, cancellationToken).ConfigureAwait(false);
        if (circle is null) return false;

        if (accept)
        {
            var member = circle.AddMember(inviteeUserId, _timeProvider.GetUtcNow());
            _auditStampWriter.StampCreated(member, inviteeUserId);
            invitation.Accept();
        }
        else
        {
            invitation.Decline();
        }
        _auditStampWriter.StampModified(invitation, inviteeUserId);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    /// <inheritdoc />
    public async Task<bool> LeaveAsync(Guid circleId, Guid userId, CancellationToken cancellationToken)
    {
        var circle = await GetForUserAsync(circleId, userId, cancellationToken).ConfigureAwait(false);
        if (circle is null) return false;
        circle.Leave(userId, _timeProvider.GetUtcNow());
        _auditStampWriter.StampModified(circle.FindMember(userId)!, userId);
        _auditStampWriter.StampModified(circle, userId);
        var publications = await _db.EntryPublications
            .Where(publication => publication.CircleId == circleId && publication.AuthorUserId == userId && publication.Status == EntryPublicationStatus.Sealed)
            .ToArrayAsync(cancellationToken)
            .ConfigureAwait(false);
        foreach (var publication in publications)
        {
            publication.Withdraw();
            _auditStampWriter.StampModified(publication, userId);
        }
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }
}
