import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
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
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useApi } from 'src/hooks/use-api';

import { fNum, fDateTime } from 'src/utils/clac';

import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { printDocument } from '../../seller/components/print-button';
import { Ring, Empty, KpiCard, PageHeader, useReferenceData } from '../../seller/components/ui';

// ----------------------------------------------------------------------

const MOVE = {
  in: { label: 'Entrée', color: 'success', icon: 'solar:import-bold' },
  out: { label: 'Sortie', color: 'error', icon: 'solar:export-bold' },
  adjust: { label: 'Inventaire', color: 'info', icon: 'solar:refresh-circle-bold' },
};

function ItemDialog({ open, onClose, pointId, item, onSaved }) {
  const { categories } = useReferenceData();
  const [f, setF] = useState({});
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setF({ label: item?.label ?? '', category_id: item?.category_id ?? '', min_threshold_kg: item?.min_threshold_kg ?? '', initial_quantity_kg: '' });
      setError('');
    }
  }, [open, item]);
  const save = async () => {
    const body = { label: f.label, category_id: f.category_id || null, min_threshold_kg: f.min_threshold_kg === '' ? null : Number(f.min_threshold_kg) };
    try {
      if (item) await axios.patch(`${endpoints.storage(pointId)}/items/${item.id}`, body);
      else await axios.post(`${endpoints.storage(pointId)}/items`, { ...body, ...(Number(f.initial_quantity_kg) > 0 && { initial_quantity_kg: Number(f.initial_quantity_kg) }) });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose}>
      <DialogTitle>{item ? 'Modifier l’article' : 'Nouvel article en stock'}</DialogTitle>
      <DialogContent>
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Libellé" value={f.label ?? ''} onChange={(e) => setF((s) => ({ ...s, label: e.target.value }))} />
          <TextField select label="Catégorie" value={f.category_id ?? ''} onChange={(e) => setF((s) => ({ ...s, category_id: e.target.value }))}>
            <MenuItem value="">—</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
          <TextField label="Seuil d’alerte (kg)" type="number" value={f.min_threshold_kg ?? ''} onChange={(e) => setF((s) => ({ ...s, min_threshold_kg: e.target.value }))} />
          {!item && <TextField label="Quantité initiale (kg)" type="number" value={f.initial_quantity_kg ?? ''} onChange={(e) => setF((s) => ({ ...s, initial_quantity_kg: e.target.value }))} />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={save} disabled={!f.label}>Enregistrer</Button>
      </DialogActions>
    </Dialog>
  );
}

function MovementDialog({ open, onClose, pointId, item, onSaved }) {
  const [type, setType] = useState('in');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setType('in');
      setQty('');
      setReason('');
      setError('');
    }
  }, [open]);
  const save = async () => {
    setSaving(true);
    try {
      await axios.post(`${endpoints.storage(pointId)}/movements`, { stock_item_id: item.id, type, quantity_kg: Number(qty), ...(reason && { reason }) });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose}>
      <DialogTitle>Mouvement de stock — {item?.label}</DialogTitle>
      <DialogContent>
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Stock actuel : <b>{fNum(item?.quantity_kg)} kg</b></Typography>
        <ToggleButtonGroup exclusive fullWidth value={type} onChange={(_, v) => v && setType(v)} sx={{ mb: 2 }}>
          {Object.entries(MOVE).map(([key, mv]) => (
            <ToggleButton key={key} value={key} sx={{ gap: 1 }}>
              <Iconify icon={mv.icon} /> {mv.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Stack spacing={2}>
          <TextField label={type === 'adjust' ? 'Quantité comptée (kg)' : 'Quantité (kg)'} type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          <TextField label="Motif (optionnel)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex : vente au recycleur, inventaire mensuel…" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Annuler</Button>
        <LoadingButton variant="contained" loading={saving} onClick={save} disabled={qty === ''}>Valider</LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

/** US-PC06 — storage capacity, items, movements. */
export function StorageView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: points } = useApi(`${endpoints.collectionPoints}/mine`, { limit: 50 });
  const pointId = searchParams.get('p') ?? points?.[0]?.id;
  const overview = useApi(pointId ? endpoints.storage(pointId) : null);
  const movements = useApi(pointId ? `${endpoints.storage(pointId)}/movements` : null, { limit: 12 });
  const [itemDialog, setItemDialog] = useState({ open: false, item: null });
  const [moveItem, setMoveItem] = useState(null);
  const [capacity, setCapacity] = useState('');

  const refresh = () => {
    overview.reload();
    movements.reload();
  };
  useSocketEvent('stock:updated', (e) => e.collection_point_id === pointId && refresh());
  useEffect(() => setCapacity(overview.data?.storage_capacity_kg ?? ''), [overview.data]);

  const saveCapacity = async () => {
    try {
      await axios.patch(`${endpoints.storage(pointId)}/capacity`, { storage_capacity_kg: Number(capacity) });
      refresh();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const o = overview.data;
  if (points && !points.length) {
    return (
      <DashboardContent>
        <Empty title="Aucun point de collecte" description="Créez d’abord un point de collecte pour gérer son stock." icon="solar:box-minimalistic-bold-duotone" />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:box-bold-duotone"
        title="Espace de stockage"
        subtitle="Suivez la capacité et la disponibilité de vos stocks en temps réel"
        action={
          <Stack direction="row" spacing={1.5}>
            <TextField select size="small" label="Point de collecte" value={pointId ?? ''} onChange={(e) => router.push(`?p=${e.target.value}`)} sx={{ minWidth: 260 }}>
              {(points ?? []).map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" color="inherit" disabled={!pointId} onClick={() => printDocument('storage', pointId)} startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}>
              Imprimer
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, height: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ alignSelf: 'flex-start', mb: 2 }}>Taux d’occupation</Typography>
            <Ring value={o?.usage_percent ?? 0} size={170} label="occupé" />
            <Stack direction="row" spacing={1} sx={{ mt: 3, width: 1 }}>
              <TextField size="small" fullWidth type="number" label="Capacité (kg)" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              <Button variant="soft" onClick={saveCapacity}>OK</Button>
            </Stack>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, height: 1 }}>
            <KpiCard title="Stock total" value={`${fNum(o?.used_kg ?? 0)} kg`} icon="solar:box-bold-duotone" />
            <KpiCard title="Place disponible" value={`${fNum(o?.available_kg ?? 0)} kg`} icon="solar:inbox-archive-bold-duotone" color="info" delay={0.05} />
            <KpiCard title="Articles" value={o?.items_count ?? 0} icon="solar:list-bold-duotone" color="secondary" delay={0.1} />
            <KpiCard title="Stocks bas" value={o?.low_stock_count ?? 0} icon="solar:danger-triangle-bold-duotone" color="warning" delay={0.15} caption="Sous le seuil d’alerte" />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader
              title="Articles en stock"
              action={<Button size="small" variant="contained" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setItemDialog({ open: true, item: null })}>Article</Button>}
            />
            <Scrollbar>
              <Table sx={{ minWidth: 560 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Article</TableCell>
                    <TableCell align="right">Quantité</TableCell>
                    <TableCell align="right">Seuil</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(o?.items ?? []).map((it) => (
                    <TableRow key={it.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{it.label}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{it.category_name ?? '—'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <b>{fNum(it.quantity_kg)} kg</b>
                        {it.is_low_stock && <Label color="warning" sx={{ ml: 1 }}>Stock bas</Label>}
                      </TableCell>
                      <TableCell align="right">{it.min_threshold_kg != null ? `${fNum(it.min_threshold_kg)} kg` : '—'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Mouvement">
                          <IconButton color="primary" onClick={() => setMoveItem(it)}><Iconify icon="solar:transfer-vertical-bold" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Modifier">
                          <IconButton onClick={() => setItemDialog({ open: true, item: it })}><Iconify icon="solar:pen-bold" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer (stock à 0)">
                          <span>
                            <IconButton color="error" disabled={it.quantity_kg > 0} onClick={async () => { await axios.delete(`${endpoints.storage(pointId)}/items/${it.id}`); refresh(); }}>
                              <Iconify icon="solar:trash-bin-trash-bold" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Scrollbar>
            {o?.items?.length === 0 && <Typography variant="body2" sx={{ p: 3, color: 'text.secondary' }}>Aucun article. Ajoutez-en un, ou réceptionnez un achat.</Typography>}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="Derniers mouvements" />
            <Stack spacing={1.5} sx={{ p: 2.5 }}>
              {(movements.data ?? []).map((mv) => (
                <Stack key={mv.id} direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 36, height: 36, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${MOVE[mv.type].color}.lighter`, color: `${MOVE[mv.type].color}.dark` }}>
                    <Iconify icon={MOVE[mv.type].icon} width={20} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{mv.item_label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>{mv.reason ?? MOVE[mv.type].label} · {fDateTime(mv.created_at)}</Typography>
                  </Box>
                  <Typography variant="subtitle2" sx={{ color: mv.quantity_kg >= 0 ? 'success.main' : 'error.main' }}>
                    {mv.quantity_kg >= 0 ? '+' : ''}{fNum(mv.quantity_kg)} kg
                  </Typography>
                </Stack>
              ))}
              {movements.data?.length === 0 && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Aucun mouvement.</Typography>}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <ItemDialog open={itemDialog.open} item={itemDialog.item} pointId={pointId} onClose={() => setItemDialog({ open: false, item: null })} onSaved={refresh} />
      <MovementDialog open={!!moveItem} item={moveItem} pointId={pointId} onClose={() => setMoveItem(null)} onSaved={refresh} />
    </DashboardContent>
  );
}
