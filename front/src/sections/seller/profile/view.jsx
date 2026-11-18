import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid2';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { fDate, initials, ROLE_LABELS, GOVERNORATES } from 'src/utils/clac';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { LOGO_URL } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { useReferenceData } from '../components/ui';

// ----------------------------------------------------------------------

const FIELDS = ['name', 'company_name', 'phone', 'bio', 'avatar_url', 'gouvernorat', 'address'];

export function ProfileView() {
  const { user, checkUserSession } = useAuthContext();
  const { categories } = useReferenceData();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ saving: false, ok: false, error: '' });
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', msg: '', error: '' });

  useEffect(() => {
    if (user && !form) {
      setForm({
        ...Object.fromEntries(FIELDS.map((k) => [k, user[k] ?? ''])),
        lat: user.lat ?? '',
        lng: user.lng ?? '',
        category_ids: user.category_ids ?? [],
      });
    }
  }, [user, form]);

  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) })),
      () => setStatus((s) => ({ ...s, error: 'Géolocalisation refusée' }))
    );

  const save = async () => {
    setStatus({ saving: true, ok: false, error: '' });
    const payload = Object.fromEntries(FIELDS.map((k) => [k, form[k] === '' ? null : form[k]]));
    payload.name = form.name;
    payload.gouvernorat = form.gouvernorat || undefined;
    payload.category_ids = form.category_ids;
    if (form.lat !== '' && form.lng !== '') Object.assign(payload, { lat: Number(form.lat), lng: Number(form.lng) });
    try {
      await axios.patch(endpoints.users.me, payload);
      await checkUserSession();
      setStatus({ saving: false, ok: true, error: '' });
    } catch (error) {
      setStatus({ saving: false, ok: false, error: error.message });
    }
  };

  const changePassword = async () => {
    try {
      await axios.patch(endpoints.auth.password, { current_password: pwd.current_password, new_password: pwd.new_password });
      setPwd({ current_password: '', new_password: '', msg: 'Mot de passe modifié ✅', error: '' });
    } catch (error) {
      setPwd((p) => ({ ...p, msg: '', error: error.message }));
    }
  };

  return (
    <DashboardContent maxWidth="lg">
      <Card sx={{ mb: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            height: 180,
            position: 'relative',
            background: (theme) => `linear-gradient(120deg, ${theme.vars.palette.primary.darker}, ${theme.vars.palette.primary.main}, ${theme.vars.palette.secondary.main})`,
          }}
        >
          <Box component="img" src={LOGO_URL} alt="" sx={{ position: 'absolute', right: 24, bottom: 12, height: 150, opacity: 0.9 }} />
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'flex-end' }} sx={{ px: 3, pb: 3, mt: -6 }}>
          <Avatar src={user.avatar_url ?? undefined} sx={{ width: 112, height: 112, fontSize: 36, border: '4px solid', borderColor: 'background.paper', bgcolor: 'primary.main' }}>
            {initials(user.displayName)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4">{user.displayName}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Label color="primary">{ROLE_LABELS[user.role]}</Label>
              <Label color={user.is_verified ? 'success' : 'warning'}>{user.is_verified ? 'Compte vérifié' : 'Vérification en attente'}</Label>
            </Stack>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Membre depuis le {fDate(user.created_at)}
          </Typography>
        </Stack>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Informations personnelles et professionnelles
            </Typography>
            {status.ok && <Alert severity="success" sx={{ mb: 2 }}>Profil mis à jour</Alert>}
            {!!status.error && <Alert severity="error" sx={{ mb: 2 }}>{status.error}</Alert>}
            <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField label="Nom" value={form.name} onChange={set('name')} />
              <TextField label="Entreprise" value={form.company_name} onChange={set('company_name')} />
              <TextField label="Email" value={user.email} disabled />
              <TextField label="Téléphone" value={form.phone} onChange={set('phone')} />
              <TextField select label="Gouvernorat" value={form.gouvernorat} onChange={set('gouvernorat')}>
                {GOVERNORATES.map((g) => (
                  <MenuItem key={g} value={g}>
                    {g}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Adresse" value={form.address} onChange={set('address')} />
              <TextField label="Latitude" value={form.lat} onChange={set('lat')} />
              <Stack direction="row" spacing={1}>
                <TextField fullWidth label="Longitude" value={form.lng} onChange={set('lng')} />
                <Button variant="soft" onClick={locate} sx={{ flexShrink: 0 }}>
                  <Iconify icon="solar:gps-bold-duotone" />
                </Button>
              </Stack>
              <TextField label="Photo de profil (URL)" value={form.avatar_url} onChange={set('avatar_url')} sx={{ gridColumn: { sm: 'span 2' } }} />
              <TextField label="Présentation" multiline rows={3} value={form.bio} onChange={set('bio')} sx={{ gridColumn: { sm: 'span 2' } }} />
            </Box>

            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              Catégories suivies (demandes & alertes)
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {categories.map((c) => {
                const on = form.category_ids.includes(c.id);
                return (
                  <Chip
                    key={c.id}
                    label={c.name}
                    color={on ? 'primary' : 'default'}
                    variant={on ? 'filled' : 'outlined'}
                    onClick={() => setForm((f) => ({ ...f, category_ids: on ? f.category_ids.filter((id) => id !== c.id) : [...f.category_ids, c.id] }))}
                  />
                );
              })}
            </Stack>

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
              <LoadingButton variant="contained" size="large" loading={status.saving} onClick={save} startIcon={<Iconify icon="solar:diskette-bold" />}>
                Enregistrer
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Sécurité
            </Typography>
            {!!pwd.msg && <Alert severity="success" sx={{ mb: 2 }}>{pwd.msg}</Alert>}
            {!!pwd.error && <Alert severity="error" sx={{ mb: 2 }}>{pwd.error}</Alert>}
            <Stack spacing={2}>
              <TextField type="password" label="Mot de passe actuel" value={pwd.current_password} onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))} />
              <TextField type="password" label="Nouveau mot de passe" helperText="8 caractères minimum" value={pwd.new_password} onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))} />
              <Button variant="outlined" onClick={changePassword} disabled={!pwd.current_password || pwd.new_password.length < 8}>
                Changer le mot de passe
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
