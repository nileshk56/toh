const express = require('express');
const router = express.Router();
const controller = require('../controllers/entitiesController');
const authMiddleware = require('../middlewares/auth');

router.post('/', authMiddleware, controller.createEntity);
router.get('/', authMiddleware, controller.listEntities);
router.get('/search', authMiddleware, controller.searchEntitiesByName);
router.get('/:id', authMiddleware, controller.getEntityById);
router.put('/:id', authMiddleware, controller.updateEntity);
router.delete('/:id', authMiddleware, controller.deleteEntity);

module.exports = router;
