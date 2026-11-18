import { m } from 'framer-motion';

import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { ForbiddenIllustration } from 'src/assets/illustrations';

import { varBounce, MotionContainer } from 'src/components/animate';

import { useAuthContext } from '../hooks';
import { homeForRole } from './guest-guard';

// ----------------------------------------------------------------------

/**
 * Renders children only for `acceptRoles` (defaults to the signed-in user's role).
 */
export function RoleBasedGuard({ sx, children, hasContent = true, currentRole, acceptRoles }) {
  const { user } = useAuthContext();
  const role = currentRole ?? user?.role;

  if (typeof acceptRoles !== 'undefined' && !acceptRoles.includes(role)) {
    return hasContent ? (
      <Container
        component={MotionContainer}
        sx={[{ textAlign: 'center', py: 10 }, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        <m.div variants={varBounce('in')}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Accès réservé
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <Typography sx={{ color: 'text.secondary' }}>
            Cet espace est réservé à un autre type de compte. Votre rôle actuel ne permet pas d’y accéder.
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <ForbiddenIllustration sx={{ my: { xs: 5, sm: 8 } }} />
        </m.div>

        <Button component={RouterLink} href={homeForRole(role)} variant="contained" size="large">
          Retour à mon espace
        </Button>
      </Container>
    ) : null;
  }

  return <>{children}</>;
}
