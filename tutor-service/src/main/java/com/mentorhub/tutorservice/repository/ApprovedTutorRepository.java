package com.mentorhub.tutorservice.repository;

import com.mentorhub.tutorservice.model.ApprovedTutor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ApprovedTutorRepository extends JpaRepository<ApprovedTutor, UUID> {
    Optional<ApprovedTutor> findByTutorProfileId(UUID tutorProfileId);
}
