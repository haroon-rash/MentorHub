package com.qmeetx.authenticationservice.api.controller;

import com.qmeetx.authenticationservice.api.dto.ApiResponse;
import com.qmeetx.authenticationservice.api.dto.PasswordResetConfirmDTO;
import com.qmeetx.authenticationservice.api.dto.PasswordResetRequestDTO;
import com.qmeetx.authenticationservice.api.dto.PasswordResetTokenDTO;
import com.qmeetx.authenticationservice.api.dto.PasswordResetVerifyDTO;
import com.qmeetx.authenticationservice.application.passwordreset.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/password-reset")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/request")
    public ResponseEntity<ApiResponse<Void>> request(@Valid @RequestBody PasswordResetRequestDTO request) {
        passwordResetService.requestReset(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("If an account exists, a reset code has been sent.", null));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<PasswordResetTokenDTO>> verifyOtp(@Valid @RequestBody PasswordResetVerifyDTO request) {
        String resetToken = passwordResetService.verifyResetOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(ApiResponse.success(
                "Reset code verified",
                PasswordResetTokenDTO.builder().resetToken(resetToken).build()
        ));
    }

    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<Void>> confirm(@Valid @RequestBody PasswordResetConfirmDTO request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match.");
        }
        passwordResetService.resetPassword(request.getEmail(), request.getResetToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success("Password updated successfully. Please log in.", null));
    }
}
