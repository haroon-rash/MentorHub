package com.qmeetx.authenticationservice.api.controller;


import com.qmeetx.authenticationservice.api.dto.ApiResponse;
import com.qmeetx.authenticationservice.api.dto.AuthSessionDTO;
import com.qmeetx.authenticationservice.application.auth.AuthTokenService;
import com.qmeetx.authenticationservice.domain.models.User;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/oauth")
@RequiredArgsConstructor
public class OAuthController {

private final HttpServletRequest request;
private final AuthTokenService authTokenService;

@GetMapping("/success")
    public ResponseEntity<ApiResponse<AuthSessionDTO>> success() {

    User user = (User) request.getAttribute("oAuthUser");
    if (user == null) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error("An unexpected error occurred", null));

    }
    try {
        AuthSessionDTO session = authTokenService.issueTokens(user);
        return ResponseEntity.ok(ApiResponse.success("OAuth login successful", session));
    } catch (Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Failed to generate JWT token", null));
    }
}

    @GetMapping("/failure")
    public ResponseEntity<ApiResponse<Void>> oauthFailure() {
        return ResponseEntity.status(401).body(ApiResponse.error("OAuth login failed", null));
    }


}
