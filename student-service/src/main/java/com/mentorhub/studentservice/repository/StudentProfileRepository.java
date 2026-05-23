package com.mentorhub.studentservice.repository;

import com.mentorhub.studentservice.model.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, UUID> {

    @Query("SELECT sp FROM StudentProfile sp WHERE sp.userAccountId = (SELECT ua.id FROM UserAccount ua WHERE ua.authUserId = :authUserId)")
    Optional<StudentProfile> findByAuthUserId(@Param("authUserId") String authUserId);
}
