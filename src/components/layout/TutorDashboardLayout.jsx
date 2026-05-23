import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const NAV = [
  { to: '/tutor-dashboard', label: 'Overview', icon: '📊', end: true },
  { to: '/tutor/teaching', label: 'Teaching Hub', icon: '📚' },
  { to: '/tutor/profile', label: 'Manage Profile', icon: '👤' },
  { to: '/tutor-services', label: 'AI Tools', icon: '✨' },
  { to: '/tutor/my-students', label: 'My Students', icon: '🎓' },
  { to: '/chat', label: 'Messages', icon: '💬' },
];

export default function TutorDashboardLayout({ children, profile, stats }) {
  const navigate = useNavigate();
  const { name } = useAuth();
  const completeness = profile?.profileCompleteness ?? 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="glass-panel w-full shrink-0 rounded-3xl p-5 lg:sticky lg:top-24 lg:w-64">
        <div className="mb-6 border-b border-slate-200/80 pb-5">
          <p className="text-xs font-black uppercase tracking-widest text-indigo-500">Tutor workspace</p>
          <p className="mt-1 font-heading text-lg font-bold text-slate-900">{name || 'Tutor'}</p>
          {profile?.verificationStatus === 'Approved' ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
              ✓ Verified
            </span>
          ) : (
            <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">
              {profile?.verificationStatus || 'Pending'}
            </span>
          )}
        </div>

        <nav className="space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profile strength</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <p className="mt-1 text-sm font-bold text-slate-700">{completeness}% complete</p>
        </div>

        {stats ? (
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white p-2 shadow-sm">
              <p className="text-lg font-black text-slate-900">{stats.pendingBookings ?? 0}</p>
              <p className="text-[9px] font-bold uppercase text-slate-400">Pending</p>
            </div>
            <div className="rounded-xl bg-white p-2 shadow-sm">
              <p className="text-lg font-black text-slate-900">${stats.earningsThisMonth ?? 0}</p>
              <p className="text-[9px] font-bold uppercase text-slate-400">Month</p>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => navigate('/tutor/profile')}
          className="mt-4 w-full rounded-2xl border border-indigo-200 bg-indigo-50 py-2.5 text-xs font-bold text-indigo-700"
        >
          Manage profile & availability
        </button>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
