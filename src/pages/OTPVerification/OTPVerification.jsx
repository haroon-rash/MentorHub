import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { resendOtp, verifyOtp, decodeJwtPayload } from '../../services/authApi.js';

const MotionDiv = motion.div;
const MotionInput = motion.input;

function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingVerificationEmail, setPendingVerificationEmail, setAuthSession } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isPreparing, setIsPreparing] = useState(Boolean(location.state?.fromSignup));
  const currentEmail = location.state?.email || pendingVerificationEmail || '';

  useEffect(() => {
    if (!isPreparing) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setIsPreparing(false);
    }, 1200);

    return () => window.clearTimeout(timerId);
  }, [isPreparing]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const id = window.setInterval(() => setResendSeconds((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  const resolvePostVerifyRoute = (roleValue) => {
    const normalizedRole = String(roleValue || '').toUpperCase();
    if (normalizedRole === 'TUTOR') {
      return '/tutor-onboarding';
    }

    if (normalizedRole === 'ADMIN' || normalizedRole === 'OWNER' || normalizedRole === 'SUPER_ADMIN') {
      return '/admin/auth';
    }

    return '/student-profile';
  };

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;
    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);
    if (element.nextSibling) element.nextSibling.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    if (!currentEmail) {
      toast.error('Verification email is missing. Please register again.');
      navigate('/auth?mode=register');
      return;
    }

    setIsVerifying(true);
    try {
      const session = await verifyOtp({ email: currentEmail, otp: code });
      const token = session?.accessToken;
      if (!token) {
        throw new Error('Token missing in verification response');
      }

      const jwtPayload = decodeJwtPayload(token);
      const resolvedRole = String(session?.role || jwtPayload?.role || '').toUpperCase() || 'STUDENT';
      setAuthSession({
        token,
        refreshToken: session?.refreshToken || null,
        email: session?.email || jwtPayload?.sub || currentEmail,
        name: session?.name || jwtPayload?.name || currentEmail.split('@')[0],
        role: resolvedRole,
        userId: session?.userId || jwtPayload?.id || null,
        isVerified: true,
      });
      setPendingVerificationEmail('');

      toast.success('Verification successful');
      navigate(resolvePostVerifyRoute(resolvedRole), { replace: true });
    } catch (error) {
      toast.error(error.message || 'OTP verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!currentEmail) {
      toast.error('Email missing. Please register again.');
      navigate('/auth?mode=register');
      return;
    }

    setIsResending(true);
    try {
      await resendOtp({ email: currentEmail });
      toast.success('A new OTP has been sent to your email');
      setResendSeconds(60);
      setOtp(['', '', '', '', '', '']);
    } catch (error) {
      toast.error(error.message || 'Unable to resend OTP right now');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-xl"
    >
      <div className="glass-panel rounded-3xl p-7 text-center sm:p-10">
        {isPreparing ? (
          <div className="py-8">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            <h3 className="mt-5 font-heading text-2xl font-bold text-slate-900">Sending your OTP</h3>
            <p className="mt-2 text-sm text-slate-600">
              We are sending a verification code to {currentEmail || 'your email'}.
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-heading text-3xl font-extrabold text-slate-900">Confirm Your Account</h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter the 6-digit verification code we sent to {currentEmail || 'your registered email'}.
            </p>

            <div className="mt-6 flex justify-center gap-2 sm:gap-3">
              {otp.map((data, index) => (
                <MotionInput
                  whileFocus={{ scale: 1.06 }}
                  className="input-glow h-12 w-11 rounded-2xl border border-slate-300 bg-white/85 text-center text-xl font-bold text-slate-800 outline-none"
                  type="text"
                  maxLength="1"
                  key={index}
                  value={data}
                  onChange={(event) => handleChange(event.target, index)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || isResending}
              className="glow-button mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-3 font-semibold text-white"
            >
              {isVerifying ? 'Verifying...' : 'Verify and Continue'}
            </button>

            <p className="mt-4 text-sm text-slate-600">
              Did not get the code?
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || isVerifying || resendSeconds > 0}
                className="ml-1 font-semibold text-indigo-700 transition hover:text-indigo-500"
              >
                {isResending ? 'Sending...' : resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend OTP'}
              </button>
            </p>
          </>
        )}
      </div>
    </MotionDiv>
  );
}

export default OTPVerification;