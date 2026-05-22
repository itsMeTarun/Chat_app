const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    const { limit = 50, before } = req.query;

    const query = {
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('senderId', 'username avatar')
      .populate('replyTo');

    res.json(messages.reverse());
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const query = { conversationId };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('senderId', 'username avatar')
      .populate('replyTo');

    res.json(messages.reverse());
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);

    if (!message) return res.status(404).json({ msg: 'Message not found' });
    if (message.senderId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Soft delete - mark as deleted but keep the record
    message.isDeleted = true;
    message.message = 'This message was deleted';
    message.fileUrl = '';
    message.imageUrl = '';
    await message.save();

    res.json({ msg: 'Message removed', message });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Message not found' });
    }
    res.status(500).send('Server Error');
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message: newText } = req.body;

    const msg = await Message.findById(id);

    if (!msg) return res.status(404).json({ msg: 'Message not found' });
    if (msg.senderId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    msg.message = newText;
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();

    const populated = await Message.findById(msg._id)
      .populate('senderId', 'username avatar')
      .populate('replyTo');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Message not found' });
    }
    res.status(500).send('Server Error');
  }
};

exports.addReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    // Remove existing reaction from this user (toggle behavior)
    message.reactions = message.reactions.filter(r => r.userId.toString() !== req.user.id);

    if (emoji) {
      message.reactions.push({ userId: req.user.id, emoji });
    }

    await message.save();
    res.json({ reactions: message.reactions });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Message not found' });
    }
    res.status(500).send('Server Error');
  }
};

exports.searchMessages = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { senderId: currentUserId },
            { receiverId: currentUserId }
          ]
        },
        { message: { $regex: q, $options: 'i' } },
        { isDeleted: { $ne: true } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('senderId', 'username avatar');

    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
