import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { homeForRole } from '../../guard/guest-guard';
import { signInWithPassword } from '../../context/jwt';

// ----------------------------------------------------------------------

export const SignInSchema = zod.object({
  email: zod.string().min(1, { message: 'Email requis' }).email({ message: 'Email invalide' }),
  password: zod.string().min(1, { message: 'Mot de passe requis' }),
});

/** Demo accounts created by `npm run seed` in the backend. */
const DEMO_ACCOUNTS = [
  { label: 'Vendeur', email: 'huilerie.zitouna@clac.tn', password: 'Clac2026!', icon: 'solar:shop-bold-duotone' },
  { label: 'Acheteur', email: 'achats@biodiesel-sahel.tn', password: 'Clac2026!', icon: 'solar:cart-large-2-bold-duotone' },
  { label: 'Point de collecte', email: 'collecte.sfax@clac.tn', password: 'Clac2026!', icon: 'solar:map-point-wave-bold-duotone' },
  { label: 'Admin', email: 'admin@clac.tn', password: 'Admin2026!', icon: 'solar:shield-user-bold-duotone' },
];

// ----------------------------------------------------------------------

export function JwtSignInView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showPassword = useBoolean();
  const { checkUserSession } = useAuthContext();
  const [errorMessage, setErrorMessage] = useState('');

  const methods = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: '', password: '' },
  });

  const {
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage('');
      const user = await signInWithPassword(data);
      await checkUserSession?.();
      router.replace(searchParams.get('returnTo') || homeForRole(user.role));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  });

  const fillDemo = (account) => {
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
  };

  return (
    <Box sx={{ maxWidth: 420, width: 1, mx: 'auto' }}>
      <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 2 }}>
        Espace professionnel
      </Typography>
      <Typography variant="h3" sx={{ mt: 1, mb: 1 }}>
        Bon retour parmi nous 🌿
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
        {`Pas encore de compte ? `}
        <Link component={RouterLink} href={paths.auth.jwt.signUp} variant="subtitle2">
          Rejoindre CLAC
        </Link>
      </Typography>

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        <Stack spacing={2.5}>
          <Field.Text
            name="email"
            label="Adresse email"
            autoComplete="email"
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="solar:letter-bold-duotone" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Field.Text
            name="password"
            label="Mot de passe"
            autoComplete="current-password"
            type={showPassword.value ? 'text' : 'password'}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="solar:lock-password-bold-duotone" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={showPassword.onToggle} edge="end">
                      <Iconify icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <LoadingButton
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            color="primary"
            loading={isSubmitting}
            endIcon={<Iconify icon="eva:arrow-forward-fill" />}
            sx={{ py: 1.5, boxShadow: (theme) => theme.customShadows.primary }}
          >
            Se connecter
          </LoadingButton>
        </Stack>
      </Form>

      <Divider sx={{ my: 4, typography: 'overline', color: 'text.disabled', '&::before, &::after': { borderTopStyle: 'dashed' } }}>
        Comptes de démonstration
      </Divider>

      <Stack direction="row" flexWrap="wrap" gap={1}>
        {DEMO_ACCOUNTS.map((account) => (
          <Chip
            key={account.email}
            variant="outlined"
            color="primary"
            icon={<Iconify icon={account.icon} />}
            label={account.label}
            onClick={() => fillDemo(account)}
          />
        ))}
      </Stack>
      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.disabled' }}>
        Cliquez sur un rôle pour remplir le formulaire (données créées par <code>npm run seed</code>).
      </Typography>
    </Box>
  );
}
