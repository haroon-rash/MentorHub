package com.qmeetx.authenticationservice.application.userdeletion;

import com.qmeetx.authenticationservice.domain.models.User;
import com.qmeetx.authenticationservice.domain.repository.EmailOtpRepository;
import com.qmeetx.authenticationservice.domain.repository.UserAccountSyncRepository;
import com.qmeetx.authenticationservice.domain.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;

@Service
@Slf4j
public class AuthUserDeletionServiceImp implements AuthUserDeletionService {

    private final UserRepository userRepository;
    private final UserAccountSyncRepository userAccountSyncRepository;
    private final EmailOtpRepository emailOtpRepository;

    public AuthUserDeletionServiceImp(
            UserRepository userRepository,
            UserAccountSyncRepository userAccountSyncRepository,
            EmailOtpRepository emailOtpRepository
    ) {
        this.userRepository = userRepository;
        this.userAccountSyncRepository = userAccountSyncRepository;
        this.emailOtpRepository = emailOtpRepository;
    }

    @Override
    @Transactional
    public void deleteByEmail(String email) {
        String normalized = normalizeEmail(email);
        Optional<User> userOpt = userRepository.findOneByEmailIgnoreCase(normalized);
        if (userOpt.isEmpty()) {
            log.info("No auth user to delete for email {}", normalized);
            emailOtpRepository.deleteByEmailIgnoreCase(normalized);
            return;
        }

        User user = userOpt.get();
        String authUserId = user.getId().toString();

        userAccountSyncRepository.findByAuthUserId(authUserId).ifPresent(userAccountSyncRepository::delete);
        emailOtpRepository.deleteByEmailIgnoreCase(normalized);

        userRepository.delete(user);
        log.info("Permanently deleted auth user {} ({})", authUserId, normalized);
    }

    private static String normalizeEmail(String email) {
        return String.valueOf(email).trim().toLowerCase(Locale.ROOT);
    }
}
