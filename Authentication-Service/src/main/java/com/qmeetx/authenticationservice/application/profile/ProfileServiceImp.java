package com.qmeetx.authenticationservice.application.profile;

import com.qmeetx.authenticationservice.api.dto.UserProfileDTO;
import com.qmeetx.authenticationservice.domain.models.User;
import com.qmeetx.authenticationservice.domain.repository.UserRepository;
import com.qmeetx.authenticationservice.exceptions.UserNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class ProfileServiceImp implements ProfileService {

    private final UserRepository userRepository;

    public ProfileServiceImp(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserProfileDTO getMyProfile(String email) {
        User user = userRepository.findOneByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        return UserProfileDTO.builder()
                .id(user.getId().toString())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .verified(user.isVerified())
                .reviewStatus(user.getReviewStatus() != null ? user.getReviewStatus().name() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
