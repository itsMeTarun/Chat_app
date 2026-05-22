import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import Link from 'next/link';
import { Search, User as UserIcon, MessageSquare, Users, UserPlus, X, Trash2, Pin, PinOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { format } from 'timeago.js';
import { API_URL } from '../config';

export default function Sidebar({ onSelectUser, selectedUser }) {
  const { user, setUser } = useContext(AuthContext);
  const { socket, onlineUsers } = useContext(SocketContext);

  const [activeTab, setActiveTab] = useState('chats');
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [search, setSearch] = useState('');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/conversations`);
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      // Fallback to friends list
      fetchFriends();
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchFriends = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/friends/${user._id}`);
      setFriends(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/friends/requests/${user._id}`);
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/users`);
      const friendIds = conversations.map(c => c.otherUser?._id).filter(Boolean);
      const filtered = res.data.filter(u => u._id !== user._id && !friendIds.includes(u._id));
      setSearchResults(filtered);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    if (user) {
      if (activeTab === 'chats') fetchConversations();
      if (activeTab === 'requests') fetchRequests();
      if (activeTab === 'search') fetchAllUsers();
    }
  }, [user, activeTab]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !user) return;

    const handleConversationUpdated = (conv) => {
      setConversations(prev => {
        const existing = prev.find(c => c._id === conv._id);
        if (existing) {
          return prev.map(c => c._id === conv._id ? { ...c, ...conv } : c);
        }
        return [conv, ...prev];
      });
    };

    const handleFriendRequestReceived = (sender) => {
      if (activeTab === 'requests') fetchRequests();
      toast.info(`${sender?.username || 'Someone'} sent you a friend request!`);
    };

    const handleFriendRequestAccepted = (acceptedUser) => {
      fetchConversations();
      if (activeTab === 'requests') fetchRequests();
      toast.success(`${acceptedUser?.username || 'Friend request'} accepted!`);
    };

    const handleFriendRequestRejected = () => {
      if (activeTab === 'requests') fetchRequests();
    };

    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('friend_request_received', handleFriendRequestReceived);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);
    socket.on('friend_request_rejected', handleFriendRequestRejected);

    return () => {
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('friend_request_received', handleFriendRequestReceived);
      socket.off('friend_request_accepted', handleFriendRequestAccepted);
      socket.off('friend_request_rejected', handleFriendRequestRejected);
    };
  }, [socket, user, activeTab]);

  // Close remove confirmation on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.querySelector('aside');
      if (sidebar && !sidebar.contains(event.target) && showRemoveConfirm) {
        setShowRemoveConfirm(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRemoveConfirm]);

  const sendRequest = async (receiverId) => {
    try {
      await axios.post(`${API_URL}/api/friends/request`, { receiverId });
      if (socket) socket.emit('send_friend_request', { senderId: user._id, receiverId });
      toast.success('Friend request sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error sending request');
    }
  };

  const acceptRequest = async (requestId, senderId) => {
    try {
      await axios.post(`${API_URL}/api/friends/accept`, { requestId });
      if (socket) socket.emit('accept_friend_request', { senderId, receiverId: user._id });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const rejectRequest = async (requestId, senderId) => {
    try {
      await axios.post(`${API_URL}/api/friends/reject`, { requestId });
      if (socket) socket.emit('reject_friend_request', { senderId, receiverId: user._id });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const removeFriend = async (friendId) => {
    try {
      await axios.post(`${API_URL}/api/friends/remove`, { friendId });
      setUser(prev => ({
        ...prev,
        friends: prev.friends?.filter(id => id !== friendId) || []
      }));
      setConversations(prev => prev.filter(c => c.otherUser?._id !== friendId));
      setShowRemoveConfirm(null);
      toast.info('Friend removed');
    } catch (err) {
      console.error(err);
    }
  };

  const togglePin = async (conversationId) => {
    try {
      const res = await axios.post(`${API_URL}/api/conversations/${conversationId}/pin`);
      setConversations(prev =>
        prev.map(c => c._id === conversationId ? { ...c, isPinned: res.data.isPinned } : c)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectUser = (convOrUser) => {
    const selectedUserData = convOrUser.otherUser || convOrUser;
    // Attach conversationId to the selected user data for ChatWindow
    const enriched = { ...selectedUserData, conversationId: convOrUser._id };
    // Mark conversation as read
    if (convOrUser._id && convOrUser.unreadCount > 0) {
      axios.post(`${API_URL}/api/conversations/${convOrUser._id}/read`);
      if (socket) {
        socket.emit('mark_messages_read', { conversationId: convOrUser._id, userId: user._id });
      }
      setConversations(prev =>
        prev.map(c => c._id === convOrUser._id ? { ...c, unreadCount: 0 } : c)
      );
    }
    onSelectUser(enriched);
  };

  const renderTabContent = () => {
    if (activeTab === 'chats') {
      // Sort: pinned first, then by updatedAt
      const sorted = [...conversations].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });

      if (loading && sorted.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-gray-400 text-sm">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Loading conversations...</p>
          </div>
        );
      }

      if (sorted.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-gray-400 text-sm">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 opacity-50" />
            </div>
            <p>No conversations yet</p>
            <p className="text-xs mt-2 opacity-70">Find users in the search tab!</p>
          </div>
        );
      }

      return (
        <div className="py-2">
          {sorted.map((conv) => {
            const u = conv.otherUser;
            if (!u) return null;
            const isOnline = onlineUsers.includes(u._id);
            const isSelected = selectedUser?._id === u._id;
            const unreadCount = conv.unreadCount || 0;

            return (
              <motion.div
                key={conv._id || u._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.08)' }}
                onClick={() => handleSelectUser(conv)}
                className={`relative flex items-center p-4 cursor-pointer transition-all duration-200 group ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400'
                    : 'border-l-4 border-transparent hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                {/* Pin indicator */}
                {conv.isPinned && (
                  <div className="absolute top-1 right-1 text-blue-400 dark:text-blue-300">
                    <Pin className="w-3 h-3" />
                  </div>
                )}

                <div className="relative flex-shrink-0">
                  {u.avatar ? (
                    <img src={u.avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-md">
                      <UserIcon className="w-7 h-7 text-white" />
                    </div>
                  )}
                  {isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-zinc-950 rounded-full shadow-sm animate-pulse"></div>
                  )}
                </div>

                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {u.username}
                    </h4>
                    {conv.lastMessage && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                        {format(conv.updatedAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate ${unreadCount > 0 ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {conv.lastMessageType === 'image' ? '📷 Photo' :
                       conv.lastMessageType === 'file' ? '📎 File' :
                       conv.lastMessageText || 'No messages yet'}
                    </p>
                    {unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-[10px] font-bold text-white bg-blue-500 rounded-full flex-shrink-0">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons on hover */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(conv._id);
                    }}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 hover:text-blue-500 transition-colors"
                    title={conv.isPinned ? 'Unpin' : 'Pin'}
                  >
                    {conv.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRemoveConfirm(u._id);
                    }}
                    className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove friend"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      );
    }

    if (activeTab === 'requests') {
      if (requests.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-gray-400 text-sm">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Users className="w-8 h-8 opacity-50" />
            </div>
            <p>No pending requests</p>
          </div>
        );
      }

      return (
        <div className="py-2">
          {requests.map((req) => (
            <motion.div
              key={req._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center">
                {req.sender.avatar ? (
                  <img src={req.sender.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-zinc-800 shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-sm">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                )}
                <span className="ml-3 text-sm font-semibold dark:text-gray-100">{req.sender.username}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => acceptRequest(req._id, req.sender._id)}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-full transition-colors shadow-sm shadow-green-500/30"
                >
                  Accept
                </button>
                <button
                  onClick={() => rejectRequest(req._id, req.sender._id)}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full transition-colors"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      );
    }

    if (activeTab === 'search') {
      const filtered = searchResults.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));
      return (
        <>
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Find friends..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/50 dark:text-white transition-all"
              />
            </div>
          </div>
          <div className="py-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-400 text-sm">
                <p>No users found</p>
              </div>
            ) : (
              filtered.map(u => (
                <motion.div
                  key={u._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center">
                    {u.avatar ? (
                      <img src={u.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shadow-sm">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <span className="ml-3 text-sm font-semibold dark:text-gray-100">{u.username}</span>
                  </div>
                  <button
                    onClick={() => sendRequest(u._id)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-full transition-colors shadow-sm shadow-blue-600/30"
                  >
                    Add
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </>
      );
    }
  };

  return (
    <div className="w-full md:w-80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-r border-gray-200 dark:border-zinc-800 flex flex-col h-full transition-colors shadow-2xl relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
        <Link href="/profile" className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer group">
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/30 group-hover:border-blue-500 transition-colors" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-2 border-blue-500/50 group-hover:border-purple-500 transition-colors">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
          )}
          <span className="font-bold text-gray-900 dark:text-white truncate">{user?.username}</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-3 flex justify-center items-center text-sm font-medium transition-all duration-300 ${
            activeTab === 'chats'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-zinc-900/50'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Chats
          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === 'chats' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
            {conversations.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 flex justify-center items-center text-sm font-medium transition-all duration-300 ${
            activeTab === 'requests'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 bg-white dark:bg-zinc-900/50'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Requests
          {requests.length > 0 && (
            <span className="ml-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-3 flex justify-center items-center text-sm font-medium transition-all duration-300 ${
            activeTab === 'search'
              ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-white dark:bg-zinc-900/50'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Search className="w-4 h-4 mr-2" />
          Search
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Remove Friend Confirmation */}
      <AnimatePresence>
        {showRemoveConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 right-4 z-30 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Remove friend?</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">This will remove them from your chat list</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRemoveConfirm(null)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => removeFriend(showRemoveConfirm)}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
