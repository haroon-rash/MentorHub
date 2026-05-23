/** Unwrap list payloads from .NET ApiResponse { success, data: [...] } or raw arrays. */
export function unwrapApiList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.Data)) return payload.Data;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.Items)) return payload.Items;
  }
  return [];
}

export function normalizeTutorBatch(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ?? raw.Id;
  const enrolled = raw.enrolledCount ?? raw.EnrolledCount ?? 0;
  const maxStudents = raw.maxStudents ?? raw.MaxStudents ?? 0;
  const seatsAvailable = raw.seatsAvailable ?? raw.SeatsAvailable ?? Math.max(0, maxStudents - enrolled);
  return {
    ...raw,
    id,
    tutorProfileId: raw.tutorProfileId ?? raw.TutorProfileId,
    title: raw.title ?? raw.Title ?? '',
    subject: raw.subject ?? raw.Subject ?? '',
    description: raw.description ?? raw.Description,
    startDateUtc: raw.startDateUtc ?? raw.StartDateUtc,
    endDateUtc: raw.endDateUtc ?? raw.EndDateUtc,
    daysOfWeekCsv: raw.daysOfWeekCsv ?? raw.DaysOfWeekCsv,
    startTime: raw.startTime ?? raw.StartTime,
    endTime: raw.endTime ?? raw.EndTime,
    scheduleLabel: raw.scheduleLabel ?? raw.ScheduleLabel,
    packageFee: raw.packageFee ?? raw.PackageFee ?? 0,
    maxStudents,
    enrolledCount: enrolled,
    seatsAvailable,
    sessionMode: raw.sessionMode ?? raw.SessionMode,
    isOnline: raw.isOnline ?? raw.IsOnline,
    isFull: raw.isFull ?? raw.IsFull ?? (maxStudents > 0 && enrolled >= maxStudents),
    visibility: raw.visibility ?? raw.Visibility ?? 'PUBLIC',
    lifecycleStatus: raw.lifecycleStatus ?? raw.LifecycleStatus,
    isPublished: raw.isPublished ?? raw.IsPublished ?? true,
  };
}

export function normalizeEnrollment(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    ...raw,
    id: raw.id ?? raw.Id,
    tutorBatchId: raw.tutorBatchId ?? raw.TutorBatchId,
    subject: raw.subject ?? raw.Subject ?? '',
    batchTitle: raw.batchTitle ?? raw.BatchTitle ?? '',
    tutorName: raw.tutorName ?? raw.TutorName ?? '',
    startDateUtc: raw.startDateUtc ?? raw.StartDateUtc,
    endDateUtc: raw.endDateUtc ?? raw.EndDateUtc,
    status: raw.status ?? raw.Status ?? '',
    amountPaid: raw.amountPaid ?? raw.AmountPaid ?? 0,
    planMonths: raw.planMonths ?? raw.PlanMonths ?? 1,
    monthlyFeeAmount: raw.monthlyFeeAmount ?? raw.MonthlyFeeAmount ?? 0,
    completionDateUtc: raw.completionDateUtc ?? raw.CompletionDateUtc ?? null,
    effectiveEndDateUtc: raw.effectiveEndDateUtc ?? raw.EffectiveEndDateUtc ?? null,
    withdrawalRequestedAtUtc: raw.withdrawalRequestedAtUtc ?? raw.WithdrawalRequestedAtUtc ?? null,
    withdrawalReason: raw.withdrawalReason ?? raw.WithdrawalReason ?? '',
    scheduleLabel: raw.scheduleLabel ?? raw.ScheduleLabel ?? '',
    sessionMode: raw.sessionMode ?? raw.SessionMode ?? '',
    locationOrMeetingInfo: raw.locationOrMeetingInfo ?? raw.LocationOrMeetingInfo ?? null,
  };
}

export function normalizeStudyMaterial(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    ...raw,
    id: raw.id ?? raw.Id,
    tutorBatchId: raw.tutorBatchId ?? raw.TutorBatchId ?? null,
    batchTitle: raw.batchTitle ?? raw.BatchTitle ?? '',
    subject: raw.subject ?? raw.Subject ?? '',
    title: raw.title ?? raw.Title ?? '',
    description: raw.description ?? raw.Description ?? '',
    topic: raw.topic ?? raw.Topic ?? '',
    module: raw.module ?? raw.Module ?? '',
    chapter: raw.chapter ?? raw.Chapter ?? '',
    tagsCsv: raw.tagsCsv ?? raw.TagsCsv ?? '',
    fileUrlsCsv: raw.fileUrlsCsv ?? raw.FileUrlsCsv ?? '',
    tutorName: raw.tutorName ?? raw.TutorName ?? '',
    createdAtUtc: raw.createdAtUtc ?? raw.CreatedAtUtc,
  };
}
