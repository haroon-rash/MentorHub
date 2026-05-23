using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using UserManagment.Infrastructure.Persistence;

#nullable disable

namespace UserManagment.Infrastructure.Migrations
{
    [DbContext(typeof(UserManagmentDbContext))]
    [Migration("20260428204000_ApproveExistingTutors")]
    public partial class ApproveExistingTutors : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE tutor_profiles
                SET ""VerificationStatus"" = 2
                WHERE ""VerificationStatus"" != 2
                  AND ""CreatedAtUtc"" < NOW();
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // One-time data migration: no safe rollback is provided.
        }
    }
}
