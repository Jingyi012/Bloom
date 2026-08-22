using System.Collections.Concurrent;
using Bloom.Application.Auditing;
using Bloom.Application.Identity;
using Bloom.Domain.Identity;

namespace Bloom.Infrastructure.Identity;

/// <summary>
/// Temporary single-process user store used while the database adapter is being added.
/// </summary>
public sealed class InMemoryGoogleUserService(IAuditStampWriter auditStampWriter) : IGoogleUserService
{
    private readonly IAuditStampWriter _auditStampWriter = auditStampWriter ?? throw new ArgumentNullException(nameof(auditStampWriter));
    private readonly ConcurrentDictionary<string, User> _byGoogleSubject = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<Guid, User> _byId = new();

    /// <inheritdoc />
    public Task<User> FindOrProvisionAsync(GoogleIdentity identity, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(identity);
        cancellationToken.ThrowIfCancellationRequested();

        var user = _byGoogleSubject.GetOrAdd(identity.Subject, _ =>
        {
            var created = User.CreateFromGoogle(
                identity.Subject,
                identity.Email,
                identity.EmailVerified,
                identity.DisplayName,
                identity.AvatarUrl,
                "UTC");
            _auditStampWriter.StampCreated(created, null);
            _byId[created.Id] = created;
            return created;
        });

        _byId[user.Id] = user;
        return Task.FromResult(user);
    }

    /// <inheritdoc />
    public Task<User?> FindByIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _byId.TryGetValue(userId, out var user);
        return Task.FromResult(user);
    }
}
