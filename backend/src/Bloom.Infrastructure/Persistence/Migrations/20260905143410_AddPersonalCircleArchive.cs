using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bloom.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonalCircleArchive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ArchivedAtUtc",
                table: "CircleMember",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CircleMember_UserId_ArchivedAtUtc",
                table: "CircleMember",
                columns: new[] { "UserId", "ArchivedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CircleMember_UserId_ArchivedAtUtc",
                table: "CircleMember");

            migrationBuilder.DropColumn(
                name: "ArchivedAtUtc",
                table: "CircleMember");
        }
    }
}
