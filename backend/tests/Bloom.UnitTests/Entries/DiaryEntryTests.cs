using Bloom.Domain.Entries;

namespace Bloom.UnitTests.Entries;

[TestClass]
public sealed class DiaryEntryTests
{
    [TestMethod]
    public void Create_keeps_text_private_and_normalizes_optional_fields()
    {
        var entry = DiaryEntry.Create(
            Guid.NewGuid(),
            " client-1 ",
            new DateOnly(2026, 8, 23),
            "Asia/Kuala_Lumpur",
            "  A quiet day.  ",
            " calm ",
            " prompt-1 ");

        Assert.AreEqual("client-1", entry.ClientEntryId);
        Assert.AreEqual("A quiet day.", entry.Text);
        Assert.AreEqual("calm", entry.Mood);
        Assert.AreEqual("prompt-1", entry.PromptKey);
    }

    [TestMethod]
    public void Create_rejects_empty_text()
    {
        Assert.ThrowsExactly<ArgumentException>(() => DiaryEntry.Create(
            Guid.NewGuid(),
            "client-1",
            new DateOnly(2026, 8, 23),
            "UTC",
            " ",
            null,
            null));
    }
}
