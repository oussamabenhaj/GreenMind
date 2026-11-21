import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { t, langMeta } from 'src/locales/i18n';

// dayjs locale (fr / ar-tn) is set by src/locales/language-provider
dayjs.extend(relativeTime);

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

export const unitLabel = (unit) => t(UNITS.find((u) => u.value === unit)?.label ?? unit);

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

export const NOTIFICATION_ICONS = {
  'request.new': 'solar:inbox-in-bold-duotone',
  'request.response': 'solar:chat-round-check-bold-duotone',
  'request.response_status': 'solar:check-circle-bold-duotone',
  'request.status': 'solar:clipboard-check-bold-duotone',
  'message.new': 'solar:chat-round-dots-bold-duotone',
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

// Tunisian locales (fr-TN / ar-TN both use Latin digits); cached per language
const formatters = {};
const nf = () => {
  const { locale } = langMeta();
  formatters[locale] = formatters[locale] ?? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  return formatters[locale];
};

export const fNum = (value) => (value === null || value === undefined ? '—' : nf().format(value));
export const fMoney = (value) => (value === null || value === undefined ? '—' : `${fNum(value)} ${t('TND')}`);
export const fQty = (value, unit) => `${fNum(value)} ${unitLabel(unit)}`;

/**
 * A listing's prices: `final_price_per_unit` is the price at the minimum order,
 * `best_price_per_unit` the deepest discount the stock can reach.
 */
export function priceOf(product) {
  const base = product?.price_per_unit ?? null;
  const price = product?.final_price_per_unit ?? base;
  const best = product?.best_price_per_unit ?? price;
  const percentOf = (value) => (base && value != null && value < base ? Math.round((1 - value / base) * 100) : 0);
  return { base, price, best, percent: percentOf(price), bestPercent: percentOf(best) };
}
/**
 * Where a quantity (in the listing's own unit) sits between its discount tiers.
 * `missing` is how much more is needed to reach the next tier. Tiers above the
 * available stock are left out: they can never be ordered.
 */
export function tierAt(product, quantity) {
  const qty = Number(quantity);
  const available = Number(product?.quantity_available ?? 0);
  const tiers = (product?.active_discounts ?? [])
    .filter((d) => d.min_quantity != null && Number(d.min_quantity) <= available)
    .map((d) => ({ min: Number(d.min_quantity), percentage: Number(d.percentage) }))
    .sort((a, b) => a.min - b.min);
  if (!tiers.length || !(qty > 0)) return null;
  const current = tiers.reduce((pct, tier) => (tier.min <= qty ? tier.percentage : pct), 0);
  const next = tiers.find((tier) => tier.min > qty);
  return { current, next, missing: next ? next.min - qty : 0 };
}

/** The same quantity in another unit — only tonnes and kilograms differ. */
export const convertQty = (qty, from, to) => {
  if (from === 't' && to === 'kg') return Number(qty) * 1000;
  if (from === 'kg' && to === 't') return Number(qty) / 1000;
  return Number(qty);
};

const sameUnitFamily = (a, b) => a === b || ((a === 'kg' || a === 't') && (b === 'kg' || b === 't'));

/**
 * The seller's optional volume discount on a listing: -10 % above half of its
 * stock and -15 % for the whole quantity. Disabled listings earn nothing.
 */
export const QUANTITY_DISCOUNT_PERCENTAGE = 10;
export const FULL_QUANTITY_DISCOUNT_PERCENTAGE = 15;

export const quantityDiscountEnabled = (product) => !!product?.quantity_discount_enabled;

export const quantityDiscountThreshold = (product) => {
  const available = Number(product?.quantity_available);
  return available > 0 ? Number((available / 2).toFixed(2)) : null;
};

const inListingUnit = (product, quantity, unit) =>
  sameUnitFamily(product?.unit, unit) ? convertQty(quantity, unit, product.unit) : null;

/** True when this quantity is strictly above the listing's half-stock threshold. */
export function reachesQuantityDiscount(product, quantity, unit = product?.unit) {
  const threshold = quantityDiscountThreshold(product);
  const qty = inListingUnit(product, quantity, unit);
  return threshold != null && qty != null && Number(quantity) > 0 && qty > threshold;
}

/** True when the order takes the whole displayed stock. */
export function isFullQuantity(product, quantity, unit = product?.unit) {
  const qty = inListingUnit(product, quantity, unit);
  const available = Number(product?.quantity_available);
  return qty != null && available > 0 && qty >= available;
}

/** 0, 10 or 15 — and 0 whenever the seller did not enable the discount. */
export function quantityDiscountPercentage(product, quantity, unit = product?.unit) {
  if (!quantityDiscountEnabled(product)) return 0;
  if (isFullQuantity(product, quantity, unit)) return FULL_QUANTITY_DISCOUNT_PERCENTAGE;
  return reachesQuantityDiscount(product, quantity, unit) ? QUANTITY_DISCOUNT_PERCENTAGE : 0;
}

/** Unit price once a discount percentage (default: the half-stock tier) is applied. */
export const quantityDiscountedPrice = (product, percentage = QUANTITY_DISCOUNT_PERCENTAGE) =>
  product?.price_per_unit == null
    ? null
    : Number((Number(product.price_per_unit) * (1 - percentage / 100)).toFixed(3));

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
