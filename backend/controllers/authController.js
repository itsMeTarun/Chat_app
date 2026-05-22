const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  const payload = { user: { id: userId } };
  return jwt.sign(payload, process.env.JWT_SECRET || 'secretkey', { expiresIn: '30d' });
};

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    user = await User.findOne({ username });
    if (user) return res.status(400).json({ message: 'Username is taken' });

    user = new User({ username, email, password });
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const token = generateToken(user.id);
    res.status(201).json({
      token,
      user: {
        _id: user.id,
        id: user.id,
        username,
        email,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status,
        lastSeen: user.lastSeen
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    // Update login timestamp and status
    user.lastSeen = new Date();
    user.status = 'online';
    await user.save();

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        _id: user.id,
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status,
        lastSeen: user.lastSeen
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('friends', 'username avatar status lastSeen');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, avatar, bio } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (username !== undefined) {
      if (username.length < 3) {
        return res.status(400).json({ message: 'Username must be at least 3 characters' });
      }
      // Check if username is already taken
      const existingUser = await User.findOne({ username, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      user.username = username;
    }
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;

    await user.save();
    const populated = await User.findById(user._id)
      .select('-password')
      .populate('friends', 'username avatar status lastSeen');
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { _id: { $ne: req.user.id } };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('friends', 'username avatar status');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUser = await User.findById(req.user.id);

    const alreadyBlocked = currentUser.blockedUsers.some(id => id.toString() === userId);
    if (alreadyBlocked) {
      return res.status(400).json({ message: 'User already blocked' });
    }

    currentUser.blockedUsers.push(userId);
    // Also remove from friends if they were friends
    currentUser.friends = currentUser.friends.filter(f => f.toString() !== userId);

    // Remove the other user's friendship too
    const otherUser = await User.findById(userId);
    if (otherUser) {
      otherUser.friends = otherUser.friends.filter(f => f.toString() !== req.user.id);
      await otherUser.save();
    }

    await currentUser.save();
    res.json({ message: 'User blocked' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUser = await User.findById(req.user.id);
    currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== userId);
    await currentUser.save();
    res.json({ message: 'User unblocked' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};
