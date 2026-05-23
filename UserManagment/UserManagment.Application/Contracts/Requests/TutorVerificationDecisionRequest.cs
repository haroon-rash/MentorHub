namespace UserManagment.Application.Contracts.Requests;

public class TutorVerificationDecisionRequest
{
    public bool Approve { get; set; }
    public string? Notes { get; set; }
}
