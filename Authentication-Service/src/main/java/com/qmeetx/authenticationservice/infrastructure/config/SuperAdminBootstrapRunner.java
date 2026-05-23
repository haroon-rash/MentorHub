package com.qmeetx.authenticationservice.infrastructure.config;

import com.qmeetx.authenticationservice.domain.enums.UserReviewStatus;
import com.qmeetx.authenticationservice.domain.enums.UserRole;
import com.qmeetx.authenticationservice.domain.models.User;
import com.qmeetx.authenticationservice.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
@RequiredArgsConstructor
@Slf4j
public class SuperAdminBootstrapRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.security.super-admin-email:haroonurrasheed1212@gmail.com}")
    private String superAdminEmail;

    @Value("${app.security.super-admin-password:admin}")
    private String superAdminPassword;

    @Override
    public void run(ApplicationArguments args) {
        String normalizedEmail = normalizeEmail(superAdminEmail);
        User user = userRepository.findOneByEmailIgnoreCase(normalizedEmail)
                .orElseGet(User::new);

        boolean isNewUser = user.getId() == null;
        if (isNewUser) {
            user.setName("Super Admin");
            user.setEmail(normalizedEmail);
        }

        user.setEmail(normalizedEmail);
        user.setRole(UserRole.OWNER);
        user.setReviewStatus(UserReviewStatus.APPROVED);
        user.setVerified(true);

        if (user.getPassword() == null || user.getPassword().isBlank() || !passwordEncoder.matches(superAdminPassword, user.getPassword())) {
            user.setPassword(passwordEncoder.encode(superAdminPassword));
        }

        userRepository.save(user);

        if (isNewUser) {
            log.info("Created configured super admin account: {}", normalizedEmail);
        } else {
            log.info("Ensured configured super admin account permissions/password: {}", normalizedEmail);
        }
    }

    private String normalizeEmail(String email) {
        return String.valueOf(email).trim().toLowerCase(Locale.ROOT);
    }
}
