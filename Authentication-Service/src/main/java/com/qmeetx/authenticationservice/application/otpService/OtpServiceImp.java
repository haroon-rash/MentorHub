package com.qmeetx.authenticationservice.application.otpService;

import com.qmeetx.authenticationservice.api.dto.AuthSessionDTO;
import com.qmeetx.authenticationservice.application.auth.AuthTokenService;
import com.qmeetx.authenticationservice.application.messaging.outbox.MessagingOutboxService;
import com.qmeetx.authenticationservice.domain.models.EmailOtp;
import com.qmeetx.authenticationservice.domain.models.User;
import com.qmeetx.authenticationservice.domain.repository.EmailOtpRepository;
import com.qmeetx.authenticationservice.domain.repository.UserAccountSyncRepository;
import com.qmeetx.authenticationservice.domain.repository.UserRepository;
import com.qmeetx.authenticationservice.exceptions.UserNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import otp.event.EmailVerifiedEvent;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@Slf4j
public class OtpServiceImp implements OtpService {

    private final UserRepository userRepository;
    private final UserAccountSyncRepository userAccountSyncRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender javaMailSender;
    private final AuthTokenService authTokenService;
    private final MessagingOutboxService messagingOutboxService;

    @Value("${app.otp.expiry-minutes:10}")
    private long otpExpiryMinutes;

    @Value("${app.otp.code-length:6}")
    private int otpCodeLength;

    @Value("${app.otp.send-email:true}")
    private boolean sendEmailEnabled;

    @Value("${app.mail.from:no-reply@mentorhub.local}")
    private String mailFrom;

    public OtpServiceImp(
            UserRepository userRepository,
            UserAccountSyncRepository userAccountSyncRepository,
            EmailOtpRepository emailOtpRepository,
            PasswordEncoder passwordEncoder,
            JavaMailSender javaMailSender,
            AuthTokenService authTokenService,
            MessagingOutboxService messagingOutboxService
    ) {
        this.userRepository = userRepository;
        this.userAccountSyncRepository = userAccountSyncRepository;
        this.emailOtpRepository = emailOtpRepository;
        this.passwordEncoder = passwordEncoder;
        this.javaMailSender = javaMailSender;
        this.authTokenService = authTokenService;
        this.messagingOutboxService = messagingOutboxService;
    }

    @Override
    @Transactional
    public void issueOtp(String email, String name) {
        User user = findUserByEmail(email);
        String normalizedEmail = normalizeEmail(user.getEmail());
        String recipientName = (name == null || name.isBlank()) ? user.getName() : name;

        final String purpose = "EMAIL_VERIFY";
        emailOtpRepository.markUnusedOtpsAsUsed(normalizedEmail, purpose);

        String otpCode = generateOtp();
        EmailOtp emailOtp = EmailOtp.builder()
                .email(normalizedEmail)
                .otpHash(passwordEncoder.encode(otpCode))
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
                .used(false)
                .purpose(purpose)
                .build();
        emailOtpRepository.save(emailOtp);

        messagingOutboxService.enqueueOtpRequested(recipientName, normalizedEmail);
        sendOtpEmailIfEnabled(recipientName, normalizedEmail, otpCode);
    }

    @Override
    @Transactional
    public AuthSessionDTO verifyOtp(String email, String otp) {
        String normalizedEmail = normalizeEmail(email);
        User user = findUserByEmail(normalizedEmail);

        if (user.isVerified()) {
            throw new IllegalArgumentException("Email is already verified. Please log in.");
        }

        EmailOtp activeOtp = emailOtpRepository
                .findTopByEmailIgnoreCaseAndPurposeAndUsedFalseOrderByCreatedAtDesc(normalizedEmail, "EMAIL_VERIFY")
                .orElseThrow(() -> new IllegalArgumentException("OTP not found. Please request a new OTP."));

        if (activeOtp.getExpiresAt().isBefore(LocalDateTime.now())) {
            activeOtp.setUsed(true);
            emailOtpRepository.save(activeOtp);
            throw new IllegalArgumentException("OTP expired. Please request a new OTP.");
        }

        if (!passwordEncoder.matches(otp, activeOtp.getOtpHash())) {
            throw new IllegalArgumentException("Invalid OTP code.");
        }

        activeOtp.setUsed(true);
        emailOtpRepository.save(activeOtp);

        user.setVerified(true);
        userRepository.save(user);
        syncEmailVerified(user);

        return authTokenService.issueTokens(user);
    }

    @Override
    @Transactional
    public void resendOtp(String email) {
        User user = findUserByEmail(email);
        if (user.isVerified()) {
            throw new IllegalArgumentException("Email is already verified.");
        }

        issueOtp(user.getEmail(), user.getName());
    }

    private User findUserByEmail(String email) {
        return userRepository.findOneByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new UserNotFoundException("User with this email does not exist: " + email));
    }

    private String normalizeEmail(String email) {
        return String.valueOf(email).trim().toLowerCase(Locale.ROOT);
    }

    private String generateOtp() {
        int digits = Math.min(Math.max(otpCodeLength, 4), 8);
        int upperBound = (int) Math.pow(10, digits);
        int number = new SecureRandom().nextInt(upperBound);
        return String.format("%0" + digits + "d", number);
    }

    private void sendOtpEmailIfEnabled(String name, String email, String otpCode) {
        if (!sendEmailEnabled) {
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(email);
            message.setSubject("MentorHub verification code");
            message.setText(buildOtpMessage(name, otpCode));
            javaMailSender.send(message);
        } catch (Exception ex) {
            log.warn("Could not send OTP email to {}. Verify SMTP config. Cause: {}", email, ex.getMessage());
        }
    }

    private void syncEmailVerified(User user) {
        userAccountSyncRepository.findByAuthUserId(user.getId().toString()).ifPresent(sync -> {
            sync.setEmailVerified(true);
            userAccountSyncRepository.save(sync);
        });
    }

    private String buildOtpMessage(String name, String otpCode) {
        String recipientName = (name == null || name.isBlank()) ? "there" : name;
        return "Hello " + recipientName + ",\n\n"
                + "Your MentorHub verification code is: " + otpCode + "\n"
                + "This code expires in " + otpExpiryMinutes + " minutes.\n\n"
                + "If you did not request this, you can ignore this email.\n\n"
                + "— MentorHub (noreply.mentorhub@gmail.com)";
    }

}
