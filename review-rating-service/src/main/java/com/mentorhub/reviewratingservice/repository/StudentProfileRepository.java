package com.mentorhub.reviewratingservice.repository;
import com.mentorhub.reviewratingservice.model.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.UUID;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, UUID> {
    @Query("SELECT sp FROM StudentProfile sp JOIN FETCH sp.userAccount WHERE sp.userAccount.authUserId = :authUserId")
    Optional<StudentProfile> findByAuthUserId(@Param("authUserId") String authUserId);
}
