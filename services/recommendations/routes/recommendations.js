const express = require('express');
const router = express.Router();
const controller = require('../controllers/recommendationsController');
const authMiddleware = require('../middlewares/auth'); // JWT decode

//router.use(authMiddleware); // protect all routes

router.get('/:userId', authMiddleware, controller.getRecommendations); // all recommendations received by logged-in user
router.put('/', authMiddleware, controller.updateRecommendationStatus); // approve/reject recommendation received from a user
router.post('/', authMiddleware, controller.addRecommendation);



module.exports = router;
