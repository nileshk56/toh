const dynamo = require('../db/dynamo');
const config = require('../config');

// Add a recommendation
exports.addRecommendation = async (fromUserId, entityId, entityType, content) => {
    const now = Date.now();
    const status = `PENDING#${fromUserId}`;

    try {
        await dynamo.put({
            TableName: config.tables.recommendations,
            Item: {
                entityId,
                entityType,
                fromUserId,
                content,
                status,
                createdAt: now,
                updatedAt: now
            },
            ConditionExpression: 'attribute_not_exists(entityId) AND attribute_not_exists(fromUserId)'
        }).promise();
    } catch (err) {
        if (err.code === 'ConditionalCheckFailedException') {
            return { message: 'You have already recommended this entity' };
        }
        throw err;
    }

    return { message: 'Recommendation submitted', entityId, fromUserId };
};

// Get all recommendations received by logged-in user (any status) with limit and pagination
exports.getRecommendationsForLoggedInUser = async (userId, entityType, limit = 50, lastEvaluatedKey = null) => {
    const params = {
        TableName: config.tables.recommendations,
        KeyConditionExpression: 'entityId = :eid',
        ExpressionAttributeValues: { ':eid': userId },
        Limit: limit
    };

    if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
    }

    if (entityType) {
        params.FilterExpression = '#entityType = :etype';
        params.ExpressionAttributeNames = { ...(params.ExpressionAttributeNames || {}), '#entityType': 'entityType' };
        params.ExpressionAttributeValues[':etype'] = entityType;
    }

    const res = await dynamo.query(params).promise();

    return {
        items: res.Items,
        lastEvaluatedKey: res.LastEvaluatedKey || null
    };
};

// Get only approved recommendations for a specific user with limit and pagination
exports.getApprovedRecommendationsForEntity = async (entityId, entityType, limit = 50, lastEvaluatedKey = null) => {
    const params = {
        TableName: config.tables.recommendations,
        IndexName: 'entityId-status-index', // GSI: PK=entityId, SK=status
        KeyConditionExpression: 'entityId = :eid AND begins_with(#status, :approved)',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':eid': entityId,
            ':approved': 'APPROVED#'
        },
        Limit: limit
    };

    if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
    }

    if (entityType) {
        params.FilterExpression = '#entityType = :etype';
        params.ExpressionAttributeNames['#entityType'] = 'entityType';
        params.ExpressionAttributeValues[':etype'] = entityType;
    }

    const res = await dynamo.query(params).promise();

    return {
        items: res.Items,
        lastEvaluatedKey: res.LastEvaluatedKey || null
    };
};

// Approve or reject a recommendation
exports.updateRecommendationStatus = async (entityId, fromUserId, action, entityType) => {
    if (!['APPROVED', 'REJECTED'].includes(action)) {
        throw new Error('Invalid action');
    }

    const now = Date.now();
    const newStatus = `${action}#${fromUserId}`;

    const res = await dynamo.update({
        TableName: config.tables.recommendations,
        Key: { entityId, fromUserId },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, #entityType = :etype',
        ExpressionAttributeNames: { '#status': 'status', '#entityType': 'entityType' },
        ExpressionAttributeValues: { ':status': newStatus, ':updatedAt': now, ':etype': entityType || 'USER' },
        ReturnValues: 'ALL_NEW'
    }).promise();

    return res.Attributes;
};

// Delete a recommendation (from sender)
exports.deleteRecommendation = async (fromUserId, entityId) => {
    await dynamo.delete({
        TableName: config.tables.recommendations,
        Key: { entityId, fromUserId }
    }).promise();

    return { message: 'Recommendation deleted' };
};
