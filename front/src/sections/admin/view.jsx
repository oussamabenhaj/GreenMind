import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { RouterLink } from 'src/routes/components';

import { useSpace } from 'src/hooks/use-space';
import { useApi, cleanParams } from 'src/hooks/use-api';

import { fNum, fDate, fMoney, initials, fFromNow, ROLE_LABELS } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { LOGO_URL } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';
import { CellMain, DataTable } from 'src/components/clac/data-table';
import { CountTabs, useTabCounts } from 'src/components/clac/count-tabs';
import { TranslationNotice } from 'src/components/clac/translation-notice';
import { useViewMode, ViewModeToggle } from 'src/components/clac/view-mode';

import { Empty, KpiCard, greeting, HeroBanner, PageHeader, PagePagination } from '../seller/components/ui';
// ----------------------------------------------------------------------

const ROLE_COLORS = { seller: 'primary', buyer: 'info', collector: 'secondary', admin: 'error' };

function PendingPoints({ onChange }) {
  const { data, reload } = useApi(endpoints.admin.pendingPoints);
  const verify = async (id) => {
    await axios.patch(endpoints.admin.verifyPoint(id), { is_verified: true });
    reload();
    onChange?.();
  };
  if (data?.length === 0) return <Empty title={t('Rien à valider')} description={t('Tous les points de collecte sont vérifiés ✅')} icon="solar:map-point-wave-bold-duotone" />;
  return (
    <Stack spacing={1.5}>
      {(data ?? []).map((p) => (
        <Card key={p.id} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Iconify icon="solar:map-point-wave-bold-duotone" width={36} sx={{ color: 'info.main' }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2">{p.name}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {[p.address, t(p.gouvernorat)].filter(Boolean).join(', ')} {t('· GPS')} {p.lat.toFixed(4)}, {p.lng.toFixed(4)} {t('· par')} {p.manager_name} ({p.manager_email}) · {fFromNow(p.updated_at)}
            </Typography>
          </Box>
          <Button size="small" variant="soft" component="a" href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`} target="_blank" rel="noopener">
            {t('Voir sur la carte')}
          </Button>
          <Button size="small" variant="contained" color="success" onClick={() => verify(p.id)} startIcon={<Iconify icon="eva:checkmark-fill" />}>
            {t('Valider')}
          </Button>
        </Card>
      ))}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function AdminDashboardView() {
  const sp = useSpace();
  const { data: s, loading, reload } = useApi(endpoints.admin.stats);
  const pendingUsers = useApi(endpoints.admin.users, { is_verified: false, limit: 5 });

  const verify = async (id) => {
    await axios.patch(endpoints.admin.user(id), { is_verified: true });
    pendingUsers.reload();
    reload();
  };

  const roles = s?.users_by_role ?? {};
  return (
    <DashboardContent maxWidth="xl">
      <HeroBanner logo={LOGO_URL} kicker={t('Administration')} title={`${greeting()} 👋`} subtitle={t('Supervisez la plateforme : vérification des acteurs, validation des points de collecte et référentiels.')} />
      <Grid container spacing={3}>
        {[
          [t('Vendeurs'), roles.seller ?? 0, 'solar:shop-bold-duotone', 'primary'],
          [t('Acheteurs'), roles.buyer ?? 0, 'solar:cart-large-2-bold-duotone', 'info'],
          [t('Points de collecte (gérants)'), roles.collector ?? 0, 'solar:map-point-wave-bold-duotone', 'secondary'],
          [t('Comptes à vérifier'), s?.users_pending_verification ?? 0, 'solar:shield-warning-bold-duotone', 'warning'],
          [t('Produits actifs'), s?.active_products ?? 0, 'solar:box-bold-duotone', 'primary'],
          [t('Demandes ouvertes'), s?.open_requests ?? 0, 'solar:inbox-in-bold-duotone', 'info'],
          [t('Matières réceptionnées'), `${fNum(s?.received_kg ?? 0)} ${t('kg')}`, 'solar:refresh-circle-bold-duotone', 'secondary'],
          [t('Volume d’achats'), fMoney(Math.round(s?.purchases_amount ?? 0)), 'solar:wallet-money-bold-duotone', 'warning'],
        ].map(([title, value, icon, color], i) => (
          <Grid key={title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard title={title} value={value} icon={icon} color={color} loading={loading} delay={i * 0.03} />
          </Grid>
        ))}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title={t('Points de collecte à valider')} subheader={t('{{v}} en attente', { v: s?.points_pending_verification ?? 0 })} />
            <Box sx={{ p: 2.5 }}>
              <PendingPoints onChange={reload} />
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title={t('Comptes à vérifier')} action={<Button component={RouterLink} href={sp.users} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>{t('Tous les comptes')}</Button>} />
            <Stack spacing={1.5} sx={{ p: 2.5 }}>
              {(pendingUsers.data ?? []).map((u) => (
                <Stack key={u.id} direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: `${ROLE_COLORS[u.role]}.lighter`, color: `${ROLE_COLORS[u.role]}.dark` }}>{initials(u.company_name || u.name)}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{u.company_name || u.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t(ROLE_LABELS[u.role])} · {t(u.gouvernorat)} {t('· inscrit')} {fFromNow(u.created_at)}</Typography>
                  </Box>
                  <Button size="small" variant="soft" color="success" onClick={() => verify(u.id)}>{t('Vérifier')}</Button>
                </Stack>
              ))}
              {pendingUsers.data?.length === 0 && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('Tous les comptes sont vérifiés ✅')}</Typography>}
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

export function AdminUsersView() {
  const [f, setF] = useState({ role: '', is_verified: '', is_active: '', q: '', page: 1 });
  const { data, meta, setData } = useApi(endpoints.admin.users, cleanParams({ ...f, limit: 20 }));
  const set = (patch) => setF((s) => ({ ...s, page: 1, ...patch }));
  const [view, setView] = useViewMode('admin-users', 'table');
  const [version, setVersion] = useState(0);
  const counts = useTabCounts(
    endpoints.admin.users,
    [{ value: '', params: {} }, ...Object.keys(ROLE_LABELS).map((v) => ({ value: v, params: { role: v } }))],
    { is_verified: f.is_verified, is_active: f.is_active, q: f.q },
    version
  );

  const update = async (u, patch) => {
    const res = await axios.patch(endpoints.admin.user(u.id), patch);
    setData((list) => list.map((x) => (x.id === u.id ? { ...x, ...res.data.data } : x)));
    setVersion((v) => v + 1);
  };

  const verifiedSwitch = (u) => (u.role === 'admin' ? '—' : <Switch color="success" checked={u.is_verified} onChange={(e) => update(u, { is_verified: e.target.checked })} />);
  const activeSwitch = (u) => (u.role === 'admin' ? '—' : <Switch checked={u.is_active} onChange={(e) => update(u, { is_active: e.target.checked })} />);

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader icon="solar:users-group-two-rounded-bold-duotone" title={t('Utilisateurs')} subtitle={t('Vérifiez les acteurs et gérez l’accès à la plateforme')} />
      <Card sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}>
          <CountTabs
            value={f.role}
            onChange={(v) => set({ role: v })}
            counts={counts}
            sx={{ flex: 1 }}
            tabs={[{ value: '', label: t('Tous'), color: 'default' }, ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label, color: ROLE_COLORS[value] }))]}
          />
          <ViewModeToggle value={view} onChange={setView} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          <TextField fullWidth placeholder={t('Nom, email, entreprise…')} value={f.q} onChange={(e) => set({ q: e.target.value })} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }} />
          <TextField select label={t('Vérification')} value={f.is_verified} onChange={(e) => set({ is_verified: e.target.value })} sx={{ minWidth: 160 }}>
            <MenuItem value="">{t('Tous')}</MenuItem>
            <MenuItem value="true">{t('Vérifiés')}</MenuItem>
            <MenuItem value="false">{t('À vérifier')}</MenuItem>
          </TextField>
          <TextField select label={t('Statut')} value={f.is_active} onChange={(e) => set({ is_active: e.target.value })} sx={{ minWidth: 150 }}>
            <MenuItem value="">{t('Tous')}</MenuItem>
            <MenuItem value="true">{t('Actifs')}</MenuItem>
            <MenuItem value="false">{t('Désactivés')}</MenuItem>
          </TextField>
        </Stack>
      </Card>
      {data && !data.length ? (
        <Empty title={t('Aucun utilisateur')} description={t('Aucun compte ne correspond à ces filtres.')} icon="solar:users-group-two-rounded-bold-duotone" />
      ) : view === 'table' ? (
        <DataTable
          rows={data ?? []}
          minWidth={900}
          columns={[
            { label: t('Utilisateur'), render: (u) => <CellMain avatar={initials(u.company_name || u.name)} color={ROLE_COLORS[u.role]} title={u.company_name || u.name} subtitle={u.email} /> },
            { label: t('Rôle'), render: (u) => <Label color={ROLE_COLORS[u.role]}>{t(ROLE_LABELS[u.role])}</Label> },
            { label: t('Gouvernorat'), render: (u) => t(u.gouvernorat) ?? '—' },
            { label: t('Inscription'), nowrap: true, render: (u) => fDate(u.created_at) },
            { label: t('Dernière connexion'), nowrap: true, render: (u) => (u.last_login_at ? fFromNow(u.last_login_at) : '—') },
            { label: t('Vérifié'), align: 'center', render: verifiedSwitch },
            { label: t('Actif'), align: 'center', render: activeSwitch },
          ]}
        />
      ) : (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' } }}>
          {(data ?? []).map((u) => (
            <Card key={u.id} sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: `${ROLE_COLORS[u.role]}.lighter`, color: `${ROLE_COLORS[u.role]}.dark`, fontWeight: 700 }}>{initials(u.company_name || u.name)}</Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" noWrap>{u.company_name || u.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="div">{u.email}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1.5 }}>
                <Label color={ROLE_COLORS[u.role]}>{t(ROLE_LABELS[u.role])}</Label>
                {t(u.gouvernorat) && <Label startIcon={<Iconify icon="solar:map-point-bold" />}>{t(u.gouvernorat)}</Label>}
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {t('Inscrit le')} {fDate(u.created_at)} · {u.last_login_at ? `vu ${fFromNow(u.last_login_at)}` : t('jamais connecté')}
              </Typography>
              {u.role !== 'admin' && (
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5, pt: 1.5, borderTop: (theme) => `dashed 1px ${theme.vars.palette.divider}`, typography: 'body2' }}>
                  <span>{t('Vérifié')} {verifiedSwitch(u)}</span>
                  <span>{t('Actif')} {activeSwitch(u)}</span>
                </Stack>
              )}
            </Card>
          ))}
        </Box>
      )}
      <PagePagination meta={meta} onChange={(page) => setF((s) => ({ ...s, page }))} />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

export function AdminPointsView() {
  return (
    <DashboardContent maxWidth="lg">
      <PageHeader icon="solar:map-point-wave-bold-duotone" title={t('Validation des points de collecte')} subtitle={t('Un point n’apparaît sur la carte publique qu’après validation')} />
      <Card sx={{ p: 2.5 }}>
        <PendingPoints />
      </Card>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function RefDialog({ open, onClose, kind, item, onSaved }) {
  const [f, setF] = useState({});
  const [error, setError] = useState('');
  const isCat = kind === 'categories';
  const onEnter = () => {
    setError('');
    setF({ slug: item?.slug ?? '', name: item?.name ?? '', description: item?.description ?? '', keywords: (item?.keywords ?? []).join(', '), gouvernorat: item?.gouvernorat ?? '' });
  };
  const save = async () => {
    const body = { slug: f.slug, name: f.name, ...(f.description && { description: f.description }) };
    if (isCat) body.keywords = f.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    try {
      const url = `/api/${kind}${item ? `/${item.id}` : ''}`;
      if (item) await axios.patch(url, body);
      else await axios.post(url, body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose} TransitionProps={{ onEnter }}>
      <DialogTitle>{item ? t('Modifier') : t('Ajouter')} {isCat ? t('une catégorie') : t('un marché')}</DialogTitle>
      <DialogContent>
        <TranslationNotice item={item} fields={['name', 'description']} />
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label={t('Nom')} value={f.name ?? ''} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} />
          <TextField label={t('Slug (minuscules-et-tirets)')} value={f.slug ?? ''} onChange={(e) => setF((s) => ({ ...s, slug: e.target.value }))} />
          <TextField label={t('Description')} multiline rows={2} value={f.description ?? ''} onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))} />
          {isCat && <TextField label={t('Mots-clés (recherche IA), séparés par des virgules')} value={f.keywords ?? ''} onChange={(e) => setF((s) => ({ ...s, keywords: e.target.value }))} />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>{t('Annuler')}</Button>
        <Button variant="contained" onClick={save}>{t('Enregistrer')}</Button>
      </DialogActions>
    </Dialog>
  );
}

export function AdminCatalogView() {
  const [kind, setKind] = useState('categories');
  const { data, reload: reloadList } = useApi(`/api/${kind}`);
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [view, setView] = useViewMode('admin-catalog', 'table');
  const [version, setVersion] = useState(0);
  const reload = () => {
    reloadList();
    setVersion((v) => v + 1);
  };
  const counts = useTabCounts(
    '/api/categories',
    [
      { value: 'categories', params: {} },
      { value: 'markets', params: {}, url: '/api/markets' },
    ],
    {},
    version
  );
  const remove = async (item) => {
    if (!window.confirm(t('Supprimer « {{name}} » ?', { name: item.name }))) return;
    await axios.delete(`/api/${kind}/${item.id}`);
    reload();
  };
  const actions = (item) => (
    <>
      <Tooltip title={t('Modifier')}><IconButton onClick={() => setDialog({ open: true, item })}><Iconify icon="solar:pen-bold" /></IconButton></Tooltip>
      <Tooltip title={t('Supprimer')}><IconButton color="error" onClick={() => remove(item)}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton></Tooltip>
    </>
  );
  const details = (item) =>
    kind === 'categories' ? (
      <Stack direction="row" flexWrap="wrap" gap={0.5}>{(item.keywords ?? []).slice(0, 6).map((k) => <Label key={k}>{k}</Label>)}</Stack>
    ) : (
      item.description
    );
  return (
    <DashboardContent maxWidth="lg">
      <PageHeader
        icon="solar:widget-5-bold-duotone"
        title={t('Référentiels')}
        subtitle={t('Catégories de matières et marchés utilisés pour les filtres')}
        action={<Button variant="contained" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setDialog({ open: true, item: null })}>{t('Ajouter')}</Button>}
      />
      <Card sx={{ mb: 3, px: 2.5, display: 'flex', alignItems: 'center' }}>
        <CountTabs
          value={kind}
          onChange={setKind}
          counts={counts}
          sx={{ flex: 1 }}
          tabs={[
            { value: 'categories', label: t('Catégories'), color: 'primary', icon: 'solar:widget-5-bold' },
            { value: 'markets', label: t('Marchés'), color: 'info', icon: 'solar:shop-2-bold' },
          ]}
        />
        <ViewModeToggle value={view} onChange={setView} />
      </Card>
      {view === 'table' ? (
        <DataTable
          rows={data ?? []}
          minWidth={720}
          columns={[
            { label: t('Nom'), render: (item) => <b>{item.name}</b> },
            { label: t('Slug'), render: (item) => <code>{item.slug}</code> },
            { label: kind === 'categories' ? t('Mots-clés') : t('Description'), render: details },
            { label: t('Produits'), align: 'right', render: (item) => item.products_count },
            { label: '', align: 'right', nowrap: true, render: actions },
          ]}
        />
      ) : (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
          {(data ?? []).map((item) => (
            <Card key={item.id} sx={{ p: 2.5, display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: kind === 'categories' ? 'primary.lighter' : 'info.lighter', color: kind === 'categories' ? 'primary.dark' : 'info.dark' }}>
                  <Iconify icon={kind === 'categories' ? 'solar:widget-5-bold-duotone' : 'solar:shop-2-bold-duotone'} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{item.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}><code>{item.slug}</code></Typography>
                </Box>
                <Label color="primary">{item.products_count} {t('produits')}</Label>
              </Stack>
              <Box sx={{ typography: 'body2', color: 'text.secondary', flexGrow: 1 }}>{details(item)}</Box>
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>{actions(item)}</Stack>
            </Card>
          ))}
        </Box>
      )}
      <RefDialog open={dialog.open} item={dialog.item} kind={kind} onClose={() => setDialog({ open: false, item: null })} onSaved={reload} />
    </DashboardContent>
  );
}
