import 'src/global.css';
import 'dayjs/locale/fr';

import { useEffect } from 'react';

import { frFR } from '@mui/x-date-pickers/locales';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { usePathname } from 'src/routes/hooks';

import { SocketProvider } from 'src/lib/socket';
import { themeConfig, ThemeProvider } from 'src/theme';

import { ProgressBar } from 'src/components/progress-bar';
import { MotionLazy } from 'src/components/animate/motion-lazy';
import { SettingsDrawer, defaultSettings, SettingsProvider } from 'src/components/settings';

import { useAuthContext } from 'src/auth/hooks';
import { AuthProvider } from 'src/auth/context/jwt';

// ----------------------------------------------------------------------

export default function App({ children }) {
  useScrollToTop();

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale="fr"
      localeText={frFR.components.MuiLocalizationProvider.defaultProps.localeText}
    >
    <AuthProvider>
      <SettingsProvider defaultSettings={defaultSettings}>
        <ThemeProvider
          noSsr
          defaultMode={themeConfig.defaultMode}
          modeStorageKey={themeConfig.modeStorageKey}
        >
          <MotionLazy>
            <RealtimeBridge>
              <ProgressBar />
              <SettingsDrawer defaultSettings={defaultSettings} />
              {children}
            </RealtimeBridge>
          </MotionLazy>
        </ThemeProvider>
      </SettingsProvider>
    </AuthProvider>
    </LocalizationProvider>
  );
}

// ----------------------------------------------------------------------

/** Opens the Socket.IO connection once the user is signed in. */
function RealtimeBridge({ children }) {
  const { user } = useAuthContext();
  return <SocketProvider userId={user?.id}>{children}</SocketProvider>;
}

// ----------------------------------------------------------------------

function useScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
