package com.mentorhub.studentservice.repository;

import com.mentorhub.studentservice.model.AssessmentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AssessmentRecordRepository extends JpaRepository<AssessmentRecord, UUID> {
    List<AssessmentRecord> findByStudentProfileIdOrderByDateRecordedDesc(UUID studentProfileId);
}
