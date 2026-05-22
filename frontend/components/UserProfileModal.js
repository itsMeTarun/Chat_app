import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, X, Calendar, Clock, MessageCircle, ShieldOff } from 'lucide-react';
import { useContext, useState } from 'react';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL } from '../config';

export default function UserProfileModal({ user, isOpen, onClose }) {
  const { onlineUsers } = useContext(SocketContext);
  const { user: currentUser, setUser: setCurrentUser } = useContext(AuthContext);
  const [blocking, setBlocking] = useState(false);

  if (!user) return null;

  const isOnline = onlineUsers.includes(user._id);
  const isBlocked = (currentUser?.blockedUsers || []).includes(user._id);

  const handleBlock = async () => {
    if (blocking) return;
    setBlocking(true);
    try {
      if (isBlocked) {
        await axios.post(`${API_URL}/api/auth/unblock/${user._id}`);
        setCurrentUser((prev) => ({
          ...prev,
          blockedUsers: (prev?.blockedUsers || []).filter((id) => id !== user._id),
        }));
        toast.success(`Unblocked ${user.username}`);
      } else {
        await axios.post(`${API_URL}/api/auth/block/${user._id}`);
        setCurrentUser((prev) => ({
          ...prev,
          blockedUsers: [...(prev?.blockedUsers || []), user._id],
        }));
        toast.info(`Blocked ${user.username}`);
      }
    } catch (err) {
      toast.error('Action failed');
      console.error(err);
    } finally {
      setBlocking(false);
    }
  };

  const statusInfo = user.status === 'online' ? 'Active Now' :
    user.status === 'away' ? 'Away' :
    isOnline ? 'Active Now' : 'Offline';

  const statusColor = user.status === 'online' || isOnline ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
    user.status === 'away' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 dark:border-zinc-800/80"
          >
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Header Gradient */}
            <div className="relative pt-12 pb-8 px-6 flex flex-col items-center">
              <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 opacity-90"></div>

              {/* Avatar */}
              <div className="relative z-10 mb-4 group">
                <div className="absolute inset-0 bg-purple-500 rounded-full blur-md opacity-30"></div>
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Avatar"
                    className="w-28 h-28 rounded-full border-4 border-white dark:border-zinc-900 object-cover shadow-xl relative z-10"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full border-4 border-white dark:border-zinc-900 bg-gradient-to-br from-indigo-100 to-purple-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center shadow-xl relative z-10">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                {isOnline && (
                  <div className="absolute bottom-1 right-2 w-5 h-5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full shadow-sm z-20 animate-pulse"></div>
                )}
              </div>

              {/* Name & Status */}
              <div className="text-center relative z-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {user.username}
                </h2>
                <div className="flex items-center justify-center gap-1.5 mt-1 opacity-80 text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm font-medium">{user.email || 'Email hidden'}</span>
                </div>
                <div className="mt-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {statusInfo}
                  </span>
                </div>
                {user.lastSeen && !isOnline && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last seen {new Date(user.lastSeen).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Bio Section */}
            {user.bio && (
              <div className="px-6 pb-4">
                <div className="bg-gray-50/80 dark:bg-zinc-800/50 rounded-2xl p-4 border border-gray-100 dark:border-zinc-700/50">
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {user.bio}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Footer */}
            <div className="bg-gray-50/50 dark:bg-zinc-950/50 px-6 py-5 border-t border-gray-100 dark:border-zinc-800/80 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined
                </span>
                <span className="text-gray-900 dark:text-gray-100 font-semibold">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Recently'}
                </span>
              </div>

              {/* Block / Unblock */}
              {currentUser?._id !== user._id && (
                <button
                  onClick={handleBlock}
                  disabled={blocking}
                  className={`w-full mt-2 py-2 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    isBlocked
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  <ShieldOff className="w-4 h-4" />
                  {blocking
                    ? 'Processing...'
                    : isBlocked
                    ? 'Unblock User'
                    : 'Block User'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
