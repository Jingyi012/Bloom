using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bloom.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAvatarAndFriendHistoryV2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvatarContentType",
                table: "User",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AvatarPath",
                table: "User",
                type: "character varying(1024)",
                maxLength: 1024,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FriendRecord",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FriendUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstAddedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSeenAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FriendRecord", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FriendRecord_User_FriendUserId",
                        column: x => x.FriendUserId,
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FriendRecord_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FriendRecord_DeletedAtUtc",
                table: "FriendRecord",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_FriendRecord_FriendUserId",
                table: "FriendRecord",
                column: "FriendUserId");

            migrationBuilder.CreateIndex(
                name: "IX_FriendRecord_UserId_FriendUserId",
                table: "FriendRecord",
                columns: new[] { "UserId", "FriendUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FriendRecord_UserId_LastSeenAtUtc",
                table: "FriendRecord",
                columns: new[] { "UserId", "LastSeenAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FriendRecord");

            migrationBuilder.DropColumn(
                name: "AvatarContentType",
                table: "User");

            migrationBuilder.DropColumn(
                name: "AvatarPath",
                table: "User");
        }
    }
}
