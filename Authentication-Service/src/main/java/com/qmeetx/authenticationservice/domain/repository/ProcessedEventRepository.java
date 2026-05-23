package com.qmeetx.authenticationservice.domain.repository;

import com.qmeetx.authenticationservice.domain.models.ProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, UUID> {
    boolean existsByConsumerNameAndIdempotencyKey(String consumerName, String idempotencyKey);
}
