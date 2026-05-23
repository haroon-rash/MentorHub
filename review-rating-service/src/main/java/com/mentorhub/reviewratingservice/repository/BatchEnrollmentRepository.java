package com.mentorhub.reviewratingservice.repository;
import com.mentorhub.reviewratingservice.model.BatchEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface BatchEnrollmentRepository extends JpaRepository<BatchEnrollment, UUID> {
}
