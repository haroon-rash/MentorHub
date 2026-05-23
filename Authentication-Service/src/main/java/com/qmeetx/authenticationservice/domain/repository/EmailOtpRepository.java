package com.qmeetx.authenticationservice.domain.repository;

import com.qmeetx.authenticationservice.domain.models.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, UUID> {

    Optional<EmailOtp> findTopByEmailIgnoreCaseAndPurposeAndUsedFalseOrderByCreatedAtDesc(String email, String purpose);

    @Modifying
    @Query("update EmailOtp o set o.used = true where lower(o.email) = lower(:email) and o.purpose = :purpose and o.used = false")
    int markUnusedOtpsAsUsed(@Param("email") String email, @Param("purpose") String purpose);

    @Modifying
    @Query("delete from EmailOtp o where lower(o.email) = lower(:email)")
    void deleteByEmailIgnoreCase(@Param("email") String email);
}
