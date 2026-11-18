import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { useApi, cleanParams } from 'src/hooks/use-api';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { ProductCard } from '../components/product-card';
import { ProductFormDialog } from '../components/product-form-dialog';
import { Empty, PageHeader, ListSkeleton, PagePagination, useReferenceData } from '../components/ui';

// ----------------------------------------------------------------------

export function ProductsView() {
  const { categories } = useReferenceData();
  const [filters, setFilters] = useState({ q: '', category_id: '', is_active: '', sort: 'recent', page: 1 });
  const [form, setForm] = useState({ open: false, product: null });
  const [toDelete, setToDelete] = useState(null);

  const { data, meta, loading, reload } = useApi(endpoints.products.mine, cleanParams({ ...filters, limit: 12 }));

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
        title="Mes produits"
        subtitle="Les matières que vous proposez aux acheteurs et points de collecte"
        action={
          <Button
            variant="contained"
            size="large"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setForm({ open: true, product: null })}
          >
            Nouveau produit
          </Button>
        }
      />

      <Card sx={{ mb: 3 }}>
        <Tabs
          value={filters.is_active}
          onChange={(_, v) => set({ is_active: v })}
          sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}
        >
          <Tab value="" label="Tous" />
          <Tab value="true" label="Visibles" icon={<Iconify icon="solar:eye-bold" />} iconPosition="start" />
          <Tab value="false" label="Masqués" icon={<Iconify icon="solar:eye-closed-bold" />} iconPosition="start" />
        </Tabs>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Rechercher un produit…"
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
          <TextField select label="Catégorie" value={filters.category_id} onChange={(e) => set({ category_id: e.target.value })} sx={{ minWidth: 220 }}>
            <MenuItem value="">Toutes</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Trier par" value={filters.sort} onChange={(e) => set({ sort: e.target.value })} sx={{ minWidth: 200 }}>
            <MenuItem value="recent">Plus récents</MenuItem>
            <MenuItem value="popular">Plus vus</MenuItem>
            <MenuItem value="price_asc">Prix croissant</MenuItem>
            <MenuItem value="price_desc">Prix décroissant</MenuItem>
            <MenuItem value="quantity_desc">Quantité</MenuItem>
          </TextField>
        </Stack>
      </Card>

      {loading && !data ? (
        <ListSkeleton count={8} height={330} />
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
          title="Aucun produit"
          description="Publiez votre première matière : les acheteurs intéressés par la catégorie seront notifiés."
          icon="solar:box-minimalistic-bold-duotone"
          action={
            <Button variant="contained" onClick={() => setForm({ open: true, product: null })}>
              Publier une matière
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
        title="Supprimer ce produit ?"
        content={`« ${toDelete?.title} » et ses remises seront définitivement supprimés.`}
        cancelText="Annuler"
        action={
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Supprimer
          </Button>
        }
      />
    </DashboardContent>
  );
}
