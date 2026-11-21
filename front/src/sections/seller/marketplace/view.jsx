import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { GOVERNORATES } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { SmartSearch } from './smart-search';
import { ProductCard } from '../components/product-card';
import { Empty, PageHeader, ListSkeleton, PagePagination, useReferenceData } from '../components/ui';
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

function Catalog() {
  const { categories, markets } = useReferenceData();
  const [f, setF] = useState({ q: '', category_id: '', market_id: '', gouvernorat: '', sort: 'recent', page: 1 });
  const { data, meta, loading } = useApi(endpoints.products.list, cleanParams({ ...f, limit: 12 }));
  const set = (patch) => setF((s) => ({ ...s, page: 1, ...patch }));

  return (
    <>
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 1fr' } }}>
          <TextField
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder={t('Produit, matière…')}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }}
          />
          {[
            ['category_id', t('Catégorie'), categories.map((c) => [c.id, c.name])],
            ['market_id', t('Marché'), markets.map((mk) => [mk.id, mk.name])],
            ['gouvernorat', t('Gouvernorat'), GOVERNORATES.map((g) => [g, t(g)])],
          ].map(([key, label, options]) => (
            <TextField key={key} select label={label} value={f[key]} onChange={(e) => set({ [key]: e.target.value })}>
              <MenuItem value="">{t('Tous')}</MenuItem>
              {options.map(([value, text]) => (
                <MenuItem key={value} value={value}>
                  {text}
                </MenuItem>
              ))}
            </TextField>
          ))}
          <TextField select label={t('Tri')} value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
            <MenuItem value="recent">{t('Récents')}</MenuItem>
            <MenuItem value="price_asc">{t('Prix ↑')}</MenuItem>
            <MenuItem value="price_desc">{t('Prix ↓')}</MenuItem>
            <MenuItem value="popular">{t('Populaires')}</MenuItem>
          </TextField>
        </Box>
      </Card>

      {loading && !data ? (
        <ListSkeleton count={8} height={330} />
      ) : data?.length ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' } }}>
          {data.map((p, i) => (
            <ProductCard key={p.id} product={p} showSeller delay={i * 0.03} />
          ))}
        </Box>
      ) : (
        <Empty title={t('Aucun produit')} description={t('Modifiez vos filtres.')} icon="solar:box-minimalistic-bold-duotone" />
      )}
      <PagePagination meta={meta} onChange={(page) => setF((s) => ({ ...s, page }))} />
    </>
  );
}

export function MarketplaceView() {
  const [tab, setTab] = useState('ai');
  return (
    <DashboardContent maxWidth="xl">
      <PageHeader icon="solar:shop-2-bold-duotone" title={t('Marché')} subtitle={t('Explorez les matières disponibles et observez la concurrence')} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="ai" label={t('Recherche IA')} icon={<Iconify icon="solar:magic-stick-3-bold" />} iconPosition="start" />
        <Tab value="catalog" label={t('Catalogue')} icon={<Iconify icon="solar:widget-5-bold" />} iconPosition="start" />
      </Tabs>
      {tab === 'ai' ? <SmartSearch /> : <Catalog />}
    </DashboardContent>
  );
}
