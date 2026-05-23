import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.jsx';
import { Role } from '../../constants/roles.js';
import AccessDenied from './AccessDenied.jsx';

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string[]|null} [props.allowedRoles] - JWT role must match signup role (STUDENT or TUTOR)
 * @param {boolean} [props.requireApprovedTutor]
 */
function ProtectedRoute({
  children,
  allowedRoles = null,
  requireApprovedTutor = false,
}) {
  const location = useLocation();
  const {
    isAuthenticated,
    isVerified,
    email,
    role,
    tutorStatus,
    tutorStatusLoading,
  } = useAuth();
  const redirectToastShown = React.useRef(false);

  const normalizedRole = String(role || '').toUpperCase();
  const isTutor = normalizedRole === Role.TUTOR;
  const isApproved = String(tutorStatus || '').toUpperCase() === 'APPROVED';
  const isUnapprovedTutor = requireApprovedTutor && isTutor && !isApproved;

  React.useEffect(() => {
    if (isAuthenticated && isUnapprovedTutor && !tutorStatusLoading && !redirectToastShown.current) {
      toast.info('Complete your profile and wait for admin approval to access this page.');
      redirectToastShown.current = true;
    }
  }, [isAuthenticated, isUnapprovedTutor, tutorStatusLoading]);

  if (!isAuthenticated) {
    return <Navigate to="/auth?mode=login" replace state={{ from: location.pathname }} />;
  }

  if (!isVerified) {
    return (
      <Navigate
        to="/verify-otp"
        replace
        state={{ email, fromLogin: true, redirectTo: location.pathname }}
      />
    );
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const allowed = allowedRoles.map((item) => String(item).toUpperCase());
    if (!allowed.includes(normalizedRole)) {
      return <AccessDenied role={role} requiredRoles={allowedRoles} />;
    }
  }

  if (requireApprovedTutor && isTutor && tutorStatusLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (isUnapprovedTutor) {
    return <Navigate to="/tutor-onboarding" replace />;
  }

  return children;
}

export default ProtectedRoute;
