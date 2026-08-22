using Bloom.Domain.Identity;

namespace Bloom.UnitTests.Identity;

[TestClass]
public sealed class UserTests
{
    [TestMethod]
    public void CreateFromGoogle_keeps_provider_subject_as_external_identity()
    {
        var user = User.CreateFromGoogle(
            "google-sub-123",
            "jy@example.com",
            true,
            "Jy",
            "https://example.com/avatar.png",
            "Asia/Kuala_Lumpur");

        Assert.AreEqual("google-sub-123", user.GoogleSubject);
        Assert.AreEqual("jy@example.com", user.Email);
        Assert.IsTrue(user.EmailVerified);
        Assert.AreEqual("Asia/Kuala_Lumpur", user.TimeZoneId);
        Assert.AreNotEqual(Guid.Empty, user.Id);
    }

    [TestMethod]
    public void CreateFromGoogle_rejects_missing_subject()
    {
        Assert.ThrowsExactly<ArgumentException>(() => User.CreateFromGoogle(
            "",
            "jy@example.com",
            true,
            "Jy",
            null,
            "UTC"));
    }
}
