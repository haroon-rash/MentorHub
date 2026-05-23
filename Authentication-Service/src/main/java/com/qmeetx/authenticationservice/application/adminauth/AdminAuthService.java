package com.qmeetx.authenticationservice.application.adminauth;

import com.qmeetx.authenticationservice.api.dto.AuthSessionDTO;

public interface AdminAuthService {
    void initiateAdminLogin(String email, String password);
    AuthSessionDTO verifyAdminOtp(String email, String otp);
}
