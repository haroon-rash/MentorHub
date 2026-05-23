using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using UserManagment.Application.Interfaces;
using UserManagment.Application.Services;
using UserManagment.Infrastructure.Messaging;
using UserManagment.Infrastructure.Persistence;
using UserManagment.Infrastructure.Repositories;
using UserManagment.Infrastructure.Services;

namespace UserManagment.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddUserManagmentInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=mentorhub;Username=postgres;Password=admin";

        services.AddDbContext<UserManagmentDbContext>(options => options
            .UseNpgsql(connectionString));

        // Repositories
        services.AddScoped<IUserAccountRepository, UserAccountRepository>();
        services.AddScoped<ITutorProfileRepository, TutorProfileRepository>();
        services.AddScoped<IStudentProfileRepository, StudentProfileRepository>();
        services.AddScoped<ITutorVerificationAuditRepository, TutorVerificationAuditRepository>();
        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<ITutorBatchRepository, TutorBatchRepository>();
        services.AddScoped<IBatchEnrollmentRepository, BatchEnrollmentRepository>();
        services.AddScoped<IEnrollmentBillingPeriodRepository, EnrollmentBillingPeriodRepository>();
        services.AddScoped<ISessionAttendanceRepository, SessionAttendanceRepository>();
        services.AddScoped<ICourseAssignmentRepository, CourseAssignmentRepository>();
        services.AddScoped<IStudyMaterialRepository, StudyMaterialRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IReviewRepository, ReviewRepository>();
        services.AddScoped<IStudentProgressRepository, StudentProgressRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Application Services
        services.AddScoped<IAuthUserSyncService, AuthUserSyncService>();
        services.AddScoped<ITutorOnboardingService, TutorOnboardingService>();
        services.AddScoped<IStudentOnboardingService, StudentOnboardingService>();
        services.AddScoped<ISuperAdminVerificationService, SuperAdminVerificationService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<ITutorBatchService, TutorBatchService>();
        services.AddScoped<IBatchEnrollmentService, BatchEnrollmentService>();
        services.AddScoped<IEnrollmentBillingService, EnrollmentBillingService>();
        services.AddScoped<IEnrollmentCompletionService, EnrollmentCompletionService>();
        services.AddScoped<IReviewEligibilityService, ReviewEligibilityService>();
        services.AddScoped<ISessionAttendanceService, SessionAttendanceService>();
        services.AddScoped<ICourseAssignmentService, CourseAssignmentService>();
        services.AddScoped<IStudyMaterialService, StudyMaterialService>();
        services.AddHttpClient<IExternalNotificationPublisher, JavaNotificationForwarder>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IReviewService, ReviewService>();
        services.AddScoped<IStudentProgressService, StudentProgressService>();
        services.AddScoped<ITutorApprovedCatalogSync, TutorApprovedCatalogSync>();

        // Messaging — NoOp (RabbitMQ removed; inter-service communication uses REST)
        services.AddSingleton<IMessagePublisher, NoOpMessagePublisher>();

        return services;
    }
}

