import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

/** Page paths of the signed-in user's space (seller, buyer, collector, admin). */
export function useSpace() {
  const { user } = useAuthContext();
  return paths[user?.role] ?? paths.seller;
}

/** Same, for plain functions: derives the space from the current URL. */
export function spaceFromLocation() {
  const root = window.location.pathname.split('/')[1];
  return paths[root] ?? paths.seller;
}
