import { decodeJwtPayload } from '../services/authApi.js';

const LEGACY_DRAFT_KEY = 'tutorOnboardingDraft';

export function resolveSessionEmail(token, authEmail) {
  if (authEmail?.trim()) {
    return authEmail.trim().toLowerCase();
  }
  const payload = decodeJwtPayload(token);
  const sub = payload?.sub;
  if (typeof sub === 'string' && sub.includes('@')) {
    return sub.trim().toLowerCase();
  }
  return '';
}

export function resolveAuthUserId(token, authUserId) {
  if (authUserId) return authUserId;
  const payload = decodeJwtPayload(token);
  return payload?.id || payload?.authId || payload?.userId || null;
}

export function tutorDraftStorageKey(userId) {
  return userId ? `tutorOnboardingDraft:${userId}` : null;
}

export function loadTutorOnboardingDraft(userId) {
  const key = tutorDraftStorageKey(userId);
  if (!key) return null;

  try {
    const legacy = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (legacy && !localStorage.getItem(key)) {
      localStorage.setItem(key, legacy);
    }
    localStorage.removeItem(LEGACY_DRAFT_KEY);

    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveTutorOnboardingDraft(userId, form) {
  const key = tutorDraftStorageKey(userId);
  if (!key || !form) return;
  localStorage.setItem(key, JSON.stringify(form));
}

export function clearLegacyTutorOnboardingDraft() {
  localStorage.removeItem(LEGACY_DRAFT_KEY);
}
