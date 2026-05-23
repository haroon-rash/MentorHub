package com.mentorhub.reviewratingservice.repository;
import com.mentorhub.reviewratingservice.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    List<Review> findByTutorProfileIdOrderByCreatedAtUtcDesc(UUID tutorProfileId);
    boolean existsByBookingId(UUID bookingId);
    boolean existsByBatchEnrollmentId(UUID batchEnrollmentId);
}
