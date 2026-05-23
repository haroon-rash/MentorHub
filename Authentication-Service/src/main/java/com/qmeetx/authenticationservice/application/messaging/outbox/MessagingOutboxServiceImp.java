package com.qmeetx.authenticationservice.application.messaging.outbox;

import com.qmeetx.authenticationservice.api.dto.userCreationDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * No-op implementation of MessagingOutboxService.
 * RabbitMQ has been removed; inter-service communication now uses REST.
 * OTP emails are sent directly via JavaMailSender in the OTP service.
 */
@Slf4j
@Service
public class MessagingOutboxServiceImp implements MessagingOutboxService {

    @Override
    public void enqueueOtpRequested(String name, String email) {
        log.debug("OTP request for {} — handled directly via email service", email);
        // No-op: OTP generation and email sending are now handled directly
        // in OtpServiceImp via JavaMailSender
    }

    @Override
    public void enqueueAuthUserCreated(userCreationDTO userCreationDTO) {
        log.debug("Auth user created event for {} — user accounts are now created via shared database",
                userCreationDTO.getEmail());
        // No-op: New microservices share the same database and create
        // user_accounts records as needed
    }
}
