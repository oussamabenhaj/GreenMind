/**
 * Auth persists nothing of its own: accounts live in the users table.
 * This model re-exports the user queries auth needs so the module stays
 * self-contained (controller → service → model).
 */
export {
  create as createUser,
  findByEmailWithHash,
  findPasswordHash,
  findPrivateById,
  touchLogin,
  updatePassword,
} from '../users/users.model.js';
