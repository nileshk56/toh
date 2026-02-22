const dynamo = require('../db/dynamo');
const { nanoid } = require('nanoid');

const TABLE = 'entities';
const NAME_INDEX = 'name-index';

const normalizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim();
};

const createEntity = async (data) => {
  const now = new Date().toISOString();

  const entity = {
    entityId: nanoid(14),
    name: normalizeString(data.name),
    entityType: normalizeString(data.entityType || ''),
    address: normalizeString(data.address || ''),
    city: normalizeString(data.city || ''),
    state: normalizeString(data.state || ''),
    country: normalizeString(data.country || ''),
    zip: normalizeString(data.zip || ''),
    phone: normalizeString(data.phone || ''),
    email: normalizeString(data.email || ''),
    website: normalizeString(data.website || ''),
    status: data.status || 'ACTIVE',
    createdAt: now,
    updatedAt: now
  };

  await dynamo.put({ TableName: TABLE, Item: entity }).promise();
  return entity;
};

const getEntityById = async (entityId) => {
  const result = await dynamo.get({ TableName: TABLE, Key: { entityId } }).promise();
  return result.Item;
};

const listEntities = async (limit, lastKey) => {
  const params = {
    TableName: TABLE,
    Limit: limit
  };

  if (lastKey) params.ExclusiveStartKey = lastKey;

  const result = await dynamo.scan(params).promise();
  return { items: result.Items || [], lastKey: result.LastEvaluatedKey || null };
};

const updateEntity = async (entityId, data) => {
  const updates = [];
  const values = {};
  const names = {};

  Object.entries(data).forEach(([key, value], index) => {
    const placeholder = `:v${index}`;
    const nameKey = `#k${index}`;
    names[nameKey] = key;
    values[placeholder] = value;
    updates.push(`${nameKey} = ${placeholder}`);
  });

  updates.push('#updatedAt = :updatedAt');
  names['#updatedAt'] = 'updatedAt';
  values[':updatedAt'] = new Date().toISOString();

  await dynamo.update({
    TableName: TABLE,
    Key: { entityId },
    UpdateExpression: `set ${updates.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values
  }).promise();

  return getEntityById(entityId);
};

const deleteEntity = async (entityId) => {
  await dynamo.delete({ TableName: TABLE, Key: { entityId } }).promise();
  return { entityId };
};

const searchEntitiesByName = async (name, limit, lastKey) => {
  const params = {
    TableName: TABLE,
    IndexName: NAME_INDEX,
    KeyConditionExpression: '#name = :name',
    ExpressionAttributeNames: { '#name': 'name' },
    ExpressionAttributeValues: { ':name': normalizeString(name) },
    Limit: limit
  };

  if (lastKey) params.ExclusiveStartKey = lastKey;

  const result = await dynamo.query(params).promise();
  return { items: result.Items || [], lastKey: result.LastEvaluatedKey || null };
};

module.exports = {
  createEntity,
  getEntityById,
  listEntities,
  updateEntity,
  deleteEntity,
  searchEntitiesByName
};
