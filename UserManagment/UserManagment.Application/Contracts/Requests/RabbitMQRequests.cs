using System;
using System.Collections.Generic;

namespace UserManagment.Application.Contracts.Requests;

public class GetStudentsByTutorRequest
{
    public Guid TutorProfileId { get; set; }
}

public class GetStudentInfoRequest
{
    public Guid StudentProfileId { get; set; }
}
