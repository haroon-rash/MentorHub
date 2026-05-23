package com.mentorhub.tutorservice.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AnnouncementSchemaRunner implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("""
                DO $$
                BEGIN
                  IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'session_announcements'
                      AND column_name = 'Title'
                  ) THEN
                    ALTER TABLE session_announcements RENAME TO session_announcements_legacy_v5;
                  END IF;
                END $$;
                """);

            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS session_announcements (
                    id UUID PRIMARY KEY,
                    tutor_profile_id UUID NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    content TEXT NOT NULL,
                    target_type VARCHAR(64),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """);

            jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_session_announcements_tutor_created
                ON session_announcements (tutor_profile_id, created_at DESC);
                """);

            log.info("session_announcements schema ready (Java snake_case)");
        } catch (Exception ex) {
            log.warn("Could not ensure session_announcements schema: {}", ex.getMessage());
        }
    }
}
