using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bloom.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "bloom");

            migrationBuilder.CreateTable(
                name: "User",
                schema: "bloom",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GoogleSubject = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    EmailNormalized = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    EmailVerified = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    GoogleAvatarUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    TimeZoneId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Circle",
                schema: "bloom",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Emoji = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    BloomAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TimeZoneId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Circle", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Circle_User_CreatorUserId",
                        column: x => x.CreatorUserId,
                        principalSchema: "bloom",
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DiaryEntry",
                schema: "bloom",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientEntryId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AuthorLocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    AuthorTimeZoneId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Text = table.Column<string>(type: "character varying(20000)", maxLength: 20000, nullable: false),
                    Mood = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    PromptKey = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiaryEntry", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DiaryEntry_User_AuthorUserId",
                        column: x => x.AuthorUserId,
                        principalSchema: "bloom",
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MediaAsset",
                schema: "bloom",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RelativePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Sha256 = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaAsset", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MediaAsset_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "bloom",
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserSession",
                schema: "bloom",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RefreshTokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RevokedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSession", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSession_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "bloom",
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CircleInvitation",
                schema: "bloom",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CircleId = table.Column<Guid>(type: "uuid", nullable: false),
                    InviterUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    InviteeUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CircleInvitation", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CircleInvitation_Circle_CircleId",
                        column: x => x.CircleId,
                        principalSchema: "bloom",
                        principalTable: "Circle",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CircleInvitation_User_InviteeUserId",
                        column: x => x.InviteeUserId,
                        principalSchema: "bloom",
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CircleInvitation_User_InviterUserId",
                        column: x => x.InviterUserId,
                        principalSchema: "bloom",
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CircleMember",
                schema: "bloom",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CircleId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    JoinedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LeftAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CircleMember", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CircleMember_Circle_CircleId",
                        column: x => x.CircleId,
                        principalSchema: "bloom",
                        principalTable: "Circle",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CircleMember_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "bloom",
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EntryPublication",
                schema: "bloom",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DiaryEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    CircleId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorLocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SubmittedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntryPublication", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EntryPublication_Circle_CircleId",
                        column: x => x.CircleId,
                        principalSchema: "bloom",
                        principalTable: "Circle",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EntryPublication_DiaryEntry_DiaryEntryId",
                        column: x => x.DiaryEntryId,
                        principalSchema: "bloom",
                        principalTable: "DiaryEntry",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EntryPublication_User_AuthorUserId",
                        column: x => x.AuthorUserId,
                        principalSchema: "bloom",
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Comment",
                schema: "bloom",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntryPublicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Body = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IsHidden = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Comment_EntryPublication_EntryPublicationId",
                        column: x => x.EntryPublicationId,
                        principalSchema: "bloom",
                        principalTable: "EntryPublication",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Comment_User_AuthorUserId",
                        column: x => x.AuthorUserId,
                        principalSchema: "bloom",
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EntryMedia",
                schema: "bloom",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntryPublicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    MediaAssetId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntryMedia", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EntryMedia_EntryPublication_EntryPublicationId",
                        column: x => x.EntryPublicationId,
                        principalSchema: "bloom",
                        principalTable: "EntryPublication",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EntryMedia_MediaAsset_MediaAssetId",
                        column: x => x.MediaAssetId,
                        principalSchema: "bloom",
                        principalTable: "MediaAsset",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reaction",
                schema: "bloom",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntryPublicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmojiCode = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reaction", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reaction_EntryPublication_EntryPublicationId",
                        column: x => x.EntryPublicationId,
                        principalSchema: "bloom",
                        principalTable: "EntryPublication",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Circle_BloomAtUtc",
                schema: "bloom",
                table: "Circle",
                column: "BloomAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Circle_CreatorUserId",
                schema: "bloom",
                table: "Circle",
                column: "CreatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Circle_DeletedAtUtc",
                schema: "bloom",
                table: "Circle",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_CircleInvitation_CircleId_InviteeUserId_Status",
                schema: "bloom",
                table: "CircleInvitation",
                columns: new[] { "CircleId", "InviteeUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CircleInvitation_DeletedAtUtc",
                schema: "bloom",
                table: "CircleInvitation",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_CircleInvitation_InviteeUserId_Status",
                schema: "bloom",
                table: "CircleInvitation",
                columns: new[] { "InviteeUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CircleInvitation_InviterUserId",
                schema: "bloom",
                table: "CircleInvitation",
                column: "InviterUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CircleMember_CircleId_UserId",
                schema: "bloom",
                table: "CircleMember",
                columns: new[] { "CircleId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CircleMember_DeletedAtUtc",
                schema: "bloom",
                table: "CircleMember",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_CircleMember_UserId_LeftAtUtc",
                schema: "bloom",
                table: "CircleMember",
                columns: new[] { "UserId", "LeftAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Comment_AuthorUserId",
                schema: "bloom",
                table: "Comment",
                column: "AuthorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Comment_DeletedAtUtc",
                schema: "bloom",
                table: "Comment",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Comment_EntryPublicationId_CreatedAtUtc",
                schema: "bloom",
                table: "Comment",
                columns: new[] { "EntryPublicationId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_DiaryEntry_AuthorUserId_ClientEntryId",
                schema: "bloom",
                table: "DiaryEntry",
                columns: new[] { "AuthorUserId", "ClientEntryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DiaryEntry_DeletedAtUtc",
                schema: "bloom",
                table: "DiaryEntry",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_EntryMedia_DeletedAtUtc",
                schema: "bloom",
                table: "EntryMedia",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_EntryMedia_EntryPublicationId_SortOrder",
                schema: "bloom",
                table: "EntryMedia",
                columns: new[] { "EntryPublicationId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EntryMedia_MediaAssetId",
                schema: "bloom",
                table: "EntryMedia",
                column: "MediaAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_EntryPublication_AuthorUserId",
                schema: "bloom",
                table: "EntryPublication",
                column: "AuthorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_EntryPublication_CircleId_AuthorLocalDate_SubmittedAtUtc",
                schema: "bloom",
                table: "EntryPublication",
                columns: new[] { "CircleId", "AuthorLocalDate", "SubmittedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_EntryPublication_CircleId_AuthorUserId_AuthorLocalDate",
                schema: "bloom",
                table: "EntryPublication",
                columns: new[] { "CircleId", "AuthorUserId", "AuthorLocalDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EntryPublication_DeletedAtUtc",
                schema: "bloom",
                table: "EntryPublication",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_EntryPublication_DiaryEntryId",
                schema: "bloom",
                table: "EntryPublication",
                column: "DiaryEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaAsset_DeletedAtUtc",
                schema: "bloom",
                table: "MediaAsset",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MediaAsset_OwnerUserId",
                schema: "bloom",
                table: "MediaAsset",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaAsset_RelativePath",
                schema: "bloom",
                table: "MediaAsset",
                column: "RelativePath",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reaction_DeletedAtUtc",
                schema: "bloom",
                table: "Reaction",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Reaction_EntryPublicationId_CreatedAtUtc",
                schema: "bloom",
                table: "Reaction",
                columns: new[] { "EntryPublicationId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Reaction_EntryPublicationId_UserId_EmojiCode",
                schema: "bloom",
                table: "Reaction",
                columns: new[] { "EntryPublicationId", "UserId", "EmojiCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_User_DeletedAtUtc",
                schema: "bloom",
                table: "User",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_User_EmailNormalized",
                schema: "bloom",
                table: "User",
                column: "EmailNormalized",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_User_GoogleSubject",
                schema: "bloom",
                table: "User",
                column: "GoogleSubject",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSession_DeletedAtUtc",
                schema: "bloom",
                table: "UserSession",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_UserSession_RefreshTokenHash",
                schema: "bloom",
                table: "UserSession",
                column: "RefreshTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSession_UserId_ExpiresAtUtc",
                schema: "bloom",
                table: "UserSession",
                columns: new[] { "UserId", "ExpiresAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CircleInvitation",
                schema: "bloom");

            migrationBuilder.DropTable(
                name: "CircleMember",
                schema: "bloom");

            migrationBuilder.DropTable(
                name: "Comment",
                schema: "bloom");

            migrationBuilder.DropTable(
                name: "EntryMedia",
                schema: "bloom");

            migrationBuilder.DropTable(
                name: "Reaction",
                schema: "bloom");

            migrationBuilder.DropTable(
                name: "UserSession",
                schema: "bloom");

            migrationBuilder.DropTable(
                name: "MediaAsset",
                schema: "bloom");

            migrationBuilder.DropTable(
                name: "EntryPublication",
                schema: "bloom");

            migrationBuilder.DropTable(
                name: "Circle",
                schema: "bloom");

            migrationBuilder.DropTable(
                name: "DiaryEntry",
                schema: "bloom");

            migrationBuilder.DropTable(
                name: "User",
                schema: "bloom");
        }
    }
}
