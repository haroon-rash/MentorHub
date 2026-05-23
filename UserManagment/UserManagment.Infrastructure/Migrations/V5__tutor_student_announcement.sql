-- Migration: V5__tutor_student_announcement.sql
-- Purpose: Create tables for tutor-student announcements system
-- Date: 2026-05-04

-- Table: session_announcements
-- Stores announcements created by tutors for their students
CREATE TABLE IF NOT EXISTS session_announcements (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "TutorProfileId" UUID NOT NULL,
    "TestSessionId" UUID,
    "Title" VARCHAR(255) NOT NULL,
    "AnnouncementText" TEXT NOT NULL,
    "AnnouncementType" INTEGER NOT NULL,
    -- AnnouncementType: 1=QuizAnnouncement, 2=Deadline, 3=Assignment, 4=General
    "TargetType" INTEGER NOT NULL DEFAULT 1,
    -- TargetType: 1=AllStudents, 2=SpecificStudent
    "TargetStudentId" UUID,
    "Deadline" TIMESTAMP WITH TIME ZONE,
    "CreatedAtUtc" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "UpdatedAtUtc" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: announcement_read_receipts
-- Tracks which students have read each announcement
CREATE TABLE IF NOT EXISTS announcement_read_receipts (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "AnnouncementId" UUID NOT NULL,
    "StudentProfileId" UUID NOT NULL,
    "ReadAtUtc" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE("AnnouncementId", "StudentProfileId")
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_session_announcements_tutor 
    ON session_announcements("TutorProfileId");

CREATE INDEX IF NOT EXISTS idx_session_announcements_target 
    ON session_announcements("TargetStudentId");

CREATE INDEX IF NOT EXISTS idx_session_announcements_test 
    ON session_announcements("TestSessionId");

CREATE INDEX IF NOT EXISTS idx_session_announcements_created 
    ON session_announcements("CreatedAtUtc" DESC);

CREATE INDEX IF NOT EXISTS idx_read_receipts_announcement 
    ON announcement_read_receipts("AnnouncementId");

CREATE INDEX IF NOT EXISTS idx_read_receipts_student 
    ON announcement_read_receipts("StudentProfileId");
