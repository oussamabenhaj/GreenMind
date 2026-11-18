import * as model from './admin.model.js';
import { notify, NotificationTypes } from '../notifications/notifications.service.js';
import { found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';

export async function listUsers(filters) {
  const page = paginationOf(filters);
  return paginated(await model.listUsers(filters, page), page);
}

export async function updateUser(id, flags) {
  const user = found(await model.setUserFlags(id, flags), 'Utilisateur introuvable');
  if (flags.is_verified === true) {
    await notify(id, {
      type: NotificationTypes.ACCOUNT_VERIFIED,
      title: 'Compte vérifié ✅',
      message: 'Votre compte a été vérifié par l\'équipe. Le badge "vérifié" est maintenant visible.',
      link: '/profile',
    });
  }
  return user;
}

export const pendingCollectionPoints = () => model.pendingCollectionPoints();

export async function verifyCollectionPoint(id, verified) {
  const point = found(await model.setPointVerified(id, verified), 'Point de collecte introuvable');
  if (verified) {
    await notify(point.manager_id, {
      type: NotificationTypes.COLLECTION_POINT_VERIFIED,
      title: 'Point de collecte validé',
      message: `« ${point.name} » est désormais visible sur la carte.`,
      data: { collection_point_id: point.id },
      link: `/collection-points/${point.id}`,
    });
  }
  return point;
}

export const stats = () => model.stats();
