import { currentLang } from './i18n';

// ----------------------------------------------------------------------

/**
 * Client-side counterpart of the API localisation (backend/src/i18n/localize.js).
 * REST responses are already localised by the API (Accept-Language), but real-time
 * Socket.IO payloads are broadcast once to everyone: they carry the raw `i18n`
 * column ({ field: { fr, ar } }) and are localised here for the current language.
 */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function walk(value, lang, depth = 0) {
  if (depth > 10 || !value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    value.forEach((v) => walk(v, lang, depth + 1));
    return value;
  }
  if (isObj(value.i18n)) {
    Object.entries(value.i18n).forEach(([field, values]) => {
      const v = isObj(values) ? values[lang] : undefined;
      if (typeof v === 'string' && v.trim() && field in value) value[field] = v;
    });
  }
  Object.values(value).forEach((v) => v && typeof v === 'object' && walk(v, lang, depth + 1));
  return value;
}

/** Localise (a copy of) any payload for the current interface language. */
export function localizeEntity(payload, lang = currentLang()) {
  if (!payload || typeof payload !== 'object') return payload;
  return walk(structuredClone(payload), lang);
}

/** Fields of a multilingual entity whose value is shown in another language (translation missing). */
export const missingTranslations = (entity) => entity?.i18n_missing ?? [];
