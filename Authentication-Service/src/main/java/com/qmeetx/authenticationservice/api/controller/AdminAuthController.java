package com.qmeetx.authenticationservice.api.controller;

import com.qmeetx.authenticationservice.api.dto.ApiResponse;
import com.qmeetx.authenticationservice.api.dto.AuthSessionDTO;
import com.qmeetx.authenticationservice.api.dto.LoginRequestDTO;
import com.qmeetx.authenticationservice.api.dto.OtpVerifyRequestDTO;
import com.qmeetx.authenticationservice.application.adminauth.AdminAuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/admin")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    public AdminAuthController(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Void>> login(@Valid @RequestBody LoginRequestDTO request) {
        adminAuthService.initiateAdminLogin(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(ApiResponse.success("Admin OTP sent to the authorized security inbox.", null));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<AuthSessionDTO>> verifyOtp(@Valid @RequestBody OtpVerifyRequestDTO request) {
        AuthSessionDTO session = adminAuthService.verifyAdminOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(ApiResponse.success("Admin login successful", session));
    }
}
