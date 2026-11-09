// Audit trail: records who did what, to which record, and when. Also pushes a live event.
const v = require('../utils/validate');

module.exports = ({ audit, events }) => ({
  // actor: the logged-in user (or null for anonymous events such as a failed login)
  record({ actor, action, entity, entityId, summary, details, ip, live = true }) {
    const id = audit.insert({ actorId: actor?.id, actorName: actor?.name, actorRole: actor?.role, action, entity, entityId, summary, details, ip });
    if (live) events.publish({ id, action, entity, entityId, summary, actor: actor ? { id: actor.id, name: actor.name, role: actor.role } : null });
    return id;
  },
  search(query) {
    const limit = v.int(query.limit, 'Limit', { min: 1, max: 200, fallback: 25 });
    const page = v.int(query.page, 'Page', { min: 1, max: 100000, fallback: 1 });
    const { total, rows } = audit.search({
      action: v.string(query.action, 'Action', { max: 60, required: false }),
      actorId: query.actorId ? v.id(query.actorId, 'actor id') : null,
      entity: v.string(query.entity, 'Entity', { max: 30, required: false }),
      entityId: query.entityId ? v.id(query.entityId, 'entity id') : null,
      q: v.string(query.q, 'Search', { max: 100, required: false }),
      from: v.date(query.from, 'From date'), to: v.date(query.to, 'To date'),
      limit, offset: (page - 1) * limit,
    });
    return { total, page, pages: Math.max(1, Math.ceil(total / limit)), limit, actions: audit.actions(),
      rows: rows.map(r => ({ ...r, details: r.details ? JSON.parse(r.details) : null })) };
  },
  forLearner: (id) => audit.forLearner(id).map(r => ({ ...r, details: r.details ? JSON.parse(r.details) : null })),
});
