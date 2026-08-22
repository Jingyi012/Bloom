using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bloom.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeMediaOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add the normalized ownership columns before removing the old
            // publication link table so existing media relationships can be
            // migrated without losing the diary entry association.
            migrationBuilder.AddColumn<Guid>(
                name: "DiaryEntryId",
                table: "MediaAsset",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "MediaAsset",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "MediaAsset" AS media
                SET "DiaryEntryId" = source."DiaryEntryId",
                    "SortOrder" = source."SortOrder"
                FROM (
                    SELECT DISTINCT ON (link."MediaAssetId")
                        link."MediaAssetId",
                        publication."DiaryEntryId",
                        link."SortOrder"
                    FROM "EntryMedia" AS link
                    INNER JOIN "EntryPublication" AS publication
                        ON publication."Id" = link."EntryPublicationId"
                    ORDER BY link."MediaAssetId", (link."DeletedAtUtc" IS NULL) DESC, link."Id"
                ) AS source
                WHERE media."Id" = source."MediaAssetId";
                """);

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM "MediaAsset" WHERE "DiaryEntryId" IS NULL OR "SortOrder" IS NULL) THEN
                        RAISE EXCEPTION 'Cannot normalize MediaAsset ownership because one or more assets are not linked to a diary entry.';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_MediaAsset_User_OwnerUserId",
                table: "MediaAsset");

            migrationBuilder.DropIndex(
                name: "IX_MediaAsset_OwnerUserId",
                table: "MediaAsset");

            migrationBuilder.DropTable(
                name: "EntryMedia");

            migrationBuilder.DropColumn(
                name: "OwnerUserId",
                table: "MediaAsset");

            migrationBuilder.AlterColumn<Guid>(
                name: "DiaryEntryId",
                table: "MediaAsset",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "SortOrder",
                table: "MediaAsset",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MediaAsset_DiaryEntryId_SortOrder",
                table: "MediaAsset",
                columns: new[] { "DiaryEntryId", "SortOrder" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_MediaAsset_DiaryEntry_DiaryEntryId",
                table: "MediaAsset",
                column: "DiaryEntryId",
                principalTable: "DiaryEntry",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OwnerUserId",
                table: "MediaAsset",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "MediaAsset" AS media
                SET "OwnerUserId" = entry."AuthorUserId"
                FROM "DiaryEntry" AS entry
                WHERE entry."Id" = media."DiaryEntryId";
                """);

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM "MediaAsset" WHERE "OwnerUserId" IS NULL) THEN
                        RAISE EXCEPTION 'Cannot restore MediaAsset ownership because one or more assets are not linked to a diary entry.';
                    END IF;
                END $$;
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "OwnerUserId",
                table: "MediaAsset",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "EntryMedia",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    EntryPublicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    MediaAssetId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntryMedia", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EntryMedia_EntryPublication_EntryPublicationId",
                        column: x => x.EntryPublicationId,
                        principalTable: "EntryPublication",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EntryMedia_MediaAsset_MediaAssetId",
                        column: x => x.MediaAssetId,
                        principalTable: "MediaAsset",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql("""
                INSERT INTO "EntryMedia" (
                    "Id", "CreatedAtUtc", "CreatedByUserId", "DeletedAtUtc", "DeletedByUserId",
                    "EntryPublicationId", "LastModifiedAtUtc", "LastModifiedByUserId", "MediaAssetId", "SortOrder")
                SELECT (md5(media."Id"::text || ':' || publication."Id"::text))::uuid,
                       media."CreatedAtUtc", media."CreatedByUserId", media."DeletedAtUtc", media."DeletedByUserId",
                       publication."Id", media."LastModifiedAtUtc", media."LastModifiedByUserId", media."Id", media."SortOrder"
                FROM "MediaAsset" AS media
                INNER JOIN "EntryPublication" AS publication
                    ON publication."DiaryEntryId" = media."DiaryEntryId";
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_MediaAsset_DiaryEntry_DiaryEntryId",
                table: "MediaAsset");

            migrationBuilder.DropIndex(
                name: "IX_MediaAsset_DiaryEntryId_SortOrder",
                table: "MediaAsset");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "MediaAsset");

            migrationBuilder.DropColumn(
                name: "DiaryEntryId",
                table: "MediaAsset");

            migrationBuilder.CreateIndex(
                name: "IX_MediaAsset_OwnerUserId",
                table: "MediaAsset",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_EntryMedia_DeletedAtUtc",
                table: "EntryMedia",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_EntryMedia_EntryPublicationId_SortOrder",
                table: "EntryMedia",
                columns: new[] { "EntryPublicationId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EntryMedia_MediaAssetId",
                table: "EntryMedia",
                column: "MediaAssetId");

            migrationBuilder.AddForeignKey(
                name: "FK_MediaAsset_User_OwnerUserId",
                table: "MediaAsset",
                column: "OwnerUserId",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
