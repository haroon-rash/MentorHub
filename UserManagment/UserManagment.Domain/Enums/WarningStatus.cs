namespace UserManagment.Domain.Enums;

/// <summary>
/// PendingReview = yellow banner (awaiting admin review).
/// Active = red banner (upheld warning).
/// Approved = resolved, hidden from banner, kept in history.
/// Disapproved = rejected warning, shown in separate profile section.
/// </summary>
public enum WarningStatus
{
    PendingReview = 1,
    Active = 2,
    Approved = 3,
    Disapproved = 4
}
