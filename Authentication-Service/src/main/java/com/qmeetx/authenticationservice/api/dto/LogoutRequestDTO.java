package com.qmeetx.authenticationservice.api.dto;

import lombok.Data;

@Data
public class LogoutRequestDTO {
    private String refreshToken;
}
