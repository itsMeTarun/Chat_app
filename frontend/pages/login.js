import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-toastify';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, user } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/');
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (success) {
      toast.success('Welcome back!');
    } else {
      setError('Invalid email or password');
      toast.error('Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-transparent transition-colors p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 space-y-6 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border border-white/40 dark:border-zinc-800 rounded-3xl shadow-2xl"
      >
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Sign in to start chatting</p>
        </div>
        {error && (
          <div className="text-red-500 text-sm text-center bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 mt-1 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white/50 dark:bg-zinc-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all backdrop-blur-md"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 mt-1 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white/50 dark:bg-zinc-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all backdrop-blur-md"
              placeholder="••••••••"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all shadow-lg shadow-blue-500/30"
          >
            Sign In
          </motion.button>
        </form>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
