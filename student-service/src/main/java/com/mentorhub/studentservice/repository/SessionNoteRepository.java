package com.mentorhub.studentservice.repository;

import com.mentorhub.studentservice.model.SessionNote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SessionNoteRepository extends JpaRepository<SessionNote, UUID> {
    List<SessionNote> findByStudentProfileIdOrderByCreatedAtUtcDesc(UUID studentProfileId);
}
