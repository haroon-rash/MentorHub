package com.qmeetx.authenticationservice.application.profile;

import com.qmeetx.authenticationservice.api.dto.UserProfileDTO;

public interface ProfileService {
    UserProfileDTO getMyProfile(String email);
}
