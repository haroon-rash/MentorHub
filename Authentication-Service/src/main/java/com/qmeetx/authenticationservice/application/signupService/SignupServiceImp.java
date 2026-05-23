package com.qmeetx.authenticationservice.application.signupService;

import com.qmeetx.authenticationservice.api.dto.SignupRequestDTO;
import com.qmeetx.authenticationservice.api.dto.userCreationDTO;
import com.qmeetx.authenticationservice.application.mapper.UserMapper;
import com.qmeetx.authenticationservice.application.messaging.outbox.MessagingOutboxService;
import com.qmeetx.authenticationservice.application.otpService.OtpService;
import com.qmeetx.authenticationservice.domain.enums.AuthProvider;
import com.qmeetx.authenticationservice.domain.enums.UserRole;
import com.qmeetx.authenticationservice.domain.enums.UserReviewStatus;
import com.qmeetx.authenticationservice.domain.models.Provider;
import com.qmeetx.authenticationservice.domain.models.User;
import com.qmeetx.authenticationservice.domain.models.UserAccountSync;
import com.qmeetx.authenticationservice.domain.repository.UserAccountSyncRepository;
import com.qmeetx.authenticationservice.domain.repository.UserRepository;
import com.qmeetx.authenticationservice.exceptions.EmailAlreadyExistException;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;


@Service
@Slf4j

public class SignupServiceImp implements SignupService {

    @Value("${app.security.super-admin-email:haroonurrasheed1212@gmail.com}")
    private String superAdminEmail;

    private final UserRepository userRepository;
    private final UserAccountSyncRepository userAccountSyncRepository;
    private final PasswordEncoder passwordEncoder;
    private final MessagingOutboxService messagingOutboxService;
    private final OtpService otpService;

    public SignupServiceImp(
            UserRepository userRepository,
            UserAccountSyncRepository userAccountSyncRepository,
            PasswordEncoder passwordEncoder,
            MessagingOutboxService messagingOutboxService,
            OtpService otpService
    ) {
        this.userRepository = userRepository;
        this.userAccountSyncRepository = userAccountSyncRepository;
        this.passwordEncoder = passwordEncoder;
        this.messagingOutboxService = messagingOutboxService;
        this.otpService = otpService;
    }
/*

@Override
public String createTenantId(String organizationName){


        for(int i=0;i<10;i++){
            String tenantId= TenantIdGenerator.generateTenantId(organizationName);
           if(!organizationRepository.existsByTenantId(tenantId))
               return tenantId;
        }
throw new  RuntimeException("Something went wrong, Error in Generating TenantId..");
}
*/

    @Override
    @Transactional
    public void signup(SignupRequestDTO signupRequestDTO) {
        String normalizedEmail = normalizeEmail(signupRequestDTO.getEmail());
        Optional<User> existingUserOpt = userRepository.findOneByEmailIgnoreCase(normalizedEmail);

        User user;
        if (existingUserOpt.isPresent()) {
            user = existingUserOpt.get();

            if (user.isVerified()) {
                throw new EmailAlreadyExistException("Email Already Exist");
            }

            user.setName(signupRequestDTO.getName().trim());
            user.setEmail(normalizedEmail);
            user.setPassword(passwordEncoder.encode(signupRequestDTO.getPassword()));
            user.setRole(resolveRole(signupRequestDTO.getRole(), normalizedEmail));
            user.setReviewStatus(user.getRole() == UserRole.TUTOR ? UserReviewStatus.PENDING : UserReviewStatus.APPROVED);
            ensureLocalProvider(user, normalizedEmail);
        } else {
            user = UserMapper.maptoUser(signupRequestDTO);
            user.setName(signupRequestDTO.getName().trim());
            user.setEmail(normalizedEmail);
            user.setPassword(passwordEncoder.encode(signupRequestDTO.getPassword()));
            user.setRole(resolveRole(signupRequestDTO.getRole(), normalizedEmail));
            user.setReviewStatus(user.getRole() == UserRole.TUTOR ? UserReviewStatus.PENDING : UserReviewStatus.APPROVED);

            Provider provider = new Provider();
            provider.setUser(user);
            provider.setProviderName(AuthProvider.LOCAL);
            provider.setProviderUserId(normalizedEmail);
            user.getProviders().add(provider);
        }

        userRepository.save(user);
        upsertUserAccountSync(user);

        userCreationDTO userCreationDTO = new userCreationDTO();
        userCreationDTO.setAuthId(user.getId().toString());
        userCreationDTO.setUsername(user.getName());
        userCreationDTO.setEmail(user.getEmail());
        userCreationDTO.setRole(user.getRole().name());
        userCreationDTO.setIsVerified(user.isVerified());

        messagingOutboxService.enqueueAuthUserCreated(userCreationDTO);
        otpService.issueOtp(user.getEmail(), user.getName());
        log.info("Signup persisted and outbox events queued for auth user id: {}", user.getId());

    }

    private void ensureLocalProvider(User user, String normalizedEmail) {
        Provider localProvider = user.getProviders().stream()
                .filter(provider -> provider.getProviderName() == AuthProvider.LOCAL)
                .findFirst()
                .orElse(null);

        if (localProvider == null) {
            Provider provider = new Provider();
            provider.setUser(user);
            provider.setProviderName(AuthProvider.LOCAL);
            provider.setProviderUserId(normalizedEmail);
            user.getProviders().add(provider);
            return;
        }

        localProvider.setProviderUserId(normalizedEmail);
    }

    private String normalizeEmail(String email) {
        return String.valueOf(email).trim().toLowerCase(Locale.ROOT);
    }

    private UserRole resolveRole(String requestedRole, String email) {
        if (email != null && email.trim().equalsIgnoreCase(superAdminEmail)) {
            return UserRole.OWNER;
        }

        if (requestedRole == null || requestedRole.isBlank()) {
            return UserRole.STUDENT;
        }

        try {
            UserRole role = UserRole.valueOf(requestedRole.trim().toUpperCase(Locale.ROOT));
            if (role == UserRole.ADMIN || role == UserRole.OWNER) {
                throw new IllegalArgumentException("Admin accounts cannot be created via public signup.");
            }
            return role;
        } catch (IllegalArgumentException ex) {
            if (ex.getMessage() != null && ex.getMessage().contains("Admin accounts")) {
                throw ex;
            }
            throw new IllegalArgumentException("Invalid role. Allowed values: STUDENT, TUTOR");
        }
    }

    private int mapToPlatformRole(UserRole role) {
        if (role == null) return 1; // Default to Student
        return switch (role) {
            case STUDENT -> 1;
            case TUTOR -> 2;
            case ADMIN, OWNER -> 3;
            default -> 1;
        };
    }

    /**
     * Upsert platform user_accounts row. Re-signup for an unverified email reuses the same auth user id;
     * a blind insert violates IX_user_accounts_auth_user_id and rolls back the whole signup transaction.
     */
    private void upsertUserAccountSync(User user) {
        String authUserId = user.getId().toString();
        var existing = userAccountSyncRepository.findByAuthUserId(authUserId);
        if (existing.isPresent()) {
            UserAccountSync sync = existing.get();
            sync.setFullName(user.getName());
            sync.setEmail(user.getEmail());
            sync.setRole(mapToPlatformRole(user.getRole()));
            sync.setEmailVerified(user.isVerified());
            userAccountSyncRepository.save(sync);
            log.info("Updated user_accounts sync for {} ({})", user.getEmail(), authUserId);
            return;
        }

        UserAccountSync sync = UserAccountSync.builder()
                .id(java.util.UUID.randomUUID())
                .authUserId(authUserId)
                .fullName(user.getName())
                .email(user.getEmail())
                .role(mapToPlatformRole(user.getRole()))
                .isEmailVerified(user.isVerified())
                .createdAtUtc(java.time.Instant.now())
                .build();
        userAccountSyncRepository.save(sync);
        log.info("Created user_accounts sync for {}", user.getEmail());
    }

}
