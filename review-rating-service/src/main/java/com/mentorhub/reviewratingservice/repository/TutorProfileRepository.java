package com.mentorhub.reviewratingservice.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.mentorhub.reviewratingservice.model.TutorProfile;
import java.util.Optional;
import java.util.UUID;

public interface TutorProfileRepository extends JpaRepository<TutorProfile, UUID> {
    @Query(value = """
        SELECT ua.auth_user_id FROM tutor_profiles tp
        JOIN user_accounts ua ON ua.id = tp."UserAccountId"
        WHERE tp."Id" = :tutorProfileId
        """, nativeQuery = true)
    Optional<String> findAuthUserIdByTutorProfileId(@Param("tutorProfileId") UUID tutorProfileId);
}
