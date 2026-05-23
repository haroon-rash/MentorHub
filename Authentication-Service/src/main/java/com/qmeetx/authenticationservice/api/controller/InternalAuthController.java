package com.qmeetx.authenticationservice.api.controller;

import com.qmeetx.authenticationservice.api.dto.ApiResponse;
import com.qmeetx.authenticationservice.application.userdeletion.AuthUserDeletionService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/internal")
@RequiredArgsConstructor
public class InternalAuthController {

    private final AuthUserDeletionService authUserDeletionService;

    @PostMapping("/users/delete-by-email")
    public ResponseEntity<ApiResponse<Void>> deleteByEmail(@RequestBody DeleteByEmailRequest request) {
        authUserDeletionService.deleteByEmail(request.email());
        return ResponseEntity.ok(ApiResponse.success("Auth account removed", null));
    }

    public record DeleteByEmailRequest(@NotBlank @Email String email) {}
}
