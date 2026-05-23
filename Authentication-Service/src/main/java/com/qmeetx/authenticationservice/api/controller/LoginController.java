package com.qmeetx.authenticationservice.api.controller;
import com.qmeetx.authenticationservice.api.dto.ApiResponse;
import com.qmeetx.authenticationservice.api.dto.AuthSessionDTO;
import com.qmeetx.authenticationservice.api.dto.LoginRequestDTO;
import com.qmeetx.authenticationservice.api.dto.LogoutRequestDTO;
import com.qmeetx.authenticationservice.api.dto.RefreshTokenRequestDTO;
import com.qmeetx.authenticationservice.application.auth.AuthTokenService;
import com.qmeetx.authenticationservice.application.loginService.LoginService;
import com.qmeetx.authenticationservice.domain.models.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;

@RestController
@RequestMapping("/api/v1/auth")
public class LoginController {

    private final LoginService loginService;
    private final AuthTokenService authTokenService;

    public LoginController(LoginService loginService, AuthTokenService authTokenService) {
        this.loginService = loginService;
        this.authTokenService = authTokenService;
    }


    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthSessionDTO>> login(@Valid @RequestBody LoginRequestDTO loginRequestDTO) {

        User user = loginService.validateLogin(loginRequestDTO);
        AuthSessionDTO session = authTokenService.issueTokens(user);

        return ResponseEntity.ok(ApiResponse.success("Login successful", session));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthSessionDTO>> refresh(@Valid @RequestBody RefreshTokenRequestDTO requestDTO) {
        AuthSessionDTO session = authTokenService.refreshSession(requestDTO.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Token refreshed", session));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) LogoutRequestDTO requestDTO
    ) {
        String refreshToken = requestDTO != null ? requestDTO.getRefreshToken() : null;
        authTokenService.logout(authorization, refreshToken);
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

}
