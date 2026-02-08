const express = require('express');
const controller = require('../controllers/tagsController');
const authMiddleware = require('../middlewares/auth');


const router = express.Router();
router.get('/endorsed-users', authMiddleware, controller.getEndorsedUsers);
router.post('/endorse', authMiddleware, controller.endorse);
router.post('/accept', authMiddleware, controller.accept);
router.post('/reject', authMiddleware, controller.reject);
router.post('/add', authMiddleware, controller.addTag);
router.get('/:userId', authMiddleware, controller.getUserTags);
router.get('/:userId/:tag/endorsers', authMiddleware, controller.getEndorsers);
router.get('/:tag/leaderboard', authMiddleware, controller.getTagLeaders);

module.exports = router;
