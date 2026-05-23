using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UserManagment.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentProgressTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chat_messages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SenderAuthUserId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ReceiverAuthUserId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    SentAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_messages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipientAuthUserId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    RelatedEntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReadAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "user_accounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthUserId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    FullName = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Email = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    IsEmailVerified = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_accounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "student_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfilePhotoUrl = table.Column<string>(type: "text", nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Gender = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    CityOrArea = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    EducationLevel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CurrentGradeOrYear = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    SchoolOrInstitutionName = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: true),
                    MediumOfEducation = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    SubjectsCsv = table.Column<string>(type: "text", nullable: false),
                    TopicsOfDifficulty = table.Column<string>(type: "character varying(1200)", maxLength: 1200, nullable: true),
                    TutoringPurpose = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    LearningGoalsOrTargetGrade = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PreferredMode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PreferredDaysCsv = table.Column<string>(type: "text", nullable: false),
                    PreferredTimeSlotsCsv = table.Column<string>(type: "text", nullable: false),
                    BudgetPerSession = table.Column<decimal>(type: "numeric", nullable: true),
                    BudgetPerMonth = table.Column<decimal>(type: "numeric", nullable: true),
                    PreferredTutorGender = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    PreferredLanguageOfInstruction = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    GuardianFullName = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: true),
                    GuardianContactNumber = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    GuardianEmailAddress = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: true),
                    GuardianRelationship = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    GuardianConsentAcknowledgment = table.Column<bool>(type: "boolean", nullable: false),
                    TermsAccepted = table.Column<bool>(type: "boolean", nullable: false),
                    PrivacyAccepted = table.Column<bool>(type: "boolean", nullable: false),
                    ProfileCompleteness = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_profiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_student_profiles_user_accounts_UserAccountId",
                        column: x => x.UserAccountId,
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tutor_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfilePhotoUrl = table.Column<string>(type: "text", nullable: false),
                    HighestDegree = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FieldOfStudy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    InstitutionName = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    GraduationYear = table.Column<int>(type: "integer", nullable: false),
                    DegreeCertificateUrl = table.Column<string>(type: "text", nullable: false),
                    SubjectsCsv = table.Column<string>(type: "text", nullable: false),
                    GradeLevelsCsv = table.Column<string>(type: "text", nullable: false),
                    YearsOfExperience = table.Column<int>(type: "integer", nullable: false),
                    LanguagesCsv = table.Column<string>(type: "text", nullable: false),
                    TeachingMode = table.Column<int>(type: "integer", nullable: false),
                    InPersonLocation = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    HourlyFee = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    MonthlyFee = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    AvailableDaysCsv = table.Column<string>(type: "text", nullable: false),
                    AvailableTimeSlotsCsv = table.Column<string>(type: "text", nullable: false),
                    Bio = table.Column<string>(type: "text", nullable: false),
                    TeachingMethodology = table.Column<string>(type: "text", nullable: false),
                    Achievements = table.Column<string>(type: "text", nullable: false),
                    GovernmentIdType = table.Column<int>(type: "integer", nullable: false),
                    GovernmentIdDocumentUrl = table.Column<string>(type: "text", nullable: false),
                    BackgroundCheckConsent = table.Column<bool>(type: "boolean", nullable: false),
                    TeachingLicensesOrCertificatesUrl = table.Column<string>(type: "text", nullable: false),
                    TermsAccepted = table.Column<bool>(type: "boolean", nullable: false),
                    PrivacyAccepted = table.Column<bool>(type: "boolean", nullable: false),
                    CommissionPolicyAccepted = table.Column<bool>(type: "boolean", nullable: false),
                    VerificationStatus = table.Column<int>(type: "integer", nullable: false),
                    VerificationNotes = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    ReviewedByAdminId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProfileCompleteness = table.Column<int>(type: "integer", nullable: false),
                    AverageRating = table.Column<double>(type: "double precision", nullable: false),
                    ReviewCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tutor_profiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tutor_profiles_user_accounts_UserAccountId",
                        column: x => x.UserAccountId,
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "learning_goals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    TargetDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_learning_goals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_learning_goals_student_profiles_StudentProfileId",
                        column: x => x.StudentProfileId,
                        principalTable: "student_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "assessment_records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    TutorProfileId = table.Column<Guid>(type: "uuid", nullable: true),
                    SubmittedByUserId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Subject = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    TopicTag = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ScoreObtained = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    TotalScore = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    StudentConfidenceLevel = table.Column<int>(type: "integer", nullable: true),
                    DateRecorded = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assessment_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_assessment_records_student_profiles_StudentProfileId",
                        column: x => x.StudentProfileId,
                        principalTable: "student_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_assessment_records_tutor_profiles_TutorProfileId",
                        column: x => x.TutorProfileId,
                        principalTable: "tutor_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "bookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TutorProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TimeSlot = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    SessionMode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Subject = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Fee = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    MeetingLink = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    StudentNotes = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    TutorNotes = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    CancellationReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CancelledBy = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_bookings_student_profiles_StudentProfileId",
                        column: x => x.StudentProfileId,
                        principalTable: "student_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bookings_tutor_profiles_TutorProfileId",
                        column: x => x.TutorProfileId,
                        principalTable: "tutor_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    TutorProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_reviews_student_profiles_StudentProfileId",
                        column: x => x.StudentProfileId,
                        principalTable: "student_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reviews_tutor_profiles_TutorProfileId",
                        column: x => x.TutorProfileId,
                        principalTable: "tutor_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tutor_verification_audits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TutorProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    AdminId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Action = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    ActionAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tutor_verification_audits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tutor_verification_audits_tutor_profiles_TutorProfileId",
                        column: x => x.TutorProfileId,
                        principalTable: "tutor_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    TransactionReference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payments_bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "session_notes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    TutorProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    TopicsCovered = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Remarks = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    AreasForImprovement = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ResourceLinksCsv = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_session_notes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_session_notes_bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_session_notes_student_profiles_StudentProfileId",
                        column: x => x.StudentProfileId,
                        principalTable: "student_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_session_notes_tutor_profiles_TutorProfileId",
                        column: x => x.TutorProfileId,
                        principalTable: "tutor_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_assessment_records_StudentProfileId",
                table: "assessment_records",
                column: "StudentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_assessment_records_TutorProfileId",
                table: "assessment_records",
                column: "TutorProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_StudentProfileId",
                table: "bookings",
                column: "StudentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TutorProfileId",
                table: "bookings",
                column: "TutorProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TutorProfileId_BookingDate_TimeSlot",
                table: "bookings",
                columns: new[] { "TutorProfileId", "BookingDate", "TimeSlot" },
                unique: true,
                filter: "\"Status\" != 3");

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_ReceiverAuthUserId",
                table: "chat_messages",
                column: "ReceiverAuthUserId");

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_SenderAuthUserId",
                table: "chat_messages",
                column: "SenderAuthUserId");

            migrationBuilder.CreateIndex(
                name: "IX_learning_goals_StudentProfileId",
                table: "learning_goals",
                column: "StudentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_IsRead",
                table: "notifications",
                column: "IsRead");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_RecipientAuthUserId",
                table: "notifications",
                column: "RecipientAuthUserId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_BookingId",
                table: "payments",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_reviews_BookingId",
                table: "reviews",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reviews_StudentProfileId",
                table: "reviews",
                column: "StudentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_reviews_TutorProfileId",
                table: "reviews",
                column: "TutorProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_session_notes_BookingId",
                table: "session_notes",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_session_notes_StudentProfileId",
                table: "session_notes",
                column: "StudentProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_session_notes_TutorProfileId",
                table: "session_notes",
                column: "TutorProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_student_profiles_UserAccountId",
                table: "student_profiles",
                column: "UserAccountId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tutor_profiles_UserAccountId",
                table: "tutor_profiles",
                column: "UserAccountId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tutor_profiles_VerificationStatus",
                table: "tutor_profiles",
                column: "VerificationStatus");

            migrationBuilder.CreateIndex(
                name: "IX_tutor_verification_audits_TutorProfileId",
                table: "tutor_verification_audits",
                column: "TutorProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_user_accounts_AuthUserId",
                table: "user_accounts",
                column: "AuthUserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_accounts_Email",
                table: "user_accounts",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "assessment_records");

            migrationBuilder.DropTable(
                name: "chat_messages");

            migrationBuilder.DropTable(
                name: "learning_goals");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "reviews");

            migrationBuilder.DropTable(
                name: "session_notes");

            migrationBuilder.DropTable(
                name: "tutor_verification_audits");

            migrationBuilder.DropTable(
                name: "bookings");

            migrationBuilder.DropTable(
                name: "student_profiles");

            migrationBuilder.DropTable(
                name: "tutor_profiles");

            migrationBuilder.DropTable(
                name: "user_accounts");
        }
    }
}
