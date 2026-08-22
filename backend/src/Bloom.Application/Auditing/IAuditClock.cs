namespace Bloom.Application.Auditing;

/// <summary>Provides the authoritative clock used to stamp audit fields.</summary>
public interface IAuditClock
{
    /// <summary>Gets the current UTC time.</summary>
    DateTimeOffset UtcNow { get; }
}
