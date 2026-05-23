package com.mentorhub.tutorservice.repository;

import com.mentorhub.tutorservice.model.TutorProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TutorProfileRepository extends JpaRepository<TutorProfile, UUID> {

    @Query("SELECT tp FROM TutorProfile tp JOIN FETCH tp.userAccount WHERE tp.userAccount.authUserId = :authUserId")
    Optional<TutorProfile> findByAuthUserId(@Param("authUserId") String authUserId);

    @Query("SELECT tp FROM TutorProfile tp JOIN FETCH tp.userAccount WHERE tp.verificationStatus = :status")
    List<TutorProfile> findByVerificationStatus(@Param("status") int status);

    @Query("SELECT tp FROM TutorProfile tp JOIN FETCH tp.userAccount WHERE tp.id = :id")
    Optional<TutorProfile> findByIdWithUser(@Param("id") UUID id);

    @Query("SELECT tp FROM TutorProfile tp JOIN FETCH tp.userAccount")
    List<TutorProfile> findAllWithUser();
}
