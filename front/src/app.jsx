import 'src/global.css';

import { useEffect } from 'react';

import { usePathname } from 'src/routes/hooks';

import { SocketProvider } from 'src/lib/socket';
import { themeConfig, ThemeProvider } from 'src/theme';
import { LanguageSync, LanguageScope } from 'src/locales';

import { ProgressBar } from 'src/components/progress-bar';
import { MotionLazy } from 'src/components/animate/motion-lazy';
import { SettingsDrawer, defaultSettings, SettingsProvider } from 'src/components/settings';

import { useAuthContext } from 'src/auth/hooks';
import { AuthProvider } from 'src/auth/context/jwt';

// ----------------------------------------------------------------------

export default function App({ children }) {
  useScrollToTop();

  return (
    <AuthProvider>
      <SettingsProvider defaultSettings={defaultSettings}>
        <LanguageSync />
        <ThemeProvider
          noSsr
          defaultMode={themeConfig.defaultMode}
          modeStorageKey={themeConfig.modeStorageKey}
        >
          <MotionLazy>
            <RealtimeBridge>
              <ProgressBar />
              <LanguageScope>
                <SettingsDrawer defaultSettings={defaultSettings} />
                {children}
              </LanguageScope>
            </RealtimeBridge>
          </MotionLazy>
        </ThemeProvider>
      </SettingsProvider>
    </AuthProvider>
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
