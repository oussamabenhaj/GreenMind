import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { fQty, UNITS, fMoney, fDateTime } from 'src/utils/clac';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { OffersView } from '../../seller/offers/view';
import { printDocument } from '../../seller/components/print-button';
import { Empty, PageHeader, ListSkeleton, PagePagination, useReferenceData } from '../../seller/components/ui';

// ----------------------------------------------------------------------

const STATUS = {
  draft: { label: 'Brouillon', color: 'default' },
  published: { label: 'Publiée', color: 'success' },
  closed: { label: 'Clôturée', color: 'info' },
  cancelled: { label: 'Annulée', color: 'error' },
};
const fmt = (d) => (d ? dayjs(d).format('YYYY-MM-DDTHH:mm') : '');

function OfferDialog({ open, onClose, offer, points, onSaved }) {
  const { categories, markets } = useReferenceData();
  const [f, setF] = useState({});
  const [items, setItems] = useState([]);
  const [publish, setPublish] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setPublish(!offer);
    setF({
      title: offer?.title ?? '',
      description: offer?.description ?? '',
      collection_point_id: offer?.collection_point_id ?? points?.[0]?.id ?? '',
      stock_item_id: offer?.stock_item_id ?? '',
      category_id: offer?.category_id ?? '',
      market_id: offer?.market_id ?? '',
      quantity: offer?.quantity ?? '',
      unit: offer?.unit ?? 'kg',
      price_per_unit: offer?.price_per_unit ?? '',
      starts_at: fmt(offer?.starts_at ?? dayjs().add(3, 'day')),
      ends_at: fmt(offer?.ends_at ?? dayjs().add(33, 'day')),
    });
  }, [open, offer, points]);

  useEffect(() => {
    if (!f.collection_point_id) return;
    axios.get(`${endpoints.storage(f.collection_point_id)}/items`).then((res) => setItems(res.data.data)).catch(() => setItems([]));
  }, [f.collection_point_id]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const fromItem = (id) => {
    const it = items.find((x) => x.id === id);
    setF((s) => ({ ...s, stock_item_id: id, ...(it && { title: s.title || `Lot de ${it.label}`, category_id: it.category_id ?? s.category_id, quantity: s.quantity || it.quantity_kg, unit: 'kg' }) }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const nullable = (v) => (v === '' ? null : v);
    const body = {
      title: f.title,
      ...(f.description && { description: f.description }),
      collection_point_id: f.collection_point_id || undefined,
      stock_item_id: nullable(f.stock_item_id),
      ...(f.category_id !== '' && { category_id: f.category_id }),
      market_id: nullable(f.market_id),
      quantity: Number(f.quantity),
      unit: f.unit,
      price_per_unit: f.price_per_unit === '' ? null : Number(f.price_per_unit),
      starts_at: new Date(f.starts_at).toISOString(),
      ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null,
    };
    try {
      if (offer) await axios.patch(endpoints.offers.details(offer.id), body);
      else await axios.post(endpoints.offers.list, { ...body, publish });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={onClose}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Iconify icon="solar:calendar-add-bold-duotone" width={28} sx={{ color: 'primary.main' }} />
        {offer ? 'Modifier l’offre' : 'Préparer une offre'}
      </DialogTitle>
      <DialogContent>
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'grid', gap: 2, pt: 1, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <TextField select label="Point de collecte" value={f.collection_point_id ?? ''} onChange={set('collection_point_id')}>
            {(points ?? []).map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Depuis un article en stock (optionnel)" value={f.stock_item_id ?? ''} onChange={(e) => fromItem(e.target.value)}>
            <MenuItem value="">—</MenuItem>
            {items.map((it) => (
              <MenuItem key={it.id} value={it.id}>{it.label} — {it.quantity_kg} kg</MenuItem>
            ))}
          </TextField>
          <TextField label="Titre" value={f.title ?? ''} onChange={set('title')} sx={{ gridColumn: { md: 'span 2' } }} />
          <TextField label="Description" multiline rows={2} value={f.description ?? ''} onChange={set('description')} sx={{ gridColumn: { md: 'span 2' } }} />
          <TextField select label="Catégorie" value={f.category_id ?? ''} onChange={set('category_id')}>
            <MenuItem value="">—</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Marché" value={f.market_id ?? ''} onChange={set('market_id')}>
            <MenuItem value="">Aucun</MenuItem>
            {markets.map((mk) => (
              <MenuItem key={mk.id} value={mk.id}>{mk.name}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField fullWidth label="Quantité" type="number" value={f.quantity ?? ''} onChange={set('quantity')} />
            <TextField select label="Unité" value={f.unit ?? 'kg'} onChange={set('unit')} sx={{ minWidth: 110 }}>
              {UNITS.map((u) => (
                <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField label="Prix / unité (TND)" type="number" value={f.price_per_unit ?? ''} onChange={set('price_per_unit')} />
          <TextField label="Début" type="datetime-local" value={f.starts_at ?? ''} onChange={set('starts_at')} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Fin" type="datetime-local" value={f.ends_at ?? ''} onChange={set('ends_at')} slotProps={{ inputLabel: { shrink: true } }} />
        </Box>
        {!offer && (
          <FormControlLabel sx={{ mt: 2 }} control={<Switch checked={publish} onChange={(e) => setPublish(e.target.checked)} />} label="Publier immédiatement (sinon enregistrer en brouillon)" />
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Annuler</Button>
        <LoadingButton variant="contained" loading={saving} onClick={save} disabled={!f.title || !f.quantity}>
          {offer ? 'Enregistrer' : publish ? 'Publier l’offre' : 'Enregistrer le brouillon'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function MyOffers() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, offer: null });
  const [toDelete, setToDelete] = useState(null);
  const { data: points } = useApi(`${endpoints.collectionPoints}/mine`, { limit: 50 });
  const { data, meta, loading, reload } = useApi(endpoints.offers.mine, cleanParams({ status, page, limit: 12 }));

  const act = async (o, action) => {
    try {
      await axios.post(`${endpoints.offers.details(o.id)}/${action}`);
      reload();
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Tabs value={status} onChange={(_, v) => { setStatus(v); setPage(1); }}>
          <Tab value="" label="Toutes" />
          {Object.entries(STATUS).map(([v, s]) => (
            <Tab key={v} value={v} label={s.label} />
          ))}
        </Tabs>
        <Button variant="contained" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setForm({ open: true, offer: null })}>
          Préparer une offre
        </Button>
      </Stack>
      {loading && !data ? (
        <ListSkeleton height={200} />
      ) : data?.length ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(3, 1fr)' } }}>
          {data.map((o) => (
            <Card key={o.id} sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Label color={STATUS[o.status].color}>{STATUS[o.status].label}</Label>
                {o.status === 'published' && <Label color="info">{o.timing === 'upcoming' ? 'À venir' : o.timing === 'ended' ? 'Terminée' : 'En cours'}</Label>}
              </Stack>
              <Typography variant="subtitle1">{o.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                {o.collection_point?.name} · {fQty(o.quantity, o.unit)} · {o.price_per_unit != null ? fMoney(o.price_per_unit) : 'Sur devis'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Du {fDateTime(o.starts_at)} au {fDateTime(o.ends_at)}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                {o.status === 'draft' && <Button size="small" variant="contained" onClick={() => act(o, 'publish')}>Publier</Button>}
                {o.status === 'published' && <Button size="small" variant="soft" onClick={() => act(o, 'close')}>Clôturer</Button>}
                {['draft', 'published'].includes(o.status) && <Button size="small" variant="soft" color="error" onClick={() => act(o, 'cancel')}>Annuler</Button>}
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title="Imprimer"><IconButton onClick={() => printDocument('offers', o.id)}><Iconify icon="solar:printer-minimalistic-bold" /></IconButton></Tooltip>
                {['draft', 'published'].includes(o.status) && (
                  <Tooltip title="Modifier"><IconButton onClick={() => setForm({ open: true, offer: o })}><Iconify icon="solar:pen-bold" /></IconButton></Tooltip>
                )}
                <Tooltip title="Supprimer"><IconButton color="error" onClick={() => setToDelete(o)}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton></Tooltip>
              </Stack>
            </Card>
          ))}
        </Box>
      ) : (
        <Empty title="Aucune offre" description="Préparez une offre à partir de votre stock et publiez-la aux acheteurs." icon="solar:calendar-add-bold-duotone" action={<Button variant="contained" onClick={() => setForm({ open: true, offer: null })}>Préparer une offre</Button>} />
      )}
      <PagePagination meta={meta} onChange={setPage} />
      <OfferDialog open={form.open} offer={form.offer} points={points} onClose={() => setForm({ open: false, offer: null })} onSaved={reload} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Supprimer cette offre ?"
        cancelText="Annuler"
        action={<Button variant="contained" color="error" onClick={async () => { await axios.delete(endpoints.offers.details(toDelete.id)); setToDelete(null); reload(); }}>Supprimer</Button>}
      />
    </>
  );
}

/** US-PC02 + US-PC03 — my offers and the offers available on the market. */
export function CollectorOffersView() {
  const [tab, setTab] = useState('mine');
  return (
    <DashboardContent maxWidth="xl">
      <PageHeader icon="solar:calendar-mark-bold-duotone" title="Offres" subtitle="Préparez et publiez vos lots, consultez les offres disponibles" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="mine" label="Mes offres" icon={<Iconify icon="solar:user-bold" />} iconPosition="start" />
        <Tab value="market" label="Offres disponibles" icon={<Iconify icon="solar:shop-2-bold" />} iconPosition="start" />
      </Tabs>
      {tab === 'mine' ? <MyOffers /> : <OffersView embedded />}
    </DashboardContent>
  );
}
