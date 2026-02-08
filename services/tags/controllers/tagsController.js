const service = require('../services/tagsService');

exports.endorse = async (req, res) => {
    try {
        const { userId, tag } = req.body;
        endorserId =  req.user.uid; 
        const data = await service.endorseTag(userId, tag, endorserId);

        return res.status(200).json(data);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || 'Endorse failed' });
    }
};

exports.getEndorsers = async (req, res) => {
    try {
        const { userId, tag } = req.params;
        let { pageToken } = req.query;

        // Decode pageToken if provided
        let lastKey = null;
        if (pageToken) {
            lastKey = JSON.parse(Buffer.from(pageToken, 'base64').toString('utf-8'));
        }

        const data = await service.getEndorsers(userId, tag, lastKey);

        // Encode lastKey for client if more pages exist
        let nextPageToken = null;
        if (data.lastKey) {
            nextPageToken = Buffer.from(JSON.stringify(data.lastKey)).toString('base64');
        }

        return res.status(200).json({
            endorsers: data.endorsers,
            nextPageToken
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || 'Fetch failed' });
    }
};

exports.accept = async (req, res) => {
    try {
        await service.acceptTag(req.body.userId, req.body.tag);

        return res.status(200).json({ message: 'Tag accepted' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || 'Accept failed' });
    }
};

exports.reject = async (req, res) => {
    try {
        await service.rejectTag(req.body.userId, req.body.tag);

        return res.status(200).json({ message: 'Tag rejected' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || 'Reject failed' });
    }
};

exports.addTag = async (req, res) => {
    try {
        const { userId, tag } = req.body;
        actorId = req.user.uid; 
        const data = await service.addTag(userId, tag, actorId);

        return res.status(200).json(data);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || 'Add tag failed' });
    }
};

exports.getTagLeaders = async (req, res) => {
    try {
        const { tag } = req.params;
        const leaders = await service.getTagLeaders(tag);
        return res.status(200).json({ tag, leaders });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || 'Failed to fetch leaders' });
    }
};

exports.getUserTags = async (req, res) => {
    try {
        const { userId } = req.params;
        const loggedInUserId = req.user.uid;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Filters
        const filters = {};
        if (userId !== loggedInUserId) {
            filters.status = 'ACTIVE'; // Only show active tags to others
        }

        // Pagination params from query string
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        let lastKey;
        if (req.query.lastKey) {
            try {
                // decode base64 to string, then parse JSON
                const decoded = Buffer.from(req.query.lastKey, 'base64').toString('utf-8');
                lastKey = JSON.parse(decoded);
            } catch (err) {
                return res.status(400).json({ error: 'Invalid lastKey format' });
            }
        }

        // Call service with filters and pagination
        const { items, lastKey: nextKey } = await service.getTagsByUser(userId, {
            status: filters.status,
            limit,
            lastKey
        });

        return res.status(200).json({
            tags: items,
            lastKey: nextKey ? JSON.stringify(nextKey) : null // send back for next page
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || 'Failed to fetch tags' });
    }
};


exports.getEndorsedUsers = async (req, res) => {
    try {
        const endorserId = req.user.uid; // from JWT

        const lastKey = req.query.lastKey
            ? JSON.parse(Buffer.from(req.query.lastKey, 'base64').toString())
            : null;

        const data = await service.getEndorsedUsers(endorserId, lastKey);

        const encodedLastKey = data.lastKey
            ? Buffer.from(JSON.stringify(data.lastKey)).toString('base64')
            : null;

        res.json({
            items: data.items,
            nextPageToken: encodedLastKey
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch endorsed users' });
    }
};
