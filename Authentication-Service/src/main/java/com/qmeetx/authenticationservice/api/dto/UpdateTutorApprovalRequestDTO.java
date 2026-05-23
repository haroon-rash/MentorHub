package com.qmeetx.authenticationservice.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateTutorApprovalRequestDTO {
    @NotBlank(message = "Status is required")
    private String status;
}
