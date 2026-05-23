package com.mentorhub.notificationservice.repository;

import com.mentorhub.notificationservice.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByRecipientAuthUserIdOrderByCreatedAtUtcDesc(String recipientAuthUserId);

    long countByRecipientAuthUserIdAndIsReadFalse(String recipientAuthUserId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAtUtc = :now WHERE n.recipientAuthUserId = :userId AND n.isRead = false")
    void markAllReadByUser(@Param("userId") String userId, @Param("now") Instant now);
}
