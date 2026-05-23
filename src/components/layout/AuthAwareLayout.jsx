import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import AppShell from './AppShell.jsx';
import PublicLayout from './PublicLayout.jsx';

/** Renders sidebar shell when logged in, marketing header when guest. */
export default function AuthAwareLayout() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppShell /> : <PublicLayout />;
}
