import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';

/**
 * Backend internationalisation (fr / ar).
 *
 * - The request language comes from `Accept-Language` (the web app sends `fr` or `ar`),
 *   or `?lang=`; it is kept in an AsyncLocalStorage so models/services can read it
 *   with `currentLang()` without threading `req` everywhere.
 * - Messages (errors, notifications) are written in French in the code and translated
 *   with `tr(lang, text, vars)` using src/i18n/locales/ar.json (French text → Arabic).
 *   Templates use `{{var}}` placeholders.
 */

export const LANGS = ['fr', 'ar'];
export const DEFAULT_LANG = 'fr';

const dictionaries = {
  ar: JSON.parse(readFileSync(new URL('./locales/ar.json', import.meta.url), 'utf8')),
};

const storage = new AsyncLocalStorage();

export function parseLang(value) {
  if (!value) return DEFAULT_LANG;
  const first = String(value).split(',')[0].trim().slice(0, 2).toLowerCase();
  return LANGS.includes(first) ? first : DEFAULT_LANG;
}

export const currentLang = () => storage.getStore()?.lang ?? DEFAULT_LANG;
export const runWithLang = (lang, fn) => storage.run({ lang }, fn);

const render = (text, vars = {}) => text.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? vars[k] === 0 ? String(vars[k]) : ''));

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Templates (`Stock insuffisant : {{qty}} kg disponibles`) compiled to regexes, so an
 * already-rendered French message can be translated without touching its call site:
 * the dynamic parts are captured and re-inserted into the translated template
 * (captured words that are themselves in the dictionary — statuses, units — are translated too).
 * Longer templates are tried first (most specific).
 */
const templates = Object.fromEntries(
  Object.entries(dictionaries).map(([lang, dict]) => [
    lang,
    Object.keys(dict)
      .filter((k) => k.includes('{{'))
      .sort((a, b) => b.length - a.length)
      .map((key) => {
        const names = [...key.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
        const pattern = key.split(/\{\{\w+\}\}/).map(escapeRe).join('(.+?)');
        return { key, names, re: new RegExp(`^${pattern}$`, 's') };
      }),
  ]),
);

function translateRendered(lang, text) {
  const dict = dictionaries[lang];
  if (!dict) return text;
  if (dict[text] !== undefined) return dict[text];
  for (const { key, names, re } of templates[lang]) {
    const m = text.match(re);
    if (!m) continue;
    const vars = Object.fromEntries(names.map((n, i) => [n, dict[m[i + 1]] ?? m[i + 1]]));
    return render(dict[key], vars);
  }
  return text;
}

/**
 * Translate a French message into `lang`.
 * - `tr(lang, 'Produit introuvable')`
 * - `tr(lang, 'Stock insuffisant : {{qty}} kg disponibles', { qty })` (template + vars)
 * - `tr(lang, 'Stock insuffisant : 12 kg disponibles')` (already rendered → template matching)
 */
export function tr(lang, text, vars) {
  if (typeof text !== 'string') return text;
  if (vars) return render(lang === DEFAULT_LANG ? text : (dictionaries[lang]?.[text] ?? text), vars);
  return lang === DEFAULT_LANG ? text : translateRendered(lang, text);
}

/** Both language versions of a message: `{ fr, ar }` (stored with notifications). */
export const msg = (text, vars) => Object.fromEntries(LANGS.map((l) => [l, tr(l, text, vars)]));

/** Express middleware: resolves the language and runs the rest of the request in its context. */
export function languageMiddleware(req, res, next) {
  req.lang = parseLang(req.query.lang ?? req.get('accept-language'));
  res.setHeader('Content-Language', req.lang);
  runWithLang(req.lang, next);
}
