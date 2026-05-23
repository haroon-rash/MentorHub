package com.qmeetx.authenticationservice.application.messaging.outbox;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * No-op replacement for the RabbitMQ outbox publisher.
 * The outbox pattern was only required for reliable RabbitMQ publishing.
 * With RabbitMQ removed, this is no longer needed.
 */
@Slf4j
@Component
public class OutboxPublisherProcessor {
    // Intentionally empty — RabbitMQ outbox polling has been removed.
    // The @Scheduled method previously published pending outbox messages
    // to RabbitMQ; this is no longer needed.
}
