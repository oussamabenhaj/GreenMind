import { arSD, frFR } from '@mui/material/locale';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as ThemeVarsProvider } from '@mui/material/styles';

import { useLang } from 'src/locales/language-provider';

import { useSettingsContext } from 'src/components/settings';

import { createTheme } from './create-theme';
import { Rtl } from './with-settings/right-to-left';

// ----------------------------------------------------------------------

export function ThemeProvider({ themeOverrides, children, ...other }) {
  const settings = useSettingsContext();
  const { lang } = useLang();

  const theme = createTheme({
    settingsState: settings.state,
    themeOverrides,
    localeComponents: lang === 'ar' ? arSD : frFR,
  });

  return (
    <ThemeVarsProvider disableTransitionOnChange theme={theme} {...other}>
      <CssBaseline />
      <Rtl direction={settings.state.direction}>{children}</Rtl>
    </ThemeVarsProvider>
  );
}
