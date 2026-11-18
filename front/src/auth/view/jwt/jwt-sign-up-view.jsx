import { z as zod } from 'zod';
import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useApi } from 'src/hooks/use-api';

import { GOVERNORATES } from 'src/utils/clac';

import { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { signUp } from '../../context/jwt';
import { useAuthContext } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { homeForRole } from '../../guard/guest-guard';

// ----------------------------------------------------------------------

const ROLES = [
  { value: 'seller', label: 'Vendre', caption: 'Je valorise mes matières', icon: 'solar:shop-2-bold-duotone' },
  { value: 'buyer', label: 'Acheter', caption: 'Je cherche des matières', icon: 'solar:cart-large-2-bold-duotone' },
  { value: 'collector', label: 'Collecter', caption: 'Je gère un point de collecte', icon: 'solar:map-point-wave-bold-duotone' },
];

const SignUpSchema = zod.object({
  role: zod.enum(['seller', 'buyer', 'collector']),
  name: zod.string().min(1, { message: 'Nom requis' }),
  company_name: zod.string().optional(),
  email: zod.string().min(1, { message: 'Email requis' }).email({ message: 'Email invalide' }),
  phone: zod.string().optional(),
  gouvernorat: zod.string().min(1, { message: 'Choisissez un gouvernorat' }),
  password: zod.string().min(8, { message: 'Au moins 8 caractères' }),
  category_ids: zod.array(zod.number()),
});

// ----------------------------------------------------------------------

export function JwtSignUpView() {
  const router = useRouter();
  const showPassword = useBoolean();
  const { checkUserSession } = useAuthContext();
  const [errorMessage, setErrorMessage] = useState('');
  const { data: categories } = useApi(endpoints.categories);

  const methods = useForm({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      role: 'seller',
      name: '',
      company_name: '',
      email: '',
      phone: '',
      gouvernorat: '',
      password: '',
      category_ids: [],
    },
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async ({ company_name, phone, ...data }) => {
    try {
      setErrorMessage('');
      const user = await signUp({
        ...data,
        ...(company_name && { company_name }),
        ...(phone && { phone }),
      });
      await checkUserSession?.();
      router.replace(homeForRole(user.role));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  });

  return (
    <Box sx={{ maxWidth: 520, width: 1, mx: 'auto' }}>
      <Typography variant="h3" sx={{ mb: 1 }}>
        Rejoignez l’économie circulaire
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
        {`Déjà inscrit ? `}
        <Link component={RouterLink} href={paths.auth.jwt.signIn} variant="subtitle2">
          Se connecter
        </Link>
      </Typography>

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        <Stack spacing={2.5}>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {ROLES.map((role) => {
                  const selected = field.value === role.value;
                  return (
                    <Box
                      key={role.value}
                      onClick={() => field.onChange(role.value)}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        borderRadius: 1.5,
                        textAlign: 'center',
                        transition: 'all .2s',
                        border: (theme) =>
                          `2px solid ${selected ? theme.vars.palette.primary.main : theme.vars.palette.divider}`,
                        bgcolor: selected ? 'primary.lighter' : 'background.paper',
                        '&:hover': { borderColor: 'primary.light', transform: 'translateY(-2px)' },
                      }}
                    >
                      <Iconify icon={role.icon} width={30} sx={{ color: selected ? 'primary.dark' : 'text.secondary' }} />
                      <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                        {role.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2, display: 'block' }}>
                        {role.caption}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          />

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Field.Text name="name" label="Nom / raison sociale" slotProps={{ inputLabel: { shrink: true } }} />
            <Field.Text name="company_name" label="Entreprise (optionnel)" slotProps={{ inputLabel: { shrink: true } }} />
            <Field.Text name="email" label="Email" slotProps={{ inputLabel: { shrink: true } }} />
            <Field.Text name="phone" label="Téléphone" placeholder="+216 …" slotProps={{ inputLabel: { shrink: true } }} />
            <Field.Select
              name="gouvernorat"
              label="Gouvernorat"
              options={GOVERNORATES.map((g) => ({ value: g, label: g }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Field.Text
              name="password"
              label="Mot de passe"
              type={showPassword.value ? 'text' : 'password'}
              slotProps={{
                inputLabel: { shrink: true },
                input: {
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
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Matières qui vous intéressent{' '}
              <Typography component="span" variant="caption" sx={{ color: 'text.disabled' }}>
                (pour recevoir les bonnes demandes et alertes)
              </Typography>
            </Typography>
            <Controller
              name="category_ids"
              control={control}
              render={({ field }) => (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {(categories ?? []).map((c) => {
                    const on = field.value.includes(c.id);
                    return (
                      <Chip
                        key={c.id}
                        label={c.name}
                        color={on ? 'primary' : 'default'}
                        variant={on ? 'filled' : 'outlined'}
                        icon={on ? <Iconify icon="eva:checkmark-fill" /> : undefined}
                        onClick={() =>
                          field.onChange(on ? field.value.filter((id) => id !== c.id) : [...field.value, c.id])
                        }
                      />
                    );
                  })}
                </Stack>
              )}
            />
          </Box>

          <LoadingButton
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            color="primary"
            loading={isSubmitting}
            endIcon={<Iconify icon="eva:arrow-forward-fill" />}
            sx={{ py: 1.5 }}
          >
            Créer mon compte
          </LoadingButton>

          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            En créant un compte, vous acceptez les conditions d’utilisation de CLAC.
          </Typography>
        </Stack>
      </Form>
    </Box>
  );
}
