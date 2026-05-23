package com.mentorhub.notificationservice.service;

import com.mentorhub.notificationservice.dto.CreateNotificationRequest;
import com.mentorhub.notificationservice.dto.NotificationResponse;
import com.mentorhub.notificationservice.model.Notification;
import com.mentorhub.notificationservice.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @InjectMocks private NotificationService notificationService;

    @Test
    void create_mapsTypeCorrectly() {
        when(notificationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        CreateNotificationRequest req = CreateNotificationRequest.builder()
                .recipientAuthUserId("user-1")
                .type("BOOKING_REQUESTED")
                .title("New Booking")
                .message("You have a new booking request")
                .relatedEntityId(UUID.randomUUID())
                .build();

        NotificationResponse response = notificationService.create(req);

        assertNotNull(response);
        assertEquals("BOOKING_REQUESTED", response.getType());
        assertEquals("New Booking", response.getTitle());
        assertFalse(response.isRead());
    }

    @Test
    void create_unknownType_defaultsToGeneral() {
        when(notificationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        CreateNotificationRequest req = CreateNotificationRequest.builder()
                .recipientAuthUserId("user-1")
                .type("UNKNOWN_TYPE")
                .title("Test")
                .message("Test message")
                .build();

        NotificationResponse response = notificationService.create(req);

        assertEquals("GENERAL", response.getType());
    }

    @Test
    void create_allNotificationTypes() {
        String[] types = {"BOOKING_REQUESTED", "BOOKING_CONFIRMED", "BOOKING_CANCELLED",
                "BOOKING_COMPLETED", "REVIEW_RECEIVED", "TUTOR_APPROVED", "TUTOR_REJECTED",
                "ANNOUNCEMENT", "GENERAL"};

        for (String type : types) {
            when(notificationRepository.save(any())).thenAnswer(i -> i.getArgument(0));
            CreateNotificationRequest req = CreateNotificationRequest.builder()
                    .recipientAuthUserId("user-1").type(type).title("T").message("M").build();
            NotificationResponse resp = notificationService.create(req);
            assertEquals(type, resp.getType(), "Type mismatch for: " + type);
        }
    }

    @Test
    void getForUser_returnsNotifications() {
        Notification n1 = Notification.builder()
                .id(UUID.randomUUID()).recipientAuthUserId("user-1")
                .type(0).title("Booking Request").message("New request")
                .isRead(false).createdAtUtc(Instant.now()).build();
        Notification n2 = Notification.builder()
                .id(UUID.randomUUID()).recipientAuthUserId("user-1")
                .type(5).title("Approved").message("Your profile approved")
                .isRead(true).readAtUtc(Instant.now()).createdAtUtc(Instant.now()).build();

        when(notificationRepository.findByRecipientAuthUserIdOrderByCreatedAtUtcDesc("user-1"))
                .thenReturn(List.of(n1, n2));

        List<NotificationResponse> results = notificationService.getForUser("user-1");

        assertEquals(2, results.size());
        assertEquals("BOOKING_REQUESTED", results.get(0).getType());
        assertEquals("TUTOR_APPROVED", results.get(1).getType());
        assertFalse(results.get(0).isRead());
        assertTrue(results.get(1).isRead());
    }

    @Test
    void getUnreadCount_returnsCount() {
        when(notificationRepository.countByRecipientAuthUserIdAndIsReadFalse("user-1")).thenReturn(5L);

        long count = notificationService.getUnreadCount("user-1");

        assertEquals(5L, count);
    }

    @Test
    void markRead_setsReadAndTimestamp() {
        UUID notifId = UUID.randomUUID();
        Notification notif = Notification.builder()
                .id(notifId).recipientAuthUserId("user-1")
                .type(0).title("Test").message("Test")
                .isRead(false).createdAtUtc(Instant.now()).build();

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(notif));
        when(notificationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        notificationService.markRead(notifId, "user-1");

        verify(notificationRepository).save(argThat(n -> n.isRead() && n.getReadAtUtc() != null));
    }

    @Test
    void markRead_wrongUser_throws() {
        UUID notifId = UUID.randomUUID();
        Notification notif = Notification.builder()
                .id(notifId).recipientAuthUserId("user-1")
                .type(0).title("Test").message("Test")
                .isRead(false).createdAtUtc(Instant.now()).build();

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(notif));

        assertThrows(IllegalArgumentException.class,
                () -> notificationService.markRead(notifId, "wrong-user"));
    }

    @Test
    void markRead_notFound_throws() {
        UUID notifId = UUID.randomUUID();
        when(notificationRepository.findById(notifId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> notificationService.markRead(notifId, "user-1"));
    }

    @Test
    void markAllRead_callsRepository() {
        notificationService.markAllRead("user-1");

        verify(notificationRepository).markAllReadByUser(eq("user-1"), any(Instant.class));
    }
}
