import { query } from '../config/db.js';
import { DEFAULT_LANG, currentLang, tr } from './index.js';

/**
 * Multilingual content model
 * --------------------------
 * Translatable rows carry an `i18n` JSONB column shaped `{ field: { fr, ar } }`.
 * The plain column (`title`, `name`, …) keeps the source text — French when it exists —
 * so search, sorting and old clients keep working. Reading picks `i18n[field][lang]`
 * and falls back to the plain column.
 *
 * Responses are localised in one place (see `localizeResponse`) by walking the JSON:
 * every object that has an `i18n` property gets its fields replaced by the requested
 * language, and gets `i18n_missing` (fields shown in fallback) so forms can warn the
 * editor that a translation is missing.
 */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

/** Reference names (categories, markets) joined into rows as `category_name`, `market_name`… */
const REF_KEYS = { category_name: 'categories', wanted_category_name: 'categories', market_name: 'markets' };
let refCache = null;
let refLoadedAt = 0;

export function invalidateReferenceCache() {
  refCache = null;
}

async function references() {
  if (refCache && Date.now() - refLoadedAt < 5 * 60_000) return refCache;
  const [c, m] = await Promise.all([query('SELECT name, i18n FROM categories'), query('SELECT name, i18n FROM markets')]);
  const index = (rows) => new Map(rows.map((r) => [r.name, r.i18n?.name ?? {}]));
  refCache = { categories: index(c.rows), markets: index(m.rows) };
  refLoadedAt = Date.now();
  return refCache;
}

function localizeObject(obj, lang, refs) {
  if (isObj(obj.i18n)) {
    const missing = [];
    for (const [field, values] of Object.entries(obj.i18n)) {
      if (!isObj(values) || !(field in obj)) continue;
      const value = values[lang];
      if (typeof value === 'string' && value.trim()) obj[field] = value;
      else if (typeof obj[field] === 'string' && obj[field]) missing.push(field);
    }
    if (missing.length) obj.i18n_missing = missing;
  }
  // joined summaries: product_title + product_i18n, item_label + item_i18n
  if (isObj(obj.product_i18n) && obj.product_title) {
    const v = obj.product_i18n.title?.[lang];
    if (v) obj.product_title = v;
  }
  if (isObj(obj.item_i18n) && obj.item_label) {
    const v = obj.item_i18n.label?.[lang];
    if (v) obj.item_label = v;
  }
  // system-generated stock movement reasons ("Stock initial", "Achat — …") are stored in French
  if (lang !== DEFAULT_LANG && typeof obj.reason === 'string' && 'balance_after_kg' in obj) obj.reason = tr(lang, obj.reason);
  if (refs) {
    for (const [key, table] of Object.entries(REF_KEYS)) {
      if (typeof obj[key] === 'string') {
        const v = refs[table].get(obj[key])?.[lang];
        if (v) obj[key] = v;
      }
    }
  }
}

function walk(value, lang, refs, depth = 0) {
  if (depth > 12 || value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v) => walk(v, lang, refs, depth + 1));
    return;
  }
  if (value instanceof Date) return;
  localizeObject(value, lang, refs);
  for (const v of Object.values(value)) if (v && typeof v === 'object') walk(v, lang, refs, depth + 1);
}

const hasRefKeys = (value) => JSON.stringify(value).match(/"(category_name|wanted_category_name|market_name)"/);

/** Localise any JSON payload in place for `lang` (default: current request language). */
export async function localize(payload, lang = currentLang()) {
  if (!payload || typeof payload !== 'object') return payload;
  const refs = lang !== DEFAULT_LANG && hasRefKeys(payload) ? await references() : null;
  walk(payload, lang, refs);
  return payload;
}

/** Synchronous variant without reference names (socket payloads are localised client-side). */
export function localizeSync(payload, lang = currentLang()) {
  walk(payload, lang, null);
  return payload;
}

/** Express middleware: wraps res.json so every response is localised. */
export function localizeResponse(req, res, next) {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (!body || typeof body !== 'object') return json(body);
    localize(body, req.lang)
      .then(() => json(body))
      .catch(() => json(body));
    return res;
  };
  next();
}
