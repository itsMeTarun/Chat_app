import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeft, User, LogOut, Mail, Image as ImageIcon, Camera, Check, X, Edit3, FileText } from 'lucide-react';

import { API_URL } from '../config';

export default function Profile() {
  const { user, setUser, logout, loading } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) {
      setUsername(user.username || '');
      setAvatar(user.avatar || '');
      setBio(user.bio || '');
    }
  }, [user, loading, router]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${API_URL}/api/auth/profile`, { username, avatar, bio });
      setUser(res.data.user || res.data);
      setMessage('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setMessage('Failed to update profile.');
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Animation Variants
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const formVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-gray-50 dark:bg-zinc-950 transition-colors duration-500">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 dark:bg-blue-600/10 blur-[100px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/20 dark:bg-purple-600/10 blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s'}}></div>

      <div className="w-full max-w-lg relative z-10">
        
        <Link
          href="/"
          className="inline-flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white mb-4 transition-colors font-medium group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> 
          Return to Chat
        </Link>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-[2rem] shadow-2xl shadow-blue-500/5 dark:shadow-black/50 overflow-hidden border border-white/50 dark:border-zinc-800/80"
        >
          {/* Hero Header Section */}
          <div className="relative pt-8 pb-4 px-6 flex flex-col items-center">
            {/* Banner gradient */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 dark:from-blue-600 dark:via-indigo-700 dark:to-purple-800 opacity-90"></div>
            
            {/* Avatar */}
            <div className="relative z-10 mb-4 group">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
              {avatar ? (
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-zinc-900 object-cover shadow-xl relative z-10 group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-zinc-900 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center shadow-xl relative z-10 group-hover:scale-105 transition-transform duration-300">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
              )}
              {isEditing && (
                <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-2 rounded-full shadow-lg z-20 border-2 border-white dark:border-zinc-900">
                  <Camera className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="text-center relative z-10 pt-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {user.username}
              </h2>
              <div className="flex items-center justify-center gap-1.5 mt-1 opacity-80 text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">{user.email}</span>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 pb-6">
            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-6"
                >
                  <div className={`p-3 rounded-2xl text-center text-sm font-medium border ${
                    message.includes('success')
                      ? 'bg-green-50/50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400'
                      : 'bg-red-50/50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400'
                  }`}>
                    {message}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {!isEditing ? (
                <motion.div
                  key="view"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    {/* Read-only Data Field */}
                    <div className="group flex items-center gap-3 p-3 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Username</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{user.username}</p>
                      </div>
                    </div>

                    <div className="group flex items-center gap-3 p-3 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100/50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Primary Email</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium truncate">{user.email}</p>
                      </div>
                    </div>

                    {/* Bio field in view mode */}
                    <div className="group flex items-start gap-3 p-3 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-100/50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Bio</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">
                          {user.bio || 'No bio yet. Click edit to add one!'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full relative group overflow-hidden py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-2xl transition-transform hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2 shadow-xl shadow-gray-900/20 dark:shadow-white/10"
                  >
                    <Edit3 className="w-4 h-4 z-10" />
                    <span className="z-10 relative">Edit Personal Info</span>
                  </button>
                  
                  <div className="pt-4 mt-2 border-t border-gray-200/50 dark:border-zinc-800/50">
                    <button
                      onClick={logout}
                      className="w-full py-3 px-4 flex justify-center items-center gap-2 rounded-2xl font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border-2 border-transparent hover:border-red-100 dark:hover:border-red-500/20 transition-all active:scale-95"
                    >
                      <LogOut className="w-5 h-5" />
                      Secure Logout
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="edit"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleUpdate}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Username</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white/70 dark:bg-zinc-800/70 border border-gray-200 dark:border-zinc-700 backdrop-blur-sm rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Avatar Image URL</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-purple-500 transition-colors">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        placeholder="https://.../avatar.png"
                        className="w-full pl-11 pr-12 py-3 bg-white/70 dark:bg-zinc-800/70 border border-gray-200 dark:border-zinc-700 backdrop-blur-sm rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                      />
                      {avatar && (
                        <button
                          type="button"
                          onClick={() => setAvatar('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bio field in edit mode */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Bio</label>
                    <div className="relative group">
                      <div className="absolute top-3 left-4 flex items-start pointer-events-none text-gray-400 group-focus-within:text-teal-500 transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell the world about yourself..."
                        maxLength={200}
                        rows={3}
                        className="w-full pl-11 pr-4 py-3 bg-white/70 dark:bg-zinc-800/70 border border-gray-200 dark:border-zinc-700 backdrop-blur-sm rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-medium resize-none"
                      />
                      <span className="absolute bottom-2 right-3 text-xs text-gray-400">{bio.length}/200</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800/50">
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-95 flex justify-center items-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Save Details
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setUsername(user.username || '');
                        setAvatar(user.avatar || '');
                        setBio(user.bio || '');
                      }}
                      className="flex-1 sm:flex-none py-3 px-6 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl transition-all active:scale-95"
                    >
                      Discard
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
