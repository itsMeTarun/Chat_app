const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/authMiddleware');

// Get all conversations for the current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    // Transform for the frontend - add unread count
    const enriched = conversations.map(conv => {
      const otherParticipant = conv.participants.find(
        p => p._id.toString() !== userId
      );
      const unreadCount = conv.unreadCounts?.get?.(userId) || 0;

      return {
        _id: conv._id,
        otherUser: otherParticipant || conv.participants[0],
        lastMessage: conv.lastMessage,
        lastMessageText: conv.lastMessageText,
        lastMessageType: conv.lastMessageType,
        unreadCount,
        isPinned: conv.pinnedBy?.some(p => p.toString() === userId) || false,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get or create a 1-on-1 conversation between two users
router.get('/with/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId], $size: 2 },
      isGroup: false
    }).populate('participants', '-password')
      .populate('lastMessage');

    // If not found, create one
    if (!conversation) {
      conversation = new Conversation({
        participants: [currentUserId, otherUserId],
        createdBy: currentUserId
      });
      await conversation.save();
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', '-password')
        .populate('lastMessage');
    }

    const otherParticipant = conversation.participants.find(
      p => p._id.toString() !== currentUserId
    );
    const unreadCount = conversation.unreadCounts?.get?.(currentUserId) || 0;

    res.json({
      _id: conversation._id,
      otherUser: otherParticipant || conversation.participants[0],
      lastMessage: conversation.lastMessage,
      lastMessageText: conversation.lastMessageText,
      lastMessageType: conversation.lastMessageType,
      unreadCount,
      isPinned: conversation.pinnedBy?.some(p => p.toString() === currentUserId) || false,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Pin/unpin a conversation
router.post('/:id/pin', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const userId = req.user.id;
    const isPinned = conversation.pinnedBy.some(p => p.toString() === userId);

    if (isPinned) {
      conversation.pinnedBy = conversation.pinnedBy.filter(p => p.toString() !== userId);
    } else {
      conversation.pinnedBy.push(userId);
    }

    await conversation.save();
    res.json({ isPinned: !isPinned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Mark conversation as read
router.post('/:id/read', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const userId = req.user.id;
    if (conversation.unreadCounts) {
      conversation.unreadCounts.set(userId, 0);
    }
    conversation.markModified('unreadCounts');
    await conversation.save();

    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete conversation (soft - removes from participant list)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    // For now, just archive by removing from visible
    conversation.participants = conversation.participants.filter(
      p => p.toString() !== req.user.id
    );

    if (conversation.participants.length === 0) {
      await conversation.deleteOne();
    } else {
      await conversation.save();
    }

    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;