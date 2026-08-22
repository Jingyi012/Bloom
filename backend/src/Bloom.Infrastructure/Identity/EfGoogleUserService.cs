using Bloom.Application.Auditing;
using Bloom.Application.Identity;
using Bloom.Domain.Identity;
using Bloom.Domain.Circles;
using Bloom.Domain.Entries;
using Bloom.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bloom.Infrastructure.Identity;

/// <summary>Persists Google-provisioned users in PostgreSQL.</summary>
public sealed class EfGoogleUserService(
    BloomDbContext db,
    IAuditStampWriter auditStampWriter) : IGoogleUserService
{
    private readonly BloomDbContext _db = db ?? throw new ArgumentNullException(nameof(db));
    private readonly IAuditStampWriter _auditStampWriter = auditStampWriter ?? throw new ArgumentNullException(nameof(auditStampWriter));

    /// <inheritdoc />
    public async Task<User> FindOrProvisionAsync(GoogleIdentity identity, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(identity);
        var user = await _db.Users.SingleOrDefaultAsync(candidate => candidate.GoogleSubject == identity.Subject, cancellationToken).ConfigureAwait(false);
        if (user is not null && user.DeletedAtUtc is not null)
            throw new InvalidOperationException("account_deleted");
        if (user is not null)
        {
            user.UpdateProfile(identity.DisplayName, user.TimeZoneId);
            _auditStampWriter.StampModified(user, null);
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return user;
        }

        user = User.CreateFromGoogle(identity.Subject, identity.Email, identity.EmailVerified, identity.DisplayName, identity.AvatarUrl, "UTC");
        _auditStampWriter.StampCreated(user, null);
        _db.Users.Add(user);
        try
        {
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return user;
        }
        catch (DbUpdateException)
        {
            _db.Entry(user).State = EntityState.Detached;
            return await _db.Users.SingleAsync(candidate => candidate.GoogleSubject == identity.Subject, cancellationToken).ConfigureAwait(false);
        }
    }

    /// <inheritdoc />
    public Task<User?> FindByIdAsync(Guid userId, CancellationToken cancellationToken) =>
        _db.Users.AsNoTracking().SingleOrDefaultAsync(user => user.Id == userId && user.DeletedAtUtc == null, cancellationToken);

    /// <inheritdoc />
    public Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        var normalized = email.Trim().ToUpperInvariant();
        return _db.Users.AsNoTracking().SingleOrDefaultAsync(user => user.EmailNormalized == normalized && user.DeletedAtUtc == null, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<User?> UpdateProfileAsync(Guid userId, string displayName, string timeZoneId, CancellationToken cancellationToken)
    {
        var user = await _db.Users.SingleOrDefaultAsync(candidate => candidate.Id == userId && candidate.DeletedAtUtc == null, cancellationToken).ConfigureAwait(false);
        if (user is null) return null;
        try { TimeZoneInfo.FindSystemTimeZoneById(timeZoneId.Trim()); }
        catch (TimeZoneNotFoundException exception) { throw new ArgumentException("The selected time zone is not supported.", nameof(timeZoneId), exception); }
        catch (InvalidTimeZoneException exception) { throw new ArgumentException("The selected time zone is not supported.", nameof(timeZoneId), exception); }
        user.UpdateProfile(displayName, timeZoneId);
        _auditStampWriter.StampModified(user, userId);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return user;
    }

    /// <inheritdoc />
    public async Task<UserStats> GetStatsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var totalEntries = await _db.DiaryEntries.CountAsync(entry => entry.AuthorUserId == userId && entry.DeletedAtUtc == null, cancellationToken).ConfigureAwait(false);
        var memberships = await _db.CircleMembers.AsNoTracking().Where(member => member.UserId == userId && member.LeftAtUtc == null).Join(_db.Circles.AsNoTracking(), member => member.CircleId, circle => circle.Id, (_, circle) => circle.BloomAtUtc).ToArrayAsync(cancellationToken).ConfigureAwait(false);
        var now = DateTimeOffset.UtcNow;
        return new UserStats(totalEntries, memberships.Length, memberships.Count(bloomAt => bloomAt <= now), 0);
    }

    /// <inheritdoc />
    public async Task<bool> DeleteAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _db.Users.SingleOrDefaultAsync(candidate => candidate.Id == userId && candidate.DeletedAtUtc == null, cancellationToken).ConfigureAwait(false);
        if (user is null) return false;
        _auditStampWriter.StampDeleted(user, userId);
        var sessions = await _db.UserSessions.Where(session => session.UserId == userId && session.RevokedAtUtc == null).ToArrayAsync(cancellationToken).ConfigureAwait(false);
        foreach (var session in sessions)
        {
            session.Revoke(DateTimeOffset.UtcNow);
            _auditStampWriter.StampModified(session, userId);
        }
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }
}
