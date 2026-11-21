import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { fNum, fQty, fDate, fMoney } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { CellMain, DataTable } from 'src/components/clac/data-table';
import { CountTabs, useTabCounts } from 'src/components/clac/count-tabs';
import { useViewMode, ViewModeToggle } from 'src/components/clac/view-mode';

import { ProductCard } from '../components/product-card';
import { ProductFormDialog } from '../components/product-form-dialog';
import { Empty, PageHeader, ListSkeleton, PagePagination, useReferenceData } from '../components/ui';
// ----------------------------------------------------------------------

export function ProductsView() {
  const { categories } = useReferenceData();
  const [filters, setFilters] = useState({ q: '', category_id: '', is_active: '', sort: 'recent', page: 1 });
  const [form, setForm] = useState({ open: false, product: null });
  const [toDelete, setToDelete] = useState(null);

  const router = useRouter();
  const [view, setView] = useViewMode('seller-products');
  const [version, setVersion] = useState(0);
  const { data, meta, loading, reload: reloadList } = useApi(endpoints.products.mine, cleanParams({ ...filters, limit: 12 }));
  const reload = () => {
    reloadList();
    setVersion((v) => v + 1);
  };
  const counts = useTabCounts(
    endpoints.products.mine,
    [{ value: '', params: {} }, { value: 'true', params: { is_active: true } }, { value: 'false', params: { is_active: false } }],
    cleanParams({ q: filters.q, category_id: filters.category_id }),
    version
  );
  const toggleVisible = async (p) => {
    await axios.patch(endpoints.products.details(p.id), { is_active: !p.is_active });
    reload();
  };

  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  const confirmDelete = async () => {
    await axios.delete(endpoints.products.details(toDelete.id));
    setToDelete(null);
    reload();
  };

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:box-bold-duotone"
        title={t('Mes produits')}
        subtitle={t('Les matières que vous proposez aux acheteurs et points de collecte')}
        action={
          <Button
            variant="contained"
            size="large"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setForm({ open: true, product: null })}
          >
            {t('Nouveau produit')}
          </Button>
        }
      />

      <Card sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}>
          <CountTabs
            value={filters.is_active}
            onChange={(v) => set({ is_active: v })}
            counts={counts}
            sx={{ flex: 1 }}
            tabs={[
              { value: '', label: t('Tous'), color: 'primary' },
              { value: 'true', label: t('Visibles'), icon: 'solar:eye-bold', color: 'success' },
              { value: 'false', label: t('Masqués'), icon: 'solar:eye-closed-bold', color: 'default' },
            ]}
          />
          <ViewModeToggle value={view} onChange={setView} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder={t('Rechercher un produit…')}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField select label={t('Catégorie')} value={filters.category_id} onChange={(e) => set({ category_id: e.target.value })} sx={{ minWidth: 220 }}>
            <MenuItem value="">{t('Toutes')}</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label={t('Trier par')} value={filters.sort} onChange={(e) => set({ sort: e.target.value })} sx={{ minWidth: 200 }}>
            <MenuItem value="recent">{t('Plus récents')}</MenuItem>
            <MenuItem value="popular">{t('Plus vus')}</MenuItem>
            <MenuItem value="price_asc">{t('Prix croissant')}</MenuItem>
            <MenuItem value="price_desc">{t('Prix décroissant')}</MenuItem>
            <MenuItem value="quantity_desc">{t('Quantité')}</MenuItem>
          </TextField>
        </Stack>
      </Card>

      {loading && !data ? (
        <ListSkeleton count={8} height={330} />
      ) : data?.length && view === 'table' ? (
        <DataTable
          rows={data}
          onRowClick={(p) => router.push(paths.seller.product(p.id))}
          columns={[
            { label: t('Produit'), render: (p) => <CellMain image={p.images?.[0]} icon={<Iconify icon="solar:box-bold-duotone" />} title={p.title} subtitle={[p.category_name, p.market_name].filter(Boolean).join(' · ')} /> },
            { label: t('Disponible'), align: 'right', nowrap: true, render: (p) => fQty(p.quantity_available, p.unit) },
            {
              label: t('Prix'),
              align: 'right',
              nowrap: true,
              render: (p) => (
                <>
                  <b>{p.price_per_unit != null ? fMoney(p.final_price_per_unit) : t('Sur devis')}</b>
                  {!!p.best_discount_percentage && <Label color="error" sx={{ ml: 1 }}>-{p.best_discount_percentage}%</Label>}
                </>
              ),
            },
            { label: t('Vues'), align: 'right', render: (p) => fNum(p.views_count) },
            { label: t('Jusqu’au'), nowrap: true, render: (p) => fDate(p.available_until) },
            { label: t('Visible'), align: 'center', stopPropagation: true, render: (p) => <Switch size="small" color="success" checked={p.is_active} onChange={() => toggleVisible(p)} /> },
            {
              label: '',
              align: 'right',
              stopPropagation: true,
              render: (p) => (
                <>
                  <Tooltip title={t('Modifier')}>
                    <IconButton onClick={() => setForm({ open: true, product: p })}><Iconify icon="solar:pen-bold" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('Supprimer')}>
                    <IconButton color="error" onClick={() => setToDelete(p)}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton>
                  </Tooltip>
                </>
              ),
            },
          ]}
        />
      ) : data?.length ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' } }}>
          {data.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              delay={i * 0.03}
              onEdit={(product) => setForm({ open: true, product })}
              onDelete={setToDelete}
            />
          ))}
        </Box>
      ) : (
        <Empty
          title={t('Aucun produit')}
          description={t('Publiez votre première matière : les acheteurs intéressés par la catégorie seront notifiés.')}
          icon="solar:box-minimalistic-bold-duotone"
          action={
            <Button variant="contained" onClick={() => setForm({ open: true, product: null })}>
              {t('Publier une matière')}
            </Button>
          }
        />
      )}

      <PagePagination meta={meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />

      <ProductFormDialog
        open={form.open}
        product={form.product}
        onClose={() => setForm({ open: false, product: null })}
        onSaved={reload}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t('Supprimer ce produit ?')}
        content={t('« {{v}} » et ses remises seront définitivement supprimés.', { v: toDelete?.title })}
        cancelText={t('Annuler')}
        action={
          <Button variant="contained" color="error" onClick={confirmDelete}>
            {t('Supprimer')}
          </Button>
        }
      />
    </DashboardContent>
  );
}
