const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

// Legacy 1-on-1 chat
router.get('/:userId', authMiddleware, chatController.getMessages);

// Conversation-based messaging
router.get('/conversation/:conversationId', authMiddleware, chatController.getConversationMessages);

// Message CRUD
router.put('/:id', authMiddleware, chatController.editMessage);
router.delete('/:id', authMiddleware, chatController.deleteMessage);

// Reactions
router.post('/:id/reaction', authMiddleware, chatController.addReaction);

// Search
router.get('/search/all', authMiddleware, chatController.searchMessages);

module.exports = router;
