package com.qmeetx.authenticationservice.application.otpService;

import com.qmeetx.authenticationservice.api.dto.AuthSessionDTO;

public interface OtpService {
    void issueOtp(String email, String name);

    AuthSessionDTO verifyOtp(String email, String otp);

    void resendOtp(String email);
}
