/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Role } from '../constants/roles.js';
import { decodeJwtPayload, fetchTutorOnboardingProfile } from '../services/authApi.js';
import { normalizeAuthRole } from '../utils/authSession.js';

const AUTH_STORAGE_KEY = 'mentorhub.auth';

const AuthContext = createContext(null);

const EMPTY_AUTH_STATE = {
  token: null,
  refreshToken: null,
  email: null,
  displayEmail: null,
  name: null,
  role: null,
  userId: null,
  isVerified: false,
  tutorStatus: null,
  adminMfaComplete: false,
};

function loadInitialAuthState() {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) {
      return { ...EMPTY_AUTH_STATE };
    }

    const parsed = JSON.parse(saved);
    const jwtVerified = parsed?.token
      ? Boolean(decodeJwtPayload(parsed.token)?.isVerified)
      : false;

    return {
      token: parsed?.token || null,
      refreshToken: parsed?.refreshToken || null,
      email: parsed?.email || null,
      displayEmail: parsed?.displayEmail || null,
      name: parsed?.name || null,
      role: normalizeAuthRole(parsed?.role) || null,
      userId: parsed?.userId || null,
      isVerified: Boolean(parsed?.isVerified ?? (parsed?.token ? jwtVerified : false)),
      tutorStatus: parsed?.tutorStatus || null,
      adminMfaComplete: Boolean(parsed?.adminMfaComplete),
    };
  } catch {
    return { ...EMPTY_AUTH_STATE };
  }
}

async function fetchTutorStatus(token) {
  if (!token) return null;
  try {
    const profile = await fetchTutorOnboardingProfile(token);
    return profile?.verificationStatus || profile?.VerificationStatus || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(loadInitialAuthState);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [tutorStatusLoading, setTutorStatusLoading] = useState(() => {
    const initial = loadInitialAuthState();
    return initial?.role?.toUpperCase() === Role.TUTOR;
  });

  const persistAuth = useCallback((next) => {
    setAuthState((prev) => {
      const merged = typeof next === 'function' ? next(prev) : next;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const refreshTutorStatus = useCallback(async () => {
    if (authState.role?.toUpperCase() !== Role.TUTOR || !authState.token) {
      return null;
    }

    setTutorStatusLoading(true);
    try {
      const status = await fetchTutorStatus(authState.token);
      if (!status) return null;

      setAuthState((prev) => {
        if (prev.tutorStatus === status) return prev;
        const next = { ...prev, tutorStatus: status };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
        return next;
      });

      const normalizedStatus = String(status || '').toUpperCase();
      const currentStatus = String(authState.tutorStatus || '').toUpperCase();

      if (normalizedStatus === 'APPROVED' && currentStatus !== 'APPROVED') {
        toast.success('Your tutor profile has been approved!');
      }
      if (normalizedStatus === 'REJECTED' && currentStatus !== 'REJECTED') {
        toast.error('Your profile was rejected. Please review the feedback.');
      }

      return status;
    } finally {
      setTutorStatusLoading(false);
    }
  }, [authState.role, authState.token, authState.tutorStatus]);

  useEffect(() => {
    refreshTutorStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.token, authState.role]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshTutorStatus();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshTutorStatus]);

  const setAuthSession = useCallback((next) => {
    const token = next?.token || null;
    const jwtPayload = token ? decodeJwtPayload(token) : {};
    const normalized = {
      token,
      refreshToken: next?.refreshToken || null,
      email: next?.email || jwtPayload?.sub || null,
      displayEmail: next?.displayEmail ?? null,
      name: next?.name || jwtPayload?.name || null,
      role: normalizeAuthRole(next?.role) || null,
      userId: next?.userId || jwtPayload?.id || null,
      isVerified: Boolean(next?.isVerified),
      tutorStatus: next?.tutorStatus ?? null,
      adminMfaComplete: Boolean(next?.adminMfaComplete),
    };
    try {
      localStorage.removeItem('tutorOnboardingDraft');
    } catch {
      // ignore
    }
    persistAuth(normalized);
  }, [persistAuth]);

  const clearAuthSession = useCallback(() => {
    setAuthState({ ...EMPTY_AUTH_STATE });
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      ...authState,
      activeRole: authState.role,
      isAuthenticated: Boolean(authState.token),
      tutorStatusLoading,
      pendingVerificationEmail,
      setPendingVerificationEmail,
      setAuthSession,
      clearAuthSession,
      refreshTutorStatus,
    }),
    [
      authState,
      tutorStatusLoading,
      pendingVerificationEmail,
      setAuthSession,
      clearAuthSession,
      refreshTutorStatus,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
