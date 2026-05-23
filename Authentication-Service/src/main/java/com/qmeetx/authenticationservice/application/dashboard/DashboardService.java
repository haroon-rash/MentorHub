package com.qmeetx.authenticationservice.application.dashboard;

import com.qmeetx.authenticationservice.api.dto.DashboardSummaryDTO;
import com.qmeetx.authenticationservice.api.dto.TutorApprovalDTO;

import java.util.List;
import java.util.UUID;

public interface DashboardService {
    DashboardSummaryDTO getSummary();
    List<TutorApprovalDTO> getTutorApprovals();
    TutorApprovalDTO updateTutorApproval(UUID tutorUserId, String status);
}
