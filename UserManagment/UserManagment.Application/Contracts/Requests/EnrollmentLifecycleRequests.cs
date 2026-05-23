namespace UserManagment.Application.Contracts.Requests;

public class WithdrawEnrollmentRequest
{
    public DateTime RequestedLeaveDateUtc { get; set; }
    public string? Reason { get; set; }
}

public class RecordSessionAttendanceRequest
{
    public Guid GeneratedClassSessionId { get; set; }
    public Guid BatchEnrollmentId { get; set; }
    public Guid StudentProfileId { get; set; }
    public bool IsPresent { get; set; }
    public string? Notes { get; set; }
}
