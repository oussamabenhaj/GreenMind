import * as service from './chat.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  list: async (req, res) => res.json(await service.list(req.user, req.query)),
  unreadCount: async (req, res) => res.json({ data: await service.unreadCount(req.user) }),
  start: async (req, res) => {
    const { conversation, created } = await service.start(req.user, req.body);
    res.status(created ? 201 : 200).json({ data: conversation });
  },
  getById: async (req, res) => res.json({ data: await service.getById(req.user, req.params.id) }),
  listMessages: async (req, res) => res.json({ data: await service.listMessages(req.user, req.params.id, req.query) }),
  sendMessage: async (req, res) => res.status(201).json({ data: await service.sendMessage(req.user, req.params.id, req.body) }),
  markRead: async (req, res) => res.json({ data: await service.markConversationRead(req.user, req.params.id) }),
});
