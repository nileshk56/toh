const { nanoid } = require('nanoid');
const dynamo = require('../db/dynamo');
const config = require('../config');

const STATUS = {
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED'
};

// Helper to pad count for lexicographic sorting
const padCount = (count, length = 10) => String(count).padStart(length, '0');

const normalizeEntityType = (entityType) => {
  if (!entityType) return 'USER';
  return String(entityType).trim().toUpperCase();
};

const getTargetTable = (entityType) => {
  return entityType === 'ENTITY' ? config.tables.entities : config.tables.users;
};

const getTargetKey = (entityType, entityId) => {
  return entityType === 'ENTITY' ? { entityId } : { uid: entityId };
};
const createCompetition = async ({ title, tag, contextType, contextName, startAt, endAt, createdBy }) => {
  const competitionId = nanoid(14);
  const now = new Date().toISOString();

  const item = {
    competitionId,
    title,
    tag,
    contextType,
    contextName,
    startAt,
    endAt,
    status: STATUS.SCHEDULED,
    createdBy,
    createdAt: now
  };

  await dynamo.put({
    TableName: config.tables.competitions,
    Item: item,
    ConditionExpression: 'attribute_not_exists(competitionId)'
  }).promise();

  return item;
};

const getCompetition = async (competitionId) => {
  const res = await dynamo.get({
    TableName: config.tables.competitions,
    Key: { competitionId }
  }).promise();
  return res.Item;
};

const listCompetitions = async (status) => {
  const res = await dynamo.scan({
    TableName: config.tables.competitions
  }).promise();

  let items = res.Items || [];
  if (status) items = items.filter((c) => c.status === status);
  return items;
};

const registerParticipant = async ({ competitionId, entityId, entityType, displayName }) => {
  const now = new Date().toISOString();
  const normalizedType = normalizeEntityType(entityType);

  await dynamo.put({
    TableName: config.tables.participants,
    Item: {
      competitionId,
      entityId,
      entityType: normalizedType,
      displayName: displayName || '',
      score: 0,
      joinedAt: now
    },
    ConditionExpression: 'attribute_not_exists(competitionId) AND attribute_not_exists(entityId)'
  }).promise();

  return { competitionId, entityId };
};

const getParticipant = async (competitionId, entityId) => {
  const res = await dynamo.get({
    TableName: config.tables.participants,
    Key: { competitionId, entityId }
  }).promise();
  return res.Item;
};

const withdrawParticipant = async (competitionId, entityId) => {
  const existing = await getParticipant(competitionId, entityId);
  if (!existing) return null;
  if ((existing.score || 0) > 0) {
    const err = new Error('Cannot withdraw after receiving votes');
    err.code = 'HAS_VOTES';
    throw err;
  }

  await dynamo.delete({
    TableName: config.tables.participants,
    Key: { competitionId, entityId }
  }).promise();
  return { competitionId, entityId };
};

const voteForParticipant = async ({ competition, voterId, candidateEntityId, candidateEntityType }) => {
  const now = new Date().toISOString();
  const tag = competition.tag;
  const normalizedType = normalizeEntityType(candidateEntityType);

  const voteItem = {
    competitionId: competition.competitionId,
    voterId,
    votedForEntityId: candidateEntityId,
    votedForEntityType: normalizedType,
    createdAt: now
  };

  const targetTable = getTargetTable(normalizedType);
  const targetKey = getTargetKey(normalizedType, candidateEntityId);

  await dynamo.transactWrite({
    TransactItems: [
      {
        Put: {
          TableName: config.tables.votes,
          Item: voteItem,
          ConditionExpression: 'attribute_not_exists(competitionId) AND attribute_not_exists(voterId)'
        }
      },
      {
        Update: {
          TableName: config.tables.participants,
          Key: { competitionId: competition.competitionId, entityId: candidateEntityId },
          UpdateExpression: 'ADD #score :inc SET lastVoteAt = :now',
          ExpressionAttributeNames: { '#score': 'score' },
          ExpressionAttributeValues: { ':inc': 1, ':now': now },
          ConditionExpression: 'attribute_exists(competitionId) AND attribute_exists(entityId)'
        }
      },
      {
        Update: {
          TableName: targetTable,
          Key: targetKey,
          UpdateExpression: 'ADD totalVotesReceived :inc, tagCount :inc',
          ExpressionAttributeValues: { ':inc': 1 }
        }
      },
      {
        Update: {
          TableName: config.tables.tags,
          Key: { entityId: candidateEntityId, tag },
          UpdateExpression: 'SET #status = :active, #entityType = :etype ADD #count :inc',
          ExpressionAttributeNames: { '#count': 'count', '#status': 'status', '#entityType': 'entityType' },
          ExpressionAttributeValues: { ':inc': 1, ':active': 'ACTIVE', ':etype': normalizedType }
        }
      }
    ]
  }).promise();

  return { competitionId: competition.competitionId, votedForEntityId: candidateEntityId };
};

const getLeaderboard = async (competitionId, limit = 100) => {
  const res = await dynamo.query({
    TableName: config.tables.participants,
    KeyConditionExpression: 'competitionId = :cid',
    ExpressionAttributeValues: { ':cid': competitionId },
    ScanIndexForward: false,
    Limit: limit
  }).promise();

  const items = res.Items || [];
  items.sort((a, b) => (b.score || 0) - (a.score || 0));
  return items;
};

const closeCompetition = async (competitionId) => {
  const competition = await getCompetition(competitionId);
  if (!competition) return null;

  await dynamo.update({
    TableName: config.tables.competitions,
    Key: { competitionId },
    UpdateExpression: 'SET #status = :closed',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':closed': STATUS.CLOSED }
  }).promise();

  return competition;
};

const addWinnerTag = async (entityId, entityType, winnerTag) => {
  const normalizedType = normalizeEntityType(entityType);
  await dynamo.update({
    TableName: config.tables.tags,
    Key: { entityId, tag: winnerTag },
    UpdateExpression: 'SET #status = :active, #entityType = :etype ADD #count :inc',
    ExpressionAttributeNames: { '#count': 'count', '#status': 'status', '#entityType': 'entityType' },
    ExpressionAttributeValues: { ':inc': 1, ':active': 'ACTIVE', ':etype': normalizedType }
  }).promise();
};

const updateTagLeaders = async (entityId, entityType, tag, newCount) => {
  const leaderPK = `TAG#${normalizeEntityType(entityType)}#${tag}`;
  const newSK = `COUNT#${padCount(newCount)}#${entityId}`;

  const top100 = await dynamo.query({
    TableName: config.tables.tagLeaders,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': leaderPK },
    ScanIndexForward: true,
    Limit: 1
  }).promise();

  const lowest = top100.Items[0];
  const lowestCount = lowest ? lowest.count : 0;

  const oldSK = `COUNT#${padCount(newCount - 1)}#${entityId}`;
  const existingItem = await dynamo.get({
    TableName: config.tables.tagLeaders,
    Key: { PK: leaderPK, SK: oldSK }
  }).promise();

  if (existingItem.Item) {
    await dynamo.delete({
      TableName: config.tables.tagLeaders,
      Key: { PK: leaderPK, SK: existingItem.Item.SK }
    }).promise();
  }

  if (newCount > lowestCount || top100.Count < 100) {
    await dynamo.put({
      TableName: config.tables.tagLeaders,
      Item: {
        PK: leaderPK,
        SK: newSK,
        entityId,
        entityType: normalizeEntityType(entityType),
        count: newCount
      }
    }).promise();

    if (top100.Count >= 100 && lowest) {
      await dynamo.delete({
        TableName: config.tables.tagLeaders,
        Key: { PK: leaderPK, SK: lowest.SK }
      }).promise();
    }
  }
};

const refreshTagLeaderForEntity = async (entityId, entityType, tag) => {
  const tagRes = await dynamo.get({
    TableName: config.tables.tags,
    Key: { entityId, tag }
  }).promise();

  if (!tagRes.Item) return;
  await updateTagLeaders(entityId, entityType, tag, tagRes.Item.count || 0);
};

module.exports = {
  STATUS,
  createCompetition,
  getCompetition,
  listCompetitions,
  registerParticipant,
  getParticipant,
  withdrawParticipant,
  voteForParticipant,
  getLeaderboard,
  closeCompetition,
  addWinnerTag,
  refreshTagLeaderForEntity
};
