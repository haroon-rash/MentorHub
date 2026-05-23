package com.mentorhub.studentservice.repository;

import com.mentorhub.studentservice.model.LearningGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface LearningGoalRepository extends JpaRepository<LearningGoal, UUID> {
    List<LearningGoal> findByStudentProfileIdOrderByCreatedAtUtcDesc(UUID studentProfileId);
}
