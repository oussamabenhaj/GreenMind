import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { fNum, fMoney, GOVERNORATES } from 'src/utils/clac';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { ProductCard } from '../components/product-card';
import { Empty, PageHeader, ListSkeleton, PagePagination, useReferenceData } from '../components/ui';

// ----------------------------------------------------------------------

const EXAMPLES = [
  'Je cherche 2 tonnes de grignons à Sfax moins de 0,2 dt',
  'huile de friture en promo près de moi',
  'carton pas cher à Tunis',
  'déchets organiques Sousse 500 kg',
];

const DETECTED_LABEL = {
  quantity: (d) => ({ icon: 'solar:box-bold', text: `≥ ${fNum(d.value)} ${d.unit}` }),
  max_price: (d) => ({ icon: 'solar:wallet-money-bold', text: `≤ ${fMoney(d.value)}` }),
  sort: () => ({ icon: 'solar:sort-from-bottom-to-top-bold', text: 'Moins cher d’abord' }),
  has_discount: () => ({ icon: 'solar:tag-price-bold', text: 'En promotion' }),
  nearby: () => ({ icon: 'solar:map-arrow-square-bold', text: 'Près de moi' }),
  gouvernorat: (d) => ({ icon: 'solar:map-point-bold', text: d.value }),
  category: (d) => ({ icon: 'solar:leaf-bold', text: d.label }),
};

function SmartSearch() {
  const [q, setQ] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async (text = q) => {
    if (text.trim().length < 2) return;
    setQ(text);
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(endpoints.search.smart, { params: { q: text } });
      setResult(res.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const it = result?.interpretation;

  return (
    <>
      <Card
        sx={{
          p: { xs: 3, md: 5 },
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
          background: (theme) =>
            `radial-gradient(circle at 0% 0%, ${theme.vars.palette.primary.lighter}, transparent 50%), radial-gradient(circle at 100% 100%, ${theme.vars.palette.info.lighter}, transparent 45%), ${theme.vars.palette.background.paper}`,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Iconify icon="solar:magic-stick-3-bold-duotone" width={28} sx={{ color: 'primary.main' }} />
          <Typography variant="h5">Recherche intelligente</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Décrivez votre besoin en langage naturel : l’IA détecte la matière, la quantité, le lieu et le prix.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="Ex : je cherche 2 tonnes de grignons à Sfax pas cher"
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 2 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="solar:chat-round-line-bold-duotone" /></InputAdornment> } }}
          />
          <LoadingButton size="large" variant="contained" loading={loading} onClick={() => run()} startIcon={<Iconify icon="solar:stars-bold" />} sx={{ px: 4, flexShrink: 0 }}>
            Analyser
          </LoadingButton>
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
          {EXAMPLES.map((ex) => (
            <Chip key={ex} size="small" variant="outlined" label={ex} onClick={() => run(ex)} />
          ))}
        </Stack>

        <AnimatePresence>
          {it && (
            <Box component={m.div} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} sx={{ mt: 3 }}>
              <Typography variant="overline" sx={{ color: 'text.disabled' }}>
                Compris comme
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                {it.detected.map((d, i) => {
                  const meta = DETECTED_LABEL[d.kind]?.(d);
                  return meta ? (
                    <Chip
                      key={`${d.kind}-${i}`}
                      component={m.div}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.08 }}
                      color="primary"
                      icon={<Iconify icon={meta.icon} />}
                      label={meta.text}
                    />
                  ) : null;
                })}
                {it.keywords.map((k) => (
                  <Chip key={k} variant="outlined" label={`« ${k} »`} />
                ))}
                {!it.detected.length && !it.keywords.length && <Chip label="Aucun critère détecté" />}
              </Stack>
              {!!it.relaxed_filters.length && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'warning.dark' }}>
                  Aucun résultat exact : critères assouplis ({it.relaxed_filters.join(', ')}).
                </Typography>
              )}
            </Box>
          )}
        </AnimatePresence>
        {!!error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Card>

      {result && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {result.products.length} produit(s) trouvé(s)
          </Typography>
          {result.products.length ? (
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' } }}>
              {result.products.map((p, i) => (
                <ProductCard key={p.id} product={p} showSeller delay={i * 0.03} />
              ))}
            </Box>
          ) : (
            <Empty title="Rien trouvé" description="Essayez une formulation plus large." icon="solar:magnifer-bug-bold-duotone" />
          )}
        </>
      )}
    </>
  );
}

// ----------------------------------------------------------------------

function Catalog() {
  const { categories, markets } = useReferenceData();
  const [f, setF] = useState({ q: '', category_id: '', market_id: '', gouvernorat: '', has_discount: false, sort: 'recent', page: 1 });
  const { data, meta, loading } = useApi(endpoints.products.list, cleanParams({ ...f, has_discount: f.has_discount || '', limit: 12 }));
  const set = (patch) => setF((s) => ({ ...s, page: 1, ...patch }));

  return (
    <>
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 1fr' } }}>
          <TextField
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Produit, matière…"
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }}
          />
          {[
            ['category_id', 'Catégorie', categories.map((c) => [c.id, c.name])],
            ['market_id', 'Marché', markets.map((mk) => [mk.id, mk.name])],
            ['gouvernorat', 'Gouvernorat', GOVERNORATES.map((g) => [g, g])],
          ].map(([key, label, options]) => (
            <TextField key={key} select label={label} value={f[key]} onChange={(e) => set({ [key]: e.target.value })}>
              <MenuItem value="">Tous</MenuItem>
              {options.map(([value, text]) => (
                <MenuItem key={value} value={value}>
                  {text}
                </MenuItem>
              ))}
            </TextField>
          ))}
          <TextField select label="Tri" value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
            <MenuItem value="recent">Récents</MenuItem>
            <MenuItem value="price_asc">Prix ↑</MenuItem>
            <MenuItem value="price_desc">Prix ↓</MenuItem>
            <MenuItem value="popular">Populaires</MenuItem>
          </TextField>
        </Box>
        <FormControlLabel
          sx={{ mt: 1.5 }}
          control={<Switch checked={f.has_discount} onChange={(e) => set({ has_discount: e.target.checked })} />}
          label="Uniquement les produits en promotion"
        />
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
        <Empty title="Aucun produit" description="Modifiez vos filtres." icon="solar:box-minimalistic-bold-duotone" />
      )}
      <PagePagination meta={meta} onChange={(page) => setF((s) => ({ ...s, page }))} />
    </>
  );
}

export function MarketplaceView() {
  const [tab, setTab] = useState('ai');
  return (
    <DashboardContent maxWidth="xl">
      <PageHeader icon="solar:shop-2-bold-duotone" title="Marché" subtitle="Explorez les matières disponibles et observez la concurrence" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="ai" label="Recherche IA" icon={<Iconify icon="solar:magic-stick-3-bold" />} iconPosition="start" />
        <Tab value="catalog" label="Catalogue" icon={<Iconify icon="solar:widget-5-bold" />} iconPosition="start" />
      </Tabs>
      {tab === 'ai' ? <SmartSearch /> : <Catalog />}
    </DashboardContent>
  );
}
