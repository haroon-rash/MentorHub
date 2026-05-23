package com.qmeetx.authenticationservice.api.controller;

import com.qmeetx.authenticationservice.api.dto.ApiResponse;
import com.qmeetx.authenticationservice.api.dto.DashboardSummaryDTO;
import com.qmeetx.authenticationservice.api.dto.TutorApprovalDTO;
import com.qmeetx.authenticationservice.api.dto.UpdateTutorApprovalRequestDTO;
import com.qmeetx.authenticationservice.application.dashboard.DashboardService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('TUTOR','ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<DashboardSummaryDTO>> getSummary() {
        DashboardSummaryDTO summary = dashboardService.getSummary();
        return ResponseEntity.ok(ApiResponse.success("Dashboard summary fetched", summary));
    }

    @GetMapping("/approvals")
    @PreAuthorize("hasAnyRole('TUTOR','ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<List<TutorApprovalDTO>>> getApprovals() {
        return ResponseEntity.ok(ApiResponse.success("Tutor approvals fetched", dashboardService.getTutorApprovals()));
    }

    @PatchMapping("/approvals/{id}")
    @PreAuthorize("hasAnyRole('TUTOR','ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<TutorApprovalDTO>> updateApproval(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTutorApprovalRequestDTO requestDTO
    ) {
        TutorApprovalDTO updated = dashboardService.updateTutorApproval(id, requestDTO.getStatus());
        return ResponseEntity.ok(ApiResponse.success("Tutor approval updated", updated));
    }
}
