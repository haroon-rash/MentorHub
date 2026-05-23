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
public class AuthSessionDTO {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private LocalDateTime accessTokenExpiresAt;
    private LocalDateTime refreshTokenExpiresAt;
    private String userId;
    private String email;
    private String name;
    private String role;
    private boolean verified;
}
