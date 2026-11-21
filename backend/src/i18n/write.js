import { query } from '../config/db.js';
import { DEFAULT_LANG, currentLang } from './index.js';

/**
 * Single-input multilingual editing.
 *
 * Forms have ONE input per translatable field; the value typed belongs to the
 * interface language. `splitTranslations` decides what goes where:
 *
 * - create (no `existing`): the plain column receives the value (source text) and
 *   `i18n[field][lang]` records it in its language;
 * - update in French: plain column + `i18n.field.fr` are updated;
 * - update in another language: only `i18n.field[lang]` changes — the plain column
 *   (French/source text) is preserved, unless it is empty;
 * - an untouched fallback (the form showed the other language because the translation
 *   is missing, and the user didn't change it) is NOT saved as a translation.
 *
 * Returns `{ data, translations }`: `data` goes to the model's normal create/update,
 * `translations` to `saveTranslations`.
 */
export function splitTranslations(body, fields, existing = null, lang = currentLang()) {
  const data = { ...body };
  const translations = {};
  for (const field of fields) {
    if (body[field] === undefined) continue;
    const value = typeof body[field] === 'string' ? body[field].trim() : body[field];
    if (!existing) {
      translations[field] = { [lang]: value || null };
      continue;
    }
    const stored = existing.i18n?.[field]?.[lang];
    const displayed = stored || existing[field];
    if (!stored && value === displayed && lang !== DEFAULT_LANG) {
      delete data[field]; // untouched fallback text: keep the field as it is
      continue;
    }
    translations[field] = { [lang]: value || null };
    if (lang !== DEFAULT_LANG && existing[field]) delete data[field]; // keep the French/source column
  }
  return { data, translations };
}

/** Deep-merges `{ field: { lang: value } }` into `table.i18n` for row `id`. */
export async function saveTranslations(table, id, translations, existingI18n = null) {
  if (!translations || !Object.keys(translations).length) return;
  let current = existingI18n;
  if (!current) {
    const { rows } = await query(`SELECT i18n FROM ${table} WHERE id = $1`, [id]);
    current = rows[0]?.i18n ?? {};
  }
  const merged = { ...current };
  for (const [field, values] of Object.entries(translations)) merged[field] = { ...(current[field] ?? {}), ...values };
  await query(`UPDATE ${table} SET i18n = $2 WHERE id = $1`, [id, merged]);
}

/**
 * One-liner for services: runs `write(data)` (the model's create/update) with the
 * translatable fields routed to the right place.
 *   create: `const id = await translatedWrite('products', ['title', 'description'], null, data, (d) => model.create(userId, d));`
 *   update: `await translatedWrite('products', ['title', 'description'], id, data, (d) => model.update(id, d));`
 * For a create, `write` must resolve to the new row id (or a row with `id`).
 */
export async function translatedWrite(table, fields, id, body, write) {
  let existing = null;
  if (id) {
    const { rows } = await query(`SELECT id, i18n, ${fields.join(', ')} FROM ${table} WHERE id = $1`, [id]);
    existing = rows[0] ?? null;
  }
  const { data, translations } = splitTranslations(body, fields, existing);
  const result = await write(data);
  const targetId = id ?? (typeof result === 'object' && result ? result.id : result);
  if (targetId) await saveTranslations(table, targetId, translations, existing?.i18n ?? (id ? null : {}));
  return result;
}

/** Read helper: the value of `field` in `lang`, falling back to the plain column. */
export const pick = (row, field, lang = currentLang()) => row?.i18n?.[field]?.[lang] || row?.[field];
