const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const { createPresigned } = require('../controllers/uploadController');

router.post('/presign', authMiddleware, createPresigned);

module.exports = router;
