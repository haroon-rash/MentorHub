import React from 'react';

function RejectedBanner({ reason }) {
  return (
    <div className="glass-panel mx-auto mb-6 rounded-3xl border border-red-200 bg-white/50 p-6 shadow-lg shadow-red-100/50">
      <div className="flex flex-col gap-4 rounded-3xl border border-red-200 bg-red-50/80 p-5 text-red-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
            <span className="text-2xl">!</span>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-700">Profile Rejected</p>
            <p className="text-lg font-bold text-slate-900">Your tutor application needs attention.</p>
          </div>
        </div>
        <div className="rounded-3xl border border-red-200 bg-white/90 p-4 text-sm text-slate-700">
          <p className="font-semibold text-red-800">Admin feedback:</p>
          <p className="mt-2">{reason}</p>
        </div>
      </div>
    </div>
  );
}

export default RejectedBanner;
