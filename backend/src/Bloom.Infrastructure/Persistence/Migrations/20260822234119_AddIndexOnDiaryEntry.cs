using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bloom.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIndexOnDiaryEntry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_DiaryEntry_AuthorUserId_AuthorLocalDate",
                table: "DiaryEntry",
                columns: new[] { "AuthorUserId", "AuthorLocalDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DiaryEntry_AuthorUserId_AuthorLocalDate",
                table: "DiaryEntry");
        }
    }
}
