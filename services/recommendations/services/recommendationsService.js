const dynamo = require('../db/dynamo');
const config = require('../config');

// Add a recommendation
exports.addRecommendation = async (fromUserId, toUserId, content) => {
    const now = Date.now();
    const status = `PENDING#${fromUserId}`;

    try {
        await dynamo.put({
            TableName: config.tables.recommendations,
            Item: {
                toUserId,
                fromUserId,
                content,
                status,
                createdAt: now,
                updatedAt: now
            },
            ConditionExpression: 'attribute_not_exists(toUserId) AND attribute_not_exists(fromUserId)'
        }).promise();
    } catch (err) {
        if (err.code === 'ConditionalCheckFailedException') {
            return { message: 'You have already recommended this user' };
        }
        throw err;
    }

    return { message: 'Recommendation submitted', toUserId, fromUserId };
};

// Get all recommendations received by logged-in user (any status) with limit and pagination
exports.getRecommendationsForLoggedInUser = async (userId, limit = 50, lastEvaluatedKey = null) => {
    const params = {
        TableName: config.tables.recommendations,
        KeyConditionExpression: 'toUserId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        Limit: limit
    };

    if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const res = await dynamo.query(params).promise();

    return {
        items: res.Items,
        lastEvaluatedKey: res.LastEvaluatedKey || null
    };
};

// Get only approved recommendations for a specific user with limit and pagination
exports.getApprovedRecommendationsForUser = async (userId, limit = 50, lastEvaluatedKey = null) => {
    const params = {
        TableName: config.tables.recommendations,
        IndexName: 'toUserId-status-index', // GSI: PK=toUserId, SK=status
        KeyConditionExpression: 'toUserId = :uid AND begins_with(#status, :approved)',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':uid': userId,
            ':approved': 'APPROVED#'
        },
        Limit: limit
    };

    if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const res = await dynamo.query(params).promise();

    return {
        items: res.Items,
        lastEvaluatedKey: res.LastEvaluatedKey || null
    };
};

// Approve or reject a recommendation
exports.updateRecommendationStatus = async (toUserId, fromUserId, action) => {
    if (!['APPROVED', 'REJECTED'].includes(action)) {
        throw new Error('Invalid action');
    }

    const now = Date.now();
    const newStatus = `${action}#${fromUserId}`;

    const res = await dynamo.update({
        TableName: config.tables.recommendations,
        Key: { toUserId, fromUserId },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': newStatus, ':updatedAt': now },
        ReturnValues: 'ALL_NEW'
    }).promise();

    return res.Attributes;
};

// Delete a recommendation (from sender)
exports.deleteRecommendation = async (fromUserId, toUserId) => {
    await dynamo.delete({
        TableName: config.tables.recommendations,
        Key: { toUserId, fromUserId }
    }).promise();

    return { message: 'Recommendation deleted' };
};
