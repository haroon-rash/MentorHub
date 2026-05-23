import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.jsx';
import { login, signup, decodeJwtPayload } from '../../services/authApi.js';
import { ADMIN_ROLES } from '../../constants/roles.js';
import {
  FaArrowRight,
  FaChalkboardUser,
  FaCircleCheck,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaGraduationCap,
  FaLock,
  FaUser,
} from 'react-icons/fa6';

const roleOptions = [
  {
    id: 'student',
    label: 'Student',
    hint: 'Find tutors and track your progress',
    icon: FaGraduationCap,
  },
  {
    id: 'tutor',
    label: 'Tutor',
    hint: 'Get discovered and manage sessions',
    icon: FaChalkboardUser,
  },
];

const proofStats = [
  { label: 'Avg Rating', value: '4.8' },
  { label: 'Sessions', value: '120k+' },
  { label: 'Tutors', value: '2.4k+' },
];

const featureBullets = [
  'Verified tutor profiles',
  'Secure session booking',
  'Progress and communication tracking',
];

function getPasswordScore(password) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return score;
}

function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthSession, setPendingVerificationEmail, clearAuthSession } = useAuth();

  const [userType, setUserType] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeField, setActiveField] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: '',
  });

  const isRegisterMode = new URLSearchParams(location.search).get('mode') === 'register';
  const passwordScore = useMemo(() => getPasswordScore(formData.password), [formData.password]);
  const passwordLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const scoreColor =
    passwordScore <= 1
      ? 'from-rose-500 to-orange-400'
      : passwordScore === 2
      ? 'from-amber-500 to-yellow-400'
      : passwordScore === 3
      ? 'from-blue-500 to-cyan-500'
      : 'from-emerald-500 to-teal-400';

  const MotionSection = motion.section;
  const MotionAside = motion.aside;

  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    // Validate before calling API
    const e = {};
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Enter a valid email address';
    if (!formData.password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setIsSubmitting(true);
    try {
      const session = await login({
        email: formData.email,
        password: formData.password,
      });

      const token = session?.accessToken;
      if (!token) {
        throw new Error('Token missing in login response');
      }

      const jwtPayload = decodeJwtPayload(token);
      const resolvedRole = String(session?.role || jwtPayload?.role || userType || 'STUDENT').toUpperCase();

      if (ADMIN_ROLES.includes(resolvedRole)) {
        toast.error('Admin accounts must use the secure admin portal.');
        navigate('/admin/auth');
        return;
      }

      const isVerified = Boolean(session?.verified ?? jwtPayload?.isVerified);
      if (!isVerified) {
        setPendingVerificationEmail(formData.email);
        toast.info('Please verify your email to continue.');
        navigate('/verify-otp', { state: { email: formData.email, fromLogin: true } });
        return;
      }

      setAuthSession({
        token,
        refreshToken: session?.refreshToken || null,
        email: session?.email || jwtPayload?.sub || formData.email,
        name: session?.name || jwtPayload?.name || formData.fullName || formData.email.split('@')[0],
        role: resolvedRole,
        userId: session?.userId || jwtPayload?.id || null,
        isVerified: true,
      });

      toast.success('Login successful');

      if (resolvedRole === 'TUTOR') {
        navigate('/tutor-dashboard');
      } else {
        navigate('/student-profile');
      }
    } catch (error) {
      toast.error(error.message || 'Unable to login right now');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();

    // Validate all registration fields
    const e = {};
    if (!formData.fullName.trim()) e.fullName = 'Full name is required';
    else if (formData.fullName.trim().length < 2) e.fullName = 'Name must be at least 2 characters';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Enter a valid email address';
    if (!formData.password) e.password = 'Password is required';
    else if (formData.password.length < 8) e.password = 'At least 8 characters required';
    else if (passwordScore < 2) e.password = 'Password is too weak — add uppercase, numbers, or symbols';
    if (!formData.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setIsSubmitting(true);
    try {
      await signup({
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: userType.toUpperCase(),
      });

      setPendingVerificationEmail(formData.email);
      clearAuthSession();
      toast.success('Account created. Enter the verification code sent to your email.');
      navigate('/verify-otp', {
        state: { email: formData.email, fromSignup: true },
      });
    } catch (error) {
      toast.error(error.message || 'Unable to register right now');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (registerMode) => {
    navigate(`/auth?mode=${registerMode ? 'register' : 'login'}`, { replace: true });
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    // Clear error for this field on change
    if (errors[name]) {
      setErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] px-2 py-2 sm:px-0">
      <motion.div
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -left-12 top-12 h-44 w-44 rounded-full bg-indigo-400/25 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute right-0 top-16 h-52 w-52 rounded-full bg-cyan-300/25 blur-3xl"
      />

      <div className="relative z-10 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <MotionSection
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-panel rounded-3xl p-6 sm:p-8"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                <FaCircleCheck className="text-[10px]" />
                Secure Access
              </p>
              <h2 className="font-heading mt-3 text-3xl font-extrabold text-slate-900">
                {isRegisterMode ? 'Create Your Account' : 'Welcome Back'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {isRegisterMode
                  ? 'Set up your profile and start booking trusted tutors.'
                  : 'Sign in to continue your learning streak in seconds.'}
              </p>
            </div>
          </div>

          <div className="relative mb-6 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white/75 p-1">
            <motion.div
              animate={{ x: isRegisterMode ? '100%' : '0%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500"
            />
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`relative z-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                !isRegisterMode ? 'text-white' : 'text-slate-600'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode(true)}
              className={`relative z-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isRegisterMode ? 'text-white' : 'text-slate-600'
              }`}
            >
              Register
            </button>
          </div>

          <AnimatePresence mode="wait">
            {isRegisterMode ? (
              <motion.form
                key="register-form"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
                onSubmit={handleRegisterSubmit}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {roleOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = userType === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setUserType(option.id)}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${
                          selected
                            ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                            : 'border-slate-200 bg-white/80 hover:border-indigo-200'
                        }`}
                      >
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <Icon className={selected ? 'text-indigo-600' : 'text-slate-500'} />
                          {option.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{option.hint}</p>
                      </button>
                    );
                  })}
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Full Name</span>
                  <div className="relative">
                    <FaUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleFieldChange}
                      onFocus={() => setActiveField('fullName')}
                      onBlur={() => setActiveField('')}
                      required
                      className={`input-glow w-full rounded-2xl border bg-white/90 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none ${
                        errors.fullName ? 'border-rose-400' : activeField === 'fullName' ? 'border-indigo-400' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.fullName && <p className="mt-1 text-xs font-medium text-rose-500">{errors.fullName}</p>}
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
                  <div className="relative">
                    <FaEnvelope className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFieldChange}
                      onFocus={() => setActiveField('email')}
                      onBlur={() => setActiveField('')}
                      required
                      className={`input-glow w-full rounded-2xl border bg-white/90 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none ${
                        errors.email ? 'border-rose-400' : activeField === 'email' ? 'border-indigo-400' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs font-medium text-rose-500">{errors.email}</p>}
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Password</span>
                    <div className="relative">
                      <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleFieldChange}
                        onFocus={() => setActiveField('password')}
                        onBlur={() => setActiveField('')}
                        required
                        className={`input-glow w-full rounded-2xl border bg-white/90 py-3 pl-10 pr-10 text-sm text-slate-700 outline-none ${
                          errors.password ? 'border-rose-400' : activeField === 'password' ? 'border-indigo-400' : 'border-slate-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((previous) => !previous)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs font-medium text-rose-500">{errors.password}</p>}
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Confirm Password</span>
                    <div className="relative">
                      <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleFieldChange}
                        onFocus={() => setActiveField('confirmPassword')}
                        onBlur={() => setActiveField('')}
                        required
                        className={`input-glow w-full rounded-2xl border bg-white/90 py-3 pl-10 pr-10 text-sm text-slate-700 outline-none ${
                          errors.confirmPassword ? 'border-rose-400' : activeField === 'confirmPassword' ? 'border-indigo-400' : 'border-slate-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((previous) => !previous)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-xs font-medium text-rose-500">{errors.confirmPassword}</p>}
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Password Strength</span>
                    <span>{passwordLabels[Math.max(0, passwordScore - 1)] || 'Very Weak'}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, passwordScore * 25)}%` }}
                      className={`h-full rounded-full bg-gradient-to-r ${scoreColor}`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glow-button inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 font-semibold text-white"
                >
                  {isSubmitting ? 'Creating Account...' : userType === 'tutor' ? 'Register as Tutor' : 'Register as Student'}
                  <FaArrowRight className="text-xs" />
                </button>

                <p className="text-xs text-slate-500">By registering, you agree to our Terms and Privacy Policy.</p>
              </motion.form>
            ) : (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
                onSubmit={handleLoginSubmit}
              >
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
                  <div className="relative">
                    <FaEnvelope className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFieldChange}
                      onFocus={() => setActiveField('email')}
                      onBlur={() => setActiveField('')}
                      required
                      className={`input-glow w-full rounded-2xl border bg-white/90 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none ${
                        errors.email ? 'border-rose-400' : activeField === 'email' ? 'border-indigo-400' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs font-medium text-rose-500">{errors.email}</p>}
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Password</span>
                  <div className="relative">
                    <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleFieldChange}
                      onFocus={() => setActiveField('password')}
                      onBlur={() => setActiveField('')}
                      required
                      className={`input-glow w-full rounded-2xl border bg-white/90 py-3 pl-10 pr-10 text-sm text-slate-700 outline-none ${
                        errors.password ? 'border-rose-400' : activeField === 'password' ? 'border-indigo-400' : 'border-slate-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs font-medium text-rose-500">{errors.password}</p>}
                </label>

                <motion.div layout className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/auth')}
                    className="font-medium text-slate-500 hover:text-slate-700"
                  >
                    Admin portal →
                  </button>
                </motion.div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glow-button inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 font-semibold text-white"
                >
                  {isSubmitting ? 'Signing In...' : 'Login'}
                  <FaArrowRight className="text-xs" />
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </MotionSection>

        <MotionAside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="glass-panel bg-grid relative overflow-hidden rounded-3xl p-7 sm:p-10"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-10 -top-8 h-32 w-32 rounded-full bg-indigo-300/25 blur-3xl"
          />

          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Why MentorHub</p>
          <h3 className="font-heading mt-2 text-3xl font-extrabold text-slate-900">Built for Reliable Learning Outcomes</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Access vetted tutors, transparent ratings, and secure scheduling flows designed for students, parents, and professionals.
          </p>

          <div className="mt-6 space-y-3">
            {featureBullets.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <FaCircleCheck className="text-emerald-500" />
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {proofStats.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-slate-200 bg-white/80 p-3 text-center">
                <p className="font-heading text-lg font-bold text-slate-900">{metric.value}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
              </div>
            ))}
          </div>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 rounded-2xl border border-slate-200 bg-white/80 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Success</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              "Booked in under 5 minutes and boosted my test score in 3 weeks."
            </p>
            <p className="mt-1 text-xs text-slate-500">Aisha Malik, GRE Student</p>
          </motion.article>
        </MotionAside>
      </div>
    </div>
  );
}

export default Auth;
