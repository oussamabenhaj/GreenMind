import * as model from './search.model.js';
import * as productsModel from '../products/products.model.js';
import * as offersModel from '../offers/offers.model.js';
import { findPrivateById } from '../users/users.model.js';
import { GOVERNORATES, normalizeText } from '../../utils/geo.js';
import { paginationOf } from '../../utils/pagination.js';
import { currentLang } from '../../i18n/index.js';
import { arabicToFrench } from './arabic.js';

const ALL_TYPES = ['products', 'sellers', 'buyers', 'offers', 'collection_points', 'requests'];

/** US-S05 / US-B05 — global search box. */
export async function quickSearch(user, { q, types, limit = 5 }) {
  return model.quickSearch(q, types ?? ALL_TYPES, limit, user.role);
}

/* ------------------------------------------------------------------ */
/*  US-S08 / US-B06 — "AI" assisted search                             */
/*  Natural language query → structured filters → ranked results.      */
/*  Rule-based NLP (no external service). Can later be swapped for an  */
/*  LLM call that returns the same `interpretation` object.            */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set(('je cherche recherche veux voudrais besoin de des du la le les un une a au aux en pour avec sur dans '
  + 'et ou svp stp sil vous plait acheter achat vendre trouver kg tonne tonnes litre litres kilo kilos dt tnd dinar dinars '
  + 'moins plus max maximum minimum min prix cher pas bon marche proche pres moi autour region gouvernorat').split(' '));

const UNIT_FACTORS = { kg: 1, kilo: 1, kilos: 1, kilogramme: 1, kilogrammes: 1, t: 1000, tonne: 1000, tonnes: 1000, l: 1, litre: 1, litres: 1 };

export function interpret(raw, categories) {
  // Arabic / darja queries are first mapped onto the French vocabulary below
  const { text: translated, arabicWords } = arabicToFrench(raw, categories);
  const text = normalizeText(translated);
  const out = { raw, filters: {}, detected: [] };
  let residual = ` ${text} `;
  const strip = (fragment) => { residual = residual.replace(fragment, ' '); };

  // Quantity: "2 tonnes", "500kg", "300 litres"
  const qty = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogrammes?|t|tonnes?|l|litres?)\b/);
  if (qty) {
    const value = Number(qty[1].replace(',', '.')) * UNIT_FACTORS[qty[2]];
    out.filters.min_quantity = value;
    out.detected.push({ kind: 'quantity', value, unit: ['l', 'litre', 'litres'].includes(qty[2]) ? 'l' : 'kg' });
    strip(qty[0]);
  }

  // Price ceiling: "moins de 2 dt", "max 1.5 dinars", "< 3"
  const price = text.match(/(?:moins de|max(?:imum)?|<|sous|jusqu'?a)\s*(\d+(?:[.,]\d+)?)\s*(?:dt|tnd|dinars?|d)?\b/);
  if (price) {
    out.filters.max_price = Number(price[1].replace(',', '.'));
    out.detected.push({ kind: 'max_price', value: out.filters.max_price });
    strip(price[0]);
  }
  if (/\b(pas cher|moins cher|bon marche|economique|meilleur prix)\b/.test(text)) {
    out.filters.sort = 'price_asc';
    out.detected.push({ kind: 'sort', value: 'price_asc' });
  }
  // Quantity discounts are now offered by every listing: promo words no longer filter results.
  strip(/\b(promo|promotion|remise|solde|reduction|discount)s?\b/);
  if (/\b(pres de moi|proche de moi|autour de moi|a proximite|proche|pres)\b/.test(text)) {
    out.wantsNearby = true;
    out.detected.push({ kind: 'nearby', value: true });
  }

  // Governorate
  const gov = GOVERNORATES.find((g) => new RegExp(`\\b${normalizeText(g)}\\b`).test(text));
  if (gov) {
    out.filters.gouvernorat = gov;
    out.detected.push({ kind: 'gouvernorat', value: gov });
    strip(new RegExp(`\\b${normalizeText(gov)}\\b`));
  }

  // Category: best keyword match
  let best = null;
  for (const c of categories) {
    const words = [...c.keywords, ...normalizeText(c.name).split(/\s+/)].map(normalizeText).filter((w) => w.length > 2);
    const hits = words.filter((w) => new RegExp(`\\b${w}`).test(text));
    if (hits.length && (!best || hits.length > best.hits.length)) best = { c, hits };
  }
  if (best) {
    out.filters.category_id = best.c.id;
    const label = best.c.i18n?.name?.[currentLang()] || best.c.name;
    out.detected.push({ kind: 'category', value: best.c.id, label, matched: best.hits });
    best.hits.forEach((w) => strip(new RegExp(`\\b${w}\\w*`, 'g')));
  }

  const keywords = [
    ...residual.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w)),
    ...arabicWords.filter((w) => residual.includes(w)), // unmatched Arabic words search the Arabic translations
  ];
  if (keywords.length) out.filters.q = keywords.join(' ');
  out.keywords = keywords;
  return out;
}

export async function smartSearch(user, { q, limit = 20 }) {
  const interpretation = interpret(q, await model.categoriesWithKeywords());
  const filters = { ...interpretation.filters };
  if (interpretation.wantsNearby) {
    const me = await findPrivateById(user.id);
    if (me?.lat != null) Object.assign(filters, { lat: me.lat, lng: me.lng, radius_km: 50, sort: filters.sort ?? 'distance' });
  }

  // Progressive relaxation when nothing matches.
  const page = paginationOf({ limit });
  const relaxed = [];
  let products = await productsModel.list(filters, page);
  for (const key of ['q', 'max_price', 'min_quantity', 'gouvernorat', 'radius_km']) {
    if (products.length || filters[key] === undefined) continue;
    delete filters[key];
    relaxed.push(key);
    products = await productsModel.list(filters, page);
  }
  const offers = await offersModel.list({
    category_id: filters.category_id, gouvernorat: filters.gouvernorat, q: filters.q, lat: filters.lat, lng: filters.lng,
  }, paginationOf({ limit: 5 }));

  const strip = (rows) => rows.map(({ total_count: _t, ...row }) => row);
  return {
    interpretation: { ...interpretation, applied_filters: filters, relaxed_filters: relaxed },
    products: strip(products),
    offers: strip(offers),
  };
}
