package com.mentorhub.reviewratingservice.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class TutorRatingSyncRepository {
    private final JdbcTemplate jdbcTemplate;

    public void syncTutorRating(UUID tutorProfileId, double averageRating, int reviewCount) {
        var avg = BigDecimal.valueOf(averageRating).setScale(1, RoundingMode.HALF_UP);
        jdbcTemplate.update(
                """
                UPDATE tutor_profiles
                SET "AverageRating" = ?, "ReviewCount" = ?, "UpdatedAtUtc" = NOW()
                WHERE "Id" = ?
                """,
                avg,
                reviewCount,
                tutorProfileId);
    }
}
