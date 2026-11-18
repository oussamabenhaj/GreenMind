import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
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

import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { printDocument } from '../../seller/components/print-button';
import { Empty, KpiCard, PageHeader, StatusLabel, PagePagination } from '../../seller/components/ui';

// ----------------------------------------------------------------------

function useSearch(url, q) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    const t = setTimeout(() => {
      axios.get(url, { params: cleanParams({ q, limit: 10 }) }).then((res) => setOptions(res.data.data)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [url, q]);
  return options;
}

function PurchaseDialog({ open, onClose, points, onSaved, initialProduct }) {
  const [pointId, setPointId] = useState('');
  const [product, setProduct] = useState(null);
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
        Nouvelle opération d’achat
      </DialogTitle>
      <DialogContent>
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField select label="Point de collecte" value={pointId} onChange={(e) => setPointId(e.target.value)}>
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
                    {o.seller?.company_name || o.seller?.name} · {o.gouvernorat} · {fNum(o.quantity_available)} {o.unit} · {fMoney(o.final_price_per_unit)}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => <TextField {...params} label="Produit d’un vendeur (recommandé)" placeholder="Rechercher sur le marché…" />}
          />
          {!product && (
            <>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>— ou saisie libre (vendeur non inscrit, apport en direct) —</Typography>
              <TextField label="Matière" value={f.label} onChange={(e) => setF((s) => ({ ...s, label: e.target.value }))} placeholder="Ex : Cartons mélangés" />
              <Autocomplete
                options={sellers}
                value={seller}
                onChange={(_, v) => setSeller(v)}
                onInputChange={(_, v) => setSq(v)}
                filterOptions={(x) => x}
                getOptionLabel={(o) => o.company_name || o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="Vendeur inscrit (optionnel)" />}
              />
            </>
          )}
          <Stack direction="row" spacing={2}>
            <TextField fullWidth label="Quantité" type="number" value={f.quantity_kg} onChange={(e) => setF((s) => ({ ...s, quantity_kg: e.target.value }))} slotProps={{ input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> } }} />
            <TextField fullWidth label="Prix" type="number" value={f.unit_price} onChange={(e) => setF((s) => ({ ...s, unit_price: e.target.value }))} slotProps={{ input: { endAdornment: <InputAdornment position="end">TND/kg</InputAdornment> } }} />
          </Stack>
          <TextField label="Enlèvement prévu" type="datetime-local" value={f.scheduled_at} onChange={(e) => setF((s) => ({ ...s, scheduled_at: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Notes" multiline rows={2} value={f.notes} onChange={(e) => setF((s) => ({ ...s, notes: e.target.value }))} />
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'primary.lighter', color: 'primary.darker' }}>
            <Typography variant="subtitle2">Montant estimé</Typography>
            <Typography variant="h5">{fMoney(total)}</Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Annuler</Button>
        <LoadingButton variant="contained" loading={saving} onClick={save} disabled={!pointId || !f.quantity_kg || (!product && !f.label)}>
          Créer l’opération
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

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:cart-large-4-bold-duotone"
        title="Opérations d’achat"
        subtitle="Achetez aux vendeurs : la réception alimente automatiquement votre stock"
        action={
          <Button variant="contained" size="large" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setCreate(true)} disabled={!points?.length}>
            Nouvel achat
          </Button>
        }
      />
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, mb: 3 }}>
        <KpiCard title="En attente" value={pu?.pending ?? 0} icon="solar:hourglass-bold-duotone" color="warning" />
        <KpiCard title="Confirmés" value={pu?.confirmed ?? 0} icon="solar:check-circle-bold-duotone" color="info" delay={0.05} />
        <KpiCard title="Réceptionné (12 mois)" value={`${fNum(pu?.received_kg ?? 0)} kg`} icon="solar:box-bold-duotone" delay={0.1} />
        <KpiCard title="Dépensé (12 mois)" value={fMoney(pu?.spent ?? 0)} icon="solar:wallet-money-bold-duotone" color="secondary" delay={0.15} />
      </Box>

      <Card>
        <Tabs value={status} onChange={(_, v) => { setStatus(v); setPage(1); }} sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}>
          <Tab value="" label="Toutes" />
          {Object.entries(PURCHASE_STATUS).map(([value, s]) => (
            <Tab key={value} value={value} label={s.label} />
          ))}
        </Tabs>
        {!loading && !data?.length ? (
          <Box sx={{ p: 3 }}>
            <Empty title="Aucune opération" description="Créez un achat depuis un produit du marché ou en saisie libre." icon="solar:cart-large-minimalistic-bold-duotone" />
          </Box>
        ) : (
          <Scrollbar>
            <Table sx={{ minWidth: 960 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Matière</TableCell>
                  <TableCell>Vendeur</TableCell>
                  <TableCell>Point</TableCell>
                  <TableCell align="right">Quantité</TableCell>
                  <TableCell align="right">Montant</TableCell>
                  <TableCell>Enlèvement</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data ?? []).map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">{row.label}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{row.category_name ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>{row.seller ? row.seller.company_name || row.seller.name : <i>Non inscrit</i>}</TableCell>
                    <TableCell>{row.collection_point.name}</TableCell>
                    <TableCell align="right">{fNum(row.quantity_kg)} kg</TableCell>
                    <TableCell align="right"><b>{fMoney(row.total_amount)}</b></TableCell>
                    <TableCell>{fDateTime(row.received_at ?? row.scheduled_at)}</TableCell>
                    <TableCell><StatusLabel map={PURCHASE_STATUS} value={row.status} /></TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {row.status === 'pending' && (
                          <Button size="small" variant="soft" disabled={busy === row.id} onClick={() => change(row, 'confirmed')}>Confirmer</Button>
                        )}
                        {row.status === 'confirmed' && (
                          <Button size="small" variant="contained" color="success" disabled={busy === row.id} onClick={() => change(row, 'received')} startIcon={<Iconify icon="solar:import-bold" />}>
                            Réceptionner
                          </Button>
                        )}
                        {['pending', 'confirmed'].includes(row.status) && (
                          <Button size="small" variant="soft" color="error" disabled={busy === row.id} onClick={() => change(row, 'cancelled')}>Annuler</Button>
                        )}
                        <Tooltip title="Bon d’achat">
                          <IconButton onClick={() => printDocument('purchases', row.id)}><Iconify icon="solar:printer-minimalistic-bold" /></IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Scrollbar>
        )}
      </Card>
      <PagePagination meta={meta} onChange={setPage} />
      <PurchaseDialog open={create} points={points} initialProduct={initialProduct} onClose={() => { setCreate(false); setInitialProduct(null); }} onSaved={() => { reload(); overview.reload(); }} />
    </DashboardContent>
  );
}
