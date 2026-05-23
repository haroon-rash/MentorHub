package com.qmeetx.authenticationservice.application.passwordreset;

import com.qmeetx.authenticationservice.domain.models.EmailOtp;
import com.qmeetx.authenticationservice.domain.models.User;
import com.qmeetx.authenticationservice.domain.repository.EmailOtpRepository;
import com.qmeetx.authenticationservice.domain.repository.UserRepository;
import com.qmeetx.authenticationservice.exceptions.UserNotFoundException;
import com.qmeetx.authenticationservice.infrastructure.jwt.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@Slf4j
public class PasswordResetServiceImp implements PasswordResetService {

    private static final String PURPOSE = "PASSWORD_RESET";

    private final UserRepository userRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender javaMailSender;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.otp.expiry-minutes:10}")
    private long otpExpiryMinutes;

    @Value("${app.otp.code-length:6}")
    private int otpCodeLength;

    @Value("${app.otp.send-email:true}")
    private boolean sendEmailEnabled;

    @Value("${app.mail.from:no-reply@mentorhub.local}")
    private String mailFrom;

    @Value("${app.security.password-reset-token-ms:900000}")
    private long resetTokenTtlMs;

    public PasswordResetServiceImp(
            UserRepository userRepository,
            EmailOtpRepository emailOtpRepository,
            PasswordEncoder passwordEncoder,
            JavaMailSender javaMailSender,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.userRepository = userRepository;
        this.emailOtpRepository = emailOtpRepository;
        this.passwordEncoder = passwordEncoder;
        this.javaMailSender = javaMailSender;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    @Transactional
    public void requestReset(String email) {
        String normalized = normalizeEmail(email);
        User user = userRepository.findOneByEmailIgnoreCase(normalized)
                .orElseThrow(() -> new UserNotFoundException("No account found for this email."));

        emailOtpRepository.markUnusedOtpsAsUsed(normalized, PURPOSE);
        String otpCode = generateOtp();
        emailOtpRepository.save(EmailOtp.builder()
                .email(normalized)
                .otpHash(passwordEncoder.encode(otpCode))
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
                .used(false)
                .purpose(PURPOSE)
                .build());

        sendResetEmail(user.getName(), normalized, otpCode);
    }

    @Override
    @Transactional
    public String verifyResetOtp(String email, String otp) {
        String normalized = normalizeEmail(email);
        userRepository.findOneByEmailIgnoreCase(normalized)
                .orElseThrow(() -> new UserNotFoundException("No account found for this email."));

        EmailOtp activeOtp = emailOtpRepository
                .findTopByEmailIgnoreCaseAndPurposeAndUsedFalseOrderByCreatedAtDesc(normalized, PURPOSE)
                .orElseThrow(() -> new IllegalArgumentException("Reset code not found. Please request a new one."));

        if (activeOtp.getExpiresAt().isBefore(LocalDateTime.now())) {
            activeOtp.setUsed(true);
            emailOtpRepository.save(activeOtp);
            throw new IllegalArgumentException("Reset code expired. Please request a new one.");
        }

        if (!passwordEncoder.matches(otp, activeOtp.getOtpHash())) {
            throw new IllegalArgumentException("Invalid reset code.");
        }

        activeOtp.setUsed(true);
        emailOtpRepository.save(activeOtp);

        User user = userRepository.findOneByEmailIgnoreCase(normalized)
                .orElseThrow(() -> new UserNotFoundException("No account found for this email."));
        String role = user.getRole() != null ? user.getRole().name() : "STUDENT";
        return jwtTokenProvider.generatePasswordResetToken(user.getId().toString(), normalized, role, resetTokenTtlMs);
    }

    @Override
    @Transactional
    public void resetPassword(String email, String resetToken, String newPassword) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }

        if (!jwtTokenProvider.validatePasswordResetToken(resetToken)) {
            throw new IllegalArgumentException("Reset session expired. Please start again.");
        }

        String normalized = normalizeEmail(email);
        String tokenEmail = jwtTokenProvider.getEmailFromToken(resetToken);
        if (!normalized.equalsIgnoreCase(tokenEmail)) {
            throw new IllegalArgumentException("Invalid reset session.");
        }

        User user = userRepository.findOneByEmailIgnoreCase(normalized)
                .orElseThrow(() -> new UserNotFoundException("No account found for this email."));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private void sendResetEmail(String name, String email, String otpCode) {
        if (!sendEmailEnabled) {
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(email);
            message.setSubject("MentorHub password reset code");
            message.setText("Hello " + (name == null || name.isBlank() ? "there" : name) + ",\n\n"
                    + "Your password reset code is: " + otpCode + "\n"
                    + "This code expires in " + otpExpiryMinutes + " minutes.\n\n"
                    + "If you did not request this, ignore this email.\n\n— MentorHub");
            javaMailSender.send(message);
        } catch (Exception ex) {
            log.warn("Could not send password reset email to {}: {}", email, ex.getMessage());
        }
    }

    private String normalizeEmail(String email) {
        return String.valueOf(email).trim().toLowerCase(Locale.ROOT);
    }

    private String generateOtp() {
        int digits = Math.min(Math.max(otpCodeLength, 4), 8);
        int upperBound = (int) Math.pow(10, digits);
        return String.format("%0" + digits + "d", new SecureRandom().nextInt(upperBound));
    }
}
