import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { initials, GOVERNORATES } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CellMain, DataTable } from 'src/components/clac/data-table';
import { CountTabs, useTabCounts } from 'src/components/clac/count-tabs';
import { useViewMode, ViewModeToggle } from 'src/components/clac/view-mode';

import { useAuthContext } from 'src/auth/hooks';

import { openConversation } from '../components/contact';
import { Empty, PageHeader, ListSkeleton, PagePagination, useReferenceData } from '../components/ui';
// ----------------------------------------------------------------------

const DIRECTORIES = {
  buyers: {
    url: endpoints.users.buyers,
    title: 'Acheteurs',
    subtitle: 'Découvrez vos clients potentiels et entrez en contact',
    icon: 'solar:users-group-rounded-bold-duotone',
    color: 'info',
    filterLabel: 'Matière recherchée',
    stat: (u) => <><b>{u.open_requests_count}</b> {t('demande(s) ouverte(s)')}</>,
  },
  sellers: {
    url: endpoints.users.sellers,
    title: 'Vendeurs',
    subtitle: 'Les fournisseurs de matières disponibles partout en Tunisie',
    icon: 'solar:shop-2-bold-duotone',
    color: 'primary',
    filterLabel: 'Matière proposée',
    stat: (u) => (
      <>
        <b>{u.products_count}</b> {t('produit(s)')}{u.has_active_discount ? t(' · 🏷️ promo en cours') : ''}
      </>
    ),
  },
};

export const BuyersView = () => <DirectoryView kind="buyers" />;
export const SellersView = () => <DirectoryView kind="sellers" />;

export function DirectoryView({ kind }) {
  const cfg = DIRECTORIES[kind];
  const router = useRouter();
  const { user } = useAuthContext();
  const { categories } = useReferenceData();
  const [filters, setFilters] = useState({ q: '', gouvernorat: '', category_id: '', near: false, verified: '', page: 1 });

  const near = filters.near && user?.lat != null ? { lat: user.lat, lng: user.lng, radius_km: 150, sort: 'distance' } : {};
  const { data, meta, loading } = useApi(
    cfg.url,
    cleanParams({ q: filters.q, gouvernorat: filters.gouvernorat, category_id: filters.category_id, verified: filters.verified, page: filters.page, limit: 12, ...near })
  );
  const [view, setView] = useViewMode(`directory-${kind}`);
  const counts = useTabCounts(
    cfg.url,
    [{ value: '', params: {} }, { value: 'true', params: { verified: true } }, { value: 'false', params: { verified: false } }],
    cleanParams({ q: filters.q, gouvernorat: filters.gouvernorat, category_id: filters.category_id, ...near })
  );
  const contact = async (u) => router.push(await openConversation(u.id));

  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));
  const catName = (id) => categories.find((c) => c.id === id)?.name;

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader icon={cfg.icon} title={cfg.title} subtitle={cfg.subtitle} />

      <Card sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}>
          <CountTabs
            value={filters.verified}
            onChange={(v) => set({ verified: v })}
            counts={counts}
            sx={{ flex: 1 }}
            tabs={[
              { value: '', label: t('Tous'), color: 'default' },
              { value: 'true', label: t('Vérifiés'), icon: 'solar:verified-check-bold', color: 'info' },
              { value: 'false', label: t('Non vérifiés'), color: 'warning' },
            ]}
          />
          <ViewModeToggle value={view} onChange={setView} />
        </Stack>
        <Stack sx={{ p: 2.5 }} direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            fullWidth
            placeholder={t('Nom, entreprise…')}
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }}
          />
          <TextField select label={t(cfg.filterLabel)} value={filters.category_id} onChange={(e) => set({ category_id: e.target.value })} sx={{ minWidth: 220 }}>
            <MenuItem value="">{t('Toutes')}</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label={t('Gouvernorat')} value={filters.gouvernorat} onChange={(e) => set({ gouvernorat: e.target.value })} sx={{ minWidth: 180 }}>
            <MenuItem value="">{t('Tous')}</MenuItem>
            {GOVERNORATES.map((g) => (
              <MenuItem key={g} value={g}>
                {t(g)}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant={filters.near ? 'contained' : 'outlined'}
            onClick={() => set({ near: !filters.near })}
            disabled={user?.lat == null}
            startIcon={<Iconify icon="solar:map-arrow-square-bold-duotone" />}
            sx={{ flexShrink: 0, height: 54 }}
          >
            {t('Près de moi')}
          </Button>
        </Stack>
      </Card>

      {loading && !data ? (
        <ListSkeleton height={240} />
      ) : data?.length && view === 'table' ? (
        <DataTable
          rows={data}
          columns={[
            { label: kind === 'buyers' ? t('Acheteur') : t('Vendeur'), render: (u) => <CellMain avatar={initials(u.company_name || u.name)} color={cfg.color} title={<>{u.company_name || u.name}{u.is_verified && <Iconify icon="solar:verified-check-bold" width={16} sx={{ color: 'info.main', ml: 0.5, verticalAlign: '-3px' }} />}</>} subtitle={u.name} /> },
            { label: t('Gouvernorat'), render: (u) => <>{t(u.gouvernorat) ?? '—'}{u.distance_km != null && <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>· {u.distance_km} {t('km')}</Typography>}</> },
            { label: t('Matières'), render: (u) => <Stack direction="row" flexWrap="wrap" gap={0.5}>{(u.category_ids ?? []).slice(0, 3).map((id) => <Label key={id} color="primary">{catName(id) ?? `#${id}`}</Label>)}</Stack> },
            { label: t('Activité'), render: (u) => cfg.stat(u) },
            { label: t('Téléphone'), nowrap: true, render: (u) => u.phone ?? '—' },
            { label: '', align: 'right', stopPropagation: true, render: (u) => <Button size="small" variant="soft" startIcon={<Iconify icon="solar:chat-round-dots-bold" />} onClick={() => contact(u)}>{t('Contacter')}</Button> },
          ]}
        />
      ) : data?.length ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' } }}>
          {data.map((b, i) => (
            <Card
              key={b.id}
              component={m.div}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              sx={{ textAlign: 'center', overflow: 'hidden' }}
            >
              <Box sx={{ height: 72, background: (theme) => `linear-gradient(120deg, ${theme.vars.palette.info.light}, ${theme.vars.palette.primary.light})` }} />
              <Avatar src={b.avatar_url ?? undefined} sx={{ width: 72, height: 72, mx: 'auto', mt: -4.5, border: '4px solid', borderColor: 'background.paper', bgcolor: `${cfg.color}.main`, fontSize: 24 }}>
                {initials(b.company_name || b.name)}
              </Avatar>
              <Box sx={{ p: 2.5, pt: 1.5 }}>
                <Typography variant="subtitle1" noWrap>
                  {b.company_name || b.name}
                  {b.is_verified && <Iconify icon="solar:verified-check-bold" width={18} sx={{ color: 'info.main', ml: 0.5, verticalAlign: 'middle' }} />}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  <Iconify icon="solar:map-point-bold" width={14} sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                  {t(b.gouvernorat) ?? '—'}
                  {b.distance_km != null && ` · ${b.distance_km} km`}
                </Typography>
                <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={0.5} sx={{ my: 2, minHeight: 24 }}>
                  {(b.category_ids ?? []).slice(0, 3).map((id) => (
                    <Label key={id} color="primary">
                      {catName(id) ?? `#${id}`}
                    </Label>
                  ))}
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                  {cfg.stat(b)}
                </Typography>
                <Button
                  fullWidth
                  variant="soft"
                  color="primary"
                  startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
                  onClick={async () => router.push(await openConversation(b.id))}
                >
                  {t('Contacter')}
                </Button>
              </Box>
            </Card>
          ))}
        </Box>
      ) : (
        <Empty title={t('Aucun résultat')} description={t('Élargissez vos filtres.')} icon={cfg.icon} />
      )}

      <PagePagination meta={meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </DashboardContent>
  );
}
