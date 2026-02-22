const service = require('../services/entitiesService');

const decodePageToken = (pageToken) => {
  if (!pageToken) return null;
  try {
    const decoded = Buffer.from(pageToken, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (err) {
    return undefined;
  }
};

const encodePageToken = (lastKey) => {
  if (!lastKey) return null;
  return Buffer.from(JSON.stringify(lastKey)).toString('base64');
};

exports.createEntity = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'name is required' });
    }

    const entity = await service.createEntity(req.body);
    return res.status(201).json({ entity });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

exports.getEntityById = async (req, res) => {
  try {
    const { id } = req.params;
    const entity = await service.getEntityById(id);
    if (!entity) return res.status(404).json({ message: 'Entity not found' });
    return res.json({ entity });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

exports.listEntities = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const lastKey = decodePageToken(req.query.lastKey);
    if (req.query.lastKey && lastKey === undefined) {
      return res.status(400).json({ message: 'Invalid lastKey format' });
    }

    const data = await service.listEntities(limit, lastKey || null);
    return res.json({
      items: data.items,
      nextPageToken: encodePageToken(data.lastKey)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

exports.updateEntity = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['name', 'entityType', 'address', 'city', 'state', 'country', 'zip', 'phone', 'email', 'website', 'status'];
    const updates = {};

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const entity = await service.updateEntity(id, updates);
    return res.json({ entity });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteEntity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.deleteEntity(id);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

exports.searchEntitiesByName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'name is required' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const lastKey = decodePageToken(req.query.lastKey);
    if (req.query.lastKey && lastKey === undefined) {
      return res.status(400).json({ message: 'Invalid lastKey format' });
    }

    const data = await service.searchEntitiesByName(name, limit, lastKey || null);
    return res.json({
      items: data.items,
      nextPageToken: encodePageToken(data.lastKey)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};
