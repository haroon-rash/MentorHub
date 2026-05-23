using Microsoft.EntityFrameworkCore;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Infrastructure.Persistence;

public class UserManagmentDbContext : DbContext
{
    public UserManagmentDbContext(DbContextOptions<UserManagmentDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();
    public DbSet<TutorProfile> TutorProfiles => Set<TutorProfile>();
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<TutorVerificationAudit> TutorVerificationAudits => Set<TutorVerificationAudit>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<LearningGoal> LearningGoals => Set<LearningGoal>();
    public DbSet<AssessmentRecord> AssessmentRecords => Set<AssessmentRecord>();
    public DbSet<SessionNote> SessionNotes => Set<SessionNote>();
    public DbSet<CmsPage> CmsPages => Set<CmsPage>();
    public DbSet<BlockedUser> BlockedUsers => Set<BlockedUser>();
    public DbSet<PlatformCatalogItem> PlatformCatalogItems => Set<PlatformCatalogItem>();
    public DbSet<UserWarning> UserWarnings => Set<UserWarning>();
    public DbSet<AccountRestriction> AccountRestrictions => Set<AccountRestriction>();
    public DbSet<AdminCommunication> AdminCommunications => Set<AdminCommunication>();
    public DbSet<AdminActionAudit> AdminActionAudits => Set<AdminActionAudit>();
    public DbSet<TutorBatch> TutorBatches => Set<TutorBatch>();
    public DbSet<BatchEnrollment> BatchEnrollments => Set<BatchEnrollment>();
    public DbSet<GeneratedClassSession> GeneratedClassSessions => Set<GeneratedClassSession>();
    public DbSet<CourseAssignment> CourseAssignments => Set<CourseAssignment>();
    public DbSet<StudyMaterial> StudyMaterials => Set<StudyMaterial>();
    public DbSet<AssignmentSubmission> AssignmentSubmissions => Set<AssignmentSubmission>();
    public DbSet<SessionAttendance> SessionAttendances => Set<SessionAttendance>();
    public DbSet<EnrollmentBillingPeriod> EnrollmentBillingPeriods => Set<EnrollmentBillingPeriod>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserAccount>(builder =>
        {
            builder.ToTable("user_accounts");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Id).HasColumnName("id");
            builder.Property(entity => entity.AuthUserId).HasColumnName("auth_user_id").HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.FullName).HasColumnName("full_name").HasMaxLength(180).IsRequired();
            builder.Property(entity => entity.Email).HasColumnName("email").HasMaxLength(180).IsRequired();
            builder.Property(entity => entity.PhoneNumber).HasColumnName("phone_number").HasMaxLength(40);
            builder.Property(entity => entity.Role).HasColumnName("role");
            builder.Property(entity => entity.IsEmailVerified).HasColumnName("is_email_verified");
            builder.Property(entity => entity.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.HasIndex(entity => entity.AuthUserId).IsUnique();
            builder.HasIndex(entity => entity.Email).IsUnique();
        });

        modelBuilder.Entity<TutorProfile>(builder =>
        {
            builder.ToTable("tutor_profiles");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.VerificationStatus)
                .HasConversion(
                    status => (int)status,
                    value => value == 0 ? TutorVerificationStatus.Pending : (TutorVerificationStatus)value);
            builder.Property(entity => entity.AverageRating).IsRequired(false);
            builder.Property(entity => entity.HighestDegree).HasMaxLength(200);
            builder.Property(entity => entity.FieldOfStudy).HasMaxLength(200);
            builder.Property(entity => entity.InstitutionName).HasMaxLength(240);
            builder.Property(entity => entity.InPersonLocation).HasMaxLength(240);
            builder.Property(entity => entity.VerificationNotes).HasMaxLength(1500);
            builder.Property(entity => entity.ReviewedByAdminId).HasMaxLength(120);
            builder.Property(entity => entity.HourlyFee).HasPrecision(12, 2);
            builder.Property(entity => entity.MonthlyFee).HasPrecision(12, 2);
            builder.HasIndex(entity => entity.VerificationStatus);

            builder.HasOne(entity => entity.UserAccount)
                .WithOne(entity => entity.TutorProfile)
                .HasForeignKey<TutorProfile>(entity => entity.UserAccountId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TutorVerificationAudit>(builder =>
        {
            builder.ToTable("tutor_verification_audits");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.AdminId).HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.Action).HasMaxLength(30).IsRequired();
            builder.Property(entity => entity.Notes).HasMaxLength(1500);
            builder.HasIndex(entity => entity.TutorProfileId);

            builder.HasOne(entity => entity.TutorProfile)
                .WithMany()
                .HasForeignKey(entity => entity.TutorProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StudentProfile>(builder =>
        {
            builder.ToTable("student_profiles");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Gender).HasMaxLength(40);
            builder.Property(entity => entity.CityOrArea).HasMaxLength(160).IsRequired();
            builder.Property(entity => entity.EducationLevel).HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.CurrentGradeOrYear).HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.SchoolOrInstitutionName).HasMaxLength(240);
            builder.Property(entity => entity.MediumOfEducation).HasMaxLength(60).IsRequired();
            builder.Property(entity => entity.TutoringPurpose).HasMaxLength(500).IsRequired();
            builder.Property(entity => entity.LearningGoalsOrTargetGrade).HasMaxLength(500);
            builder.Property(entity => entity.TopicsOfDifficulty).HasMaxLength(1200);
            builder.Property(entity => entity.PreferredMode).HasMaxLength(50).IsRequired();
            builder.Property(entity => entity.PreferredTutorGender).HasMaxLength(40);
            builder.Property(entity => entity.PreferredLanguageOfInstruction).HasMaxLength(80).IsRequired();
            builder.Property(entity => entity.GuardianFullName).HasMaxLength(180);
            builder.Property(entity => entity.GuardianContactNumber).HasMaxLength(40);
            builder.Property(entity => entity.GuardianEmailAddress).HasMaxLength(180);
            builder.Property(entity => entity.GuardianRelationship).HasMaxLength(100);
            builder.HasIndex(entity => entity.UserAccountId).IsUnique();

            builder.HasOne(entity => entity.UserAccount)
                .WithOne(entity => entity.StudentProfile)
                .HasForeignKey<StudentProfile>(entity => entity.UserAccountId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Booking>(builder =>
        {
            builder.ToTable("bookings");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.TimeSlot).HasMaxLength(50).IsRequired();
            builder.Property(entity => entity.SessionMode).HasMaxLength(50).IsRequired();
            builder.Property(entity => entity.Subject).HasMaxLength(150).IsRequired();
            builder.Property(entity => entity.MeetingLink).HasMaxLength(500);
            builder.Property(entity => entity.StudentNotes).HasMaxLength(1500);
            builder.Property(entity => entity.TutorNotes).HasMaxLength(1500);
            builder.Property(entity => entity.CancellationReason).HasMaxLength(500);
            builder.Property(entity => entity.CancelledBy).HasMaxLength(20);
            builder.Property(entity => entity.Fee).HasPrecision(12, 2);

            builder.HasIndex(entity => entity.TutorProfileId);
            builder.HasIndex(entity => entity.StudentProfileId);

            // Prevent double-booking: A tutor can only have one non-cancelled booking for a specific date and timeslot.
            builder.HasIndex(entity => new { entity.TutorProfileId, entity.BookingDate, entity.TimeSlot })
                .IsUnique()
                .HasFilter("\"Status\" != 2"); // 2 = Cancelled in BookingStatus enum

            builder.HasOne(entity => entity.TutorProfile)
                .WithMany()
                .HasForeignKey(entity => entity.TutorProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(entity => entity.StudentProfile)
                .WithMany()
                .HasForeignKey(entity => entity.StudentProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ChatMessage>(builder =>
        {
            builder.ToTable("chat_messages");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.SenderAuthUserId).HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.ReceiverAuthUserId).HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.Content).HasMaxLength(2000).IsRequired();
            builder.HasIndex(entity => entity.SenderAuthUserId);
            builder.HasIndex(entity => entity.ReceiverAuthUserId);
        });

        modelBuilder.Entity<Notification>(builder =>
        {
            builder.ToTable("notifications");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Id).HasColumnName("id");
            builder.Property(entity => entity.RecipientAuthUserId).HasColumnName("recipient_auth_user_id").HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.Type).HasColumnName("notification_type");
            builder.Property(entity => entity.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.Message).HasColumnName("message").HasMaxLength(2000).IsRequired();
            builder.Property(entity => entity.IsRead).HasColumnName("is_read");
            builder.Property(entity => entity.RelatedEntityId).HasColumnName("related_entity_id");
            builder.Property(entity => entity.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(entity => entity.ReadAtUtc).HasColumnName("read_at_utc");
            builder.HasIndex(entity => entity.RecipientAuthUserId);
            builder.HasIndex(entity => entity.IsRead);
        });

        modelBuilder.Entity<Review>(builder =>
        {
            builder.ToTable("reviews");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Comment).HasMaxLength(2000);
            builder.HasIndex(entity => entity.TutorProfileId);
            builder.HasIndex(entity => entity.BookingId).IsUnique(); // one review per booking

            builder.HasOne(entity => entity.StudentProfile)
                .WithMany()
                .HasForeignKey(entity => entity.StudentProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(entity => entity.TutorProfile)
                .WithMany()
                .HasForeignKey(entity => entity.TutorProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Payment>(builder =>
        {
            builder.ToTable("payments");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Amount).HasPrecision(12, 2);
            builder.Property(entity => entity.TransactionReference).HasMaxLength(200);
            builder.Property(entity => entity.FailureReason).HasMaxLength(500);
            builder.HasIndex(entity => entity.BookingId);

            builder.HasOne(entity => entity.Booking)
                .WithMany()
                .HasForeignKey(entity => entity.BookingId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LearningGoal>(builder =>
        {
            builder.ToTable("learning_goals");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Title).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.Description).HasMaxLength(1500);
            builder.Property(entity => entity.Status).HasMaxLength(50).IsRequired();
            builder.Property(entity => entity.Priority).HasMaxLength(30);
            builder.Property(entity => entity.Remarks).HasMaxLength(1500);
            builder.Property(entity => entity.AttachmentUrlsCsv).HasMaxLength(2000);
            builder.HasIndex(entity => entity.StudentProfileId);
            builder.HasIndex(entity => entity.TutorProfileId);

            builder.HasOne(entity => entity.StudentProfile)
                .WithMany()
                .HasForeignKey(entity => entity.StudentProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TutorBatch>(builder =>
        {
            builder.ToTable("tutor_batches");
            builder.HasKey(e => e.Id);
            builder.Property(e => e.Title).HasMaxLength(200).IsRequired();
            builder.Property(e => e.Subject).HasMaxLength(150).IsRequired();
            builder.Property(e => e.DaysOfWeekCsv).HasMaxLength(200).IsRequired();
            builder.Property(e => e.PackageFee).HasPrecision(12, 2);
            builder.HasIndex(e => e.TutorProfileId);
            builder.HasIndex(e => new { e.TutorProfileId, e.Subject });

            builder.HasOne(e => e.TutorProfile)
                .WithMany()
                .HasForeignKey(e => e.TutorProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BatchEnrollment>(builder =>
        {
            builder.ToTable("batch_enrollments");
            builder.HasKey(e => e.Id);
            builder.Property(e => e.Subject).HasMaxLength(150).IsRequired();
            builder.Property(e => e.AmountPaid).HasPrecision(12, 2);
            builder.Property(e => e.MonthlyFeeAmount).HasPrecision(12, 2);
            builder.Property(e => e.WithdrawalReason).HasMaxLength(2000);
            builder.HasIndex(e => e.StudentProfileId);
            builder.HasIndex(e => e.TutorProfileId);
            builder.HasIndex(e => e.TutorBatchId);
            builder.HasIndex(e => new { e.StudentProfileId, e.TutorProfileId, e.Subject });

            builder.HasOne(e => e.TutorBatch).WithMany(b => b.Enrollments).HasForeignKey(e => e.TutorBatchId);
            builder.HasOne(e => e.StudentProfile).WithMany().HasForeignKey(e => e.StudentProfileId).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(e => e.TutorProfile).WithMany().HasForeignKey(e => e.TutorProfileId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EnrollmentBillingPeriod>(builder =>
        {
            builder.ToTable("enrollment_billing_periods");
            builder.HasKey(e => e.Id);
            builder.Property(e => e.FeeAmount).HasPrecision(12, 2);
            builder.HasIndex(e => e.BatchEnrollmentId);
            builder.HasIndex(e => new { e.BatchEnrollmentId, e.PeriodIndex }).IsUnique();

            builder.HasOne(e => e.BatchEnrollment)
                .WithMany(en => en.BillingPeriods)
                .HasForeignKey(e => e.BatchEnrollmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GeneratedClassSession>(builder =>
        {
            builder.ToTable("generated_class_sessions");
            builder.HasKey(e => e.Id);
            builder.Property(e => e.TimeSlotLabel).HasMaxLength(80).IsRequired();
            builder.HasIndex(e => new { e.TutorBatchId, e.SessionDateUtc });

            builder.HasOne(e => e.TutorBatch).WithMany(b => b.ClassSessions).HasForeignKey(e => e.TutorBatchId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CourseAssignment>(builder =>
        {
            builder.ToTable("course_assignments");
            builder.HasKey(e => e.Id);
            builder.Property(e => e.Title).HasMaxLength(200).IsRequired();
            builder.Property(e => e.Subject).HasMaxLength(150).IsRequired();
            builder.Property(e => e.TotalMarks).HasPrecision(12, 2);
            builder.HasIndex(e => e.TutorProfileId);

            builder.HasOne(e => e.TutorProfile).WithMany().HasForeignKey(e => e.TutorProfileId).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(e => e.TutorBatch).WithMany().HasForeignKey(e => e.TutorBatchId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<StudyMaterial>(builder =>
        {
            builder.ToTable("study_materials");
            builder.HasKey(e => e.Id);
            builder.Property(e => e.Subject).HasMaxLength(150).IsRequired();
            builder.Property(e => e.Title).HasMaxLength(200).IsRequired();
            builder.HasIndex(e => e.TutorProfileId);
            builder.HasIndex(e => e.TutorBatchId);

            builder.HasOne(e => e.TutorProfile).WithMany().HasForeignKey(e => e.TutorProfileId).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(e => e.TutorBatch).WithMany().HasForeignKey(e => e.TutorBatchId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AssignmentSubmission>(builder =>
        {
            builder.ToTable("assignment_submissions");
            builder.HasKey(e => e.Id);
            builder.Property(e => e.GradeLetter).HasMaxLength(10);
            builder.Property(e => e.Percentage).HasPrecision(5, 2);
            builder.Property(e => e.MarksObtained).HasPrecision(12, 2);
            builder.HasIndex(e => new { e.CourseAssignmentId, e.StudentProfileId }).IsUnique();

            builder.HasOne(e => e.CourseAssignment).WithMany(a => a.Submissions).HasForeignKey(e => e.CourseAssignmentId).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(e => e.StudentProfile).WithMany().HasForeignKey(e => e.StudentProfileId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SessionAttendance>(builder =>
        {
            builder.ToTable("session_attendance");
            builder.HasKey(e => e.Id);
            builder.HasIndex(e => new { e.GeneratedClassSessionId, e.StudentProfileId }).IsUnique();

            builder.HasOne(e => e.ClassSession).WithMany().HasForeignKey(e => e.GeneratedClassSessionId).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(e => e.Enrollment).WithMany().HasForeignKey(e => e.BatchEnrollmentId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AssessmentRecord>(builder =>
        {
            builder.ToTable("assessment_records");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.SubmittedByUserId).HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.Title).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.Subject).HasMaxLength(150).IsRequired();
            builder.Property(entity => entity.TopicTag).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.ScoreObtained).HasPrecision(12, 2);
            builder.Property(entity => entity.TotalScore).HasPrecision(12, 2);
            builder.HasIndex(entity => entity.StudentProfileId);

            builder.HasOne(entity => entity.StudentProfile)
                .WithMany()
                .HasForeignKey(entity => entity.StudentProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(entity => entity.TutorProfile)
                .WithMany()
                .HasForeignKey(entity => entity.TutorProfileId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SessionNote>(builder =>
        {
            builder.ToTable("session_notes");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.TopicsCovered).HasMaxLength(1000).IsRequired();
            builder.Property(entity => entity.Remarks).HasMaxLength(2000).IsRequired();
            builder.Property(entity => entity.AreasForImprovement).HasMaxLength(1000);
            builder.Property(entity => entity.ResourceLinksCsv).HasMaxLength(2000);
            builder.HasIndex(entity => entity.BookingId).IsUnique(); // One note per booking

            builder.HasOne(entity => entity.Booking)
                .WithOne()
                .HasForeignKey<SessionNote>(entity => entity.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(entity => entity.StudentProfile)
                .WithMany()
                .HasForeignKey(entity => entity.StudentProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(entity => entity.TutorProfile)
                .WithMany()
                .HasForeignKey(entity => entity.TutorProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CmsPage>(builder =>
        {
            builder.ToTable("cms_pages");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Slug).HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.Title).HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.Content).IsRequired();
            builder.Property(entity => entity.ImageUrl).HasMaxLength(500);
            builder.HasIndex(entity => entity.Slug).IsUnique();
        });

        modelBuilder.Entity<PlatformCatalogItem>(builder =>
        {
            builder.ToTable("platform_catalog_items");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Id).HasColumnName("id");
            builder.Property(entity => entity.Category).HasColumnName("category").HasMaxLength(60).IsRequired();
            builder.Property(entity => entity.Value).HasColumnName("value").HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.Label).HasColumnName("label").HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.SortOrder).HasColumnName("sort_order");
            builder.Property(entity => entity.IsActive).HasColumnName("is_active");
            builder.Property(entity => entity.AllowCustomEntry).HasColumnName("allow_custom_entry");
            builder.Property(entity => entity.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(entity => entity.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.HasIndex(entity => new { entity.Category, entity.Value }).IsUnique();
        });

        modelBuilder.Entity<UserWarning>(builder =>
        {
            builder.ToTable("user_warnings");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Id).HasColumnName("id");
            builder.Property(entity => entity.TargetAuthUserId).HasColumnName("target_auth_user_id").HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.TargetRole).HasColumnName("target_role").HasMaxLength(30).IsRequired();
            builder.Property(entity => entity.Category).HasColumnName("category").HasMaxLength(100).IsRequired();
            builder.Property(entity => entity.Severity).HasColumnName("severity").HasMaxLength(30).IsRequired();
            builder.Property(entity => entity.Notes).HasColumnName("notes").HasMaxLength(2000);
            builder.Property(entity => entity.AttachmentUrl).HasColumnName("attachment_url");
            builder.Property(entity => entity.IssuedByAdminId).HasColumnName("issued_by_admin_id").HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.IssuedByAdminName).HasColumnName("issued_by_admin_name").HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.IssuedAtUtc).HasColumnName("issued_at_utc");
            builder.Property(entity => entity.ExpiresAtUtc).HasColumnName("expires_at_utc");
            builder.Property(entity => entity.IsActive).HasColumnName("is_active");
            builder.Property(entity => entity.Status).HasColumnName("status");
            builder.Property(entity => entity.DefenseMessage).HasColumnName("defense_message").HasMaxLength(4000);
            builder.Property(entity => entity.DefenseAttachmentUrl).HasColumnName("defense_attachment_url");
            builder.Property(entity => entity.DefenseSubmittedAtUtc).HasColumnName("defense_submitted_at_utc");
            builder.Property(entity => entity.ReviewedByAdminId).HasColumnName("reviewed_by_admin_id").HasMaxLength(120);
            builder.Property(entity => entity.ReviewedByAdminName).HasColumnName("reviewed_by_admin_name").HasMaxLength(200);
            builder.Property(entity => entity.ReviewedAtUtc).HasColumnName("reviewed_at_utc");
            builder.Property(entity => entity.ReviewNotes).HasColumnName("review_notes").HasMaxLength(2000);
            builder.HasIndex(entity => entity.TargetAuthUserId);
            builder.HasIndex(entity => entity.Status);
        });

        modelBuilder.Entity<AccountRestriction>(builder =>
        {
            builder.ToTable("account_restrictions");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Id).HasColumnName("id");
            builder.Property(entity => entity.TargetAuthUserId).HasColumnName("target_auth_user_id").HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.RestrictionType).HasColumnName("restriction_type").HasMaxLength(50).IsRequired();
            builder.Property(entity => entity.Reason).HasColumnName("reason").HasMaxLength(1500);
            builder.Property(entity => entity.IssuedByAdminId).HasColumnName("issued_by_admin_id").HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.StartsAtUtc).HasColumnName("starts_at_utc");
            builder.Property(entity => entity.ExpiresAtUtc).HasColumnName("expires_at_utc");
            builder.Property(entity => entity.IsActive).HasColumnName("is_active");
            builder.Property(entity => entity.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(entity => entity.RevokedAtUtc).HasColumnName("revoked_at_utc");
            builder.HasIndex(entity => entity.TargetAuthUserId);
        });

        modelBuilder.Entity<AdminActionAudit>(builder =>
        {
            builder.ToTable("admin_action_audits");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Id).HasColumnName("id");
            builder.Property(entity => entity.AdminAuthUserId).HasColumnName("admin_auth_user_id").HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.AdminEmail).HasColumnName("admin_email").HasMaxLength(180).IsRequired();
            builder.Property(entity => entity.Action).HasColumnName("action").HasMaxLength(80).IsRequired();
            builder.Property(entity => entity.TargetAuthUserId).HasColumnName("target_auth_user_id").HasMaxLength(120);
            builder.Property(entity => entity.TargetEmail).HasColumnName("target_email").HasMaxLength(180);
            builder.Property(entity => entity.TargetUserAccountId).HasColumnName("target_user_account_id");
            builder.Property(entity => entity.Reason).HasColumnName("reason").HasMaxLength(1500);
            builder.Property(entity => entity.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.HasIndex(entity => entity.CreatedAtUtc);
        });

        modelBuilder.Entity<AdminCommunication>(builder =>
        {
            builder.ToTable("admin_communications");
            builder.HasKey(entity => entity.Id);
            builder.Property(entity => entity.Id).HasColumnName("id");
            builder.Property(entity => entity.Subject).HasColumnName("subject").HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.Body).HasColumnName("body").HasMaxLength(5000).IsRequired();
            builder.Property(entity => entity.Audience).HasColumnName("audience").HasMaxLength(30).IsRequired();
            builder.Property(entity => entity.TargetAuthUserId).HasColumnName("target_auth_user_id").HasMaxLength(120);
            builder.Property(entity => entity.AttachmentUrl).HasColumnName("attachment_url");
            builder.Property(entity => entity.SentByAdminId).HasColumnName("sent_by_admin_id").HasMaxLength(120).IsRequired();
            builder.Property(entity => entity.SentByAdminName).HasColumnName("sent_by_admin_name").HasMaxLength(200).IsRequired();
            builder.Property(entity => entity.RecipientCount).HasColumnName("recipient_count");
            builder.Property(entity => entity.SentAtUtc).HasColumnName("sent_at_utc");
        });

        base.OnModelCreating(modelBuilder);
    }
}
