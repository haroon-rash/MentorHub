package com.qmeetx.authenticationservice.api.controller;


import com.qmeetx.authenticationservice.api.dto.ApiResponse;
import com.qmeetx.authenticationservice.api.dto.AuthSessionDTO;
import com.qmeetx.authenticationservice.api.dto.OtpResendRequestDTO;
import com.qmeetx.authenticationservice.api.dto.OtpVerifyRequestDTO;
import com.qmeetx.authenticationservice.api.dto.SignupRequestDTO;
import com.qmeetx.authenticationservice.application.otpService.OtpService;
import com.qmeetx.authenticationservice.application.signupService.SignupService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class SignupController {

    private final SignupService signupservice;
    private final OtpService otpService;

    public SignupController(SignupService signupservice, OtpService otpService) {
        this.signupservice = signupservice;
        this.otpService = otpService;
    }


    @PostMapping("/signup")
public ResponseEntity<ApiResponse<Map<String, String>>> signup(@Valid @RequestBody SignupRequestDTO signupRequestDTO) {

signupservice.signup(signupRequestDTO);
return ResponseEntity.ok(ApiResponse.success("Signup successful", Map.of("email", signupRequestDTO.getEmail())));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<AuthSessionDTO>> verifyOtp(@Valid @RequestBody OtpVerifyRequestDTO requestDTO) {
        AuthSessionDTO session = otpService.verifyOtp(requestDTO.getEmail(), requestDTO.getOtp());
        return ResponseEntity.ok(ApiResponse.success("OTP verified successfully", session));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponse<Map<String, String>>> resendOtp(@Valid @RequestBody OtpResendRequestDTO requestDTO) {
        otpService.resendOtp(requestDTO.getEmail());
        return ResponseEntity.ok(ApiResponse.success("OTP resent successfully", Map.of("email", requestDTO.getEmail())));
    }




}
