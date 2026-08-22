using Bloom.Application.Auditing;
using Bloom.Domain.Common;

namespace Bloom.UnitTests.Auditing;

[TestClass]
public sealed class AuditStampWriterTests
{
    private static readonly DateTimeOffset CreatedAt = new(2026, 8, 22, 12, 0, 0, TimeSpan.Zero);

    [TestMethod]
    public void StampCreated_sets_all_creation_fields_and_clears_deletion_fields()
    {
        var entity = new TestEntity
        {
            DeletedAtUtc = CreatedAt.AddDays(-1),
            DeletedByUserId = Guid.NewGuid(),
        };
        var actor = Guid.NewGuid();
        var writer = new AuditStampWriter(new FixedAuditClock(CreatedAt));

        writer.StampCreated(entity, actor);

        Assert.AreEqual(CreatedAt, entity.CreatedAtUtc);
        Assert.AreEqual(actor, entity.CreatedByUserId);
        Assert.AreEqual(CreatedAt, entity.LastModifiedAtUtc);
        Assert.AreEqual(actor, entity.LastModifiedByUserId);
        Assert.IsNull(entity.DeletedAtUtc);
        Assert.IsNull(entity.DeletedByUserId);
    }

    [TestMethod]
    public void StampModified_uses_the_current_server_time_and_actor()
    {
        var modifiedAt = CreatedAt.AddMinutes(5);
        var entity = new TestEntity();
        var actor = Guid.NewGuid();
        var writer = new AuditStampWriter(new FixedAuditClock(modifiedAt));

        writer.StampModified(entity, actor);

        Assert.AreEqual(modifiedAt, entity.LastModifiedAtUtc);
        Assert.AreEqual(actor, entity.LastModifiedByUserId);
    }

    [TestMethod]
    public void StampDeleted_sets_deletion_and_last_modified_fields()
    {
        var deletedAt = CreatedAt.AddHours(2);
        var entity = new TestEntity();
        var actor = Guid.NewGuid();
        var writer = new AuditStampWriter(new FixedAuditClock(deletedAt));

        writer.StampDeleted(entity, actor);

        Assert.AreEqual(deletedAt, entity.DeletedAtUtc);
        Assert.AreEqual(actor, entity.DeletedByUserId);
        Assert.AreEqual(deletedAt, entity.LastModifiedAtUtc);
        Assert.AreEqual(actor, entity.LastModifiedByUserId);
    }

    private sealed class FixedAuditClock(DateTimeOffset utcNow) : IAuditClock
    {
        public DateTimeOffset UtcNow { get; } = utcNow;
    }

    private sealed class TestEntity : AuditableEntity
    {
    }
}
