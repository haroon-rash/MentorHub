import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  FaShieldHalved,
  FaLock,
  FaEnvelope,
  FaArrowRight,
  FaFingerprint,
} from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminLogin, adminVerifyOtp } from '../../services/authApi.js';
import {
  ADMIN_UI_EMAIL_PLACEHOLDER,
  extractAuthSession,
  isAdminRole,
} from '../../utils/authSession.js';

const ADMIN_LOGIN_PROGRESS_KEY = 'mentorhub.adminLoginInProgress';

function AdminAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthSession, clearAuthSession, adminMfaComplete, role, isAuthenticated } = useAuth();
  const [phase, setPhase] = useState('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const otpRefs = useRef([]);
  const initDone = useRef(false);
  const verifyInFlight = useRef(false);

  // Run once on mount only — do NOT depend on clearAuthSession (it used to re-run after OTP and wipe the session).
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const saved = localStorage.getItem('mentorhub.auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.adminMfaComplete && parsed?.token) {
          return;
        }
      } catch {
        // ignore
      }
    }

    const inProgress = sessionStorage.getItem(ADMIN_LOGIN_PROGRESS_KEY) === '1';
    if (inProgress) {
      setPhase('otp');
    } else {
      clearAuthSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (adminMfaComplete && isAuthenticated && isAdminRole(role)) {
      navigate(location.state?.from || '/super-admin-dashboard', { replace: true });
    }
  }, [adminMfaComplete, isAuthenticated, role, navigate, location.state?.from]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const id = window.setInterval(() => setResendSeconds((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  const handleCredentials = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin({ email: email.trim(), password });
      sessionStorage.setItem(ADMIN_LOGIN_PROGRESS_KEY, '1');
      setResendSeconds(60);
      setPhase('otp');
      setOtp(['', '', '', '', '', '']);
      toast.success('Verification code sent to the admin security inbox.');
      window.setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      toast.error(err.message || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (element, index) => {
    const digit = element.value.replace(/\D/g, '').slice(-1);
    if (!digit && element.value) return;
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (digit && index === 5) {
      const code = [...next.slice(0, 5), digit].join('');
      if (code.length === 6) {
        handleVerify(code);
      }
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handleVerify = async (codeOverride) => {
    if (verifyInFlight.current || redirecting) return;

    const code = codeOverride || otp.join('');
    if (code.length !== 6) {
      toast.error('Enter the full 6-digit code');
      return;
    }

    verifyInFlight.current = true;
    setLoading(true);
    try {
      const apiData = await adminVerifyOtp({ email: email.trim(), otp: code });
      const session = extractAuthSession(apiData, email.trim());
      const token = session.accessToken;

      if (!token) {
        throw new Error('Session missing after admin verification');
      }

      if (!isAdminRole(session.role)) {
        throw new Error('Account is not authorized for admin access.');
      }

      const destination = location.state?.from || '/super-admin-dashboard';

      setAuthSession({
        token,
        refreshToken: session.refreshToken,
        email: session.email,
        displayEmail: session.displayEmail,
        name: session.name,
        role: session.role,
        userId: session.userId,
        isVerified: true,
        adminMfaComplete: true,
      });

      sessionStorage.removeItem(ADMIN_LOGIN_PROGRESS_KEY);
      setRedirecting(true);
      toast.success('Welcome to the control center');
      navigate(destination, { replace: true });

      window.setTimeout(() => {
        if (window.location.pathname.startsWith('/admin/auth')) {
          window.location.replace(destination);
        }
      }, 150);
    } catch (err) {
      toast.error(err.message || 'Verification failed');
      verifyInFlight.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    sessionStorage.removeItem(ADMIN_LOGIN_PROGRESS_KEY);
    setPhase('credentials');
    setOtp(['', '', '', '', '', '']);
    clearAuthSession();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative min-h-[calc(100vh-8rem)] overflow-hidden rounded-[2rem]"
    >
      <motion.div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" />
      <motion.div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <motion.div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative mx-auto grid max-w-5xl gap-0 lg:grid-cols-[1fr_1.1fr]">
        <div className="hidden flex-col justify-between p-10 text-white lg:flex">
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
              <FaShieldHalved /> MentorHub Admin
            </div>
            <h1 className="mt-6 font-heading text-4xl font-bold leading-tight">
              Enterprise control center
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
              Isolated admin access with mandatory two-factor verification. OTP is delivered only to the authorized security inbox.
            </p>
          </motion.div>
          <ul className="space-y-3 text-sm text-slate-400">
            {['Separate from student & tutor login', 'RSA-signed session tokens', 'Audit-ready access'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <motion.div
          layout
          className="m-4 rounded-3xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-8 shadow-2xl shadow-black/20 backdrop-blur-xl lg:m-6 lg:p-10"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <FaShieldHalved />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Admin portal</p>
              <h2 className="font-heading text-xl font-bold text-[var(--mh-text)]">Secure sign in</h2>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'credentials' ? (
              <motion.form
                key="credentials"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                onSubmit={handleCredentials}
                className="space-y-5"
                autoComplete="off"
              >
                <div>
                  <h2 className="hidden font-heading text-2xl font-bold text-[var(--mh-text)] lg:block">Sign in</h2>
                  <p className="mt-1 text-sm text-[var(--mh-text-muted)]">Use your administrator credentials</p>
                </div>
                <label className="block">
                  <span className="mh-field-label flex items-center gap-2">
                    <FaEnvelope className="text-indigo-500" /> Admin email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mh-field"
                    placeholder={ADMIN_UI_EMAIL_PLACEHOLDER}
                    autoComplete="off"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mh-field-label flex items-center gap-2">
                    <FaLock className="text-indigo-500" /> Password
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mh-field"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-700 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-900/25 transition hover:brightness-110 disabled:opacity-60"
                >
                  {loading ? 'Authenticating…' : (
                    <>
                      Continue to verification
                      <FaArrowRight className="text-xs" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : redirecting ? (
              <div key="redirecting" className="flex flex-col items-center justify-center py-16 text-center">
                <motion.div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                <p className="mt-4 text-sm font-semibold text-[var(--mh-text)]">Opening admin dashboard…</p>
              </div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-indigo-500/25 bg-indigo-500/10 px-4 py-3">
                  <FaFingerprint className="text-2xl text-indigo-500" />
                  <div>
                    <p className="text-sm font-bold text-[var(--mh-text)]">Two-factor verification</p>
                    <p className="text-xs text-[var(--mh-text-muted)]">Code sent to the authorized security inbox (not shown here)</p>
                  </div>
                </div>
                <p className="mb-3 text-center text-xs text-[var(--mh-text-muted)]">Enter your 6-digit code</p>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="password"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      className="mh-field h-14 w-11 text-center text-xl font-bold tracking-widest sm:h-16 sm:w-12"
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleVerify()}
                  disabled={loading}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-60"
                >
                  {loading ? 'Verifying…' : 'Unlock dashboard'}
                </button>
                <button
                  type="button"
                  disabled={loading || resendSeconds > 0}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await adminLogin({ email: email.trim(), password });
                      setResendSeconds(60);
                      toast.success('New code sent.');
                    } catch (err) {
                      toast.error(err.message || 'Could not resend');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="mt-3 w-full text-center text-sm font-semibold text-indigo-600 disabled:text-slate-400"
                >
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="mt-2 w-full text-center text-sm text-[var(--mh-text-muted)] hover:text-[var(--mh-text)]"
                >
                  ← Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-8 border-t border-[var(--mh-border)] pt-6 text-center text-xs text-[var(--mh-text-muted)]">
            Not an admin?{' '}
            <Link to="/auth?mode=login" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Student / tutor sign in
            </Link>
          </p>
          <p className="mt-2 text-center text-[10px] text-[var(--mh-text-subtle)]">
            Local dev: check Mailpit at localhost:8025 for the OTP
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default AdminAuth;
