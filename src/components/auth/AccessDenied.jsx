import React from 'react';
import { Link } from 'react-router-dom';

const dashboardMap = {
  STUDENT: '/student-profile',
  TUTOR: '/tutor-dashboard',
  ADMIN: '/super-admin-dashboard',
  OWNER: '/super-admin-dashboard',
  SUPER_ADMIN: '/super-admin-dashboard',
};

function AccessDenied({ role, requiredRoles }) {
  const normalized = String(role || '').toUpperCase();
  const destination = dashboardMap[normalized] ?? '/';
  const required = Array.isArray(requiredRoles)
    ? requiredRoles.map((r) => String(r).toUpperCase()).join(' or ')
    : null;

  return (
    <div className="glass-panel mx-auto mt-24 max-w-xl rounded-3xl p-10 text-center">
      <h2 className="font-heading text-3xl font-bold text-slate-900">Access denied</h2>
      <p className="mt-3 text-slate-600">
        This page is for {required || 'another'} accounts. You are signed in as{' '}
        <strong className="text-indigo-600">{normalized || 'Guest'}</strong>.
      </p>
      <Link
        to={destination}
        className="glow-button mt-6 inline-block rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 font-semibold text-white"
      >
        Go to my dashboard
      </Link>
    </div>
  );
}

export default AccessDenied;
