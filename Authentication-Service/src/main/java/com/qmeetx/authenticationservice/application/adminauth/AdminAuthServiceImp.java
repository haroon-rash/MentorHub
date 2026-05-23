package com.qmeetx.authenticationservice.application.adminauth;

import com.qmeetx.authenticationservice.api.dto.AuthSessionDTO;
import com.qmeetx.authenticationservice.application.auth.AuthTokenService;
import com.qmeetx.authenticationservice.domain.enums.UserRole;
import com.qmeetx.authenticationservice.domain.models.EmailOtp;
import com.qmeetx.authenticationservice.domain.models.User;
import com.qmeetx.authenticationservice.domain.repository.EmailOtpRepository;
import com.qmeetx.authenticationservice.domain.repository.UserRepository;
import com.qmeetx.authenticationservice.exceptions.PasswordNotMatchException;
import com.qmeetx.authenticationservice.exceptions.UserNotFoundException;
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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class AdminAuthServiceImp implements AdminAuthService {

    private static final String PURPOSE = "ADMIN_LOGIN";

    private final UserRepository userRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender javaMailSender;
    private final AuthTokenService authTokenService;
    private final Map<String, String> pendingAdminSessions = new ConcurrentHashMap<>();

    @Value("${app.security.admin-otp-email:haroonurrasheed1212@gmail.com}")
    private String adminOtpEmail;

    @Value("${app.otp.expiry-minutes:10}")
    private long otpExpiryMinutes;

    @Value("${app.otp.code-length:6}")
    private int otpCodeLength;

    @Value("${app.otp.send-email:true}")
    private boolean sendEmailEnabled;

    @Value("${app.mail.from:no-reply@mentorhub.local}")
    private String mailFrom;

    public AdminAuthServiceImp(
            UserRepository userRepository,
            EmailOtpRepository emailOtpRepository,
            PasswordEncoder passwordEncoder,
            JavaMailSender javaMailSender,
            AuthTokenService authTokenService
    ) {
        this.userRepository = userRepository;
        this.emailOtpRepository = emailOtpRepository;
        this.passwordEncoder = passwordEncoder;
        this.javaMailSender = javaMailSender;
        this.authTokenService = authTokenService;
    }

    @Override
    @Transactional
    public void initiateAdminLogin(String email, String password) {
        String normalized = normalizeEmail(email);
        User user = userRepository.findOneByEmailIgnoreCase(normalized)
                .orElseThrow(() -> new UserNotFoundException("Admin account not found."));

        if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.OWNER) {
            throw new IllegalStateException("This account is not authorized for admin access.");
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new PasswordNotMatchException("Invalid admin credentials.");
        }

        if (!user.isVerified()) {
            throw new IllegalStateException("Admin email must be verified before admin login.");
        }

        String otpRecipient = normalizeEmail(adminOtpEmail);
        emailOtpRepository.markUnusedOtpsAsUsed(otpRecipient, PURPOSE);
        String otpCode = generateOtp();
        emailOtpRepository.save(EmailOtp.builder()
                .email(otpRecipient)
                .otpHash(passwordEncoder.encode(otpCode))
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
                .used(false)
                .purpose(PURPOSE)
                .build());

        pendingAdminSessions.put(otpRecipient, normalized);
        sendAdminOtpEmail(otpRecipient, otpCode, user.getEmail());
    }

    @Override
    @Transactional
    public AuthSessionDTO verifyAdminOtp(String email, String otp) {
        String otpRecipient = normalizeEmail(adminOtpEmail);
        String normalizedLoginEmail = pendingAdminSessions.get(otpRecipient);
        if (normalizedLoginEmail == null) {
            throw new IllegalStateException("Admin login session expired. Please sign in again.");
        }

        EmailOtp activeOtp = emailOtpRepository
                .findTopByEmailIgnoreCaseAndPurposeAndUsedFalseOrderByCreatedAtDesc(otpRecipient, PURPOSE)
                .orElseThrow(() -> new IllegalArgumentException("Admin OTP not found. Please sign in again."));

        if (activeOtp.getExpiresAt().isBefore(LocalDateTime.now())) {
            activeOtp.setUsed(true);
            emailOtpRepository.save(activeOtp);
            pendingAdminSessions.remove(otpRecipient);
            throw new IllegalArgumentException("Admin OTP expired. Please sign in again.");
        }

        if (!passwordEncoder.matches(otp, activeOtp.getOtpHash())) {
            throw new IllegalArgumentException("Invalid admin OTP.");
        }

        activeOtp.setUsed(true);
        emailOtpRepository.save(activeOtp);
        pendingAdminSessions.remove(otpRecipient);

        User user = userRepository.findOneByEmailIgnoreCase(normalizedLoginEmail)
                .orElseThrow(() -> new UserNotFoundException("Admin account not found."));
        return authTokenService.issueTokens(user);
    }

    private void sendAdminOtpEmail(String otpRecipient, String otpCode, String adminEmail) {
        if (!sendEmailEnabled) {
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(otpRecipient);
            message.setSubject("MentorHub admin verification code");
            message.setText("Admin login attempt for: " + adminEmail + "\n\n"
                    + "Your admin verification code is: " + otpCode + "\n"
                    + "This code expires in " + otpExpiryMinutes + " minutes.\n\n"
                    + "If you did not attempt admin login, secure your account immediately.\n\n— MentorHub Security");
            javaMailSender.send(message);
        } catch (Exception ex) {
            log.warn("Could not send admin OTP email: {}", ex.getMessage());
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
