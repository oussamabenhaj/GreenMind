import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { useSpace } from 'src/hooks/use-space';
import { useApi, cleanParams } from 'src/hooks/use-api';

import { fDate, fMoney, GOVERNORATES } from 'src/utils/clac';

import { endpoints } from 'src/lib/axios';
import { useSocketEvent } from 'src/lib/socket';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { ProductCover } from '../../seller/components/product-card';
import { Empty, PageHeader, ListSkeleton, PagePagination, useReferenceData } from '../../seller/components/ui';

// ----------------------------------------------------------------------

/** US-B07 — active discounts offered by sellers. */
export function DealsView() {
  const router = useRouter();
  const sp = useSpace();
  const { categories } = useReferenceData();
  const [f, setF] = useState({ category_id: '', gouvernorat: '', sort: 'percentage', state: 'active', page: 1 });
  const { data, meta, loading, reload } = useApi(endpoints.discounts.list, cleanParams({ ...f, limit: 12 }));
  useSocketEvent('notification:new', (n) => n.type === 'discount.new' && reload());
  const set = (patch) => setF((s) => ({ ...s, page: 1, ...patch }));

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader icon="solar:tag-price-bold-duotone" title="Bons plans" subtitle="Les remises proposées par les vendeurs — profitez des meilleures offres" />
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField select fullWidth label="Catégorie" value={f.category_id} onChange={(e) => set({ category_id: e.target.value })}>
            <MenuItem value="">Toutes</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
          <TextField select fullWidth label="Gouvernorat" value={f.gouvernorat} onChange={(e) => set({ gouvernorat: e.target.value })}>
            <MenuItem value="">Tous</MenuItem>
            {GOVERNORATES.map((g) => (
              <MenuItem key={g} value={g}>{g}</MenuItem>
            ))}
          </TextField>
          <TextField select fullWidth label="Période" value={f.state} onChange={(e) => set({ state: e.target.value })}>
            <MenuItem value="active">En cours</MenuItem>
            <MenuItem value="upcoming">À venir</MenuItem>
          </TextField>
          <TextField select fullWidth label="Trier" value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
            <MenuItem value="percentage">Plus forte remise</MenuItem>
            <MenuItem value="ending_soon">Se termine bientôt</MenuItem>
            <MenuItem value="recent">Plus récentes</MenuItem>
          </TextField>
        </Stack>
      </Card>

      {loading && !data ? (
        <ListSkeleton height={320} />
      ) : data?.length ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' } }}>
          {data.map((d, i) => (
            <Card key={d.id} component={m.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -4 }} sx={{ overflow: 'hidden' }}>
              <Box sx={{ position: 'relative' }}>
                <ProductCover product={{ ...d.product, category_slug: categories.find((c) => c.id === d.product.category_id)?.slug }} height={140} />
                <Box sx={{ position: 'absolute', top: 12, left: 12, px: 1.5, py: 0.5, borderRadius: 1, bgcolor: 'error.main', color: 'common.white', typography: 'h5' }}>
                  -{d.percentage}%
                </Box>
              </Box>
              <Stack spacing={1} sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" noWrap>{d.product.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {d.seller.company_name || d.seller.name} · {d.product.gouvernorat}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>« {d.title} »{d.min_quantity ? ` · dès ${d.min_quantity} ${d.product.unit}` : ''}</Typography>
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography variant="h5" sx={{ color: 'primary.dark' }}>{fMoney(d.discounted_price_per_unit)}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>{fMoney(d.product.price_per_unit)}</Typography>
                  <Typography variant="caption">/ {d.product.unit}</Typography>
                </Stack>
                <Label color="warning" startIcon={<Iconify icon="solar:clock-circle-bold" />} sx={{ alignSelf: 'flex-start' }}>
                  {d.state === 'upcoming' ? `Dès le ${fDate(d.starts_at)}` : `Jusqu’au ${fDate(d.ends_at)}`}
                </Label>
                <Button variant="contained" onClick={() => router.push(sp.product(d.product_id))} sx={{ mt: 1 }}>
                  Voir le produit
                </Button>
              </Stack>
            </Card>
          ))}
        </Box>
      ) : (
        <Empty title="Aucune remise" description="Revenez bientôt : vous serez notifié des nouvelles remises dans vos catégories." icon="solar:tag-price-bold-duotone" />
      )}
      <PagePagination meta={meta} onChange={(page) => setF((s) => ({ ...s, page }))} />
    </DashboardContent>
  );
}
