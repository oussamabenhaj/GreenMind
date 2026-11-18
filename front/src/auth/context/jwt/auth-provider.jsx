import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';

import axios, { endpoints } from 'src/lib/axios';

import { JWT_STORAGE_KEY } from './constant';
import { AuthContext } from '../auth-context';
import { setSession, isValidToken } from './utils';

// ----------------------------------------------------------------------

export function AuthProvider({ children }) {
  const { state, setState } = useSetState({ user: null, loading: true });

  const checkUserSession = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem(JWT_STORAGE_KEY);

      if (accessToken && isValidToken(accessToken)) {
        setSession(accessToken);
        // Retry transient failures (server restarting, dev reload); only a 401 means "signed out".
        let res;
        for (let attempt = 0; ; attempt += 1) {
          try {
            res = await axios.get(endpoints.auth.me);
            break;
          } catch (error) {
            if (error?.status === 401 || attempt >= 2) throw error;
            await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          }
        }
        setState({ user: { ...res.data.data, accessToken }, loading: false });
      } else {
        setSession(null);
        setState({ user: null, loading: false });
      }
    } catch (error) {
      console.error(error);
      setState({ user: null, loading: false });
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUser = useCallback((patch) => setState({ user: { ...state.user, ...patch } }), [
    setState,
    state.user,
  ]);

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';
  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user
        ? { ...state.user, displayName: state.user.company_name || state.user.name, photoURL: state.user.avatar_url }
        : null,
      checkUserSession,
      updateUser,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
    }),
    [checkUserSession, updateUser, state.user, status]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}
