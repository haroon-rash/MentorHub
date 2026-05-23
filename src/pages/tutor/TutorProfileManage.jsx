import React, { useState } from 'react';
import { toast } from 'sonner';
import TutorOnboarding from '../TutorOnboarding/TutorOnboarding.jsx';
import WarningBanner from '../../components/tutor/WarningBanner.jsx';

const TABS = [
  { id: 'profile', label: 'Edit profile' },
  { id: 'availability', label: 'Availability & slots' },
  { id: 'security', label: 'Password & security' },
];

export default function TutorProfileManage() {
  const [tab, setTab] = useState('profile');

  return (
    <div className="space-y-6">
        <div className="glass-panel rounded-3xl p-6">
          <h1 className="font-heading text-3xl font-black text-slate-900">Manage Profile</h1>
          <p className="mt-1 text-sm text-slate-600">
            Update your teaching profile, schedule, and account settings.
          </p>
        </div>

        <WarningBanner />

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                tab === t.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'mh-btn-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(tab === 'profile' || tab === 'availability') && (
          <TutorOnboarding
            key={tab}
            manageMode
            initialStep={tab === 'availability' ? 2 : 1}
          />
        )}
        {tab === 'security' && (
          <div className="glass-panel max-w-lg space-y-4 rounded-3xl p-6">
            <h2 className="font-heading text-xl font-bold text-slate-900">Password & security</h2>
            <p className="text-sm text-slate-600">
              For your security, password changes are handled through the sign-in flow. Sign out, then use
              forgot password on the login page if you need to reset your password.
            </p>
            <button
              type="button"
              onClick={() => {
                toast.info('Use Logout in the sidebar, then Forgot password on the login page.');
              }}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
            >
              How to reset password
            </button>
          </div>
        )}
    </div>
  );
}
