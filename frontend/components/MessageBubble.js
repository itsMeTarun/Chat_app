import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'timeago.js';
import { MoreVertical, Trash2, Edit, Check, X, Reply, Smile } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageBubble({ message, isOwn, onDelete, onEdit, onViewProfile, onReply, onReaction }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message);
  const [showOptions, setShowOptions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const optionsRef = useRef(null);

  useEffect(() => {
    setEditText(message.message);
  }, [message.message]);

  // Close options on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptions(false);
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText.trim() === message.message) {
      setIsEditing(false);
      return;
    }
    try {
      await axios.put(`${API_URL}/api/chat/${message._id}`, { message: editText.trim() });
      if (onEdit) onEdit(message._id, editText.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleQuickReaction = (emoji) => {
    if (onReaction) onReaction(message._id, emoji);
    setShowReactions(false);
  };

  // Aggregate reactions for display
  const reactionCounts = {};
  (message.reactions || []).forEach(r => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  if (message.isDeleted && !message.message) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center my-3"
      >
        <span className="text-xs text-gray-400 dark:text-gray-500 italic px-3 py-1 rounded-full bg-gray-100 dark:bg-zinc-800/50">
          Message deleted
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex w-full mb-2 px-1 sm:px-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar for received messages */}
      {!isOwn && (
        <div
          className={`mr-3 flex-shrink-0 ${onViewProfile ? 'cursor-pointer' : ''}`}
          onClick={() => onViewProfile && onViewProfile()}
        >
          {message.senderId?.avatar ? (
            <img src={message.senderId.avatar} className="w-8 h-8 rounded-full object-cover shadow-sm" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-md">
              <span className="text-white text-xs font-bold">
                {message.senderId?.username?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>
      )}

      <div
        className={`group relative flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
        style={{ maxWidth: '85%' }}
      >
        {/* Reply-to preview */}
        {message.replyTo && (
          <div className={`mb-1 px-3 py-1 rounded-t-xl text-xs border-l-4 ${isOwn ? 'bg-blue-400/20 border-blue-300 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-zinc-700/50 border-gray-300 dark:border-zinc-500 text-gray-600 dark:text-gray-400'}`}>
            <span className="font-medium">
              {message.replyTo.senderId === message.senderId?._id ? 'Self' : (message.replyTo.senderId?.username || 'User')}
            </span>
            : {message.replyTo.message?.substring(0, 50)}
            {message.replyTo.message?.length > 50 ? '...' : ''}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`relative px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl w-fit backdrop-blur-md shadow-md transition-all duration-200 ${
            isOwn
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md border border-blue-400/30'
              : 'bg-white/90 dark:bg-zinc-800/90 text-gray-900 dark:text-gray-100 rounded-bl-md border border-white/20 dark:border-zinc-700'
          }`}
        >
          {isEditing ? (
            <div className="space-y-2 min-w-[160px]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-white/20 dark:bg-black/20 text-white dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Image content */}
              {message.messageType === 'image' && message.imageUrl && (
                <div className="mb-2 relative rounded-xl overflow-hidden">
                  {!imageLoaded && (
                    <div className="w-48 h-48 sm:w-64 sm:h-64 bg-gray-200 dark:bg-zinc-700 animate-pulse rounded-xl flex items-center justify-center">
                      <span className="text-gray-400">Loading...</span>
                    </div>
                  )}
                  <img
                    src={message.imageUrl}
                    alt="Shared image"
                    className={`max-w-[200px] sm:max-w-[280px] max-h-64 object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity ${imageLoaded ? 'block' : 'hidden'}`}
                    onLoad={() => setImageLoaded(true)}
                    onClick={() => window.open(message.imageUrl, '_blank')}
                  />
                </div>
              )}

              {/* File content */}
              {message.messageType === 'file' && message.fileUrl && (
                <div className="mb-2">
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600'} transition-colors`}
                  >
                    <span className="text-lg">📎</span>
                    <span className="truncate max-w-[150px]">{message.fileName || 'File'}</span>
                  </a>
                </div>
              )}

              {/* Text content */}
              {message.message && (
                <p className={`text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words ${message.isDeleted ? 'italic opacity-60' : ''}`}>
                  {message.message}
                  {message.isEdited && !message.isDeleted && (
                    <span className={`text-[10px] ml-1 opacity-60 ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                      (edited)
                    </span>
                  )}
                </p>
              )}

              {/* Time and checkmarks */}
              <div className={`flex items-center gap-1.5 mt-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <span className={`text-[10px] ${isOwn ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
                  {format(message.createdAt)}
                </span>
                {isOwn && (
                  <span className="text-blue-200">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16L5 12L3.59 13.41L9 19L21 7L19.59 5.59L9 16Z" />
                    </svg>
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Reactions bar */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleQuickReaction(emoji)}
                className="px-2 py-0.5 text-xs bg-white/80 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-full hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
              >
                {emoji} {count > 1 && count}
              </button>
            ))}
          </div>
        )}

        {/* Options / Reaction menu */}
        {!isEditing && (
          <div ref={optionsRef} className="relative">
            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {/* Quick reactions */}
              <div className="flex items-center bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-gray-200 dark:border-zinc-700 px-1 py-0.5">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleQuickReaction(emoji)}
                    className="p-1 hover:scale-125 transition-transform text-sm"
                  >
                    {emoji}
                  </button>
                ))}
                <div className="w-px h-4 bg-gray-200 dark:bg-zinc-600 mx-0.5"></div>
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Smile className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Reply button */}
              {onReply && (
                <button
                  onClick={() => onReply(message)}
                  className="p-1 rounded-full bg-white dark:bg-zinc-800 shadow border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Options for own messages */}
              {isOwn && (
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="p-1 rounded-full bg-white dark:bg-zinc-800 shadow border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown menu */}
            <AnimatePresence>
              {showOptions && isOwn && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -5 }}
                  className="absolute top-8 right-0 z-30 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-700 overflow-hidden"
                >
                  <button
                    onClick={() => { setIsEditing(true); setShowOptions(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { if (onDelete) onDelete(message._id); setShowOptions(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
