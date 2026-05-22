const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { imageUpload, fileUpload } = require('../middleware/uploadMiddleware');

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Upload image (for chat messages)
router.post('/image', authMiddleware, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imageUrl = `${API_URL}/uploads/${req.file.filename}`;
    res.json({
      imageUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      message: 'Image uploaded successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error uploading image' });
  }
});

// Upload file
router.post('/file', authMiddleware, fileUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const fileUrl = `${API_URL}/uploads/${req.file.filename}`;
    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      message: 'File uploaded successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

module.exports = router;