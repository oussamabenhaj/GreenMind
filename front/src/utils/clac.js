import 'dayjs/locale/fr';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('fr');

// ----------------------------------------------------------------------

export const GOVERNORATES = [
  'Ariana', 'Beja', 'Ben Arous', 'Bizerte', 'Gabes', 'Gafsa', 'Jendouba', 'Kairouan',
  'Kasserine', 'Kebili', 'Kef', 'Mahdia', 'Manouba', 'Medenine', 'Monastir', 'Nabeul',
  'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
];

export const UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 't', label: 'tonne' },
  { value: 'l', label: 'litre' },
  { value: 'unit', label: 'unité' },
];

export const unitLabel = (unit) => UNITS.find((u) => u.value === unit)?.label ?? unit;

export const ROLE_LABELS = {
  seller: 'Vendeur',
  buyer: 'Acheteur',
  collector: 'Point de collecte',
  admin: 'Administrateur',
};

export const REQUEST_STATUS = {
  open: { label: 'Ouverte', color: 'success' },
  in_progress: { label: 'En cours', color: 'info' },
  fulfilled: { label: 'Satisfaite', color: 'primary' },
  closed: { label: 'Clôturée', color: 'default' },
  cancelled: { label: 'Annulée', color: 'error' },
};

export const RESPONSE_STATUS = {
  pending: { label: 'En attente', color: 'warning' },
  accepted: { label: 'Acceptée', color: 'success' },
  rejected: { label: 'Refusée', color: 'error' },
  withdrawn: { label: 'Retirée', color: 'default' },
};

export const PURCHASE_STATUS = {
  pending: { label: 'En attente', color: 'warning' },
  confirmed: { label: 'Confirmée', color: 'info' },
  received: { label: 'Réceptionnée', color: 'success' },
  cancelled: { label: 'Annulée', color: 'error' },
};

export const DISCOUNT_STATE = {
  active: { label: 'Active', color: 'success' },
  upcoming: { label: 'À venir', color: 'info' },
  expired: { label: 'Expirée', color: 'default' },
  inactive: { label: 'Désactivée', color: 'warning' },
};

export const NOTIFICATION_ICONS = {
  'request.new': 'solar:inbox-in-bold-duotone',
  'request.response': 'solar:chat-round-check-bold-duotone',
  'request.response_status': 'solar:check-circle-bold-duotone',
  'request.status': 'solar:clipboard-check-bold-duotone',
  'message.new': 'solar:chat-round-dots-bold-duotone',
  'discount.new': 'solar:tag-price-bold-duotone',
  'offer.published': 'solar:calendar-mark-bold-duotone',
  'purchase.new': 'solar:cart-large-4-bold-duotone',
  'purchase.status': 'solar:delivery-bold-duotone',
  'stock.alert': 'solar:danger-triangle-bold-duotone',
  'account.verified': 'solar:verified-check-bold-duotone',
  'collection_point.verified': 'solar:map-point-wave-bold-duotone',
  'exchange.new': 'solar:refresh-square-bold-duotone',
  'exchange.response': 'solar:hand-shake-bold-duotone',
  'exchange.response_status': 'solar:check-circle-bold-duotone',
};

// ----------------------------------------------------------------------

const nf = new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 2 });

export const fNum = (value) => (value === null || value === undefined ? '—' : nf.format(value));
export const fMoney = (value) => (value === null || value === undefined ? '—' : `${fNum(value)} TND`);
export const fQty = (value, unit) => `${fNum(value)} ${unitLabel(unit)}`;
export const fDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '—');
export const fDateTime = (value) => (value ? dayjs(value).format('DD MMM YYYY · HH:mm') : '—');
export const fFromNow = (value) => (value ? dayjs(value).fromNow() : '');

export const initials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
