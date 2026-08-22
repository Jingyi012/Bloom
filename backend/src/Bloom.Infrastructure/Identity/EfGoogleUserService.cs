using Bloom.Application.Auditing;
using Bloom.Application.Identity;
using Bloom.Domain.Identity;
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
        _db.Users.AsNoTracking().SingleOrDefaultAsync(user => user.Id == userId, cancellationToken);

    /// <inheritdoc />
    public Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        var normalized = email.Trim().ToUpperInvariant();
        return _db.Users.AsNoTracking().SingleOrDefaultAsync(user => user.EmailNormalized == normalized, cancellationToken);
    }
}
