package com.qmeetx.authenticationservice.application.messaging.outbox;

import com.qmeetx.authenticationservice.api.dto.userCreationDTO;

public interface MessagingOutboxService {
    void enqueueOtpRequested(String name, String email);
    void enqueueAuthUserCreated(userCreationDTO userCreationDTO);
}
