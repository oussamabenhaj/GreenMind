import bcrypt from 'bcryptjs';
import * as model from './auth.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { signToken } from '../../utils/jwt.js';
import { withDefaultCoordinates } from '../../utils/geo.js';

/** US-S01 / US-B01 / collection point manager sign-up. */
export async function register(data) {
  if (await model.findByEmailWithHash(data.email)) throw ApiError.conflict('Cet email est déjà utilisé');
  const password_hash = await bcrypt.hash(data.password, 10);
  const user = await model.createUser({ ...withDefaultCoordinates(data), password_hash });
  return { token: signToken(user), user };
}

/** US-S02 / US-B02. */
export async function login({ email, password }) {
  const account = await model.findByEmailWithHash(email);
  if (!account || !(await bcrypt.compare(password, account.password_hash))) {
    throw ApiError.unauthorized('Email ou mot de passe incorrect');
  }
  if (!account.is_active) throw ApiError.forbidden('Ce compte est désactivé');
  await model.touchLogin(account.id);
  const { password_hash: _hash, ...user } = account;
  return { token: signToken(user), user };
}

export async function changePassword(user, { current_password: current, new_password: next }) {
  const hash = await model.findPasswordHash(user.id);
  if (!(await bcrypt.compare(current, hash))) throw ApiError.badRequest('Mot de passe actuel incorrect');
  await model.updatePassword(user.id, await bcrypt.hash(next, 10));
}

export const me = (user) => model.findPrivateById(user.id);
