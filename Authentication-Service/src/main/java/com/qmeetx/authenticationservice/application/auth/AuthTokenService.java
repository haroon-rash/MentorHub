package com.qmeetx.authenticationservice.application.auth;

import com.qmeetx.authenticationservice.api.dto.AuthSessionDTO;
import com.qmeetx.authenticationservice.domain.models.User;

public interface AuthTokenService {
    AuthSessionDTO issueTokens(User user);
    AuthSessionDTO refreshSession(String refreshToken);
    void logout(String accessToken, String refreshToken);
}
