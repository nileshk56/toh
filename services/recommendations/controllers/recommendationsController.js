const service = require('../services/recommendationsService');

// GET /recommendations → all recommendations for logged-in user
exports.getRecommendations = async (req, res) => {
    try {
        const loggedInUser = req.user.uid; // from JWT
        const { entityId: toEntityId } = req.params;
        const entityType = (req.query.entityType || 'USER').toUpperCase();
        const limit = parseInt(req.query.limit) || 50; // default 50
        //const lastKey = req.query.lastKey ? JSON.parse(req.query.lastKey) : null;
        let lastKey;
        if (req.query.lastKey) {
            try {
                const decoded = Buffer.from(req.query.lastKey, 'base64').toString('utf-8');
                lastKey = JSON.parse(decoded);
            } catch (err) {
                return res.status(400).json({ error: 'Invalid lastKey format' });
            }
        }

        let data;
        if (entityType === 'USER' && loggedInUser === toEntityId) {
            // get all recommendations for logged-in user
            data = await service.getRecommendationsForLoggedInUser(loggedInUser, entityType, limit, lastKey);
        } else {
            // get only approved recommendations for another user
            data = await service.getApprovedRecommendationsForEntity(toEntityId, entityType, limit, lastKey);
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

// GET /recommendations/:entityId → approved recommendations only
exports.getApprovedRecommendations = async (req, res) => {
    try {
        const { entityId: toEntityId } = req.params;
        const entityType = (req.query.entityType || 'USER').toUpperCase();
        const limit = parseInt(req.query.limit) || 50;
        const lastKey = req.query.lastKey ? JSON.parse(req.query.lastKey) : null;

        const data = await service.getApprovedRecommendationsForEntity(toEntityId, entityType, limit, lastKey);
        return res.status(200).json(data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

// PATCH /recommendations/:fromEntityId → approve/reject recommendation
exports.updateRecommendationStatus = async (req, res) => {
    try {
        const { action , fromUserId, entityId, entityType } = req.body; 
        const toEntityId = entityId || req.user.uid; 
        const toEntityType = (entityType || 'USER').toUpperCase();

        const data = await service.updateRecommendationStatus(toEntityId, fromUserId, action, toEntityType);
        return res.status(200).json(data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

// POST /recommendations → add a new recommendation to another user
exports.addRecommendation = async (req, res) => {
    try {
        const fromUserId = req.user.uid;
        const { entityId: toEntityId, entityType, content } = req.body;
        const toEntityType = (entityType || 'USER').toUpperCase();

        if (!toEntityId || !content) {
            return res.status(400).json({ error: 'entityId and content are required' });
        }

        const data = await service.addRecommendation(fromUserId, toEntityId, toEntityType, content);
        return res.status(201).json(data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

// DELETE /recommendations → delete an existing recommendation
exports.deleteRecommendation = async (req, res) => {
    try {
        const { entityId, fromUserId, entityType } = req.body || {};
        if (!entityId || !fromUserId) {
            return res.status(400).json({ error: 'entityId and fromUserId are required' });
        }

        const normalizedType = (entityType || 'USER').toUpperCase();
        if (normalizedType === 'USER' && req.user.uid !== entityId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await service.deleteRecommendation(fromUserId, entityId);
        return res.json({ message: 'Recommendation deleted', entityId, fromUserId });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};
