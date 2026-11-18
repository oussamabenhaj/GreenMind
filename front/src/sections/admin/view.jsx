import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid2';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
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

import { fNum, fDate, initials, fFromNow, ROLE_LABELS } from 'src/utils/clac';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { LOGO_URL } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

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
  if (data?.length === 0) return <Empty title="Rien à valider" description="Tous les points de collecte sont vérifiés ✅" icon="solar:map-point-wave-bold-duotone" />;
  return (
    <Stack spacing={1.5}>
      {(data ?? []).map((p) => (
        <Card key={p.id} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Iconify icon="solar:map-point-wave-bold-duotone" width={36} sx={{ color: 'info.main' }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2">{p.name}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {[p.address, p.gouvernorat].filter(Boolean).join(', ')} · GPS {p.lat.toFixed(4)}, {p.lng.toFixed(4)} · par {p.manager_name} ({p.manager_email}) · {fFromNow(p.updated_at)}
            </Typography>
          </Box>
          <Button size="small" variant="soft" component="a" href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`} target="_blank" rel="noopener">
            Voir sur la carte
          </Button>
          <Button size="small" variant="contained" color="success" onClick={() => verify(p.id)} startIcon={<Iconify icon="eva:checkmark-fill" />}>
            Valider
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
      <HeroBanner logo={LOGO_URL} kicker="Administration" title={`${greeting()} 👋`} subtitle="Supervisez la plateforme : vérification des acteurs, validation des points de collecte et référentiels." />
      <Grid container spacing={3}>
        {[
          ['Vendeurs', roles.seller ?? 0, 'solar:shop-bold-duotone', 'primary'],
          ['Acheteurs', roles.buyer ?? 0, 'solar:cart-large-2-bold-duotone', 'info'],
          ['Points de collecte (gérants)', roles.collector ?? 0, 'solar:map-point-wave-bold-duotone', 'secondary'],
          ['Comptes à vérifier', s?.users_pending_verification ?? 0, 'solar:shield-warning-bold-duotone', 'warning'],
          ['Produits actifs', s?.active_products ?? 0, 'solar:box-bold-duotone', 'primary'],
          ['Demandes ouvertes', s?.open_requests ?? 0, 'solar:inbox-in-bold-duotone', 'info'],
          ['Matières réceptionnées', `${fNum(s?.received_kg ?? 0)} kg`, 'solar:refresh-circle-bold-duotone', 'secondary'],
          ['Volume d’achats', `${fNum(Math.round(s?.purchases_amount ?? 0))} TND`, 'solar:wallet-money-bold-duotone', 'warning'],
        ].map(([title, value, icon, color], i) => (
          <Grid key={title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard title={title} value={value} icon={icon} color={color} loading={loading} delay={i * 0.03} />
          </Grid>
        ))}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="Points de collecte à valider" subheader={`${s?.points_pending_verification ?? 0} en attente`} />
            <Box sx={{ p: 2.5 }}>
              <PendingPoints onChange={reload} />
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="Comptes à vérifier" action={<Button component={RouterLink} href={sp.users} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>Tous les comptes</Button>} />
            <Stack spacing={1.5} sx={{ p: 2.5 }}>
              {(pendingUsers.data ?? []).map((u) => (
                <Stack key={u.id} direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: `${ROLE_COLORS[u.role]}.lighter`, color: `${ROLE_COLORS[u.role]}.dark` }}>{initials(u.company_name || u.name)}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{u.company_name || u.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{ROLE_LABELS[u.role]} · {u.gouvernorat} · inscrit {fFromNow(u.created_at)}</Typography>
                  </Box>
                  <Button size="small" variant="soft" color="success" onClick={() => verify(u.id)}>Vérifier</Button>
                </Stack>
              ))}
              {pendingUsers.data?.length === 0 && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Tous les comptes sont vérifiés ✅</Typography>}
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

  const update = async (u, patch) => {
    const res = await axios.patch(endpoints.admin.user(u.id), patch);
    setData((list) => list.map((x) => (x.id === u.id ? { ...x, ...res.data.data } : x)));
  };

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader icon="solar:users-group-two-rounded-bold-duotone" title="Utilisateurs" subtitle="Vérifiez les acteurs et gérez l’accès à la plateforme" />
      <Card>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          <TextField fullWidth placeholder="Nom, email, entreprise…" value={f.q} onChange={(e) => set({ q: e.target.value })} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }} />
          <TextField select label="Rôle" value={f.role} onChange={(e) => set({ role: e.target.value })} sx={{ minWidth: 180 }}>
            <MenuItem value="">Tous</MenuItem>
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <MenuItem key={v} value={v}>{l}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Vérification" value={f.is_verified} onChange={(e) => set({ is_verified: e.target.value })} sx={{ minWidth: 160 }}>
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="true">Vérifiés</MenuItem>
            <MenuItem value="false">À vérifier</MenuItem>
          </TextField>
          <TextField select label="Statut" value={f.is_active} onChange={(e) => set({ is_active: e.target.value })} sx={{ minWidth: 150 }}>
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="true">Actifs</MenuItem>
            <MenuItem value="false">Désactivés</MenuItem>
          </TextField>
        </Stack>
        <Scrollbar>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Gouvernorat</TableCell>
                <TableCell>Inscription</TableCell>
                <TableCell>Dernière connexion</TableCell>
                <TableCell align="center">Vérifié</TableCell>
                <TableCell align="center">Actif</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data ?? []).map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ width: 36, height: 36, bgcolor: `${ROLE_COLORS[u.role]}.lighter`, color: `${ROLE_COLORS[u.role]}.dark` }}>{initials(u.company_name || u.name)}</Avatar>
                      <Box>
                        <Typography variant="subtitle2">{u.company_name || u.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{u.email}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell><Label color={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Label></TableCell>
                  <TableCell>{u.gouvernorat ?? '—'}</TableCell>
                  <TableCell>{fDate(u.created_at)}</TableCell>
                  <TableCell>{u.last_login_at ? fFromNow(u.last_login_at) : '—'}</TableCell>
                  <TableCell align="center">
                    {u.role === 'admin' ? '—' : <Switch color="success" checked={u.is_verified} onChange={(e) => update(u, { is_verified: e.target.checked })} />}
                  </TableCell>
                  <TableCell align="center">
                    {u.role === 'admin' ? '—' : <Switch checked={u.is_active} onChange={(e) => update(u, { is_active: e.target.checked })} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Scrollbar>
      </Card>
      <PagePagination meta={meta} onChange={(page) => setF((s) => ({ ...s, page }))} />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

export function AdminPointsView() {
  return (
    <DashboardContent maxWidth="lg">
      <PageHeader icon="solar:map-point-wave-bold-duotone" title="Validation des points de collecte" subtitle="Un point n’apparaît sur la carte publique qu’après validation" />
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
      <DialogTitle>{item ? 'Modifier' : 'Ajouter'} {isCat ? 'une catégorie' : 'un marché'}</DialogTitle>
      <DialogContent>
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Nom" value={f.name ?? ''} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} />
          <TextField label="Slug (minuscules-et-tirets)" value={f.slug ?? ''} onChange={(e) => setF((s) => ({ ...s, slug: e.target.value }))} />
          <TextField label="Description" multiline rows={2} value={f.description ?? ''} onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))} />
          {isCat && <TextField label="Mots-clés (recherche IA), séparés par des virgules" value={f.keywords ?? ''} onChange={(e) => setF((s) => ({ ...s, keywords: e.target.value }))} />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={save}>Enregistrer</Button>
      </DialogActions>
    </Dialog>
  );
}

export function AdminCatalogView() {
  const [kind, setKind] = useState('categories');
  const { data, reload } = useApi(`/api/${kind}`);
  const [dialog, setDialog] = useState({ open: false, item: null });
  const remove = async (item) => {
    if (!window.confirm(`Supprimer « ${item.name} » ?`)) return;
    await axios.delete(`/api/${kind}/${item.id}`);
    reload();
  };
  return (
    <DashboardContent maxWidth="lg">
      <PageHeader
        icon="solar:widget-5-bold-duotone"
        title="Référentiels"
        subtitle="Catégories de matières et marchés utilisés pour les filtres"
        action={<Button variant="contained" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setDialog({ open: true, item: null })}>Ajouter</Button>}
      />
      <Tabs value={kind} onChange={(_, v) => setKind(v)} sx={{ mb: 3 }}>
        <Tab value="categories" label="Catégories" />
        <Tab value="markets" label="Marchés" />
      </Tabs>
      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>{kind === 'categories' ? 'Mots-clés' : 'Description'}</TableCell>
              <TableCell align="right">Produits</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {(data ?? []).map((item) => (
              <TableRow key={item.id} hover>
                <TableCell><b>{item.name}</b></TableCell>
                <TableCell><code>{item.slug}</code></TableCell>
                <TableCell sx={{ maxWidth: 360 }}>
                  {kind === 'categories' ? (
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>{item.keywords.slice(0, 6).map((k) => <Label key={k}>{k}</Label>)}</Stack>
                  ) : (
                    item.description
                  )}
                </TableCell>
                <TableCell align="right">{item.products_count}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Modifier"><IconButton onClick={() => setDialog({ open: true, item })}><Iconify icon="solar:pen-bold" /></IconButton></Tooltip>
                  <Tooltip title="Supprimer"><IconButton color="error" onClick={() => remove(item)}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <RefDialog open={dialog.open} item={dialog.item} kind={kind} onClose={() => setDialog({ open: false, item: null })} onSaved={reload} />
    </DashboardContent>
  );
}
