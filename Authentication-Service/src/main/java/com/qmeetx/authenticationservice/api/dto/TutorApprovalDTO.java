package com.qmeetx.authenticationservice.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TutorApprovalDTO {
    private String id;
    private String name;
    private String subject;
    private String status;
    private String time;
}
