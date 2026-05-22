import { useState, useContext, useEffect, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-toastify';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  UserPlus,
  MessageCircle,
  ArrowLeft,
  Loader2,
  Check,
  X,
} from 'lucide-react';

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Weak', cls: 'strength-weak', color: 'text-red-500' };
  if (score === 3) return { label: 'Fair', cls: 'strength-fair', color: 'text-amber-500' };
  if (score === 4) return { label: 'Good', cls: 'strength-good', color: 'text-blue-500' };
  return { label: 'Strong', cls: 'strength-strong', color: 'text-emerald-500' };
}

const passwordChecks = [
  { key: 'length6', label: 'At least 6 characters', check: (p) => p.length >= 6 },
  { key: 'length10', label: 'At least 10 characters', check: (p) => p.length >= 10 },
  { key: 'uppercase', label: 'One uppercase letter', check: (p) => /[A-Z]/.test(p) },
  { key: 'number', label: 'One number', check: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', check: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showChecks, setShowChecks] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, user } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/');
  }, [user]);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    const success = await register(username, email, password);
    setIsSubmitting(false);

    if (success) {
      toast.success('Account created successfully! 🎉');
    } else {
      setError('Registration failed. Username or email might already be taken.');
      toast.error('Registration failed — please try again');
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden px-4 py-10">
      {/* Decorative floating orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="relative p-8 sm:p-10 space-y-6 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-2xl border border-white/40 dark:border-zinc-700/60 rounded-3xl shadow-2xl shadow-zinc-900/[0.06] dark:shadow-black/30">

          {/* Brand logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 shadow-lg shadow-emerald-500/25 auth-logo-pulse">
              <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                BaatCheet
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium">
                Create your account and start chatting
              </p>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 p-3 rounded-xl"
            >
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <span className="text-red-500 text-xs font-bold">!</span>
              </div>
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500" strokeWidth={1.8} />
                </div>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="auth-input w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white/60 dark:bg-zinc-900/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-emerald-400 dark:focus:border-emerald-500 focus:outline-none backdrop-blur-sm text-sm"
                  placeholder="johndoe"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500" strokeWidth={1.8} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white/60 dark:bg-zinc-900/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-emerald-400 dark:focus:border-emerald-500 focus:outline-none backdrop-blur-sm text-sm"
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500" strokeWidth={1.8} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (e.target.value.length > 0) setShowChecks(true);
                    else setShowChecks(false);
                  }}
                  onFocus={() => password.length > 0 && setShowChecks(true)}
                  onBlur={() => setShowChecks(false)}
                  className="auth-input w-full pl-10 pr-11 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white/60 dark:bg-zinc-900/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-emerald-400 dark:focus:border-emerald-500 focus:outline-none backdrop-blur-sm text-sm"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4.5 h-4.5" strokeWidth={1.8} />
                  ) : (
                    <Eye className="w-4.5 h-4.5" strokeWidth={1.8} />
                  )}
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2"
                >
                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                    <div className={`password-strength-bar ${strength.cls} h-full rounded-full`} />
                  </div>
                  <p className={`text-xs mt-1 font-medium ${strength.color}`}>
                    {strength.label}
                  </p>
                </motion.div>
              )}

              {/* Password requirements checklist */}
              {showChecks && password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/50 space-y-1.5"
                >
                  {passwordChecks.map(({ key, label, check }) => {
                    const passed = check(password);
                    return (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        {passed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" strokeWidth={3} />
                        ) : (
                          <X className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" strokeWidth={2} />
                        )}
                        <span className={passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Submit button */}
            <motion.button
              whileHover={!isSubmitting ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting ? { scale: 0.98 } : {}}
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 font-semibold text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/40 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-emerald-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" strokeWidth={2.5} />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <UserPlus className="w-4.5 h-4.5" strokeWidth={2} />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              or
            </span>
          </div>

          {/* Login link */}
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
