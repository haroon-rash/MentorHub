using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UserManagment.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBlockedUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_bookings_TutorProfileId_BookingDate_TimeSlot",
                table: "bookings");

            migrationBuilder.CreateTable(
                name: "BlockedUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BlockerAuthUserId = table.Column<string>(type: "text", nullable: false),
                    BlockedAuthUserId = table.Column<string>(type: "text", nullable: false),
                    BlockedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlockedUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "cms_pages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cms_pages", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TutorProfileId_BookingDate_TimeSlot",
                table: "bookings",
                columns: new[] { "TutorProfileId", "BookingDate", "TimeSlot" },
                unique: true,
                filter: "\"Status\" != 2");

            migrationBuilder.CreateIndex(
                name: "IX_cms_pages_Slug",
                table: "cms_pages",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BlockedUsers");

            migrationBuilder.DropTable(
                name: "cms_pages");

            migrationBuilder.DropIndex(
                name: "IX_bookings_TutorProfileId_BookingDate_TimeSlot",
                table: "bookings");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TutorProfileId_BookingDate_TimeSlot",
                table: "bookings",
                columns: new[] { "TutorProfileId", "BookingDate", "TimeSlot" },
                unique: true,
                filter: "\"Status\" != 3");
        }
    }
}
