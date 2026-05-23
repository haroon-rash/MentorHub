package com.mentorhub.studentservice.service;

import com.mentorhub.studentservice.model.*;
import com.mentorhub.studentservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentProgressService {

    private final StudentProfileRepository studentProfileRepository;
    private final LearningGoalRepository learningGoalRepository;
    private final AssessmentRecordRepository assessmentRecordRepository;
    private final SessionNoteRepository sessionNoteRepository;

    public Map<String, Object> getProgress(String authUserId) {
        var profile = studentProfileRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        var goals = learningGoalRepository.findByStudentProfileIdOrderByCreatedAtUtcDesc(profile.getId())
                .stream().map(this::mapGoal).toList();
        var assessments = assessmentRecordRepository.findByStudentProfileIdOrderByDateRecordedDesc(profile.getId())
                .stream().map(this::mapAssessment).toList();
        var notes = sessionNoteRepository.findByStudentProfileIdOrderByCreatedAtUtcDesc(profile.getId())
                .stream().map(this::mapSessionNote).toList();

        var weakSubjects = assessments.stream()
                .filter(a -> ((Number) a.get("totalScore")).doubleValue() > 0)
                .collect(Collectors.groupingBy(a -> a.get("subject") + "|" + a.get("topicTag")))
                .entrySet().stream()
                .map(e -> {
                    var list = e.getValue();
                    double avg = list.stream()
                            .mapToDouble(a -> ((Number) a.get("scorePercentage")).doubleValue())
                            .average().orElse(0);
                    var parts = e.getKey().split("\\|", 2);
                    return Map.<String, Object>of(
                            "subject", parts[0],
                            "topicTag", parts.length > 1 ? parts[1] : "",
                            "averageScore", Math.round(avg * 10.0) / 10.0
                    );
                })
                .sorted(Comparator.comparingDouble(w -> ((Number) w.get("averageScore")).doubleValue()))
                .limit(3)
                .toList();

        var result = new LinkedHashMap<String, Object>();
        result.put("goals", goals);
        result.put("assessments", assessments);
        result.put("sessionNotes", notes);
        result.put("weakSubjects", weakSubjects);
        return result;
    }

    @Transactional
    public Map<String, Object> addGoal(String authUserId, Map<String, Object> request) {
        var profile = studentProfileRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        var title = request.get("title") != null ? request.get("title").toString().trim() : "";
        if (title.isBlank()) {
            throw new IllegalArgumentException("Goal title is required");
        }

        var now = Instant.now();
        var goal = LearningGoal.builder()
                .id(UUID.randomUUID())
                .studentProfileId(profile.getId())
                .studentProfileIdMirror(profile.getId())
                .title(title)
                .description((String) request.get("description"))
                .status("Not Started")
                .createdAtUtc(now)
                .createdAtUtcMirror(now)
                .build();

        if (request.containsKey("targetDate") && request.get("targetDate") != null && !request.get("targetDate").toString().isBlank()) {
            goal.setTargetDate(parseTargetDate(request.get("targetDate").toString()));
        }

        return mapGoal(learningGoalRepository.save(goal));
    }

    @Transactional
    public Map<String, Object> updateGoalStatus(String authUserId, UUID goalId, String status) {
        var profile = studentProfileRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        var goal = learningGoalRepository.findById(goalId)
                .orElseThrow(() -> new IllegalArgumentException("Goal not found"));

        if (!goal.getStudentProfileId().equals(profile.getId())) {
            throw new IllegalArgumentException("Goal does not belong to this student");
        }

        goal.setStatus(status);
        return mapGoal(learningGoalRepository.save(goal));
    }

    @Transactional
    public Map<String, Object> addAssessment(String authUserId, Map<String, Object> request) {
        var profile = studentProfileRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        var record = AssessmentRecord.builder()
                .id(UUID.randomUUID())
                .studentProfileId(profile.getId())
                .submittedByUserId(authUserId)
                .title((String) request.get("title"))
                .subject((String) request.get("subject"))
                .topicTag((String) request.getOrDefault("topicTag", ""))
                .scoreObtained(new BigDecimal(request.get("scoreObtained").toString()))
                .totalScore(new BigDecimal(request.get("totalScore").toString()))
                .dateRecorded(Instant.now())
                .build();

        if (request.containsKey("tutorProfileId") && request.get("tutorProfileId") != null) {
            record.setTutorProfileId(UUID.fromString(request.get("tutorProfileId").toString()));
        }
        if (request.containsKey("studentConfidenceLevel") && request.get("studentConfidenceLevel") != null) {
            record.setStudentConfidenceLevel(Integer.parseInt(request.get("studentConfidenceLevel").toString()));
        }
        if (request.containsKey("dateRecorded") && request.get("dateRecorded") != null && !request.get("dateRecorded").toString().isBlank()) {
            record.setDateRecorded(Instant.parse(request.get("dateRecorded").toString() + (request.get("dateRecorded").toString().endsWith("Z") ? "" : "T00:00:00Z")));
        }

        return mapAssessment(assessmentRecordRepository.save(record));
    }

    @Transactional
    public Map<String, Object> addSessionNote(String authUserId, Map<String, Object> request) {
        var profile = studentProfileRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        var note = SessionNote.builder()
                .id(UUID.randomUUID())
                .bookingId(UUID.fromString(request.get("bookingId").toString()))
                .studentProfileId(profile.getId())
                .tutorProfileId(UUID.fromString(request.get("tutorProfileId").toString()))
                .topicsCovered((String) request.get("topicsCovered"))
                .remarks((String) request.get("remarks"))
                .areasForImprovement((String) request.getOrDefault("areasForImprovement", null))
                .resourceLinksCsv((String) request.getOrDefault("resourceLinksCsv", null))
                .createdAtUtc(Instant.now())
                .build();

        return mapSessionNote(sessionNoteRepository.save(note));
    }

    private Map<String, Object> mapGoal(LearningGoal g) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", g.getId());
        map.put("title", g.getTitle());
        map.put("description", g.getDescription());
        map.put("targetDate", g.getTargetDate());
        map.put("status", g.getStatus());
        map.put("createdAtUtc", g.getCreatedAtUtc());
        return map;
    }

    private Map<String, Object> mapAssessment(AssessmentRecord a) {
        double pct = 0;
        if (a.getTotalScore() != null && a.getTotalScore().compareTo(BigDecimal.ZERO) > 0) {
            pct = a.getScoreObtained()
                    .divide(a.getTotalScore(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
        }
        var map = new LinkedHashMap<String, Object>();
        map.put("id", a.getId());
        map.put("title", a.getTitle());
        map.put("subject", a.getSubject());
        map.put("topicTag", a.getTopicTag());
        map.put("scoreObtained", a.getScoreObtained());
        map.put("totalScore", a.getTotalScore());
        map.put("scorePercentage", Math.round(pct * 10.0) / 10.0);
        map.put("studentConfidenceLevel", a.getStudentConfidenceLevel());
        map.put("submittedByUserId", a.getSubmittedByUserId());
        map.put("dateRecorded", a.getDateRecorded());
        return map;
    }

    private static Instant parseTargetDate(String raw) {
        var value = raw.trim();
        if (value.length() <= 10) {
            return LocalDate.parse(value).atStartOfDay().toInstant(ZoneOffset.UTC);
        }
        return Instant.parse(value);
    }

    private Map<String, Object> mapSessionNote(SessionNote n) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", n.getId());
        map.put("bookingId", n.getBookingId());
        map.put("tutorFullName", "Tutor");
        map.put("topicsCovered", n.getTopicsCovered());
        map.put("remarks", n.getRemarks());
        map.put("areasForImprovement", n.getAreasForImprovement());
        map.put("resourceLinks", n.getResourceLinksCsv() != null && !n.getResourceLinksCsv().isBlank()
                ? Arrays.asList(n.getResourceLinksCsv().split(","))
                : List.of());
        map.put("createdAtUtc", n.getCreatedAtUtc());
        return map;
    }
}
