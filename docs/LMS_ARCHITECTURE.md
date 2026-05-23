# MentorHub LMS — Batch + Enrollment Architecture

## Problem

Simple one-off `bookings` allowed students to purchase the same subject multiple times during an active monthly package. Real academies use **one enrollment per package period** with auto-generated class sessions.

## Core aggregates (DDD)

| Aggregate | Root entity | Responsibility |
|-----------|-------------|----------------|
| **TutorBatch** | `TutorBatch` | Course definition: schedule, fee, capacity, subject |
| **Enrollment** | `BatchEnrollment` | Student joins batch once; active window `[StartDate, EndDate]` |
| **Class schedule** | `GeneratedClassSession` | Materialized sessions from batch rules |
| **Assignment** | `CourseAssignment` | Tutor homework with due date and rubric |
| **Submission** | `AssignmentSubmission` | Student work + tutor grading |

Legacy `Booking` remains for **hourly single sessions** only.

## Enrollment rules

1. **No duplicate active enrollment** for same `(Student, Tutor, Subject)` while `Status ∈ {Pending, Active}` and `EndDateUtc >= now`.
2. **Date overlap**: new period must not overlap existing active period.
3. **Capacity**: `batch_enrollments` count &lt; `TutorBatch.MaxStudents`.
4. **Renewal**: allowed only after `Expired` or `Cancelled`.
5. **DB constraint**: partial unique index on `(StudentProfileId, TutorProfileId, lower(Subject))` where status active.

## Session generation

`ClassSessionGenerator` walks each calendar day from `StartDateUtc` to `EndDateUtc`, emits `GeneratedClassSession` for matching `DaysOfWeekCsv` (e.g. `Monday,Wednesday,Friday`).

## API surface (gateway → usermanagment-api)

| Method | Route | Role |
|--------|-------|------|
| POST | `/api/v1/tutor-batches` | Tutor — create batch + generate sessions |
| GET | `/api/v1/tutor-batches/mine` | Tutor |
| GET | `/api/v1/tutor-batches/tutor/{id}` | Public — published batches |
| POST | `/api/v1/enrollments/batch/{batchId}` | Student — enroll in existing batch |
| POST | `/api/v1/enrollments/package` | Student — ad-hoc monthly package |
| GET | `/api/v1/enrollments/mine` | Student |
| GET | `/api/v1/enrollments/can-enroll` | Student — pre-check |
| POST | `/api/v1/course-assignments` | Tutor |
| GET | `/api/v1/course-assignments/student` | Student |

## Student booking UX

- **Monthly package** → `POST /enrollments/package` (not `POST /bookings`).
- **Hourly** → `POST /bookings` (blocked if active enrollment exists for that subject+tutor).

## Progress analytics (computed)

`StudentPerformanceSummaryResponse`:

- Assignment average %
- Attendance rate (from `session_attendance`)
- Goals achieved / total
- Weak subjects from assessments

## Notifications (planned hooks)

- Enrollment confirmed → tutor
- Assignment due in 24h → student
- Package expiring in 7 days → student + tutor

## Phase 2 (recommended)

- Link `GeneratedClassSession` to Jitsi on session day
- Tutor attendance UI per session
- Subscription renewal job (cron expires enrollments)
- Spring Boot `enrollment-service` if UM API splits
