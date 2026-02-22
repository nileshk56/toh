const express = require('express');
const router = express.Router();
const controller = require('../controllers/competitionsController');
const authMiddleware = require('../middlewares/auth');

router.post('/', authMiddleware, controller.createCompetition);
router.get('/', authMiddleware, controller.listCompetitions);
router.post('/:id/register', authMiddleware, controller.register);
router.delete('/:id/register', authMiddleware, controller.withdraw);
router.post('/:id/vote', authMiddleware, controller.vote);
router.get('/:id/leaderboard', authMiddleware, controller.leaderboard);
router.post('/:id/close', authMiddleware, controller.close);

module.exports = router;
