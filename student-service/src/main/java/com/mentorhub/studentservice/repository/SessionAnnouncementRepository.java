package com.mentorhub.studentservice.repository;

import com.mentorhub.studentservice.model.SessionAnnouncement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SessionAnnouncementRepository extends JpaRepository<SessionAnnouncement, UUID> {
    List<SessionAnnouncement> findByTutorProfileIdOrderByCreatedAtDesc(UUID tutorProfileId);
    List<SessionAnnouncement> findAllByOrderByCreatedAtDesc();
}
