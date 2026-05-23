package com.mentorhub.studentservice.repository;

import com.mentorhub.studentservice.model.AnnouncementReadReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface AnnouncementReadReceiptRepository extends JpaRepository<AnnouncementReadReceipt, Long> {
    Optional<AnnouncementReadReceipt> findByAnnouncementIdAndStudentProfileId(UUID announcementId, UUID studentProfileId);
    boolean existsByAnnouncementIdAndStudentProfileId(UUID announcementId, UUID studentProfileId);
}
