namespace Bloom.Application.Entries;

/// <summary>Indicates that a circle's content is not available until its bloom instant.</summary>
public sealed class CircleNotBloomedException : InvalidOperationException
{
    /// <summary>Initializes the exception.</summary>
    public CircleNotBloomedException() : base("circle_not_bloomed")
    {
    }
}

/// <summary>Indicates that a publication is not visible to the requesting user.</summary>
public sealed class PublicationNotVisibleException : InvalidOperationException
{
    /// <summary>Initializes the exception.</summary>
    public PublicationNotVisibleException() : base("publication_not_visible")
    {
    }
}
