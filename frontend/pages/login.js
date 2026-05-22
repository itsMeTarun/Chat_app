import { useState, useContext, useEffect } from 'react';
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
  LogIn,
  MessageCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/');
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Simple validation
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);

    if (success) {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      toast.success('Welcome back! 🎉');
    } else {
      setError('Invalid email or password');
      toast.error('Login failed — please try again');
    }
  };

  // Load remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

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
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25 auth-logo-pulse">
              <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                BaatCheet
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium">
                Welcome back — sign in to continue
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
                  className="auth-input w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white/60 dark:bg-zinc-900/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none backdrop-blur-sm text-sm"
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500" strokeWidth={1.8} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input w-full pl-10 pr-11 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white/60 dark:bg-zinc-900/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none backdrop-blur-sm text-sm"
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
            </div>

            {/* Remember me checkbox */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setRememberMe((prev) => !prev)}
                className="flex items-center gap-2 group cursor-pointer select-none"
              >
                <div
                  className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                    rememberMe
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'border-gray-300 dark:border-zinc-600 bg-white/40 dark:bg-zinc-800/40 group-hover:border-indigo-400'
                  }`}
                >
                  {rememberMe && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </motion.svg>
                  )}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                  Remember me
                </span>
              </button>
            </div>

            {/* Submit button */}
            <motion.button
              whileHover={!isSubmitting ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting ? { scale: 0.98 } : {}}
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 font-semibold text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/40 transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" strokeWidth={2.5} />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <LogIn className="w-4.5 h-4.5" strokeWidth={2} />
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

          {/* Signup link */}
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold transition-colors group"
            >
              Create one
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
