const service = require('../services/recommendationsService');

// GET /recommendations → all recommendations for logged-in user
exports.getRecommendations = async (req, res) => {
    try {
        const loggedInUser = req.user.uid; // from JWT
        const { userId } = req.params;
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
        if (loggedInUser === userId) {
            // get all recommendations for logged-in user
            data = await service.getRecommendationsForLoggedInUser(loggedInUser, limit, lastKey);
        } else {
            // get only approved recommendations for another user
            data = await service.getApprovedRecommendationsForUser(userId, limit, lastKey);
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

// GET /recommendations/:userId → approved recommendations only
exports.getApprovedRecommendations = async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const lastKey = req.query.lastKey ? JSON.parse(req.query.lastKey) : null;

        const data = await service.getApprovedRecommendationsForUser(userId, limit, lastKey);
        return res.status(200).json(data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

// PATCH /recommendations/:fromUserId → approve/reject recommendation
exports.updateRecommendationStatus = async (req, res) => {
    try {
        const toUserId = req.user.uid; 
        const { action , fromUserId} = req.body; 

        const data = await service.updateRecommendationStatus(toUserId, fromUserId, action);
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
        const { toUserId, content } = req.body;

        if (!toUserId || !content) {
            return res.status(400).json({ error: 'toUserId and content are required' });
        }

        const data = await service.addRecommendation(fromUserId, toUserId, content);
        return res.status(201).json(data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};
