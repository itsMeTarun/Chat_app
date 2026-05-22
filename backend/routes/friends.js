const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Conversation = require('../models/Conversation');
const authMiddleware = require('../middleware/authMiddleware');

// Get all friends for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', '-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get friends by userId (legacy support)
router.get('/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }
    const user = await User.findById(req.params.userId).populate('friends', '-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get pending friend requests
router.get('/requests/pending', authMiddleware, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user.id, status: 'pending' })
      .populate('sender', '-password');
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Legacy support
router.get('/requests/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }
    const requests = await FriendRequest.find({ receiver: req.params.userId, status: 'pending' })
      .populate('sender', '-password');
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Send a friend request
router.post('/request', authMiddleware, async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user.id;

  if (senderId === receiverId) return res.status(400).json({ message: 'Cannot add yourself' });

  try {
    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: 'User not found' });

    // Check if already friends
    const sender = await User.findById(senderId);
    if (sender.friends.includes(receiverId)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    // Check if blocked
    if (receiver.blockedUsers?.includes(senderId)) {
      return res.status(400).json({ message: 'Cannot send request to this user' });
    }

    let request = await FriendRequest.findOne({ sender: senderId, receiver: receiverId });
    if (request && request.status === 'pending') {
      return res.status(400).json({ message: 'Request already sent' });
    }

    if (request && request.status === 'rejected') {
      request.status = 'pending';
    } else if (!request) {
      request = new FriendRequest({ sender: senderId, receiver: receiverId });
    }

    await request.save();
    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Request already exists' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
});

// Accept a friend request
router.post('/accept', authMiddleware, async (req, res) => {
  const { requestId } = req.body;
  try {
    const request = await FriendRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ message: 'Invalid request' });
    }

    // Ensure the receiver is the authenticated user
    if (request.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'accepted';
    await request.save();

    const sender = await User.findById(request.sender);
    const receiver = await User.findById(request.receiver);

    if (!sender.friends.includes(receiver._id)) sender.friends.push(receiver._id);
    if (!receiver.friends.includes(sender._id)) receiver.friends.push(sender._id);

    await sender.save();
    await receiver.save();

    // Create a conversation between them
    let conv = await Conversation.findOne({
      participants: { $all: [sender._id, receiver._id], $size: 2 },
      isGroup: false
    });

    if (!conv) {
      conv = new Conversation({
        participants: [sender._id, receiver._id],
        createdBy: sender._id
      });
      await conv.save();
    }

    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Reject a friend request
router.post('/reject', authMiddleware, async (req, res) => {
  const { requestId } = req.body;
  try {
    const request = await FriendRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ message: 'Invalid request' });
    }

    if (request.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Friend request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Remove a friend
router.post('/remove', authMiddleware, async (req, res) => {
  const { friendId } = req.body;
  const userId = req.user.id;
  try {
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) return res.status(404).json({ message: 'User not found' });

    user.friends = user.friends.filter(id => id.toString() !== friendId);
    friend.friends = friend.friends.filter(id => id.toString() !== userId);

    await user.save();
    await friend.save();

    // Clean up friend request history
    await FriendRequest.deleteMany({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId }
      ]
    });

    res.json({ message: 'Friend removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
