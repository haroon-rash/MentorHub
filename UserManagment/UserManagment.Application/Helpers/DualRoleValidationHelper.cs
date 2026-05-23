using UserManagment.Domain.Entities;

namespace UserManagment.Application.Helpers;

public static class DualRoleValidationHelper
{
    public const string SelfInteractionMessage =
        "You cannot use your tutor and student profiles together on the same account. " +
        "Switch to your other profile or choose a different tutor.";

    public static bool IsSameUserAccount(Guid studentProfileUserAccountId, Guid tutorProfileUserAccountId)
        => studentProfileUserAccountId == tutorProfileUserAccountId;

    public static void EnsureNotSelfEnrollment(StudentProfile student, TutorProfile tutor)
    {
        if (IsSameUserAccount(student.UserAccountId, tutor.UserAccountId))
        {
            throw new InvalidOperationException(SelfInteractionMessage);
        }
    }

    public static void EnsureNotSelfEnrollment(StudentProfile student, Guid tutorProfileId, TutorProfile tutor)
    {
        if (tutor.Id != tutorProfileId)
        {
            return;
        }

        EnsureNotSelfEnrollment(student, tutor);
    }

    public static void EnsureNotSelfBooking(StudentProfile student, TutorProfile tutor)
        => EnsureNotSelfEnrollment(student, tutor);

    public static void EnsureNotSelfReview(StudentProfile student, TutorProfile tutor)
        => EnsureNotSelfEnrollment(student, tutor);

    public static void EnsureNotSelfTutorAction(BatchEnrollment enrollment)
    {
        var studentAccountId = enrollment.StudentProfile?.UserAccountId;
        var tutorAccountId = enrollment.TutorProfile?.UserAccountId;
        if (studentAccountId.HasValue && tutorAccountId.HasValue
            && IsSameUserAccount(studentAccountId.Value, tutorAccountId.Value))
        {
            throw new InvalidOperationException(SelfInteractionMessage);
        }
    }
}
