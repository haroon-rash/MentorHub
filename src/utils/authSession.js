import { ADMIN_ROLES } from '../constants/roles.js';
import { decodeJwtPayload } from '../services/authApi.js';

export const ADMIN_UI_EMAIL_PLACEHOLDER = 'example@gmail.com';

const ROLE_MAP = {
  '1': 'STUDENT',
  '2': 'TUTOR',
  '3': 'OWNER',
  '4': 'ADMIN',
};

/** Normalize role strings / numeric codes from API or JWT. */
export function normalizeAuthRole(raw) {
  const value = String(raw ?? '').trim().toUpperCase().replace(/^ROLE_/, '');
  return ROLE_MAP[value] || value;
}

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(normalizeAuthRole(role));
}

/** Never show the real super-admin email in the UI chrome. */
export function getSessionDisplayEmail(email, role) {
  if (isAdminRole(role)) {
    return ADMIN_UI_EMAIL_PLACEHOLDER;
  }
  return email || '';
}

/** Parse login / admin-verify API payloads into a consistent session shape. */
export function extractAuthSession(apiData, fallbackEmail = '') {
  const session = apiData?.accessToken || apiData?.access_token
    ? apiData
    : (apiData?.data ?? apiData ?? {});

  const accessToken = session?.accessToken ?? session?.access_token ?? null;
  const jwtPayload = accessToken ? decodeJwtPayload(accessToken) : {};
  const role = normalizeAuthRole(session?.role ?? jwtPayload?.role);
  const email = session?.email ?? jwtPayload?.email ?? fallbackEmail;

  return {
    accessToken,
    refreshToken: session?.refreshToken ?? session?.refresh_token ?? null,
    email,
    displayEmail: getSessionDisplayEmail(email, role),
    name: session?.name ?? jwtPayload?.name ?? (isAdminRole(role) ? 'Administrator' : email.split('@')[0]),
    role,
    userId: session?.userId ?? jwtPayload?.id ?? jwtPayload?.sub ?? null,
    isVerified: Boolean(session?.verified ?? jwtPayload?.isVerified ?? true),
  };
}
