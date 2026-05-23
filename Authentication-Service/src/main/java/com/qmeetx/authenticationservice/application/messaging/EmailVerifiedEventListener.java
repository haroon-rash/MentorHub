package com.qmeetx.authenticationservice.application.messaging;

import com.qmeetx.authenticationservice.domain.models.User;
import com.qmeetx.authenticationservice.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles email verification status updates.
 * Previously consumed RabbitMQ events; now called directly from OTP verification flow.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerifiedEventListener {

    private final UserRepository userRepository;

    @Transactional
    public void handleEmailVerified(String email, boolean isVerified) {
        User user = userRepository.findByEmail(email);
        if (user == null) {
            log.warn("Email verification ignored — user not found for email {}", email);
            return;
        }

        if (isVerified) {
            user.setVerified(true);
            userRepository.save(user);
            log.info("User verification status updated for {}", email);
        } else {
            log.warn("Received negative email verification for {}", email);
        }
    }
}
