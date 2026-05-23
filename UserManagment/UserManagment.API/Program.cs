using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using UserManagment.Infrastructure;
using UserManagment.Infrastructure.Persistence;
using UserManagment.API.Authentication;
using UserManagment.API.Middleware;
using UserManagment.Domain.Entities;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10 * 1024 * 1024;
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartHeadersLengthLimit = int.MaxValue;
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 10 * 1024 * 1024;
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddUserManagmentInfrastructure(builder.Configuration);
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<UserManagment.API.Services.IAdminCredentialVerifier, UserManagment.API.Services.AdminCredentialVerifier>();
builder.Services.AddHttpClient<UserManagment.API.Services.IAuthUserDeletionClient, UserManagment.API.Services.AuthUserDeletionClient>();
builder.Services.AddScoped<UserManagment.API.Services.IAdminPermanentUserDeletionService, UserManagment.API.Services.AdminPermanentUserDeletionService>();
builder.Services.Configure<UserManagment.API.Services.PlatformEmailOptions>(
    builder.Configuration.GetSection(UserManagment.API.Services.PlatformEmailOptions.SectionName));
builder.Services.AddSingleton<UserManagment.API.Services.IPlatformEmailService, UserManagment.API.Services.PlatformEmailService>();
builder.Services.AddScoped<UserManagment.API.Services.IWarningNotifier, UserManagment.API.Services.WarningNotifier>();
builder.Services.AddScoped<UserManagment.Application.Interfaces.IFileService, UserManagment.API.Services.LocalFileService>();
builder.Services.AddScoped<UserManagment.Application.Interfaces.IRealtimeNotifier, UserManagment.API.Services.SignalRRealtimeNotifier>();
builder.Services.AddSignalR();
builder.Services.AddSingleton<Microsoft.AspNetCore.SignalR.IUserIdProvider, UserManagment.API.Hubs.CustomUserIdProvider>();

builder.Services.AddAuthentication(HeaderAuthenticationOptions.SchemeName)
    .AddScheme<HeaderAuthenticationOptions, HeaderAuthenticationHandler>(HeaderAuthenticationOptions.SchemeName, null);

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("StudentOnly", policy => policy.RequireRole("STUDENT"));
    options.AddPolicy("TutorOrAdmin", policy => policy.RequireAssertion(context =>
        context.User.IsInRole("TUTOR") ||
        context.User.IsInRole("ADMIN") ||
        context.User.IsInRole("SUPER_ADMIN") ||
        context.User.IsInRole("OWNER")));
    options.AddPolicy("AdminOnly", policy => policy.RequireAssertion(context =>
        context.User.IsInRole("ADMIN") ||
        context.User.IsInRole("SUPER_ADMIN") ||
        context.User.IsInRole("OWNER")));
});

builder.Services.AddRateLimiter(options =>
{
    var authLimit = builder.Configuration.GetValue<int>("RateLimiting:AuthEndpointPermitLimit", 10);
    var authWindow = TimeSpan.FromMinutes(builder.Configuration.GetValue<int>("RateLimiting:AuthEndpointWindowMinutes", 1));
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, IPAddress>(httpContext =>
    {
        var path = httpContext.Request.Path;
        if (path.StartsWithSegments("/api/v1/auth") ||
            path.StartsWithSegments("/api/v1/otp") ||
            path.StartsWithSegments("/api/v1/token") ||
            path.StartsWithSegments("/api/v1/refresh"))
        {
            var remoteIp = httpContext.Connection.RemoteIpAddress ?? IPAddress.Loopback;
            return RateLimitPartition.GetFixedWindowLimiter(remoteIp, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = authLimit,
                Window = authWindow,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
                AutoReplenishment = true
            });
        }

        return RateLimitPartition.GetNoLimiter(httpContext.Connection.RemoteIpAddress ?? IPAddress.Loopback);
    });
    options.RejectionStatusCode = 429;
});

builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
        ?? new[] { "http://localhost:3000", "http://localhost:5173" };

    options.AddPolicy("frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

var enableRbacGuards = builder.Configuration.GetValue<bool>("FeatureFlags:EnableRbacGuards");
if (app.Environment.IsProduction() && !enableRbacGuards)
{
    throw new InvalidOperationException("EnableRbacGuards must be true in Production before the UserManagment.API can start.");
}

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<UserManagmentDbContext>();
    var connection = dbContext.Database.GetDbConnection();
    await connection.OpenAsync();

    try
    {
        await using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'user_accounts'
            );";

        var hasUserManagementSchema = await command.ExecuteScalarAsync() is bool exists && exists;

        if (!hasUserManagementSchema)
        {
            var createScript = dbContext.Database.GenerateCreateScript();
            await dbContext.Database.ExecuteSqlRawAsync(createScript);
        }

        await dbContext.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE student_profiles
            ADD COLUMN IF NOT EXISTS ""ProfilePhotoUrl"" text NOT NULL DEFAULT '';

            ALTER TABLE student_profiles
            ALTER COLUMN ""DateOfBirth"" DROP NOT NULL;

            UPDATE student_profiles SET ""GuardianConsentAcknowledgment"" = false WHERE ""GuardianConsentAcknowledgment"" IS NULL;
            UPDATE student_profiles SET ""TermsAccepted"" = false WHERE ""TermsAccepted"" IS NULL;
            UPDATE student_profiles SET ""PrivacyAccepted"" = false WHERE ""PrivacyAccepted"" IS NULL;

            ALTER TABLE student_profiles
            ALTER COLUMN ""GuardianConsentAcknowledgment"" SET DEFAULT false;

            ALTER TABLE student_profiles
            ALTER COLUMN ""TermsAccepted"" SET DEFAULT false;

            ALTER TABLE student_profiles
            ALTER COLUMN ""PrivacyAccepted"" SET DEFAULT false;

            ALTER TABLE student_profiles
            ALTER COLUMN ""GuardianConsentAcknowledgment"" SET NOT NULL;

            ALTER TABLE student_profiles
            ALTER COLUMN ""TermsAccepted"" SET NOT NULL;

            ALTER TABLE student_profiles
            ALTER COLUMN ""PrivacyAccepted"" SET NOT NULL;

            ALTER TABLE tutor_profiles
            ADD COLUMN IF NOT EXISTS ""ProfilePhotoUrl"" text NOT NULL DEFAULT '';

            ALTER TABLE tutor_profiles
            ADD COLUMN IF NOT EXISTS ""DegreeCertificateUrl"" text NOT NULL DEFAULT '';

            ALTER TABLE tutor_profiles
            ADD COLUMN IF NOT EXISTS ""GovernmentIdDocumentUrl"" text NOT NULL DEFAULT '';

            ALTER TABLE tutor_profiles
            ADD COLUMN IF NOT EXISTS ""TeachingLicensesOrCertificatesUrl"" text NOT NULL DEFAULT '';

            ALTER TABLE tutor_profiles
            ADD COLUMN IF NOT EXISTS ""UnavailableDatesCsv"" text NOT NULL DEFAULT '';

            CREATE TABLE IF NOT EXISTS bookings (
                ""Id"" uuid PRIMARY KEY,
                ""TutorProfileId"" uuid NOT NULL,
                ""StudentProfileId"" uuid NOT NULL,
                ""BookingDate"" timestamp with time zone NOT NULL,
                ""TimeSlot"" text NOT NULL,
                ""Status"" integer NOT NULL,
                ""SessionMode"" text NOT NULL,
                ""Subject"" text NOT NULL,
                ""Fee"" numeric(12,2) NOT NULL,
                ""MeetingLink"" text,
                ""StudentNotes"" text,
                ""TutorNotes"" text,
                ""CancellationReason"" text,
                ""CancelledBy"" varchar(20),
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL
            );

            -- Add new booking columns if they don't exist (for existing deployments)
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ""TutorNotes"" text;
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ""CancellationReason"" text;
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ""CancelledBy"" varchar(20);

            -- Unique index to prevent double bookings
            CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_prevent_double 
            ON bookings(""TutorProfileId"", ""BookingDate"", ""TimeSlot"") 
            WHERE ""Status"" != 2;

            CREATE TABLE IF NOT EXISTS chat_messages (
                ""Id"" uuid PRIMARY KEY,
                ""SenderAuthUserId"" varchar(120) NOT NULL,
                ""ReceiverAuthUserId"" varchar(120) NOT NULL,
                ""Content"" text NOT NULL,
                ""SentAtUtc"" timestamp with time zone NOT NULL,
                ""IsRead"" boolean NOT NULL DEFAULT false
            );

            CREATE TABLE IF NOT EXISTS notifications (
                ""Id"" uuid PRIMARY KEY,
                ""RecipientAuthUserId"" varchar(120) NOT NULL,
                ""Type"" integer NOT NULL,
                ""Title"" varchar(200) NOT NULL,
                ""Message"" text NOT NULL,
                ""IsRead"" boolean NOT NULL DEFAULT false,
                ""RelatedEntityId"" uuid,
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""ReadAtUtc"" timestamp with time zone
            );

            DO $notify_idx$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_auth_user_id'
                ) THEN
                    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_auth_user_id);
                    CREATE INDEX IF NOT EXISTS idx_notifications_isread ON notifications(is_read);
                ELSIF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'RecipientAuthUserId'
                ) THEN
                    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(""RecipientAuthUserId"");
                    CREATE INDEX IF NOT EXISTS idx_notifications_isread ON notifications(""IsRead"");
                END IF;
            END $notify_idx$;

            ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS ""AverageRating"" double precision NOT NULL DEFAULT 0;
            ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS ""ReviewCount"" integer NOT NULL DEFAULT 0;

            CREATE TABLE IF NOT EXISTS reviews (
                ""Id"" uuid PRIMARY KEY,
                ""StudentProfileId"" uuid NOT NULL,
                ""TutorProfileId"" uuid NOT NULL,
                ""BookingId"" uuid NOT NULL UNIQUE,
                ""Rating"" integer NOT NULL,
                ""Comment"" text NOT NULL DEFAULT '',
                ""CreatedAtUtc"" timestamp with time zone NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_reviews_tutor ON reviews(""TutorProfileId"");

            CREATE TABLE IF NOT EXISTS payments (
                ""Id"" uuid PRIMARY KEY,
                ""BookingId"" uuid NOT NULL REFERENCES bookings(""Id"") ON DELETE RESTRICT,
                ""StudentProfileId"" uuid NOT NULL,
                ""Amount"" numeric(12,2) NOT NULL,
                ""Status"" integer NOT NULL DEFAULT 0,
                ""TransactionReference"" varchar(200),
                ""FailureReason"" varchar(500),
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(""BookingId"");

            CREATE TABLE IF NOT EXISTS learning_goals (
                ""Id"" uuid PRIMARY KEY,
                ""StudentProfileId"" uuid NOT NULL,
                ""Title"" varchar(200) NOT NULL,
                ""Description"" varchar(1500),
                ""TargetDate"" timestamp with time zone,
                ""Status"" varchar(50) NOT NULL DEFAULT 'Not Started',
                ""CreatedAtUtc"" timestamp with time zone NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_learning_goals_student ON learning_goals(""StudentProfileId"");

            CREATE TABLE IF NOT EXISTS assessment_records (
                ""Id"" uuid PRIMARY KEY,
                ""StudentProfileId"" uuid NOT NULL,
                ""TutorProfileId"" uuid,
                ""SubmittedByUserId"" varchar(120) NOT NULL,
                ""Title"" varchar(200) NOT NULL,
                ""Subject"" varchar(150) NOT NULL,
                ""TopicTag"" varchar(200) NOT NULL,
                ""ScoreObtained"" numeric(12,2) NOT NULL,
                ""TotalScore"" numeric(12,2) NOT NULL,
                ""StudentConfidenceLevel"" integer,
                ""DateRecorded"" timestamp with time zone NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_assessment_records_student ON assessment_records(""StudentProfileId"");

            CREATE TABLE IF NOT EXISTS session_notes (
                ""Id"" uuid PRIMARY KEY,
                ""BookingId"" uuid NOT NULL UNIQUE REFERENCES bookings(""Id"") ON DELETE CASCADE,
                ""StudentProfileId"" uuid NOT NULL,
                ""TutorProfileId"" uuid NOT NULL,
                ""TopicsCovered"" varchar(1000) NOT NULL,
                ""Remarks"" varchar(2000) NOT NULL,
                ""AreasForImprovement"" varchar(1000),
                ""ResourceLinksCsv"" varchar(2000),
                ""CreatedAtUtc"" timestamp with time zone NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_session_notes_student ON session_notes(""StudentProfileId"");

            CREATE TABLE IF NOT EXISTS cms_pages (
                ""Id"" uuid PRIMARY KEY,
                ""Slug"" varchar(120) NOT NULL UNIQUE,
                ""Title"" varchar(200) NOT NULL,
                ""Content"" text NOT NULL,
                ""ImageUrl"" varchar(500),
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone
            );

            -- Align legacy Java pending code (0) with .NET Pending (=1)
            UPDATE tutor_profiles SET ""VerificationStatus"" = 1 WHERE ""VerificationStatus"" = 0;
            UPDATE tutor_profiles SET ""AverageRating"" = 0 WHERE ""AverageRating"" IS NULL;
            UPDATE tutor_profiles SET ""ReviewCount"" = 0 WHERE ""ReviewCount"" IS NULL;

            CREATE TABLE IF NOT EXISTS platform_catalog_items (
                id uuid PRIMARY KEY,
                category varchar(60) NOT NULL,
                value varchar(200) NOT NULL,
                label varchar(200) NOT NULL,
                sort_order integer NOT NULL DEFAULT 0,
                is_active boolean NOT NULL DEFAULT true,
                allow_custom_entry boolean NOT NULL DEFAULT false,
                created_at_utc timestamp with time zone NOT NULL,
                updated_at_utc timestamp with time zone
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_catalog_category_value
                ON platform_catalog_items(category, value);

            CREATE TABLE IF NOT EXISTS user_warnings (
                id uuid PRIMARY KEY,
                target_auth_user_id varchar(120) NOT NULL,
                target_role varchar(30) NOT NULL,
                category varchar(100) NOT NULL,
                severity varchar(30) NOT NULL,
                notes varchar(2000) NOT NULL,
                attachment_url text,
                issued_by_admin_id varchar(120) NOT NULL,
                issued_by_admin_name varchar(200) NOT NULL,
                issued_at_utc timestamp with time zone NOT NULL,
                expires_at_utc timestamp with time zone,
                is_active boolean NOT NULL DEFAULT true
            );

            CREATE TABLE IF NOT EXISTS account_restrictions (
                id uuid PRIMARY KEY,
                target_auth_user_id varchar(120) NOT NULL,
                restriction_type varchar(50) NOT NULL,
                reason varchar(1500) NOT NULL,
                issued_by_admin_id varchar(120) NOT NULL,
                starts_at_utc timestamp with time zone NOT NULL,
                expires_at_utc timestamp with time zone,
                is_active boolean NOT NULL DEFAULT true,
                created_at_utc timestamp with time zone NOT NULL,
                revoked_at_utc timestamp with time zone
            );

            CREATE TABLE IF NOT EXISTS admin_communications (
                id uuid PRIMARY KEY,
                subject varchar(200) NOT NULL,
                body varchar(5000) NOT NULL,
                audience varchar(30) NOT NULL,
                target_auth_user_id varchar(120),
                attachment_url text,
                sent_by_admin_id varchar(120) NOT NULL,
                sent_by_admin_name varchar(200) NOT NULL,
                recipient_count integer NOT NULL DEFAULT 0,
                sent_at_utc timestamp with time zone NOT NULL
            );

            ALTER TABLE user_warnings ADD COLUMN IF NOT EXISTS status integer NOT NULL DEFAULT 1;
            ALTER TABLE user_warnings ADD COLUMN IF NOT EXISTS defense_message varchar(4000);
            ALTER TABLE user_warnings ADD COLUMN IF NOT EXISTS defense_attachment_url text;
            ALTER TABLE user_warnings ADD COLUMN IF NOT EXISTS defense_submitted_at_utc timestamp with time zone;
            ALTER TABLE user_warnings ADD COLUMN IF NOT EXISTS reviewed_by_admin_id varchar(120);
            ALTER TABLE user_warnings ADD COLUMN IF NOT EXISTS reviewed_by_admin_name varchar(200);
            ALTER TABLE user_warnings ADD COLUMN IF NOT EXISTS reviewed_at_utc timestamp with time zone;
            ALTER TABLE user_warnings ADD COLUMN IF NOT EXISTS review_notes varchar(2000);
            UPDATE user_warnings SET status = 2 WHERE is_active = true AND (status IS NULL OR status = 0);

            CREATE TABLE IF NOT EXISTS admin_action_audits (
                id uuid PRIMARY KEY,
                admin_auth_user_id varchar(120) NOT NULL,
                admin_email varchar(180) NOT NULL,
                action varchar(80) NOT NULL,
                target_auth_user_id varchar(120),
                target_email varchar(180),
                target_user_account_id uuid,
                reason varchar(1500),
                created_at_utc timestamp with time zone NOT NULL
            );
            ALTER TABLE admin_action_audits ADD COLUMN IF NOT EXISTS target_email varchar(180);

            -- Batch + Enrollment + LMS tables
            CREATE TABLE IF NOT EXISTS tutor_batches (
                ""Id"" uuid PRIMARY KEY,
                ""TutorProfileId"" uuid NOT NULL REFERENCES tutor_profiles(""Id"") ON DELETE RESTRICT,
                ""Title"" varchar(200) NOT NULL,
                ""Subject"" varchar(150) NOT NULL,
                ""Description"" text,
                ""LearningObjectives"" text,
                ""DifficultyLevel"" varchar(80),
                ""StartDateUtc"" timestamp with time zone NOT NULL,
                ""EndDateUtc"" timestamp with time zone NOT NULL,
                ""DaysOfWeekCsv"" varchar(200) NOT NULL,
                ""StartTime"" time NOT NULL,
                ""EndTime"" time NOT NULL,
                ""PackageFee"" numeric(12,2) NOT NULL,
                ""MaxStudents"" integer NOT NULL DEFAULT 20,
                ""SessionMode"" integer NOT NULL DEFAULT 1,
                ""LocationOrMeetingInfo"" text,
                ""IsPublished"" boolean NOT NULL DEFAULT true,
                ""IsDeleted"" boolean NOT NULL DEFAULT false,
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL
            );

            CREATE TABLE IF NOT EXISTS batch_enrollments (
                ""Id"" uuid PRIMARY KEY,
                ""TutorBatchId"" uuid NOT NULL REFERENCES tutor_batches(""Id"") ON DELETE RESTRICT,
                ""StudentProfileId"" uuid NOT NULL REFERENCES student_profiles(""Id"") ON DELETE RESTRICT,
                ""TutorProfileId"" uuid NOT NULL REFERENCES tutor_profiles(""Id"") ON DELETE RESTRICT,
                ""Subject"" varchar(150) NOT NULL,
                ""StartDateUtc"" timestamp with time zone NOT NULL,
                ""EndDateUtc"" timestamp with time zone NOT NULL,
                ""Status"" integer NOT NULL DEFAULT 1,
                ""AmountPaid"" numeric(12,2) NOT NULL,
                ""StudentNotes"" text,
                ""CancellationReason"" text,
                ""CancelledAtUtc"" timestamp with time zone,
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_enrollment_active_student_tutor_subject
            ON batch_enrollments (""StudentProfileId"", ""TutorProfileId"", lower(""Subject""))
            WHERE ""Status"" IN (0, 1);

            CREATE TABLE IF NOT EXISTS generated_class_sessions (
                ""Id"" uuid PRIMARY KEY,
                ""TutorBatchId"" uuid NOT NULL REFERENCES tutor_batches(""Id"") ON DELETE CASCADE,
                ""TutorProfileId"" uuid NOT NULL,
                ""SessionDateUtc"" timestamp with time zone NOT NULL,
                ""StartTime"" time NOT NULL,
                ""EndTime"" time NOT NULL,
                ""TimeSlotLabel"" varchar(80) NOT NULL,
                ""Status"" integer NOT NULL DEFAULT 0,
                ""MeetingLink"" text,
                ""Location"" text,
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL
            );

            CREATE TABLE IF NOT EXISTS course_assignments (
                ""Id"" uuid PRIMARY KEY,
                ""TutorProfileId"" uuid NOT NULL REFERENCES tutor_profiles(""Id"") ON DELETE RESTRICT,
                ""TutorBatchId"" uuid REFERENCES tutor_batches(""Id"") ON DELETE SET NULL,
                ""Subject"" varchar(150) NOT NULL,
                ""Title"" varchar(200) NOT NULL,
                ""Instructions"" text NOT NULL,
                ""GradingRubric"" text,
                ""AttachmentUrlsCsv"" text,
                ""TotalMarks"" numeric(12,2) NOT NULL,
                ""DueDateUtc"" timestamp with time zone NOT NULL,
                ""Status"" integer NOT NULL DEFAULT 1,
                ""VisibilityRule"" varchar(100) NOT NULL DEFAULT 'BATCH',
                ""AllowResubmission"" boolean NOT NULL DEFAULT false,
                ""IsDeleted"" boolean NOT NULL DEFAULT false,
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL
            );

            CREATE TABLE IF NOT EXISTS assignment_submissions (
                ""Id"" uuid PRIMARY KEY,
                ""CourseAssignmentId"" uuid NOT NULL REFERENCES course_assignments(""Id"") ON DELETE CASCADE,
                ""StudentProfileId"" uuid NOT NULL REFERENCES student_profiles(""Id"") ON DELETE RESTRICT,
                ""SubmissionText"" text,
                ""FileUrlsCsv"" text,
                ""Status"" integer NOT NULL DEFAULT 0,
                ""MarksObtained"" numeric(12,2),
                ""GradeLetter"" varchar(10),
                ""Percentage"" numeric(5,2),
                ""TutorFeedback"" text,
                ""ReviewedFileUrlsCsv"" text,
                ""SubmittedAtUtc"" timestamp with time zone,
                ""GradedAtUtc"" timestamp with time zone,
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL,
                UNIQUE (""CourseAssignmentId"", ""StudentProfileId"")
            );

            CREATE TABLE IF NOT EXISTS session_attendance (
                ""Id"" uuid PRIMARY KEY,
                ""GeneratedClassSessionId"" uuid NOT NULL REFERENCES generated_class_sessions(""Id"") ON DELETE CASCADE,
                ""StudentProfileId"" uuid NOT NULL REFERENCES student_profiles(""Id"") ON DELETE RESTRICT,
                ""BatchEnrollmentId"" uuid NOT NULL REFERENCES batch_enrollments(""Id"") ON DELETE RESTRICT,
                ""IsPresent"" boolean NOT NULL DEFAULT false,
                ""Notes"" text,
                ""RecordedAtUtc"" timestamp with time zone NOT NULL,
                UNIQUE (""GeneratedClassSessionId"", ""StudentProfileId"")
            );

            ALTER TABLE learning_goals ADD COLUMN IF NOT EXISTS ""TutorProfileId"" uuid;
            ALTER TABLE learning_goals ADD COLUMN IF NOT EXISTS ""TutorBatchId"" uuid;
            ALTER TABLE learning_goals ADD COLUMN IF NOT EXISTS ""Priority"" varchar(30) DEFAULT 'Medium';
            ALTER TABLE learning_goals ADD COLUMN IF NOT EXISTS ""CompletionPercent"" integer NOT NULL DEFAULT 0;
            ALTER TABLE learning_goals ADD COLUMN IF NOT EXISTS ""Remarks"" varchar(1500);
            ALTER TABLE learning_goals ADD COLUMN IF NOT EXISTS ""AttachmentUrlsCsv"" text;
            ALTER TABLE learning_goals ADD COLUMN IF NOT EXISTS ""UpdatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW();

            ALTER TABLE tutor_batches ADD COLUMN IF NOT EXISTS ""LifecycleStatus"" integer NOT NULL DEFAULT 0;
            ALTER TABLE tutor_batches ADD COLUMN IF NOT EXISTS ""Visibility"" varchar(30) NOT NULL DEFAULT 'PUBLIC';
            ALTER TABLE tutor_batches ADD COLUMN IF NOT EXISTS ""AssignmentRules"" text;
            ALTER TABLE tutor_batches ADD COLUMN IF NOT EXISTS ""InPersonAddress"" text;
            ALTER TABLE tutor_batches ADD COLUMN IF NOT EXISTS ""InPersonBuildingDetails"" text;
            ALTER TABLE tutor_batches ADD COLUMN IF NOT EXISTS ""LocationNotes"" text;
            ALTER TABLE tutor_batches ADD COLUMN IF NOT EXISTS ""OnlineMeetingInstructions"" text;

            ALTER TABLE course_assignments ADD COLUMN IF NOT EXISTS ""AllowLateSubmission"" boolean NOT NULL DEFAULT false;
            ALTER TABLE course_assignments ADD COLUMN IF NOT EXISTS ""PublishedAtUtc"" timestamp with time zone;

            ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS ""ResubmissionCount"" integer NOT NULL DEFAULT 0;

            CREATE TABLE IF NOT EXISTS study_materials (
                ""Id"" uuid PRIMARY KEY,
                ""TutorProfileId"" uuid NOT NULL REFERENCES tutor_profiles(""Id"") ON DELETE RESTRICT,
                ""TutorBatchId"" uuid REFERENCES tutor_batches(""Id"") ON DELETE SET NULL,
                ""Subject"" varchar(150) NOT NULL,
                ""Title"" varchar(200) NOT NULL,
                ""Description"" text,
                ""Topic"" varchar(150),
                ""Module"" varchar(150),
                ""Chapter"" varchar(150),
                ""TagsCsv"" varchar(500),
                ""FileUrlsCsv"" text NOT NULL,
                ""IsDeleted"" boolean NOT NULL DEFAULT false,
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL
            );

            ALTER TABLE batch_enrollments ADD COLUMN IF NOT EXISTS ""PlanMonths"" integer NOT NULL DEFAULT 1;
            ALTER TABLE batch_enrollments ADD COLUMN IF NOT EXISTS ""MonthlyFeeAmount"" numeric(12,2) NOT NULL DEFAULT 0;
            ALTER TABLE batch_enrollments ADD COLUMN IF NOT EXISTS ""WithdrawalRequestedAtUtc"" timestamp with time zone;
            ALTER TABLE batch_enrollments ADD COLUMN IF NOT EXISTS ""EffectiveEndDateUtc"" timestamp with time zone;
            ALTER TABLE batch_enrollments ADD COLUMN IF NOT EXISTS ""WithdrawalReason"" text;
            ALTER TABLE batch_enrollments ADD COLUMN IF NOT EXISTS ""CompletionDateUtc"" timestamp with time zone;

            UPDATE batch_enrollments
            SET ""CompletionDateUtc"" = COALESCE(""WithdrawalRequestedAtUtc"", ""EffectiveEndDateUtc"", ""EndDateUtc"")
            WHERE ""Status"" = 5 AND ""CompletionDateUtc"" IS NULL;

            UPDATE tutor_profiles tp
            SET ""ReviewCount"" = COALESCE(sub.cnt, 0),
                ""AverageRating"" = COALESCE(sub.avg, 0)
            FROM (
                SELECT ""TutorProfileId"",
                       COUNT(*)::int AS cnt,
                       ROUND(AVG(""Rating"")::numeric, 1) AS avg
                FROM reviews
                GROUP BY ""TutorProfileId""
            ) sub
            WHERE tp.""Id"" = sub.""TutorProfileId"";

            UPDATE tutor_profiles SET ""ReviewCount"" = 0, ""AverageRating"" = 0
            WHERE ""Id"" NOT IN (SELECT DISTINCT ""TutorProfileId"" FROM reviews);

            CREATE TABLE IF NOT EXISTS enrollment_billing_periods (
                ""Id"" uuid PRIMARY KEY,
                ""BatchEnrollmentId"" uuid NOT NULL REFERENCES batch_enrollments(""Id"") ON DELETE CASCADE,
                ""PeriodIndex"" integer NOT NULL,
                ""PeriodStartUtc"" timestamp with time zone NOT NULL,
                ""PeriodEndUtc"" timestamp with time zone NOT NULL,
                ""GraceEndsUtc"" timestamp with time zone NOT NULL,
                ""FeeAmount"" numeric(12,2) NOT NULL,
                ""Status"" integer NOT NULL DEFAULT 0,
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL,
                UNIQUE (""BatchEnrollmentId"", ""PeriodIndex"")
            );

            ALTER TABLE reviews ALTER COLUMN ""BookingId"" DROP NOT NULL;
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ""BatchEnrollmentId"" uuid REFERENCES batch_enrollments(""Id"") ON DELETE RESTRICT;
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ""ReviewType"" integer NOT NULL DEFAULT 0;
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ""Sentiment"" varchar(20);
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ""SentimentConfidence"" numeric(5,4);
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ""ReviewWindowExpiresAtUtc"" timestamp with time zone;

            CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_batch_enrollment
            ON reviews (""BatchEnrollmentId"") WHERE ""BatchEnrollmentId"" IS NOT NULL;
        ");

        await SeedPlatformCatalogAsync(dbContext);
        await SeedPrivacyPolicyAsync(dbContext);

    }
    finally
    {
        await connection.CloseAsync();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("frontend");
app.UseStaticFiles();

app.UseRateLimiter();
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseMiddleware<GatewayTrustMiddleware>();
app.UseMiddleware<GatewayIdentityMiddleware>();
app.UseMiddleware<AccountRestrictionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<ForbiddenAuditMiddleware>();
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "UserManagment.API" }));

if (enableRbacGuards)
{
    app.UseMiddleware<TutorStatusMiddleware>();
}

app.MapControllers();
app.MapHub<UserManagment.API.Hubs.ChatHub>("/chatHub");

static async Task SeedPlatformCatalogAsync(UserManagmentDbContext dbContext)
{
    if (await dbContext.PlatformCatalogItems.AnyAsync())
    {
        return;
    }

    var now = DateTime.UtcNow;
    var items = new List<PlatformCatalogItem>();
    var order = 0;

    void AddCategory(string category, IEnumerable<string> values, bool allowCustom = true)
    {
        foreach (var value in values)
        {
            items.Add(new PlatformCatalogItem
            {
                Id = Guid.NewGuid(),
                Category = category,
                Value = value,
                Label = value,
                SortOrder = order++,
                IsActive = true,
                AllowCustomEntry = allowCustom,
                CreatedAtUtc = now
            });
        }
        order = 0;
    }

    AddCategory("subject", new[]
    {
        "Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science",
        "Urdu", "Islamiat", "Pakistan Studies", "Accounting", "Economics", "General Science", "History"
    });
    AddCategory("language", new[] { "English", "Urdu", "Punjabi", "Sindhi", "Pashto", "Arabic", "Hindi", "Other" });
    AddCategory("grade_level", new[]
    {
        "Primary (1-5)", "Middle School (6-8)", "Matric / O-Level", "Intermediate / A-Level", "University / Bachelors", "Masters / Professional"
    });
    AddCategory("time_slot", new[]
    {
        "08:00 AM - 09:00 AM", "09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM",
        "12:00 PM - 01:00 PM", "01:00 PM - 02:00 PM", "02:00 PM - 03:00 PM", "03:00 PM - 04:00 PM",
        "04:00 PM - 05:00 PM", "05:00 PM - 06:00 PM", "06:00 PM - 07:00 PM", "07:00 PM - 08:00 PM", "08:00 PM - 09:00 PM"
    }, false);
    AddCategory("interest", new[] { "Exam Prep", "Homework Help", "Concept Clarity", "Career Guidance", "Language Fluency" });
    AddCategory("skill", new[] { "Problem Solving", "Critical Thinking", "Communication", "Test Strategy", "Research Writing" });
    AddCategory("day_of_week", new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" }, false);

    dbContext.PlatformCatalogItems.AddRange(items);
    await dbContext.SaveChangesAsync();
}

static async Task SeedPrivacyPolicyAsync(UserManagmentDbContext dbContext)
{
    const string slug = "privacy-policy";
    var existing = await dbContext.CmsPages.FirstOrDefaultAsync(p => p.Slug == slug);
    var now = DateTime.UtcNow;
    var content = """
        <h1>Privacy Policy</h1>
        <p><em>Last updated: May 2026</em></p>

        <h2>Reviews and ratings</h2>
        <p>Only students who completed an enrolled course (or whose package naturally expired after the full term) may submit one review per enrollment within <strong>10 calendar days</strong> of completion. Reviews include a star rating (1–5) and optional comment. Approved reviews may appear on tutor public profiles.</p>

        <h2>Ratings and recommendations</h2>
        <p>Personalized tutor recommendations combine four signals: your <strong>subject interests</strong> (profile and activity), <strong>bookings</strong> (1:1 sessions), <strong>reviews and star ratings</strong> (including course reviews), and <strong>course enrollments</strong> (packages/batches). Anonymized review text may be used to improve matching and sentiment models.</p>

        <h2>Course packages and billing periods</h2>
        <p>Package enrollments are split into monthly billing periods anchored to your enrollment start date (e.g. enroll on the 15th → periods run 15th–14th each month). Phase 1 records periods as <em>Paid</em>, <em>Owed</em>, or <em>Waived</em> on a ledger for transparency only—no payment gateway charges or refunds are processed in the app yet.</p>

        <h2>Early withdrawal (5-day grace)</h2>
        <p>At the start of each new billing period you have <strong>5 calendar days</strong> to request early leave without owing that period’s fee. Example: 3-month package starting 15 May — if you leave on 18 July (period started 15 July, grace until 20 July), the August-period fee is waived; if you leave on 25 July, that period is recorded as owed on your ledger (display only).</p>

        <h2>Course completion</h2>
        <p>A course is <strong>Completed</strong> when you finish the scheduled term, your tutor confirms completion, or the system auto-completes after the end date when at least 80% of billing periods are settled. <strong>Withdrawn</strong> applies when you confirm early leave under the grace rules above (withdrawal notes required; amounts calculated from the grace policy).</p>
        <p>After <strong>Completed</strong>, <strong>Expired</strong>, or <strong>Withdrawn</strong>, you may leave a course review within <strong>10 days</strong>. Reviews are analyzed for sentiment and used in tutor recommendations together with your profile interests, bookings, and enrollments.</p>

        <h2>Data retention</h2>
        <p>We retain reviews, billing period records, completion dates, and sentiment analysis results as needed to operate the platform, support disputes, and improve services. Contact support to request account-related data actions where applicable by law.</p>
        """;

    if (existing is null)
    {
        dbContext.CmsPages.Add(new CmsPage
        {
            Id = Guid.NewGuid(),
            Slug = slug,
            Title = "Privacy Policy",
            Content = content,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        });
    }
    else if (existing.Content.Length < 200)
    {
        existing.Content = content;
        existing.Title = "Privacy Policy";
        existing.UpdatedAtUtc = now;
    }

    await dbContext.SaveChangesAsync();
}

app.Run();

