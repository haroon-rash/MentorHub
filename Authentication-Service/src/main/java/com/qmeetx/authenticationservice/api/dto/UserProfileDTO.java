package com.qmeetx.authenticationservice.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDTO {
    private String id;
    private String name;
    private String email;
    private String role;
    private boolean verified;
    private String reviewStatus;
    private LocalDateTime createdAt;
}
