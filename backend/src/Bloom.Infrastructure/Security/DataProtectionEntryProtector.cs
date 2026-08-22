using Bloom.Application.Security;
using Microsoft.AspNetCore.DataProtection;

namespace Bloom.Infrastructure.Security;

/// <summary>Uses the local protected key ring for diary text encryption.</summary>
public sealed class DataProtectionEntryProtector(IDataProtectionProvider provider) : IEntryProtector
{
    private readonly IDataProtector _protector = (provider ?? throw new ArgumentNullException(nameof(provider))).CreateProtector("Bloom.EntryText.v1");

    /// <inheritdoc />
    public string Protect(string plaintext)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(plaintext);
        return _protector.Protect(plaintext);
    }

    /// <inheritdoc />
    public string Unprotect(string protectedText)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(protectedText);
        return _protector.Unprotect(protectedText);
    }
}
