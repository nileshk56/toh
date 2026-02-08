const { verifyToken } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    console.log('Token verification failed', err);
    return res.status(401).json({ message: 'Invalid Token' });
  }
};

module.exports = authMiddleware;
