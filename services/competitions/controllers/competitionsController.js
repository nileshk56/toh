const service = require('../services/competitionsService');

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

exports.createCompetition = async (req, res) => {
  try {
    const { title, tag, contextType, contextName, startAt, endAt } = req.body || {};

    if (!title || !tag || !contextType || !contextName || !startAt || !endAt) {
      return res.status(400).json({ message: 'title, tag, contextType, contextName, startAt, endAt are required' });
    }

    const startIso = parseDate(startAt);
    const endIso = parseDate(endAt);
    if (!startIso || !endIso) {
      return res.status(400).json({ message: 'Invalid startAt or endAt' });
    }

    const competition = await service.createCompetition({
      title,
      tag,
      contextType,
      contextName,
      startAt: startIso,
      endAt: endIso,
      createdBy: req.user.uid
    });

    return res.status(201).json({ competition });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

exports.listCompetitions = async (req, res) => {
  try {
    const status = req.query.status;
    const items = await service.listCompetitions(status);
    return res.json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, entityType, entityId } = req.body || {};
    const targetEntityId = entityId || req.user.uid;
    const targetEntityType = (entityType || 'USER').toUpperCase();

    const competition = await service.getCompetition(id);
    if (!competition) return res.status(404).json({ message: 'Competition not found' });

    const now = Date.now();
    if (competition.startAt && new Date(competition.startAt).getTime() <= now && competition.endAt && new Date(competition.endAt).getTime() >= now) {
      if (competition.status === service.STATUS.SCHEDULED) {
        // allow auto activation window, but do not update status for simplicity
      }
    }

    await service.registerParticipant({
      competitionId: id,
      entityId: targetEntityId,
      entityType: targetEntityType,
      displayName
    });

    return res.status(201).json({ competitionId: id, entityId: targetEntityId, entityType: targetEntityType });
  } catch (err) {
    console.error(err);
    if (err.code === 'ConditionalCheckFailedException') {
      return res.status(409).json({ message: 'Already registered' });
    }
    return res.status(500).json({ message: err.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const { id } = req.params;

    const entityId = req.query.entityId || req.user.uid;
    const result = await service.withdrawParticipant(id, entityId);
    if (!result) return res.status(404).json({ message: 'Registration not found' });

    return res.json({ message: 'Withdrawn', ...result });
  } catch (err) {
    console.error(err);
    if (err.code === 'HAS_VOTES') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
};

exports.vote = async (req, res) => {
  try {
    const { id } = req.params;
    const { entityId, entityType } = req.body || {};

    if (!entityId) return res.status(400).json({ message: 'entityId is required' });

    const competition = await service.getCompetition(id);
    if (!competition) return res.status(404).json({ message: 'Competition not found' });

    const now = Date.now();
    const start = competition.startAt ? new Date(competition.startAt).getTime() : null;
    const end = competition.endAt ? new Date(competition.endAt).getTime() : null;

    if (competition.status === service.STATUS.CLOSED) {
      return res.status(400).json({ message: 'Competition is closed' });
    }

    if (start && now < start) {
      return res.status(400).json({ message: 'Competition has not started yet' });
    }

    if (end && now > end) {
      return res.status(400).json({ message: 'Competition has ended' });
    }

    const normalizedType = (entityType || 'USER').toUpperCase();

    await service.voteForParticipant({
      competition,
      voterId: req.user.uid,
      candidateEntityId: entityId,
      candidateEntityType: normalizedType
    });

    await service.refreshTagLeaderForEntity(entityId, normalizedType, competition.tag);

    return res.status(201).json({ competitionId: id, votedForEntityId: entityId, votedForEntityType: normalizedType });
  } catch (err) {
    console.error(err);
    if (err.code === 'ConditionalCheckFailedException') {
      return res.status(409).json({ message: 'You already voted in this competition' });
    }
    return res.status(500).json({ message: err.message });
  }
};

exports.leaderboard = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;

    const items = await service.getLeaderboard(id, limit);
    return res.json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

exports.close = async (req, res) => {
  try {
    const { id } = req.params;
    const competition = await service.getCompetition(id);
    if (!competition) return res.status(404).json({ message: 'Competition not found' });

    const items = await service.getLeaderboard(id, 1);
    const winner = items[0];
    if (winner) {
      const winnerTag = `${competition.tag}-winner`;
      await service.addWinnerTag(winner.entityId, winner.entityType, winnerTag);
      await service.refreshTagLeaderForEntity(winner.entityId, winner.entityType, winnerTag);
    }

    await service.closeCompetition(id);

    return res.json({ message: 'Competition closed', winner: winner || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};
