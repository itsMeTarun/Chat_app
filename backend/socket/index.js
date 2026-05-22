const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

module.exports = (io) => {
  const userSocketMap = {}; // Maps userId -> socketId

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Register user
    socket.on('register_user', async (userId) => {
      if (!userId) return;

      userSocketMap[userId] = socket.id;
      socket.userId = userId;

      // Update user status to online
      try {
        await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });
      } catch (e) { console.error(e); }

      io.emit('online_users', Object.keys(userSocketMap));
    });

    // Send message (enhanced with conversation support)
    socket.on('send_message', async (data) => {
      const {
        senderId, receiverId, conversationId,
        message, messageType, imageUrl, fileUrl,
        fileName, fileSize, replyTo
      } = data;

      try {
        let convId = conversationId;
        let conv;

        // Find or create conversation
        if (convId) {
          conv = await Conversation.findById(convId);
        }

        if (!conv && senderId && receiverId) {
          conv = await Conversation.findOne({
            participants: { $all: [senderId, receiverId], $size: 2 },
            isGroup: false
          });

          if (!conv) {
            conv = new Conversation({
              participants: [senderId, receiverId],
              createdBy: senderId
            });
          }
        }

        if (conv) {
          convId = conv._id;
          conv.lastMessageText = message || (messageType === 'image' ? '📷 Image' : messageType === 'file' ? '📎 File' : message);
          conv.lastMessageType = messageType || 'text';

          // Increment unread count for receiver
          if (receiverId) {
            const currentCount = conv.unreadCounts?.get(receiverId) || 0;
            conv.unreadCounts.set(receiverId, currentCount + 1);
          }

          await conv.save();
        }

        const newMessage = new Message({
          senderId,
          receiverId,
          conversationId: convId,
          message: message || '',
          messageType: messageType || 'text',
          imageUrl: imageUrl || '',
          fileUrl: fileUrl || '',
          fileName: fileName || '',
          fileSize: fileSize || 0,
          replyTo: replyTo || null
        });

        await newMessage.save();

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('senderId', 'username avatar')
          .populate('replyTo');

        // Send to receiver
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', populatedMessage);
        }

        // Emit conversation update to both users
        if (conv) {
          const updatedConv = await Conversation.findById(conv._id)
            .populate('participants', '-password')
            .populate('lastMessage');

          [senderId, receiverId].forEach(uid => {
            if (uid) {
              const sockId = userSocketMap[uid];
              if (sockId) {
                const otherParticipant = updatedConv.participants.find(
                  p => p._id.toString() !== uid
                );
                const unreadCount = updatedConv.unreadCounts?.get?.(uid) || 0;

                io.to(sockId).emit('conversation_updated', {
                  _id: updatedConv._id,
                  otherUser: otherParticipant || updatedConv.participants[0],
                  lastMessage: updatedConv.lastMessage,
                  lastMessageText: updatedConv.lastMessageText,
                  lastMessageType: updatedConv.lastMessageType,
                  unreadCount,
                  isPinned: updatedConv.pinnedBy?.some(p => p.toString() === uid) || false,
                  updatedAt: updatedConv.updatedAt,
                  createdAt: updatedConv.createdAt
                });
              }
            }
          });
        }

        // Also send back to sender
        io.to(socket.id).emit('receive_message', populatedMessage);
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });

    // Edit message
    socket.on('edit_message', async (data) => {
      const { messageId, newText, receiverId, conversationId } = data;
      try {
        const message = await Message.findById(messageId);
        if (message) {
          message.message = newText;
          message.isEdited = true;
          message.editedAt = new Date();
          await message.save();

          const updatedMsg = await Message.findById(messageId)
            .populate('senderId', 'username avatar')
            .populate('replyTo');

          // Send to receiver
          const receiverSocketId = userSocketMap[receiverId];
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('message_edited', updatedMsg);
          }
          // Send back to sender
          io.to(socket.id).emit('message_edited', updatedMsg);
        }
      } catch (err) {
        console.error('Error editing message:', err);
      }
    });

    // Delete message
    socket.on('delete_message_event', async ({ messageId, receiverId }) => {
      try {
        const message = await Message.findById(messageId);
        if (message) {
          message.isDeleted = true;
          message.message = 'This message was deleted';
          message.fileUrl = '';
          message.imageUrl = '';
          await message.save();
        }
      } catch (e) { console.error(e); }

      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message_deleted', messageId);
      }
    });

    // Message reactions
    socket.on('react_to_message', async (data) => {
      const { messageId, userId, emoji, receiverId } = data;
      try {
        const message = await Message.findById(messageId);
        if (message) {
          message.reactions = message.reactions.filter(r => r.userId.toString() !== userId);
          if (emoji) {
            message.reactions.push({ userId, emoji });
          }
          await message.save();

          // Notify both sender and receiver
          const senderSocketId = userSocketMap[message.senderId.toString()];
          const receiverSockId = userSocketMap[receiverId] || (senderSocketId === socket.id ? null : senderSocketId);

          [receiverId, message.senderId.toString()].forEach(uid => {
            const sockId = userSocketMap[uid];
            if (sockId) {
              io.to(sockId).emit('message_reaction_updated', {
                messageId,
                reactions: message.reactions
              });
            }
          });
        }
      } catch (err) {
        console.error('Error adding reaction:', err);
      }
    });

    // Read receipts
    socket.on('mark_messages_read', async ({ conversationId, userId }) => {
      try {
        const conv = await Conversation.findById(conversationId);
        if (conv) {
          conv.unreadCounts.set(userId, 0);
          conv.markModified('unreadCounts');
          await conv.save();

          const otherParticipant = conv.participants.find(p => p.toString() !== userId);
          if (otherParticipant) {
            const sockId = userSocketMap[otherParticipant.toString()];
            if (sockId) {
              io.to(sockId).emit('messages_read_by', { conversationId, userId });
            }
          }
        }
      } catch (err) {
        console.error('Error marking messages read:', err);
      }
    });

    // Typing indicators
    socket.on('typing', ({ senderId, receiverId, conversationId }) => {
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user_typing', { senderId, conversationId });
      }
    });

    socket.on('stop_typing', ({ senderId, receiverId, conversationId }) => {
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user_stop_typing', { senderId, conversationId });
      }
    });

    // Friend requests
    socket.on('send_friend_request', async ({ senderId, receiverId }) => {
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        const sender = await User.findById(senderId).select('-password');
        io.to(receiverSocketId).emit('friend_request_received', sender);
      }
    });

    socket.on('accept_friend_request', async ({ senderId, receiverId }) => {
      const [senderUser, receiverUser] = await Promise.all([
        User.findById(senderId).select('-password'),
        User.findById(receiverId).select('-password')
      ]);

      const senderSocketId = userSocketMap[senderId];
      const receiverSocketId = userSocketMap[receiverId];

      if (senderSocketId) {
        io.to(senderSocketId).emit('friend_request_accepted', receiverUser);
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('friend_request_accepted', senderUser);
      }
    });

    socket.on('reject_friend_request', ({ senderId, receiverId }) => {
      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit('friend_request_rejected', receiverId);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);

      const userId = Object.keys(userSocketMap).find(key => userSocketMap[key] === socket.id);
      if (userId) {
        delete userSocketMap[userId];
        io.emit('online_users', Object.keys(userSocketMap));

        // Update user status to offline
        try {
          await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
        } catch (e) { console.error(e); }
      }
    });
  });
};
