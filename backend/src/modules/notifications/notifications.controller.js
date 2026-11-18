import * as service from './notifications.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  list: async (req, res) => res.json(await service.list(req.user, req.query)),
  unreadCount: async (req, res) => res.json({ data: await service.unreadCount(req.user) }),
  markRead: async (req, res) => res.json({ data: await service.markRead(req.user, req.params.id) }),
  markAllRead: async (req, res) => res.json({ data: await service.markAllRead(req.user) }),
  remove: async (req, res) => {
    await service.remove(req.user, req.params.id);
    res.status(204).end();
  },
  removeAllRead: async (req, res) => res.json({ data: await service.removeAllRead(req.user) }),
});
