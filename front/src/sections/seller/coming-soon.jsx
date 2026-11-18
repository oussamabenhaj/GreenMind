import { Helmet } from 'react-helmet-async';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { ROLE_LABELS } from 'src/utils/clac';

import { LOGO_URL } from 'src/components/logo';

import { useAuthContext } from 'src/auth/hooks';
import { signOut } from 'src/auth/context/jwt/action';

// ----------------------------------------------------------------------

/** Landing for roles whose space is not built yet (buyer, collector, admin). */
export function ComingSoonView() {
  const router = useRouter();
  const { user, checkUserSession } = useAuthContext();

  const logout = async () => {
    await signOut().catch(() => {});
    await checkUserSession();
    router.replace(paths.auth.jwt.signIn);
  };

  return (
    <>
      <Helmet>
        <title>Bientôt disponible · CLAC</title>
      </Helmet>
      <Stack alignItems="center" justifyContent="center" spacing={3} sx={{ minHeight: '100vh', p: 3, textAlign: 'center', bgcolor: 'primary.lighter' }}>
        <Box component="img" src={LOGO_URL} alt="CLAC" sx={{ width: 280 }} />
        <Typography variant="h3">L’espace {ROLE_LABELS[user?.role] ?? ''} arrive bientôt 🌱</Typography>
        <Typography sx={{ color: 'text.secondary', maxWidth: 520 }}>
          Seul l’espace Vendeur est disponible pour le moment. Connectez-vous avec un compte vendeur pour découvrir la plateforme.
        </Typography>
        <Button variant="contained" size="large" onClick={logout}>
          Changer de compte
        </Button>
      </Stack>
    </>
  );
}
