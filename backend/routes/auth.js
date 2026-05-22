const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);
router.get('/users', authMiddleware, authController.getUsers);
router.get('/users/:id', authMiddleware, authController.getUserById);
router.post('/block/:userId', authMiddleware, authController.blockUser);
router.post('/unblock/:userId', authMiddleware, authController.unblockUser);

module.exports = router;
