namespace UserManagment.Application.Interfaces;

public interface IEnrollmentCompletionService
{
    Task CompleteEnrollmentAsync(string authUserId, Guid enrollmentId, CancellationToken cancellationToken);
    Task TryAutoCompleteEnrollmentAsync(Guid enrollmentId, CancellationToken cancellationToken);
    Task TryAutoCompletePastEnrollmentsAsync(CancellationToken cancellationToken);
}
