package com.qmeetx.authenticationservice.api.controller;

import com.qmeetx.authenticationservice.api.dto.ApiResponse;
import com.qmeetx.authenticationservice.api.dto.UserProfileDTO;
import com.qmeetx.authenticationservice.application.profile.ProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileDTO>> getMyProfile(Authentication authentication) {
        String email = authentication.getName();
        UserProfileDTO profile = profileService.getMyProfile(email);
        return ResponseEntity.ok(ApiResponse.success("Profile fetched", profile));
    }
}
