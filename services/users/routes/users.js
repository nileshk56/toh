const express = require('express');
const router = express.Router();
const { register, login, searchUsers, getUserById, updateUser } = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.get("/search", authMiddleware, searchUsers);
router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUser);


// Protected route example
router.get('/me', /*authMiddleware,*/ (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
