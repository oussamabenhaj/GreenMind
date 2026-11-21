import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { useRouter } from 'src/routes/hooks';

import { useApi } from 'src/hooks/use-api';
import { useSpace } from 'src/hooks/use-space';

import { fNum } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CountTabs } from 'src/components/clac/count-tabs';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { CellMain, DataTable } from 'src/components/clac/data-table';
import { useViewMode, ViewModeToggle } from 'src/components/clac/view-mode';

import { PointFormDialog } from './point-form-dialog';
import { printDocument } from '../../seller/components/print-button';
import { Empty, PageHeader, ListSkeleton, useReferenceData } from '../../seller/components/ui';
// ----------------------------------------------------------------------

export function PointsView() {
  const router = useRouter();
  const sp = useSpace();
  const { categories } = useReferenceData();
  const { data, loading, reload } = useApi(`${endpoints.collectionPoints}/mine`, { limit: 50 });
  const [form, setForm] = useState({ open: false, point: null });
  const [toDelete, setToDelete] = useState(null);
  const [view, setView] = useViewMode('collector-points');
  const [tab, setTab] = useState('all');

  useSocketEvent('notification:new', (n) => n.type === 'collection_point.verified' && reload());

  const all = data ?? [];
  const counts = data ? { all: all.length, verified: all.filter((p) => p.is_verified).length, pending: all.filter((p) => !p.is_verified).length } : {};
  const rows = tab === 'verified' ? all.filter((p) => p.is_verified) : tab === 'pending' ? all.filter((p) => !p.is_verified) : all;
  const usageOf = (p) => (p.storage_capacity_kg > 0 ? (p.storage_used_kg / p.storage_capacity_kg) * 100 : 0);
  const renderActions = (p) => (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button size="small" variant="soft" startIcon={<Iconify icon="solar:box-bold" />} onClick={() => router.push(`${sp.storage}?p=${p.id}`)}>
        {t('Stock')}
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <Tooltip title={t('Imprimer la fiche')}>
        <IconButton onClick={() => printDocument('collection-points', p.id)}><Iconify icon="solar:printer-minimalistic-bold" /></IconButton>
      </Tooltip>
      <Tooltip title={t('Modifier')}>
        <IconButton onClick={() => setForm({ open: true, point: p })}><Iconify icon="solar:pen-bold" /></IconButton>
      </Tooltip>
      <Tooltip title={t('Supprimer')}>
        <IconButton color="error" onClick={() => setToDelete(p)}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton>
      </Tooltip>
    </Stack>
  );

  const remove = async () => {
    await axios.delete(`${endpoints.collectionPoints}/${toDelete.id}`);
    setToDelete(null);
    reload();
  };

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:map-point-wave-bold-duotone"
        title={t('Mes points de collecte')}
        subtitle={t('Localisation GPS, horaires, capacité et matières acceptées')}
        action={
          <Button variant="contained" size="large" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setForm({ open: true, point: null })}>
            {t('Nouveau point')}
          </Button>
        }
      />

      <Card sx={{ mb: 3, px: 2.5, display: 'flex', alignItems: 'center' }}>
        <CountTabs
          value={tab}
          onChange={setTab}
          counts={counts}
          sx={{ flex: 1 }}
          tabs={[
            { value: 'all', label: t('Tous'), color: 'default' },
            { value: 'verified', label: t('Validés'), color: 'success' },
            { value: 'pending', label: t('En attente'), color: 'warning' },
          ]}
        />
        <ViewModeToggle value={view} onChange={setView} />
      </Card>

      {loading && !data ? (
        <ListSkeleton height={260} />
      ) : rows.length && view === 'table' ? (
        <DataTable
          rows={rows}
          minWidth={980}
          columns={[
            { label: t('Point'), render: (p) => <CellMain icon={<Iconify icon="solar:map-point-wave-bold-duotone" />} color="info" title={p.name} subtitle={[p.address, t(p.gouvernorat)].filter(Boolean).join(', ')} /> },
            {
              label: t('État'),
              render: (p) => (
                <Stack direction="row" spacing={0.5}>
                  <Label color={p.is_verified ? 'success' : 'warning'}>{p.is_verified ? t('Validé') : t('En attente')}</Label>
                  <Label color={p.is_open_now ? 'primary' : 'default'}>{p.is_open_now ? t('Ouvert') : t('Fermé')}</Label>
                </Stack>
              ),
            },
            {
              label: t('Stockage'),
              width: 200,
              render: (p) => (
                <Box>
                  <Typography variant="caption">{fNum(p.storage_used_kg)} / {fNum(p.storage_capacity_kg)} {t('kg')}</Typography>
                  <LinearProgress variant="determinate" value={Math.min(usageOf(p), 100)} color={usageOf(p) > 90 ? 'error' : usageOf(p) > 70 ? 'warning' : 'primary'} sx={{ height: 6, borderRadius: 3 }} />
                </Box>
              ),
            },
            { label: t('Matières'), render: (p) => t('{{length}} catégorie(s)', { length: p.category_ids.length }) },
            { label: t('Actions'), align: 'right', render: renderActions },
          ]}
        />
      ) : rows.length ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(3, 1fr)' } }}>
          {rows.map((p, i) => {
            const usage = usageOf(p);
            return (
              <Card key={p.id} component={m.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} sx={{ overflow: 'hidden' }}>
                <Box sx={{ p: 2.5, color: 'common.white', background: (theme) => `linear-gradient(135deg, ${theme.vars.palette.info.dark}, ${theme.vars.palette.primary.main})`, position: 'relative' }}>
                  <Iconify icon="solar:map-point-wave-bold-duotone" width={90} sx={{ position: 'absolute', right: 8, top: 8, opacity: 0.2 }} />
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Label variant="filled" color={p.is_verified ? 'success' : 'warning'}>{p.is_verified ? t('Validé') : t('En attente de validation')}</Label>
                    <Label variant="filled" color={p.is_open_now ? 'primary' : 'default'}>{p.is_open_now ? t('Ouvert') : t('Fermé')}</Label>
                  </Stack>
                  <Typography variant="h6">{p.name}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>{[p.address, t(p.gouvernorat)].filter(Boolean).join(', ')}</Typography>
                </Box>
                <Stack spacing={2} sx={{ p: 2.5 }}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ typography: 'caption', mb: 0.5 }}>
                      <span>{t('Stockage')}</span>
                      <b>{fNum(p.storage_used_kg)} / {fNum(p.storage_capacity_kg)} {t('kg')}</b>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.min(usage, 100)} color={usage > 90 ? 'error' : usage > 70 ? 'warning' : 'primary'} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {p.category_ids.map((id) => (
                      <Label key={id} color="primary">{categories.find((c) => c.id === id)?.name ?? `#${id}`}</Label>
                    ))}
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    <Iconify icon="solar:gps-bold" width={14} sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                    {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                  </Typography>
                  {renderActions(p)}
                </Stack>
              </Card>
            );
          })}
        </Box>
      ) : (
        <Empty
          title={t('Aucun point de collecte')}
          description={t('Créez votre premier point : position GPS, horaires et capacité de stockage.')}
          icon="solar:map-point-add-bold-duotone"
          action={<Button variant="contained" onClick={() => setForm({ open: true, point: null })}>{t('Créer un point')}</Button>}
        />
      )}

      <PointFormDialog open={form.open} point={form.point} onClose={() => setForm({ open: false, point: null })} onSaved={reload} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t('Supprimer ce point ?')}
        content={t('Le stock, les horaires et l’historique associés seront supprimés.')}
        cancelText={t('Annuler')}
        action={<Button variant="contained" color="error" onClick={remove}>{t('Supprimer')}</Button>}
      />
    </DashboardContent>
  );
}
