import 'dayjs/locale/fr';
import 'dayjs/locale/ar-tn';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/500.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';
import '@fontsource/cairo/800.css';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback, useLayoutEffect } from 'react';

import { frFR } from '@mui/x-date-pickers/locales';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { themeConfig } from 'src/theme/theme-config';

import { useSettingsContext } from 'src/components/settings';

import { useAuthContext } from 'src/auth/hooks';

import { i18n, LANGS, langMeta, currentLang, LANG_STORAGE_KEY } from './i18n';

// ----------------------------------------------------------------------

const ARABIC_FONT = 'Cairo';
const DAYJS_LOCALE = { fr: 'fr', ar: 'ar-tn' };

dayjs.locale(DAYJS_LOCALE[currentLang()] ?? 'fr');

/** Switch language instantly (no reload): i18n + dayjs + persisted choice. */
export function changeLanguage(lang) {
  if (!LANGS.some((l) => l.value === lang)) return;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // storage unavailable (private mode): the choice simply isn't remembered
  }
  dayjs.locale(DAYJS_LOCALE[lang] ?? 'fr');
  i18n.changeLanguage(lang);
}

/** Current language, re-rendering when it changes. */
export function useLang() {
  const [lang, setLang] = useState(currentLang());
  useEffect(() => {
    const onChange = (l) => setLang(l);
    i18n.on('languageChanged', onChange);
    return () => i18n.off('languageChanged', onChange);
  }, []);
  const change = useCallback((l) => changeLanguage(l), []);
  return { lang, meta: langMeta(lang), changeLanguage: change };
}

/**
 * Keeps the theme in sync with the language: direction (RTL for Arabic),
 * font (Cairo for Arabic), <html lang/dir>. Must live inside SettingsProvider.
 */
export function LanguageSync() {
  const { lang, meta } = useLang();
  const settings = useSettingsContext();
  const { user } = useAuthContext();
  const { direction, fontFamily } = settings.state;

  // A signed-in user on a new device gets the language saved on their profile
  // (an explicit choice made on this device wins).
  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      // storage unavailable
    }
    if (!stored && user?.preferred_lang && user.preferred_lang !== currentLang()) changeLanguage(user.preferred_lang);
  }, [user?.preferred_lang]);

  useLayoutEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = meta.dir;
    const wantedFont = lang === 'ar' ? ARABIC_FONT : themeConfig.fontFamily.primary;
    if (direction !== meta.dir || fontFamily !== wantedFont) {
      settings.setState({ direction: meta.dir, fontFamily: wantedFont });
    }
  }, [lang, meta.dir, direction, fontFamily, settings]);

  return null;
}

/**
 * Re-mounts its subtree when the language changes so every `t()` call and
 * locale-dependent formatter is re-evaluated (state above it — auth, socket,
 * theme — is preserved). Also provides the date-picker locale.
 */
export function LanguageScope({ children }) {
  const { lang } = useLang();
  return (
    <LocalizationProvider
      key={lang}
      dateAdapter={AdapterDayjs}
      adapterLocale={DAYJS_LOCALE[lang] ?? 'fr'}
      localeText={lang === 'fr' ? frFR.components.MuiLocalizationProvider.defaultProps.localeText : undefined}
    >
      {children}
    </LocalizationProvider>
  );
}
