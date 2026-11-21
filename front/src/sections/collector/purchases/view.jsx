import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { useSearchParams } from 'src/routes/hooks';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { fNum, fMoney, fDateTime, PURCHASE_STATUS } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CellMain, DataTable } from 'src/components/clac/data-table';
import { CountTabs, useTabCounts } from 'src/components/clac/count-tabs';
import { useViewMode, ViewModeToggle } from 'src/components/clac/view-mode';

import { PurchaseCard } from '../../seller/components/purchase-card';
import { printDocument } from '../../seller/components/print-button';
import { Empty, KpiCard, TierHint, PageHeader, StatusLabel, ListSkeleton, PagePagination } from '../../seller/components/ui';
// ----------------------------------------------------------------------

function useSearch(url, q) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    const tt = setTimeout(() => {
      axios.get(url, { params: cleanParams({ q, limit: 10 }) }).then((res) => setOptions(res.data.data)).catch(() => {});
    }, 250);
    return () => clearTimeout(tt);
  }, [url, q]);
  return options;
}

/** Deepest active discount percentage applicable at this ordered quantity (kg). */
function discountAt(product, quantityKg) {
  const qty = product?.unit === 't' ? Number(quantityKg) / 1000 : Number(quantityKg);
  return (product?.active_discounts ?? []).reduce(
    (max, d) => (d.min_quantity == null || Number(d.min_quantity) <= qty ? Math.max(max, Number(d.percentage)) : max),
    0
  );
}

/** Listing price for this ordered quantity (kg), discount tiers included. */
function priceAt(product, quantityKg) {
  if (product?.price_per_unit == null) return null;
  return Number((Number(product.price_per_unit) * (1 - discountAt(product, quantityKg) / 100)).toFixed(3));
}

function PurchaseDialog({ open, onClose, points, onSaved, initialProduct }) {
  const [pointId, setPointId] = useState('');
  const [product, setProduct] = useState(null);
  const [pricing, setPricing] = useState(null);
  const appliedTier = useRef(null);
  const [seller, setSeller] = useState(null);
  const [q, setQ] = useState('');
  const [sq, setSq] = useState('');
  const [f, setF] = useState({ label: '', quantity_kg: '', unit_price: '', scheduled_at: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const products = useSearch(endpoints.products.list, q);
  const sellers = useSearch(endpoints.users.sellers, sq);

  useEffect(() => {
    if (open) {
      setPointId(points?.[0]?.id ?? '');
      setProduct(null);
      setSeller(null);
      setF({ label: '', quantity_kg: '', unit_price: '', scheduled_at: '', notes: '' });
      setError('');
      if (initialProduct) {
        setProduct(initialProduct);
        setF((st) => ({
          ...st,
          label: initialProduct.title,
          unit_price: initialProduct.final_price_per_unit ?? initialProduct.price_per_unit ?? '',
          quantity_kg: initialProduct.min_order_quantity ?? '',
        }));
      }
    }
  }, [open, points, initialProduct]);

  // A product row lists its prices but not its tiers: load the full listing so
  // a quantity can be priced against the discount it actually reaches.
  useEffect(() => {
    appliedTier.current = null;
    if (!product?.id) {
      setPricing(null);
      return undefined;
    }
    let alive = true;
    axios
      .get(endpoints.products.details(product.id))
      .then((res) => alive && setPricing(res.data.data))
      .catch(() => alive && setPricing(product));
    return () => {
      alive = false;
    };
  }, [product]);

  // The unit price follows the ordered quantity's discount tier, and only
  // changes when that tier does — a typed-in price survives smaller edits.
  useEffect(() => {
    if (!pricing || !f.quantity_kg) return;
    const tier = discountAt(pricing, f.quantity_kg);
    if (tier === appliedTier.current) return;
    appliedTier.current = tier;
    const price = priceAt(pricing, f.quantity_kg);
    if (price != null) setF((s) => ({ ...s, unit_price: price }));
  }, [pricing, f.quantity_kg]);

  const pick = (p) => {
    setProduct(p);
    if (p) setF((s) => ({ ...s, label: p.title, unit_price: p.final_price_per_unit ?? p.price_per_unit ?? '', quantity_kg: p.min_order_quantity ?? s.quantity_kg }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await axios.post(endpoints.purchases.list, {
        collection_point_id: pointId,
        ...(product ? { product_id: product.id } : { label: f.label, ...(seller && { seller_id: seller.id }) }),
        quantity_kg: Number(f.quantity_kg),
        ...(f.unit_price !== '' && { unit_price: Number(f.unit_price) }),
        ...(f.scheduled_at && { scheduled_at: new Date(f.scheduled_at).toISOString() }),
        ...(f.notes && { notes: f.notes }),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const total = (Number(f.quantity_kg) || 0) * (Number(f.unit_price) || 0);

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Iconify icon="solar:cart-plus-bold-duotone" width={28} sx={{ color: 'primary.main' }} />
        {t('Nouvelle opération d’achat')}
      </DialogTitle>
      <DialogContent>
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField select label={t('Point de collecte')} value={pointId} onChange={(e) => setPointId(e.target.value)}>
            {(points ?? []).map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </TextField>
          <Autocomplete
            options={product && !products.some((x) => x.id === product.id) ? [product, ...products] : products}
            value={product}
            onChange={(_, v) => pick(v)}
            onInputChange={(_, v) => setQ(v)}
            filterOptions={(x) => x}
            getOptionLabel={(o) => o.title}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderOption={(props, o) => (
              <li {...props} key={o.id}>
                <Box>
                  <Typography variant="subtitle2">{o.title}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {o.seller?.company_name || o.seller?.name} · {t(o.gouvernorat)} · {fNum(o.quantity_available)} {o.unit} · {fMoney(o.final_price_per_unit)}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => <TextField {...params} label={t('Produit d’un vendeur (recommandé)')} placeholder={t('Rechercher sur le marché…')} />}
          />
          {!product && (
            <>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('— ou saisie libre (vendeur non inscrit, apport en direct) —')}</Typography>
              <TextField label={t('Matière')} value={f.label} onChange={(e) => setF((s) => ({ ...s, label: e.target.value }))} placeholder={t('Ex : Cartons mélangés')} />
              <Autocomplete
                options={sellers}
                value={seller}
                onChange={(_, v) => setSeller(v)}
                onInputChange={(_, v) => setSq(v)}
                filterOptions={(x) => x}
                getOptionLabel={(o) => o.company_name || o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label={t('Vendeur inscrit (optionnel)')} />}
              />
            </>
          )}
          <Stack direction="row" spacing={2}>
            <TextField fullWidth label={t('Quantité')} type="number" value={f.quantity_kg} onChange={(e) => setF((s) => ({ ...s, quantity_kg: e.target.value }))} slotProps={{ input: { endAdornment: <InputAdornment position="end">{t('kg')}</InputAdornment> } }} />
            <TextField fullWidth label={t('Prix')} type="number" value={f.unit_price} onChange={(e) => setF((s) => ({ ...s, unit_price: e.target.value }))} slotProps={{ input: { endAdornment: <InputAdornment position="end">{t('TND/kg')}</InputAdornment> } }} />
          </Stack>
          <TierHint product={pricing} quantity={f.quantity_kg} unit="kg" displayUnit="kg" />
          <TextField label={t('Enlèvement prévu')} type="datetime-local" value={f.scheduled_at} onChange={(e) => setF((s) => ({ ...s, scheduled_at: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label={t('Notes')} multiline rows={2} value={f.notes} onChange={(e) => setF((s) => ({ ...s, notes: e.target.value }))} />
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'primary.lighter', color: 'primary.darker' }}>
            <Typography variant="subtitle2">{t('Montant estimé')}</Typography>
            <Typography variant="h5">{fMoney(total)}</Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>{t('Annuler')}</Button>
        <LoadingButton variant="contained" loading={saving} onClick={save} disabled={!pointId || !f.quantity_kg || (!product && !f.label)}>
          {t('Créer l’opération')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

/** US-PC01 — purchase operations of the collection points. */
export function CollectorPurchasesView() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const [create, setCreate] = useState(false);
  const [initialProduct, setInitialProduct] = useState(null);
  const searchParams = useSearchParams();
  const fromMarket = searchParams.get('product');
  useEffect(() => {
    if (!fromMarket) return;
    axios.get(endpoints.products.details(fromMarket)).then((res) => {
      setInitialProduct(res.data.data);
      setCreate(true);
    });
  }, [fromMarket]);
  const { data: points } = useApi(`${endpoints.collectionPoints}/mine`, { limit: 50 });
  const { data, meta, loading, reload } = useApi(endpoints.purchases.list, cleanParams({ status, page, limit: 15 }));
  const overview = useApi(endpoints.reports.overview);
  const [view, setView] = useViewMode('collector-purchases', 'table');
  const counts = useTabCounts(
    endpoints.purchases.list,
    [{ value: '', params: {} }, ...Object.keys(PURCHASE_STATUS).map((v) => ({ value: v, params: { status: v } }))],
    {},
    `${overview.data?.purchases?.pending}-${overview.data?.purchases?.confirmed}-${meta?.total}`
  );
  useSocketEvent('purchase:updated', () => { reload(); overview.reload(); });

  const change = async (row, next) => {
    setBusy(row.id);
    try {
      await axios.patch(endpoints.purchases.status(row.id), { status: next });
      await Promise.all([reload(), overview.reload()]);
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBusy(null);
    }
  };

  const pu = overview.data?.purchases;

  const renderActions = (row) => (
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        {row.status === 'pending' && (
          <Button size="small" variant="soft" disabled={busy === row.id} onClick={() => change(row, 'confirmed')}>{t('Confirmer')}</Button>
        )}
        {row.status === 'confirmed' && (
          <Button size="small" variant="contained" color="success" disabled={busy === row.id} onClick={() => change(row, 'received')} startIcon={<Iconify icon="solar:import-bold" />}>
            {t('Réceptionner')}
          </Button>
        )}
        {['pending', 'confirmed'].includes(row.status) && (
          <Button size="small" variant="soft" color="error" disabled={busy === row.id} onClick={() => change(row, 'cancelled')}>{t('Annuler')}</Button>
        )}
        <Tooltip title={t('Bon d’achat')}>
          <IconButton onClick={() => printDocument('purchases', row.id)}><Iconify icon="solar:printer-minimalistic-bold" /></IconButton>
        </Tooltip>
      </Stack>
  );

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:cart-large-4-bold-duotone"
        title={t('Opérations d’achat')}
        subtitle={t('Achetez aux vendeurs : la réception alimente automatiquement votre stock')}
        action={
          <Button variant="contained" size="large" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setCreate(true)} disabled={!points?.length}>
            {t('Nouvel achat')}
          </Button>
        }
      />
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, mb: 3 }}>
        <KpiCard title={t('En attente')} value={pu?.pending ?? 0} icon="solar:hourglass-bold-duotone" color="warning" />
        <KpiCard title={t('Confirmés')} value={pu?.confirmed ?? 0} icon="solar:check-circle-bold-duotone" color="info" delay={0.05} />
        <KpiCard title={t('Réceptionné (12 mois)')} value={`${fNum(pu?.received_kg ?? 0)} ${t('kg')}`} icon="solar:box-bold-duotone" delay={0.1} />
        <KpiCard title={t('Dépensé (12 mois)')} value={fMoney(pu?.spent ?? 0)} icon="solar:wallet-money-bold-duotone" color="secondary" delay={0.15} />
      </Box>

      <Card sx={{ mb: 3, px: 2.5, display: 'flex', alignItems: 'center' }}>
        <CountTabs
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          counts={counts}
          sx={{ flex: 1 }}
          tabs={[{ value: '', label: t('Toutes'), color: 'default' }, ...Object.entries(PURCHASE_STATUS).map(([value, st]) => ({ value, label: st.label, color: st.color }))]}
        />
        <ViewModeToggle value={view} onChange={setView} />
      </Card>
      {loading && !data ? (
        <ListSkeleton height={260} />
      ) : !data?.length ? (
        <Empty title={t('Aucune opération')} description={t('Créez un achat depuis un produit du marché ou en saisie libre.')} icon="solar:cart-large-minimalistic-bold-duotone" />
      ) : view === 'table' ? (
        <DataTable
          rows={data}
          minWidth={960}
          columns={[
            { label: t('Matière'), render: (row) => <CellMain icon={<Iconify icon="solar:cart-large-4-bold-duotone" />} title={row.label} subtitle={row.category_name ?? '—'} /> },
            { label: t('Vendeur'), render: (row) => (row.seller ? row.seller.company_name || row.seller.name : <i>{t('Non inscrit')}</i>) },
            { label: t('Point'), render: (row) => row.collection_point.name },
            { label: t('Quantité'), align: 'right', nowrap: true, render: (row) => `${fNum(row.quantity_kg)} ${t('kg')}` },
            { label: t('Montant'), align: 'right', nowrap: true, render: (row) => <b>{fMoney(row.total_amount)}</b> },
            { label: t('Enlèvement'), nowrap: true, render: (row) => fDateTime(row.received_at ?? row.scheduled_at) },
            { label: t('Statut'), render: (row) => <StatusLabel map={PURCHASE_STATUS} value={row.status} /> },
            { label: t('Actions'), align: 'right', render: renderActions },
          ]}
        />
      ) : (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(3, 1fr)' } }}>
          {data.map((row, i) => (
            <PurchaseCard key={row.id} row={row} party="collector" delay={Math.min(i, 10) * 0.03} actions={renderActions(row)} />
          ))}
        </Box>
      )}
      <PagePagination meta={meta} onChange={setPage} />
      <PurchaseDialog open={create} points={points} initialProduct={initialProduct} onClose={() => { setCreate(false); setInitialProduct(null); }} onSaved={() => { reload(); overview.reload(); }} />
    </DashboardContent>
  );
}
