namespace Bloom.Application.Security;

/// <summary>Protects sealed diary text at rest.</summary>
public interface IEntryProtector
{
    /// <summary>Encrypts one diary body.</summary>
    string Protect(string plaintext);

    /// <summary>Decrypts one diary body.</summary>
    string Unprotect(string protectedText);
}
