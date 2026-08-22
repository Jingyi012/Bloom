namespace Bloom.Domain.Entries;

/// <summary>Lifecycle state of an immutable circle publication.</summary>
public enum EntryPublicationStatus
{
    Sealed = 0,
    Withdrawn = 1,
}
