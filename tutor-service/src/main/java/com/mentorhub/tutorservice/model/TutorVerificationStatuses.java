package com.mentorhub.tutorservice.model;

/**
 * Aligns with .NET {@code TutorVerificationStatus}: Pending=1, Approved=2, Rejected=3.
 */
public final class TutorVerificationStatuses {
    public static final int PENDING = 1;
    public static final int APPROVED = 2;
    public static final int REJECTED = 3;

    private TutorVerificationStatuses() {}

    public static String toApiString(Integer status) {
        if (status == null) {
            return "Pending";
        }
        return switch (status) {
            case APPROVED -> "Approved";
            case REJECTED -> "Rejected";
            case PENDING -> "Pending";
            // Legacy Java values before alignment
            case 0 -> "Pending";
            default -> "Pending";
        };
    }

    public static boolean canEditProfile(int status) {
        return status == PENDING || status == REJECTED || status == 0;
    }
}
