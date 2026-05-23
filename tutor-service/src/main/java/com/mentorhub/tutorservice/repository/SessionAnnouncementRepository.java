package com.mentorhub.tutorservice.repository;

import com.mentorhub.tutorservice.model.SessionAnnouncement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SessionAnnouncementRepository extends JpaRepository<SessionAnnouncement, UUID> {
    List<SessionAnnouncement> findByTutorProfileIdOrderByCreatedAtDesc(UUID tutorProfileId);
}
