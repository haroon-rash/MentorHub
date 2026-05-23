package com.mentorhub.tutorservice.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public class StudentNameRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public String findStudentDisplayName(UUID studentProfileId) {
        try {
            Object result = entityManager.createNativeQuery("""
                    SELECT COALESCE(NULLIF(TRIM(ua.full_name), ''), split_part(ua.email, '@', 1))
                    FROM student_profiles sp
                    INNER JOIN user_accounts ua ON ua.id = sp."UserAccountId"
                    WHERE sp."Id" = ?1
                    LIMIT 1
                    """)
                .setParameter(1, studentProfileId)
                .getSingleResult();
            return result != null ? result.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
