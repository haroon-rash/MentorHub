import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from '../../services/authApi.js';

const STEPS = ['email', 'otp', 'password'];

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const stepIndex = STEPS.indexOf(step);

  React.useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const id = window.setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const handleOtpChange = (element, index) => {
    if (Number.isNaN(Number(element.value))) return;
    const next = [...otp];
    next[index] = element.value.slice(-1);
    setOtp(next);
    if (element.nextSibling && element.value) element.nextSibling.focus();
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Enter your account email');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset({ email: email.trim() });
      toast.success('If an account exists, a reset code was sent.');
      setResendSeconds(60);
      setStep('otp');
    } catch (err) {
      toast.error(err.message || 'Unable to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Enter the full 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyPasswordResetOtp({ email: email.trim(), otp: code });
      setResetToken(result?.resetToken || '');
      setStep('password');
      toast.success('Code verified. Set your new password.');
    } catch (err) {
      toast.error(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset({
        email: email.trim(),
        resetToken,
        newPassword: password,
        confirmPassword,
      });
      toast.success('Password updated. Sign in with your new password.');
      navigate('/auth?mode=login');
    } catch (err) {
      toast.error(err.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0) return;
    setLoading(true);
    try {
      await requestPasswordReset({ email: email.trim() });
      setResendSeconds(60);
      setOtp(['', '', '', '', '', '']);
      toast.success('New code sent');
    } catch (err) {
      toast.error(err.message || 'Unable to resend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-lg"
    >
      <motion.div layout className="glass-panel rounded-3xl p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Account recovery</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-slate-900">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Step {stepIndex + 1} of 3 — secure, passwordless recovery (no old password required).
        </p>

        <motion.div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
            animate={{ width: `${((stepIndex + 1) / 3) * 100}%` }}
            transition={{ duration: 0.35 }}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.form
              key="email"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              onSubmit={handleRequest}
              className="mt-8 space-y-4"
            >
              <label className="block text-sm font-medium text-slate-700">
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mh-input mt-2 w-full"
                  placeholder="you@school.edu"
                  required
                />
              </label>
              <button type="submit" disabled={loading} className="glow-button w-full rounded-2xl py-3 font-semibold text-white">
                {loading ? 'Sending…' : 'Send reset code'}
              </button>
            </motion.form>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="mt-8"
            >
              <p className="text-center text-sm text-slate-600">Code sent to <strong>{email}</strong></p>
              <motion.div layout className="mt-6 flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target, i)}
                    className="h-12 w-10 rounded-xl border border-slate-300 bg-white text-center text-lg font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                ))}
              </motion.div>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading}
                className="glow-button mt-6 w-full rounded-2xl py-3 font-semibold text-white"
              >
                {loading ? 'Verifying…' : 'Verify code'}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || resendSeconds > 0}
                className="mt-3 w-full text-sm font-medium text-indigo-600 disabled:text-slate-400"
              >
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
              </button>
            </motion.div>
          )}

          {step === 'password' && (
            <motion.form
              key="password"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              onSubmit={handleReset}
              className="mt-8 space-y-4"
            >
              <label className="block text-sm font-medium text-slate-700">
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mh-input mt-2 w-full"
                  required
                  minLength={8}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mh-input mt-2 w-full"
                  required
                  minLength={8}
                />
              </label>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  animate={{ width: `${Math.min(100, passwordScore * 25)}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                />
              </div>
              <button type="submit" disabled={loading} className="glow-button w-full rounded-2xl py-3 font-semibold text-white">
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/auth?mode=login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}

export default ForgotPassword;
