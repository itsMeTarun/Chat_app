const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const splitToken = token.split(' ');
    const finalToken = splitToken[1] || token;
    
    if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
      console.warn('WARNING: Using default JWT_SECRET in production. This is highly insecure.');
    }
    
    const decoded = jwt.verify(finalToken, process.env.JWT_SECRET || 'secretkey');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
