import * as service from './auth.service.js';
import { wrapController } from '../../utils/asyncHandler.js';
import { sessionCookie } from '../../utils/jwt.js';

export default wrapController({
  register: async (req, res) => {
    const result = await service.register(req.body);
    res.append('Set-Cookie', sessionCookie(result.token));
    res.status(201).json({ data: result });
  },
  login: async (req, res) => {
    const result = await service.login(req.body);
    res.append('Set-Cookie', sessionCookie(result.token));
    res.json({ data: result });
  },
  logout: async (req, res) => {
    res.append('Set-Cookie', sessionCookie(null));
    res.status(204).end();
  },
  me: async (req, res) => res.json({ data: await service.me(req.user) }),
  changePassword: async (req, res) => {
    await service.changePassword(req.user, req.body);
    res.status(204).end();
  },
});
