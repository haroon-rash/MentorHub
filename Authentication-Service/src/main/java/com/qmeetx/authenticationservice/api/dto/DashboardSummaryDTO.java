package com.qmeetx.authenticationservice.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDTO {
    private long activeLearners;
    private long newTutorRequests;
    private long sessionsBooked;
    private long platformRevenue;
    private int tutorVerificationRate;
    private int sessionFulfillmentRate;
    private List<String> moderationFeed;
}
