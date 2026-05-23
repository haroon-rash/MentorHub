import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiBaseUrl } from '../../utils/urls.js';

async function checkJson(url) {
  try {
    const r = await fetch(url, { method: 'GET' });
    if (!r.ok) return { ok: false, detail: `${r.status}` };
    const j = await r.json().catch(() => ({}));
    return { ok: true, detail: j?.status || j?.service || 'ok' };
  } catch (e) {
    return { ok: false, detail: 'unreachable' };
  }
}

export default function SystemHealth() {
  const [gateway, setGateway] = useState(null);

  useEffect(() => {
    let active = true;
    const base = apiBaseUrl();
    checkJson(`${base}/health`).then((r) => {
      if (active) setGateway(r);
    });
    return () => {
      active = false;
    };
  }, []);

  const services = [
    { name: 'API Gateway', key: 'gateway' },
    { name: 'Auth Service', note: 'Routed via gateway (/api/v1/auth)' },
    { name: 'User Management (.NET)', note: 'REST + SignalR (/chatHub)' },
    { name: 'Student / Tutor / Reviews / Notifications', note: 'Java microservices via gateway' },
    { name: 'PostgreSQL', note: 'Primary database' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-slate-900">System Health</h2>
        <p className="mt-1 text-sm text-slate-500">
          Messaging stack is <span className="font-semibold text-slate-700">REST-only</span> (no RabbitMQ). Below shows a live check of the gateway; other services follow the same base URL from your Vite env.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/75 p-5 shadow-sm"
        >
          <div>
            <p className="font-semibold text-slate-900">API Gateway</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">GET {apiBaseUrl()}/health</p>
          </div>
          <div className="flex items-center gap-2">
            {gateway === null ? (
              <span className="text-xs font-bold text-slate-400">Checking…</span>
            ) : gateway.ok ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-emerald-600">Up</span>
              </>
            ) : (
              <>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-rose-600">Down</span>
              </>
            )}
          </div>
        </motion.div>

        {services.slice(1).map((service, index) => (
          <motion.div
            key={service.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 1) * 0.05 }}
            className="rounded-2xl border border-slate-200 bg-white/75 p-5 shadow-sm"
          >
            <p className="font-semibold text-slate-900">{service.name}</p>
            <p className="mt-1 text-xs text-slate-500">{service.note}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
