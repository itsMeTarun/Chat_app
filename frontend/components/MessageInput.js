import { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Smile, Send, Image as ImageIcon, X, Loader2, Reply, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../config';

export default function MessageInput({ onSendMessage, onTyping, onStopTyping, replyTo, onCancelReply }) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, []);

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping?.();
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping?.();
    }, 1500);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    if (imagePreview) {
      await sendImageMessage();
    } else {
      onSendMessage(text, 'text');
    }

    setText('');
    setImagePreview(null);
    setShowEmojiPicker(false);
    onStopTyping?.();
    clearTimeout(typingTimeoutRef.current);
    if (onCancelReply) onCancelReply();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview({ file, dataUrl: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  const sendImageMessage = async () => {
    if (!imagePreview?.file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', imagePreview.file);

      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/upload/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      onSendMessage(text, 'image', {
        imageUrl: res.data.imageUrl,
        fileName: res.data.fileName,
        fileSize: res.data.fileSize
      });
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setText(prev => prev + emojiObject.emoji);
  };

  return (
    <div className="relative w-full">
      {/* Reply indicator */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Reply className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300 truncate">
                <span className="font-medium">Replying to:</span> {replyTo.message?.substring(0, 60)}
                {replyTo.message?.length > 60 ? '...' : ''}
              </div>
            </div>
            <button
              onClick={onCancelReply}
              className="ml-2 p-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/50 text-blue-500 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-2 relative inline-block"
          >
            <img
              src={imagePreview.dataUrl}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-xl border border-gray-200 dark:border-zinc-700"
            />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            {uploading && (
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMOJI PICKER */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-2 sm:left-4 z-50 mb-2 scale-90 sm:scale-100 origin-bottom-left max-w-[95vw] overflow-hidden"
          >
            <EmojiPicker onEmojiClick={onEmojiClick} theme="auto" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* INPUT */}
      <form onSubmit={handleSend} className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Image upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 sm:p-3 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 bg-gray-100 dark:bg-gray-700 rounded-full transition"
          title="Upload image"
        >
          <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* EMOJI BTN */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 sm:p-3 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-100 dark:bg-gray-700 rounded-full transition"
        >
          <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* TEXTAREA */}
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder={uploading ? 'Uploading image...' : 'Type a message...'}
          disabled={uploading}
          className="
            flex-1
            min-h-[40px] sm:min-h-[48px]
            max-h-28 sm:max-h-32
            text-sm sm:text-base
            py-2 sm:py-3 px-3 sm:px-4
            bg-white/50 dark:bg-black/50
            border border-white/20 dark:border-white/5
            rounded-2xl resize-none
            focus:ring-2 focus:ring-blue-500
            dark:text-white
            backdrop-blur-sm
            disabled:opacity-50
          "
          rows="1"
        />

        {/* SEND BTN */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="submit"
          className="
            p-2 sm:p-3
            text-white bg-blue-600 rounded-full
            hover:bg-blue-700 transition
            shadow-md disabled:opacity-50
          "
          disabled={!text.trim() && !imagePreview || uploading}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
          ) : (
            <Send className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </motion.button>
      </form>
    </div>
  );
}