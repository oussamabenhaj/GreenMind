import { lazy } from 'react';
import { Navigate } from 'react-router';

import { paths } from 'src/routes/paths';

import { SplashScreen } from 'src/components/loading-screen';

import { homeForRole } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';

import { authRoutes } from './auth';
import { spaceRoutes } from './seller';
import { dashboardRoutes } from './dashboard';

// ----------------------------------------------------------------------

const Page404 = lazy(() => import('src/pages/error/404'));
const ComingSoon = lazy(() =>
  import('src/sections/seller/coming-soon').then((m) => ({ default: m.ComingSoonView }))
);

/** "/" → the signed-in user's space, or the sign-in page. */
function RootRedirect() {
  const { loading, authenticated, user } = useAuthContext();
  if (loading) return <SplashScreen />;
  return <Navigate to={authenticated ? homeForRole(user?.role) : paths.auth.jwt.signIn} replace />;
}

export const routesSection = [
  {
    path: '/',
    element: <RootRedirect />,
  },

  // Auth
  ...authRoutes,

  // Role spaces: /seller, /buyer, /collector, /admin
  ...spaceRoutes,

  // Fallback for unknown roles
  { path: 'coming-soon', element: <ComingSoon /> },

  // Starter dashboard (template demo)
  ...dashboardRoutes,

  // No match
  { path: '*', element: <Page404 /> },
];
