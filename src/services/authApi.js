import { getApiGatewayBase } from '../utils/apiGatewayBase.js';

const AUTH_API_BASE_URL = getApiGatewayBase();
const USER_API_BASE_URL = getApiGatewayBase();

export function getIdentityHeaders(token) {
  if (!token) {
    return {};
  }

  const payload = decodeJwtPayload(token);
  let roleValue = Array.isArray(payload?.roles)
    ? payload.roles[0]
    : payload?.role || payload?.Role || payload?.authorities || '';

  // Map backend integer roles to frontend strings
  const roleMap = {
    '1': 'STUDENT',
    '2': 'TUTOR',
    '3': 'OWNER',
    '4': 'ADMIN',
  };

  const role = roleMap[String(roleValue)] || String(roleValue || '').replace(/^ROLE_/, '').toUpperCase();

  const authUserId = payload?.authId || payload?.userId || payload?.id || payload?.sub || payload?.email || '';

  // Identity and active role are enforced server-side from the Bearer JWT only (via gateway).
  // Do not send X-User-Role or X-Auth-User-Id — prevents role spoofing on misconfigured backends.
  return {};
}

async function parseError(response) {
  let message = 'Request failed';

  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (data?.errors && typeof data.errors === 'object') {
        const parts = Object.values(data.errors).flat().filter(Boolean);
        if (parts.length > 0) {
          message = parts.join(' ');
        }
      }
      message = data?.message || data?.Message || data?.data?.message || data?.detail || data?.data?.error || data?.error || data?.title || message;
      if (data?.success === false && data?.message) {
        message = data.message;
      }
    } else {
      const text = await response.text();
      if (text && text.length < 300) {
        message = text;
      }
    }
  } catch {
    // Keep fallback message.
  }

  if (message === 'Request failed') {
    if (response.status === 403) {
      message = 'Access denied. Your account does not have permission for this action.';
    } else if (response.status === 401) {
      message = 'Your session expired or is invalid. Please sign out and sign in again.';
    } else if (response.status === 502 || response.status === 503) {
      message = 'A backend service is temporarily unavailable. Wait a minute, then try again.';
    } else if (response.status >= 500) {
      message = 'Server error. Please try again in a moment.';
    }
  }

  throw new Error(message);
}

async function parseResponse(response) {
  if (!response.ok) {
    await parseError(response);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  const body = await response.json();
  let data = body?.data ?? body;
  if (data && typeof data === 'object' && 'Url' in data && data.url === undefined) {
    data = { ...data, url: data.Url };
  }
  if (body && typeof body === 'object' && 'Url' in body && typeof data !== 'string') {
    const url = body.Url ?? body.url;
    if (url && (!data || typeof data !== 'object' || !data.url)) {
      data = typeof data === 'object' && data !== null ? { ...data, url } : { url };
    }
  }

  // Global role mapping for any response containing a 'role' field (like login/signup)
  if (data && typeof data === 'object' && 'role' in data) {
    const roleMap = {
      '1': 'STUDENT',
      '2': 'TUTOR',
      '3': 'OWNER',
      '4': 'ADMIN',
    };
    const rawRole = String(data.role);
    if (roleMap[rawRole]) {
      data.role = roleMap[rawRole];
    } else if (typeof data.role === 'string') {
      data.role = data.role.toUpperCase();
    }
  }

  return data;
}

export async function authFetch(path, options = {}, token) {
  const response = await fetch(`${AUTH_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...getIdentityHeaders(token),
    },
  });

  return parseResponse(response);
}

async function userFetch(path, options = {}, token) {
  const response = await fetch(`${USER_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...getIdentityHeaders(token),
    },
  });

  return parseResponse(response);
}

/** Java services return `{ success, data }` for list endpoints; keep envelope for the UI. */
async function userFetchSpringEnvelope(path, options = {}, token) {
  const response = await fetch(`${USER_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...getIdentityHeaders(token),
    },
  });
  if (!response.ok) {
    await parseError(response);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return { success: false, data: null };
  }
  const body = await response.json();
  if (body && typeof body === 'object' && 'success' in body) {
    return body;
  }
  return { success: true, data: body };
}



export async function signup({ name, email, password, role }) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password, role }),
  });

  return parseResponse(response);
}

export async function login({ email, password }) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  return parseResponse(response);
}

export async function verifyOtp({ email, otp }) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, otp }),
  });

  return parseResponse(response);
}

export async function resendOtp({ email }) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/auth/resend-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  return parseResponse(response);
}

export async function requestPasswordReset({ email }) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/auth/password-reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseResponse(response);
}

export async function verifyPasswordResetOtp({ email, otp }) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/auth/password-reset/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  return parseResponse(response);
}

export async function confirmPasswordReset({ email, resetToken, newPassword, confirmPassword }) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/auth/password-reset/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, resetToken, newPassword, confirmPassword }),
  });
  return parseResponse(response);
}

export async function adminLogin({ email, password }) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseResponse(response);
}

export async function adminVerifyOtp({ email, otp }) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/auth/admin/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  return parseResponse(response);
}

export async function refreshSession(refreshToken) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  return parseResponse(response);
}

export async function logout({ token, refreshToken }) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ refreshToken }),
  });

  return parseResponse(response);
}

export async function fetchMyProfile(token) {
  return authFetch('/api/v1/profile/me', { method: 'GET' }, token);
}

export async function fetchDashboardSummary(token) {
  return authFetch('/api/v1/dashboard/summary', { method: 'GET' }, token);
}

export async function fetchApprovedTutors() {
  return userFetch('/api/v1/tutors/approved', { method: 'GET' });
}

export async function fetchApprovedTutorById(tutorProfileId) {
  return userFetch(`/api/v1/tutors/approved/${encodeURIComponent(tutorProfileId)}`, { method: 'GET' });
}

export async function fetchTutorApprovals(token) {
  return authFetch('/api/v1/dashboard/approvals', { method: 'GET' }, token);
}

export async function updateTutorApproval({ token, id, status }) {
  return authFetch(
    `/api/v1/dashboard/approvals/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    token,
  );
}

export async function fetchTutorOnboardingProfile(token) {
  return userFetch('/api/v1/tutor-onboarding/me', { method: 'GET' }, token);
}

export async function upsertTutorOnboardingProfile({ token, payload }) {
  return userFetch(
    '/api/v1/tutor-onboarding/me',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function fetchStudentOnboardingProfile(token) {
  return userFetch('/api/v1/student-onboarding/me', { method: 'GET' }, token);
}

export async function upsertStudentOnboardingProfile({ token, payload }) {
  return userFetch(
    '/api/v1/student-onboarding/me',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function fetchSuperAdminDashboard(token) {
  return userFetch('/api/v1/super-admin/dashboard', { method: 'GET' }, token);
}

export async function fetchSuperAdminTutorRequests({ token, status }) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return userFetch(`/api/v1/super-admin/tutor-requests${query}`, { method: 'GET' }, token);
}

export async function reviewTutorVerification({ token, tutorProfileId, approve, notes }) {
  return userFetch(
    `/api/v1/super-admin/tutor-requests/${tutorProfileId}/review`,
    {
      method: 'POST',
      body: JSON.stringify({ approve, notes }),
    },
    token,
  );
}

export async function fetchTutorById(id) {
  return userFetch(`/api/v1/tutors/${id}`, { method: 'GET' });
}

export async function createBooking({ token, payload }) {
  return userFetch(
    '/api/v1/bookings',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function fetchBookedSlots(tutorId, date, token) {
  return userFetch(`/api/v1/bookings/tutor/${tutorId}/booked-slots?date=${encodeURIComponent(date)}`, { method: 'GET' }, token);
}

export async function fetchStudentBookings(token) {
  return userFetch('/api/v1/bookings/student', { method: 'GET' }, token);
}

export async function fetchTutorBookings(token) {
  return userFetch('/api/v1/bookings/tutor', { method: 'GET' }, token);
}




async function uploadMultipart(path, file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${USER_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...getIdentityHeaders(token),
    },
    body: formData,
  });

  const data = await parseResponse(response);
  const url = typeof data === 'string'
    ? data
    : (data?.url || data?.Url || '');
  if (!url) {
    throw new Error('Upload failed: no file URL returned');
  }
  return { url };
}

export function extractUploadUrl(result) {
  if (typeof result === 'string') return result;
  return result?.url || result?.Url || '';
}

export async function uploadProfilePicture(file, token) {
  return uploadMultipart('/api/v1/files/upload-profile-picture', file, token);
}

export async function uploadDocument(file, token) {
  return uploadMultipart('/api/v1/files/upload-document', file, token);
}

export function decodeJwtPayload(token) {

  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return {};
    }

    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

export async function markNotificationRead(notificationId, token) {
  return userFetch(`/api/v1/notifications/${notificationId}/read`, { method: 'PATCH' }, token);
}

export async function markAllNotificationsRead(token) {
  return userFetch('/api/v1/notifications/read-all', { method: 'PATCH' }, token);
}

export async function fetchNotifications(token) {
  return userFetch('/api/v1/notifications', { method: 'GET' }, token);
}

export async function createReview({ token, payload }) {
  return userFetch('/api/v1/reviews', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export async function fetchTutorReviews(tutorProfileId) {
  return userFetch(`/api/v1/reviews/tutor/${encodeURIComponent(tutorProfileId)}`, { method: 'GET' });
}

export async function confirmBooking({ token, bookingId }) {
  return userFetch(`/api/v1/bookings/${bookingId}/confirm`, { method: 'PATCH' }, token);
}

export async function cancelBooking({ token, bookingId, reason }) {
  return userFetch(`/api/v1/bookings/${bookingId}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  }, token);
}

export async function completeBooking({ token, bookingId }) {
  return userFetch(`/api/v1/bookings/${bookingId}/complete`, { method: 'PATCH' }, token);
}

export async function fetchTutorDashboardStats(token) {
  return userFetch('/api/v1/bookings/tutor/stats', { method: 'GET' }, token);
}

export async function fetchAdminAnalytics(token) {
  return userFetch('/api/v1/super-admin/analytics', { method: 'GET' }, token);
}

export async function fetchApprovedTutorsWithFilters({ subject, minFee, maxFee, teachingMode, location, search } = {}) {
  const params = new URLSearchParams();
  if (subject) params.append('subject', subject);
  if (minFee != null) params.append('minFee', minFee);
  if (maxFee != null) params.append('maxFee', maxFee);
  if (teachingMode) params.append('teachingMode', teachingMode);
  if (location) params.append('location', location);
  if (search) params.append('search', search);
  const query = params.toString() ? `?${params.toString()}` : '';
  return userFetch(`/api/v1/tutors/search${query}`, { method: 'GET' });
}

export async function fetchConversations(token) {
  return userFetch('/api/v1/chat/conversations', { method: 'GET' }, token);
}

export async function sendChatMessage({ token, receiverAuthUserId, content }) {
  return userFetch('/api/v1/chat/send-message', {
    method: 'POST',
    body: JSON.stringify({ receiverAuthUserId, content }),
  }, token);
}

export async function fetchChatHistory(token, otherUserId) {
  return userFetch(`/api/v1/chat/history/${encodeURIComponent(otherUserId)}`, { method: 'GET' }, token);
}

export async function fetchChatProfiles(token, authUserIds) {
  return userFetch('/api/v1/chat/profiles', {
    method: 'POST',
    body: JSON.stringify(authUserIds),
  }, token);
}

export async function blockUser(token, blockedUserId) {
  return userFetch(`/api/v1/chat/block/${encodeURIComponent(blockedUserId)}`, { method: 'POST' }, token);
}

export async function unblockUser(token, blockedUserId) {
  return userFetch(`/api/v1/chat/unblock/${encodeURIComponent(blockedUserId)}`, { method: 'POST' }, token);
}

export async function fetchAdminChatRecipients(token, search = '') {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  const query = params.toString() ? `?${params.toString()}` : '';
  return userFetch(`/api/v1/chat/admin/recipients${query}`, { method: 'GET' }, token);
}

export async function fetchSuperAdminUsers({
  token,
  skip = 0,
  take = 20,
  search = '',
  role = '',
  emailVerified = null,
  tutorVerification = '',
  hasRestriction = null,
  hasWarnings = null,
}) {
  const params = new URLSearchParams({ skip, take });
  if (search) params.append('search', search);
  if (role) params.append('role', role);
  if (emailVerified !== null && emailVerified !== '') params.append('emailVerified', emailVerified);
  if (tutorVerification) params.append('tutorVerification', tutorVerification);
  if (hasRestriction === true) params.append('hasRestriction', 'true');
  if (hasWarnings === true) params.append('hasWarnings', 'true');
  return userFetch(`/api/v1/super-admin/users?${params.toString()}`, { method: 'GET' }, token);
}

export async function fetchAdminUserDetail(userId, token) {
  return userFetch(`/api/v1/super-admin/users/${userId}`, { method: 'GET' }, token);
}

export async function lookupAdminUsersByEmail({ token, email }) {
  const params = new URLSearchParams({ email });
  return userFetch(`/api/v1/super-admin/users/lookup?${params.toString()}`, { method: 'GET' }, token);
}

export async function secureDeleteAdminUser({ userId, token, adminPassword, reason }) {
  return userFetch(`/api/v1/super-admin/users/${userId}/secure-delete`, {
    method: 'POST',
    body: JSON.stringify({ adminPassword, reason }),
  }, token);
}

// ── Student Progress ─────────────────────────────────────────────────────────

export async function fetchStudentProgress(token) {
  return userFetch('/api/v1/student-progress', { method: 'GET' }, token);
}

export async function addLearningGoal({ token, title, description, targetDate }) {
  return userFetch('/api/v1/student-progress/goals', {
    method: 'POST',
    body: JSON.stringify({ title, description, targetDate }),
  }, token);
}

export async function updateGoalStatus({ token, goalId, status }) {
  return userFetch(`/api/v1/student-progress/goals/${goalId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }, token);
}

export async function addAssessmentRecord({ token, payload }) {
  return userFetch('/api/v1/student-progress/assessments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function addSessionNote({ token, payload }) {
  return userFetch('/api/v1/student-progress/session-notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

// ── Batches & Enrollments (LMS) ───────────────────────────────────────────────

export async function fetchMyEnrollments(token) {
  return userFetch('/api/v1/enrollments/mine', { method: 'GET' }, token);
}

export async function fetchEnrollmentBillingPeriods({ token, enrollmentId }) {
  return userFetch(`/api/v1/enrollments/${enrollmentId}/billing-periods`, { method: 'GET' }, token);
}

export async function previewEnrollmentWithdrawal({ token, enrollmentId, requestedLeaveDateUtc, reason }) {
  return userFetch(`/api/v1/enrollments/${enrollmentId}/withdraw/preview`, {
    method: 'POST',
    body: JSON.stringify({ requestedLeaveDateUtc, reason }),
  }, token);
}

export async function confirmEnrollmentWithdrawal({ token, enrollmentId, requestedLeaveDateUtc, reason }) {
  return userFetch(`/api/v1/enrollments/${enrollmentId}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ requestedLeaveDateUtc, reason }),
  }, token);
}

export async function fetchEnrollmentReviewEligibility({ token, enrollmentId }) {
  return userFetch(`/api/v1/enrollments/${enrollmentId}/review-eligibility`, { method: 'GET' }, token);
}

export async function fetchReviewPrompts(token) {
  return userFetch('/api/v1/enrollments/review-prompts', { method: 'GET' }, token);
}

export async function completeEnrollment({ token, enrollmentId }) {
  return userFetch(`/api/v1/enrollments/${enrollmentId}/complete`, { method: 'POST' }, token);
}

export async function canEnrollInBatch({ token, batchId }) {
  const params = new URLSearchParams({ batchId });
  return userFetch(`/api/v1/enrollments/can-enroll-batch?${params}`, { method: 'GET' }, token);
}

export async function fetchTutorBatchDetail({ token, batchId }) {
  return userFetch(`/api/v1/tutor-batches/${batchId}`, { method: 'GET' }, token);
}

export async function canEnrollPackage({
  token,
  tutorProfileId,
  subject,
  startDateUtc,
  planMonths,
  daysOfWeekCsv,
  startTime,
  endTime,
}) {
  const params = new URLSearchParams({
    tutorProfileId,
    subject,
    startDateUtc,
    planMonths: String(planMonths ?? 1),
  });
  if (daysOfWeekCsv) params.set('daysOfWeekCsv', daysOfWeekCsv);
  if (startTime) params.set('startTime', startTime);
  if (endTime) params.set('endTime', endTime);
  return userFetch(`/api/v1/enrollments/can-enroll?${params}`, { method: 'GET' }, token);
}

export async function enrollInPackage({ token, payload }) {
  return userFetch('/api/v1/enrollments/package', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function enrollInBatch({ token, batchId, studentNotes }) {
  return userFetch(`/api/v1/enrollments/batch/${batchId}`, {
    method: 'POST',
    body: JSON.stringify({ studentNotes: studentNotes || null }),
  }, token);
}

export async function fetchTutorBatchesForTutor(tutorProfileId) {
  const data = await userFetch(`/api/v1/tutor-batches/tutor/${tutorProfileId}`, { method: 'GET' });
  const list = Array.isArray(data) ? data : (data?.data ?? data?.Data);
  return Array.isArray(list) ? list : [];
}

export async function updateStudyMaterial({ token, materialId, payload }) {
  return userFetch(`/api/v1/study-materials/${materialId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function createTutorBatch({ token, payload }) {
  return userFetch('/api/v1/tutor-batches', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function fetchMyTutorBatches(token) {
  return userFetch('/api/v1/tutor-batches/mine', { method: 'GET' }, token);
}

export async function fetchCourseAssignmentsForStudent(token) {
  return userFetch('/api/v1/course-assignments/student', { method: 'GET' }, token);
}

export async function fetchCourseAssignmentsForTutor(token) {
  return userFetch('/api/v1/course-assignments/tutor', { method: 'GET' }, token);
}

export async function createCourseAssignment({ token, payload }) {
  return userFetch('/api/v1/course-assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function submitCourseAssignment({ token, assignmentId, payload }) {
  return userFetch(`/api/v1/course-assignments/${assignmentId}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function fetchTutorEnrollments({ token, batchId }) {
  const q = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
  return userFetch(`/api/v1/enrollments/tutor${q}`, { method: 'GET' }, token);
}

export async function fetchAssignmentSubmissions({ token, assignmentId }) {
  return userFetch(`/api/v1/course-assignments/${assignmentId}/submissions`, { method: 'GET' }, token);
}

export async function gradeAssignmentSubmission({ token, submissionId, payload }) {
  return userFetch(`/api/v1/course-assignments/submissions/${submissionId}/grade`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function fetchBatchSessions({ batchId, token }) {
  return userFetch(`/api/v1/tutor-batches/${batchId}/sessions`, { method: 'GET' }, token);
}

export async function updateTutorBatch({ token, batchId, payload }) {
  return userFetch(`/api/v1/tutor-batches/${batchId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteTutorBatch({ token, batchId, force = false, archiveInstead = true }) {
  const params = new URLSearchParams();
  if (force) params.set('force', 'true');
  if (archiveInstead) params.set('archiveInstead', 'true');
  const q = params.toString() ? `?${params}` : '';
  return userFetch(`/api/v1/tutor-batches/${batchId}${q}`, { method: 'DELETE' }, token);
}

export async function archiveTutorBatch({ token, batchId }) {
  return userFetch(`/api/v1/tutor-batches/${batchId}/archive`, { method: 'POST' }, token);
}

export async function duplicateTutorBatch({ token, batchId }) {
  return userFetch(`/api/v1/tutor-batches/${batchId}/duplicate`, { method: 'POST' }, token);
}

export async function completeTutorBatch({ token, batchId }) {
  return userFetch(`/api/v1/tutor-batches/${batchId}/complete`, { method: 'POST' }, token);
}

export async function cancelTutorBatch({ token, batchId }) {
  return userFetch(`/api/v1/tutor-batches/${batchId}/cancel`, { method: 'POST' }, token);
}

export async function updateCourseAssignment({ token, assignmentId, payload }) {
  return userFetch(`/api/v1/course-assignments/${assignmentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function extendAssignmentDeadline({ token, assignmentId, dueDateUtc }) {
  return userFetch(`/api/v1/course-assignments/${assignmentId}/extend-deadline`, {
    method: 'POST',
    body: JSON.stringify({ dueDateUtc }),
  }, token);
}

export async function rejectCourseAssignment({ token, assignmentId, reason }) {
  return userFetch(`/api/v1/course-assignments/${assignmentId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }, token);
}

export async function cancelCourseAssignment({ token, assignmentId, reason }) {
  return userFetch(`/api/v1/course-assignments/${assignmentId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }, token);
}

export async function archiveCourseAssignment({ token, assignmentId }) {
  return userFetch(`/api/v1/course-assignments/${assignmentId}/archive`, { method: 'POST' }, token);
}

export async function republishCourseAssignment({ token, assignmentId }) {
  return userFetch(`/api/v1/course-assignments/${assignmentId}/republish`, { method: 'POST' }, token);
}

export async function queryAssignmentSubmissions({ token, params = {} }) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const q = qs.toString() ? `?${qs}` : '';
  return userFetch(`/api/v1/course-assignments/submissions${q}`, { method: 'GET' }, token);
}

export async function fetchSubmissionDetail({ token, submissionId }) {
  return userFetch(`/api/v1/course-assignments/submissions/${submissionId}`, { method: 'GET' }, token);
}

export async function fetchEnrolledStudentDetail({ token, studentProfileId, batchId }) {
  const q = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
  return userFetch(`/api/v1/enrollments/tutor/student/${studentProfileId}${q}`, { method: 'GET' }, token);
}

export async function fetchStudyMaterialsForTutor(token) {
  return userFetch('/api/v1/study-materials/tutor', { method: 'GET' }, token);
}

export async function fetchStudyMaterialsForStudent(token) {
  return userFetch('/api/v1/study-materials/student', { method: 'GET' }, token);
}

export async function createStudyMaterial({ token, payload }) {
  return userFetch('/api/v1/study-materials', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteStudyMaterial({ token, materialId }) {
  return userFetch(`/api/v1/study-materials/${materialId}`, { method: 'DELETE' }, token);
}

// Legacy alias — positional args (batchId, token)
export function fetchBatchSessionsLegacy(batchId, token) {
  return userFetch(`/api/v1/tutor-batches/${batchId}/sessions`, { method: 'GET' }, token);
}

// ── CMS (Static Pages) ───────────────────────────────────────────────────────

export async function fetchCmsPages() {
  return userFetch('/api/v1/cms', { method: 'GET' });
}

export async function fetchCmsPageBySlug(slug) {
  return userFetch(`/api/v1/cms/${encodeURIComponent(slug)}`, { method: 'GET' });
}

export async function createCmsPage({ token, payload }) {
  return userFetch('/api/v1/cms', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updateCmsPage({ token, slug, payload }) {
  return userFetch(`/api/v1/cms/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteCmsPage({ token, slug }) {
  return userFetch(`/api/v1/cms/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  }, token);
}

// Tutor-Student Announcements API (requires gateway identity headers)
export async function getTutorStudents(tutorProfileId, token) {
  return userFetchSpringEnvelope(`/api/v1/tutor-students/${tutorProfileId}/students`, { method: 'GET' }, token);
}

export async function createAnnouncement(tutorProfileId, data, token) {
  return userFetchSpringEnvelope(
    `/api/v1/tutor-students/${tutorProfileId}/announcements`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function getTutorAnnouncements(tutorProfileId, token) {
  return userFetchSpringEnvelope(`/api/v1/tutor-students/${tutorProfileId}/announcements`, { method: 'GET' }, token);
}

export async function deleteAnnouncement(announcementId, token) {
  return userFetch(`/api/v1/tutor-students/announcements/${announcementId}`, { method: 'DELETE' }, token);
}

// Student Announcements API
export async function getStudentTutors(_studentProfileId, token) {
  return userFetchSpringEnvelope('/api/v1/student-announcements/my-tutors', { method: 'GET' }, token);
}

export async function fetchAnnouncementUnreadSummary(token) {
  return userFetchSpringEnvelope('/api/v1/student-announcements/unread-summary', { method: 'GET' }, token);
}

export async function getStudentAnnouncements(_studentProfileId, token) {
  return userFetchSpringEnvelope('/api/v1/student-announcements', { method: 'GET' }, token);
}

export async function getAnnouncementsFromTutor(_studentProfileId, tutorProfileId, token) {
  return userFetchSpringEnvelope(`/api/v1/student-announcements/tutor/${tutorProfileId}`, { method: 'GET' }, token);
}

export async function markAnnouncementAsRead(announcementId, token) {
  return userFetch(`/api/v1/student-announcements/${announcementId}/mark-read`, { method: 'POST' }, token);
}

// ── Platform catalog ─────────────────────────────────────────────────────────

export async function fetchPlatformCatalogGrouped() {
  return userFetch('/api/v1/catalog/grouped', { method: 'GET' });
}

export async function fetchAdminCatalogItems(token, category) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return userFetch(`/api/v1/super-admin/catalog${query}`, { method: 'GET' }, token);
}

export async function createCatalogItem({ token, payload }) {
  return userFetch('/api/v1/super-admin/catalog', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updateCatalogItem({ token, id, payload }) {
  return userFetch(`/api/v1/super-admin/catalog/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteCatalogItem({ token, id }) {
  return userFetch(`/api/v1/super-admin/catalog/${id}`, { method: 'DELETE' }, token);
}

// ── Moderation ───────────────────────────────────────────────────────────────

export async function fetchModerationStats(token) {
  return userFetch('/api/v1/super-admin/moderation/stats', { method: 'GET' }, token);
}

export async function fetchWarnings(token, authUserId) {
  const query = authUserId ? `?authUserId=${encodeURIComponent(authUserId)}` : '';
  return userFetch(`/api/v1/super-admin/moderation/warnings${query}`, { method: 'GET' }, token);
}

export async function issueWarning({ token, payload }) {
  return userFetch('/api/v1/super-admin/moderation/warnings', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function fetchRestrictions(token, authUserId) {
  const query = authUserId ? `?authUserId=${encodeURIComponent(authUserId)}` : '';
  return userFetch(`/api/v1/super-admin/moderation/restrictions${query}`, { method: 'GET' }, token);
}

export async function applyRestriction({ token, payload }) {
  return userFetch('/api/v1/super-admin/moderation/restrictions', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function revokeRestriction({ token, id }) {
  return userFetch(`/api/v1/super-admin/moderation/restrictions/${id}/revoke`, { method: 'POST' }, token);
}

export async function fetchWarningDetail({ token, id }) {
  return userFetch(`/api/v1/super-admin/moderation/warnings/${id}`, { method: 'GET' }, token);
}

export async function reviewWarning({ token, id, payload }) {
  return userFetch(`/api/v1/super-admin/moderation/warnings/${id}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

// ── Tutor warnings ───────────────────────────────────────────────────────────

export async function fetchMyWarnings(token) {
  return userFetch('/api/v1/warnings/my', { method: 'GET' }, token);
}

export async function fetchMyWarningBanner(token) {
  const response = await fetch(`${USER_API_BASE_URL}/api/v1/warnings/my/banner`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...getIdentityHeaders(token),
    },
  });
  if (!response.ok) {
    await parseError(response);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  const body = await response.json();
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data ?? null;
  }
  return body?.id || body?.Id ? body : null;
}

export async function submitWarningDefense({ token, warningId, message, attachmentUrl, file }) {
  if (file) {
    const formData = new FormData();
    formData.append('message', message || '');
    if (attachmentUrl) formData.append('attachmentUrl', attachmentUrl);
    formData.append('file', file);

    const response = await fetch(`${USER_API_BASE_URL}/api/v1/warnings/${warningId}/defense`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...getIdentityHeaders(token),
      },
      body: formData,
    });
    return parseResponse(response);
  }

  return userFetch(`/api/v1/warnings/${warningId}/defense`, {
    method: 'POST',
    body: JSON.stringify({ message, attachmentUrl }),
  }, token);
}

// ── Admin communications ─────────────────────────────────────────────────────

export async function fetchAdminCommunications(token) {
  return userFetch('/api/v1/super-admin/communications', { method: 'GET' }, token);
}

export async function sendAdminCommunication({ token, payload }) {
  return userFetch('/api/v1/super-admin/communications/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}
