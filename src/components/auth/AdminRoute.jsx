import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { isAdminRole } from '../../utils/authSession.js';
import AccessDenied from './AccessDenied.jsx';

/**
 * Admin dashboard routes require a valid admin role AND completed admin-portal OTP (MFA).
 */
function AdminRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isVerified, role, adminMfaComplete } = useAuth();
  const normalizedRole = String(role || '').toUpperCase();
  const isAdmin = isAdminRole(normalizedRole);

  if (!isAuthenticated) {
    return <Navigate to="/admin/auth" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return <AccessDenied role={role} />;
  }

  if (!adminMfaComplete) {
    return (
      <Navigate
        to="/admin/auth"
        replace
        state={{ from: location.pathname, requireAdminOtp: true }}
      />
    );
  }

  if (!isVerified) {
    return (
      <Navigate
        to="/admin/auth"
        replace
        state={{ from: location.pathname, requireAdminOtp: true }}
      />
    );
  }

  return children;
}

export default AdminRoute;
