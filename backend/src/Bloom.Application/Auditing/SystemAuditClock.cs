namespace Bloom.Application.Auditing;

/// <summary>Uses the .NET time provider for deterministic audit timestamps.</summary>
public sealed class SystemAuditClock(TimeProvider timeProvider) : IAuditClock
{
    private readonly TimeProvider _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));

    /// <inheritdoc />
    public DateTimeOffset UtcNow => _timeProvider.GetUtcNow();
}
