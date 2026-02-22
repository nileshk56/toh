const dynamo = require('../db/dynamo');
const config = require('../config');

// Helper to pad count for lexicographic sorting
const padCount = (count, length = 10) => String(count).padStart(length, '0');

const normalizeEntityType = (entityType) => {
    if (!entityType) return 'USER';
    return String(entityType).trim().toUpperCase();
};

const updateTagCountForTarget = async (entityType, entityId, delta) => {
    const tableName = entityType === 'ENTITY' ? config.tables.entities : config.tables.users;
    await dynamo.update({
        TableName: tableName,
        Key: entityType === 'ENTITY' ? { entityId } : { uid: entityId },
        UpdateExpression: 'ADD tagCount :inc',
        ExpressionAttributeValues: { ':inc': delta }
    }).promise();
};


exports.endorseTag = async (entityId, tag, endorserId) => {
    // 1️⃣ Check tag exists and is active
    const tagRes = await dynamo.get({
        TableName: config.tables.tags,
        Key: { entityId, tag }
    }).promise();

    if (!tagRes.Item || tagRes.Item.status !== 'ACTIVE') {
        return { message: 'Tag not active or does not exist' };
    }

    const tagEndorser = `${tag}#${endorserId}`;
    const entityType = normalizeEntityType(tagRes.Item.entityType);

    // 2️⃣ Insert endorsement - prevent duplicates
    try {
        await dynamo.put({
            TableName: config.tables.endorsements,
            Item: {
                entityId,
                tagEndorser,
                tag,
                endorserId,
                createdAt: Date.now()
            },
            ConditionExpression: 'attribute_not_exists(entityId) AND attribute_not_exists(tagEndorser)'
        }).promise();
    } catch (err) {
        if (err.code === 'ConditionalCheckFailedException') {
            return { message: 'User already endorsed this tag' };
        }
        throw err;
    }

    // 3️⃣ Increment count in tags table
    const updatedTag = await dynamo.update({
        TableName: config.tables.tags,
        Key: { entityId, tag },
        UpdateExpression: 'ADD #count :inc',
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: { ':inc': 1 },
        ReturnValues: 'UPDATED_NEW'
    }).promise();

    const newCount = updatedTag.Attributes.count;

    // 4️⃣ Update tagLeaders table
    const leaderPK = `TAG#${entityType}#${tag}`;
    const newSK = `COUNT#${padCount(newCount)}#${entityId}`;

    // 4a. Query lowest count in leaderboard (top 100)
    const top100 = await dynamo.query({
        TableName: config.tables.tagLeaders,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': leaderPK },
        ScanIndexForward: true, // ascending → lowest count first
        Limit: 1
    }).promise();

    const lowest = top100.Items[0];
    const lowestCount = lowest ? lowest.count : 0;

    // 4b. Check if user already exists in leaderboard (old SK)
    const oldSK = `COUNT#${padCount(newCount - 1)}#${entityId}`;
    const existingItem = await dynamo.get({
        TableName: config.tables.tagLeaders,
        Key: { PK: leaderPK, SK: oldSK }
    }).promise();

    // 4c. Delete old SK if exists
    if (existingItem.Item) {
        await dynamo.delete({
            TableName: config.tables.tagLeaders,
            Key: { PK: leaderPK, SK: existingItem.Item.SK }
        }).promise();
    }

    // 4d. Insert new SK if qualifies for top 100 or leaderboard has less than 100
    if (newCount > lowestCount || top100.Count < 100) {
        await dynamo.put({
            TableName: config.tables.tagLeaders,
            Item: {
                PK: leaderPK,
                SK: newSK,
                entityId,
                entityType,
                count: newCount
            }
        }).promise();

        // Optional: remove lowest if >100 items now
        if (top100.Count >= 100 && lowest) {
            await dynamo.delete({
                TableName: config.tables.tagLeaders,
                Key: { PK: leaderPK, SK: lowest.SK }
            }).promise();
        }
    }

    return { message: 'Endorsement recorded', newCount };
};

exports.getEndorsers = async (entityId, tag, lastKey = null) => {
    const params = {
        TableName: config.tables.endorsements,
        KeyConditionExpression: 'entityId = :eid AND begins_with(tagEndorser, :tag)',
        ExpressionAttributeValues: {
            ':eid': entityId,
            ':tag': `${tag}#`
        },
        Limit: 25
    };

    if (lastKey) {
        params.ExclusiveStartKey = lastKey;
    }

    const res = await dynamo.query(params).promise();

    return {
        endorsers: res.Items,
        lastKey: res.LastEvaluatedKey || null
    };
};

exports.acceptTag = async (entityId, tag) => {
    const tagRes = await dynamo.get({
        TableName: config.tables.tags,
        Key: { entityId, tag }
    }).promise();

    if (!tagRes.Item || tagRes.Item.status !== 'PENDING') {
        throw new Error('Tag request not found or already active');
    }

    const actorId = tagRes.Item.createdBy;
    const entityType = normalizeEntityType(tagRes.Item.entityType);

    // Set tag ACTIVE and count = 1
    await dynamo.update({
        TableName: config.tables.tags,
        Key: { entityId, tag },
        UpdateExpression: 'SET #status = :active, #count = :count',
        ExpressionAttributeNames: { '#status': 'status', '#count': 'count' },
        ExpressionAttributeValues: { ':active': 'ACTIVE', ':count': 1 }
    }).promise();

    // Add first endorsement
    const tagEndorser = `${tag}#${actorId}`;
    await dynamo.put({
        TableName: config.tables.endorsements,
        Item: {
            entityId,
            tagEndorser,
            tag,
            endorserId: actorId,
            createdAt: Date.now()
        },
        ConditionExpression: 'attribute_not_exists(entityId) AND attribute_not_exists(tagEndorser)'
    }).promise();

    return { message: 'Tag accepted and count set to 1' };
};

exports.rejectTag = async (entityId, tag) => {
    await dynamo.delete({
        TableName: config.tables.tags,
        Key: { entityId, tag }
    }).promise();

    return { message: 'Tag rejected' };
};

exports.addTag = async (entityId, tag, actorId, entityTypeInput) => {
    const entityType = normalizeEntityType(entityTypeInput);
    const existing = await dynamo.get({
        TableName: config.tables.tags,
        Key: { entityId, tag }
    }).promise();

    if (existing.Item) {
        return { message: 'Tag already exists' };
    }

    // Self add
    if (entityId === actorId) {
        await dynamo.put({
            TableName: config.tables.tags,
            Item: {
                entityId,
                tag,
                count: 1,
                status: 'ACTIVE',
                entityType
            }
        }).promise();

        // Record self endorsement
        /*const tagEndorser = `${tag}#${actorId}`;
        await dynamo.put({
            TableName: config.tables.endorsements,
            Item: {
                entityId,
                tagEndorser,
                tag,
                endorserId: actorId,
                createdAt: Date.now()
            },
            ConditionExpression: 'attribute_not_exists(entityId) AND attribute_not_exists(tagEndorser)'
        }).promise();*/

        await updateTagCountForTarget(entityType, entityId, 1);

        return { message: 'Tag added successfully' };
    } 

    console.log('Creating pending tag request', {
            entityId,
            tag,
            count: 0,
            status: 'PENDING',
            createdBy: actorId
        });

    // Other entity adding tag → create pending
    await dynamo.put({
        TableName: config.tables.tags,
        Item: {
            entityId,
            tag,
            count: 0,
            status: 'PENDING',
            createdBy: actorId,
            entityType
        }
    }).promise();

    return { message: 'Tag request sent' };
};

exports.getTagLeaders = async (tag, entityTypeInput) => {
    const entityType = normalizeEntityType(entityTypeInput);
    const leaderPK = `TAG#${entityType}#${tag}`;

    const res = await dynamo.query({
        TableName: config.tables.tagLeaders,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': leaderPK },
        ScanIndexForward: false, // descending → top counts first
        Limit: 100
    }).promise();

    return res.Items.map(i => ({ entityId: i.entityId, count: i.count }));
};

exports.getTagsByEntity = async (entityId, options = {}) => {
    const { status, limit, lastKey, entityType } = options;

    const params = {
        TableName: config.tables.tags,
        KeyConditionExpression: 'entityId = :eid',
        ExpressionAttributeValues: { ':eid': entityId },
        Limit: limit, // optional
        ExclusiveStartKey: lastKey // optional
    };

    const res = await dynamo.query(params).promise();

    let items = res.Items || [];

    // Apply status filter after query (if provided)
    if (status) {
        items = items.filter(item => item.status === status);
    }
    if (entityType) {
        const normalized = normalizeEntityType(entityType);
        items = items.filter(item => normalizeEntityType(item.entityType) === normalized);
    }

    return {
        items,
        lastKey: res.LastEvaluatedKey // pass back for next page
    };
};

exports.getEndorsedUsers = async (endorserId, lastKey = null) => {
    const params = {
        TableName: config.tables.endorsements,
        IndexName: 'endorserIndex',
        KeyConditionExpression: 'endorserId = :eid',
        ExpressionAttributeValues: {
            ':eid': endorserId
        },
        Limit: 25
    };

    if (lastKey) {
        params.ExclusiveStartKey = lastKey;
    }

    const res = await dynamo.query(params).promise();

    return {
        items: res.Items.map(item => ({
            entityId: item.entityId,
            tag: item.tag
        })),
        lastKey: res.LastEvaluatedKey || null
    };
};
