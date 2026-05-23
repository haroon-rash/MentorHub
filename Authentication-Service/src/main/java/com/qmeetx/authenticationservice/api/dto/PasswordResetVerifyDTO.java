package com.qmeetx.authenticationservice.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PasswordResetVerifyDTO {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String otp;
}
