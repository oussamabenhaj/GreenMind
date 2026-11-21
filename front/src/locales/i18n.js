import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// ----------------------------------------------------------------------

/**
 * Translation strategy: French is the source language and keys are the French
 * strings themselves (gettext style). `fr/*.json` is therefore an identity map
 * (kept so wording can be tuned without touching code) and `ar/*.json` holds the
 * Arabic translations. A missing Arabic key falls back to the French text.
 *
 * Namespaces only organise the files: every namespace is searched (fallbackNS),
 * so components simply call `t('Mes produits')`.
 */

export const LANGS = [
  { value: 'fr', label: 'Français', short: 'FR', dir: 'ltr', locale: 'fr-TN', flag: '🇫🇷' },
  { value: 'ar', label: 'العربية', short: 'ع', dir: 'rtl', locale: 'ar-TN', flag: '🇹🇳' },
];

export const DEFAULT_LANG = 'fr';
export const LANG_STORAGE_KEY = 'clac-lang';

const modules = import.meta.glob('./*/*.json', { eager: true });

const resources = {};
Object.entries(modules).forEach(([path, mod]) => {
  const [, lang, file] = path.match(/\.\/(\w+)\/([\w-]+)\.json$/);
  resources[lang] = resources[lang] ?? {};
  resources[lang][file] = mod.default ?? mod;
});

export const NAMESPACES = Object.keys(resources.fr ?? { common: {} });

const readStoredLang = () => {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    return LANGS.some((l) => l.value === v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
};

i18next.use(initReactI18next).init({
  resources,
  lng: readStoredLang(),
  fallbackLng: DEFAULT_LANG,
  ns: NAMESPACES,
  defaultNS: 'common',
  fallbackNS: NAMESPACES.filter((n) => n !== 'common'),
  // natural-language keys contain "." and ":" → disable separators
  keySeparator: false,
  nsSeparator: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export const i18n = i18next;

/** Global translate function (re-evaluated on every render; the tree re-renders on language change). */
export const t = (key, options) => (key == null || key === '' ? key : i18next.t(key, options));

export const currentLang = () => i18next.language || DEFAULT_LANG;
export const langMeta = (lang = currentLang()) => LANGS.find((l) => l.value === lang) ?? LANGS[0];
export const isRtl = () => langMeta().dir === 'rtl';
