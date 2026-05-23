using System;
using System.Collections.Generic;

namespace UserManagment.Application.Contracts.Responses;

public class StudentBookingSummaryResponse
{
    public Guid StudentProfileId { get; set; }
    public Guid BookingId { get; set; }
    public string FullName { get; set; }
    public string Email { get; set; }
    public string PhoneNumber { get; set; }
    public string Subject { get; set; }
    public string TimeSlot { get; set; }
    public string BookingDate { get; set; }
    public decimal Fee { get; set; }
    public string BookingStatus { get; set; }
}

public class GetStudentsByTutorResponse
{
    public List<StudentBookingSummaryResponse> Students { get; set; } = new();
}

public class StudentInfoResponse
{
    public Guid StudentProfileId { get; set; }
    public string FullName { get; set; }
    public string Email { get; set; }
    public string PhoneNumber { get; set; }
    public string LearningGoals { get; set; }
    public decimal BudgetPerSession { get; set; }
}
