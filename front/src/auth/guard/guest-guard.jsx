import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

/** Home of each role once signed in. */
export const homeForRole = (role) => paths[role]?.root ?? paths.comingSoon;

export function GuestGuard({ children }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { loading, authenticated, user } = useAuthContext();

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (authenticated) {
      router.replace(searchParams.get('returnTo') || homeForRole(user?.role));
      return;
    }
    setIsChecking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, loading]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
