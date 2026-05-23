package com.qmeetx.authenticationservice.domain.repository;

import com.qmeetx.authenticationservice.domain.enums.OutboxStatus;
import com.qmeetx.authenticationservice.domain.models.OutboxMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface OutboxMessageRepository extends JpaRepository<OutboxMessage, UUID> {
    List<OutboxMessage> findTop50ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            OutboxStatus status,
            LocalDateTime now
    );
}
