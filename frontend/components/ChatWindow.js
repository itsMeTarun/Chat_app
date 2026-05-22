import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import UserProfileModal from './UserProfileModal';
import { User, Phone, Video, Info, ArrowLeft, MoreVertical, Trash2, MessageSquare, Image, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { API_URL } from '../config';

export default function ChatWindow({ selectedUser, onBack }) {
  const { user } = useContext(AuthContext);
  const { socket, onlineUsers } = useContext(SocketContext);

  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [conversation, setConversation] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Determine the actual user being chatted with
  const chatUser = selectedUser?.otherUser || selectedUser;
  const conversationId = selectedUser?.conversationId || conversation?._id || selectedUser?._id;

  // Fetch messages on user/conversation change
  useEffect(() => {
    if (selectedUser) fetchMessages();
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!socket || !conversationId || !user) return;
    socket.emit('mark_messages_read', {
      conversationId,
      userId: user._id,
    });
  }, [socket, conversationId, user]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage) => {
      const msgSenderId = newMessage.senderId?._id || newMessage.senderId;
      const isRelevant =
        (newMessage.conversationId === conversationId) ||
        (msgSenderId === chatUser?._id && newMessage.receiverId === user?._id) ||
        (msgSenderId === user?._id && newMessage.receiverId === chatUser?._id);

      if (!isRelevant) return;

      setMessages((prev) => {
        if (prev.find((m) => m._id === newMessage._id)) return prev;
        return [...prev, newMessage];
      });
    };

    const handleUserTyping = (senderId) => {
      if (senderId === chatUser?._id) setIsTyping(true);
    };

    const handleUserStopTyping = (senderId) => {
      if (senderId === chatUser?._id) setIsTyping(false);
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true, message: '' } : m))
      );
    };

    const handleMessageEdited = ({ messageId, newText }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, message: newText, isEdited: true } : m
        )
      );
    };

    const handleMessageReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleMessagesRead = ({ userId, conversationId: convId }) => {
      if (convId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) => {
          const msgSenderId = m.senderId?._id || m.senderId;
          if (String(msgSenderId) === String(user?._id)) {
            const alreadyRead = (m.readBy || []).some((r) => r.userId === userId);
            if (!alreadyRead) {
              return {
                ...m,
                readBy: [...(m.readBy || []), { userId, readAt: new Date().toISOString() }],
              };
            }
          }
          return m;
        })
      );
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_reaction_updated', handleMessageReactionUpdated);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_reaction_updated', handleMessageReactionUpdated);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, chatUser, user, conversationId]);

  // Play notification sound for incoming messages
  const playMessageSound = useCallback(() => {
    try {
      const audio = new Audio('/message-notification.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {
      // Sound file may not exist, ignore
    }
  }, []);

  // Also watch for incoming messages to play sound when window not focused
  useEffect(() => {
    if (!socket) return;
    const handleIncoming = (newMessage) => {
      const msgSenderId = newMessage.senderId?._id || newMessage.senderId;
      if (
        String(msgSenderId) !== String(user?._id) &&
        ((newMessage.conversationId === conversationId) ||
          newMessage.receiverId === user?._id)
      ) {
        if (document.hidden) playMessageSound();
      }
    };
    socket.on('receive_message', handleIncoming);
    return () => socket.off('receive_message', handleIncoming);
  }, [socket, user, conversationId, playMessageSound]);

  const fetchMessages = async () => {
    try {
      let res;
      if (conversationId) {
        res = await axios.get(`${API_URL}/api/chat/conversation/${conversationId}`);
      } else if (chatUser?._id) {
        res = await axios.get(`${API_URL}/api/chat/${chatUser._id}`);
      } else {
        return;
      }
      setMessages(res.data.messages || res.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleSendMessage = (text, messageType = 'text', extra = {}) => {
    if (!socket) return;

    const payload = {
      senderId: user._id,
      receiverId: chatUser?._id,
      message: text,
      messageType,
      ...extra,
    };

    if (replyTo) {
      payload.replyToId = replyTo._id;
      setReplyTo(null);
    }

    socket.emit('send_message', payload);
  };

  const handleTyping = () => {
    socket?.emit('typing', { senderId: user._id, receiverId: chatUser?._id });
  };

  const handleStopTyping = () => {
    socket?.emit('stop_typing', { senderId: user._id, receiverId: chatUser?._id });
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`${API_URL}/api/chat/${messageId}`);
      if (socket) {
        socket.emit('delete_message_event', { messageId, receiverId: chatUser?._id });
      }
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true, message: '' } : m))
      );
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    const updatedMessages = messages.map((m) =>
      m._id === messageId ? { ...m, message: newText, isEdited: true } : m
    );
    setMessages(updatedMessages);
    if (socket) {
      socket.emit('edit_message', {
        messageId,
        newText,
        receiverId: chatUser?._id,
      });
    }
  };

  const handleReply = (message) => {
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleReaction = (messageId, emoji) => {
    if (!socket) return;
    socket.emit('react_to_message', {
      messageId,
      emoji,
    });
  };

  // Check read status for own messages
  const getReadStatus = (message) => {
    const msgSenderId = message?.senderId?._id || message?.senderId;
    if (!message || String(msgSenderId) !== String(user?._id)) return null;
    const readByOthers = (message.readBy || []).filter(
      (r) => r.userId !== user?._id
    );
    if (readByOthers.length > 0) return 'read';
    return 'delivered';
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white/50 dark:bg-black/30 backdrop-blur-md">
        <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
          <MessageSquare className="w-10 h-10 text-blue-400 dark:text-blue-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
          Select a chat
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Choose a friend from the sidebar to start chatting
        </p>
      </div>
    );
  }

  const isOnline = onlineUsers.includes(chatUser?._id);

  return (
    <div className="flex-1 flex flex-col bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-zinc-800 shadow-2xl overflow-hidden transition-colors duration-300 relative">
      <UserProfileModal
        user={chatUser}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* HEADER */}
      <div className="p-4 bg-gradient-to-r from-white/80 to-white/40 dark:from-zinc-900/90 dark:to-zinc-800/60 backdrop-blur-lg border-b border-white/30 dark:border-zinc-700 flex items-center justify-between z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <div
            onClick={() => setShowProfileModal(true)}
            className="relative group cursor-pointer"
          >
            {chatUser?.avatar ? (
              <img
                src={chatUser.avatar}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover shadow-md group-hover:ring-2 group-hover:ring-blue-500/50 transition-all"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
            {isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full shadow-sm animate-pulse"></div>
            )}
          </div>

          <div className="truncate">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {chatUser?.username || 'Unknown User'}
            </h3>
            <p
              className={`text-xs font-medium ${
                isOnline ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {isTyping
                ? 'Typing...'
                : isOnline
                ? 'Online'
                : 'Offline'}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex gap-2 items-center">
          <button
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300 transition-colors"
            title="Voice Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300 transition-colors"
            title="Video Call"
          >
            <Video className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowProfileModal(true)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300 transition-colors"
            title="View Profile"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 w-full custom-scrollbar"
        style={{
          backgroundImage:
            "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjzDCAjFM1FwBhCQK4//cCEQAAAAAAdS1sRQAAAABJRU5ErkJggg==')",
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Say hello to start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((m) => {
              const msgSenderId = m.senderId?._id || m.senderId;
              return (
              <MessageBubble
                key={m._id}
                message={m}
                isOwn={String(msgSenderId) === String(user._id)}
                onDelete={(id) => setShowDeleteConfirm(id)}
                onEdit={handleEditMessage}
                onViewProfile={() => setShowProfileModal(true)}
                onReply={handleReply}
                onReaction={handleReaction}
                readStatus={getReadStatus(m)}
              />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-blue-500 ml-2 flex items-center gap-1"
            >
              <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                <span
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                ></span>
                <span
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></span>
              </div>
              <span>{chatUser?.username} is typing...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* INPUT */}
      <div className="p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-t border-white/30 dark:border-zinc-800 shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
        />
      </div>

      {/* Delete Confirmation Popover */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 right-4 z-50 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 p-3 flex gap-2 items-center"
          >
            <span className="text-xs text-gray-600 dark:text-gray-300 pr-2">
              Delete message?
            </span>
            <button
              onClick={() => handleDeleteMessage(showDeleteConfirm)}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="px-3 py-1 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
