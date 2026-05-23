package com.qmeetx.authenticationservice.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PasswordResetConfirmDTO {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String resetToken;

    @NotBlank
    @Size(min = 8, max = 128)
    private String newPassword;

    @NotBlank
    private String confirmPassword;
}
