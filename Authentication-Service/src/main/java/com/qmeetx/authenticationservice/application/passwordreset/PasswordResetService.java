package com.qmeetx.authenticationservice.application.passwordreset;

public interface PasswordResetService {
    void requestReset(String email);
    String verifyResetOtp(String email, String otp);
    void resetPassword(String email, String resetToken, String newPassword);
}
