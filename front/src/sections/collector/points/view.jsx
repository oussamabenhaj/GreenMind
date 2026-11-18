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

import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

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

  useSocketEvent('notification:new', (n) => n.type === 'collection_point.verified' && reload());

  const remove = async () => {
    await axios.delete(`${endpoints.collectionPoints}/${toDelete.id}`);
    setToDelete(null);
    reload();
  };

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:map-point-wave-bold-duotone"
        title="Mes points de collecte"
        subtitle="Localisation GPS, horaires, capacité et matières acceptées"
        action={
          <Button variant="contained" size="large" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setForm({ open: true, point: null })}>
            Nouveau point
          </Button>
        }
      />

      {loading && !data ? (
        <ListSkeleton height={260} />
      ) : data?.length ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(3, 1fr)' } }}>
          {data.map((p, i) => {
            const usage = p.storage_capacity_kg > 0 ? (p.storage_used_kg / p.storage_capacity_kg) * 100 : 0;
            return (
              <Card key={p.id} component={m.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} sx={{ overflow: 'hidden' }}>
                <Box sx={{ p: 2.5, color: 'common.white', background: (theme) => `linear-gradient(135deg, ${theme.vars.palette.info.dark}, ${theme.vars.palette.primary.main})`, position: 'relative' }}>
                  <Iconify icon="solar:map-point-wave-bold-duotone" width={90} sx={{ position: 'absolute', right: 8, top: 8, opacity: 0.2 }} />
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Label variant="filled" color={p.is_verified ? 'success' : 'warning'}>{p.is_verified ? 'Validé' : 'En attente de validation'}</Label>
                    <Label variant="filled" color={p.is_open_now ? 'primary' : 'default'}>{p.is_open_now ? 'Ouvert' : 'Fermé'}</Label>
                  </Stack>
                  <Typography variant="h6">{p.name}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>{[p.address, p.gouvernorat].filter(Boolean).join(', ')}</Typography>
                </Box>
                <Stack spacing={2} sx={{ p: 2.5 }}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ typography: 'caption', mb: 0.5 }}>
                      <span>Stockage</span>
                      <b>{fNum(p.storage_used_kg)} / {fNum(p.storage_capacity_kg)} kg</b>
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
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="soft" startIcon={<Iconify icon="solar:box-bold" />} onClick={() => router.push(`${sp.storage}?p=${p.id}`)}>
                      Stock
                    </Button>
                    <Box sx={{ flexGrow: 1 }} />
                    <Tooltip title="Imprimer la fiche">
                      <IconButton onClick={() => printDocument('collection-points', p.id)}><Iconify icon="solar:printer-minimalistic-bold" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Modifier">
                      <IconButton onClick={() => setForm({ open: true, point: p })}><Iconify icon="solar:pen-bold" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton color="error" onClick={() => setToDelete(p)}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Card>
            );
          })}
        </Box>
      ) : (
        <Empty
          title="Aucun point de collecte"
          description="Créez votre premier point : position GPS, horaires et capacité de stockage."
          icon="solar:map-point-add-bold-duotone"
          action={<Button variant="contained" onClick={() => setForm({ open: true, point: null })}>Créer un point</Button>}
        />
      )}

      <PointFormDialog open={form.open} point={form.point} onClose={() => setForm({ open: false, point: null })} onSaved={reload} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Supprimer ce point ?"
        content="Le stock, les horaires et l’historique associés seront supprimés."
        cancelText="Annuler"
        action={<Button variant="contained" color="error" onClick={remove}>Supprimer</Button>}
      />
    </DashboardContent>
  );
}
