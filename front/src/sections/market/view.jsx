import { m, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useSpace } from 'src/hooks/use-space';
import { cleanParams } from 'src/hooks/use-api';

import { fQty, fDate, fMoney, GOVERNORATES } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CellMain, DataTable } from 'src/components/clac/data-table';
import { CountTabs, useTabCounts } from 'src/components/clac/count-tabs';
import { useViewMode, ViewModeToggle } from 'src/components/clac/view-mode';

import { useAuthContext } from 'src/auth/hooks';

import { useReferenceData } from '../seller/components/ui';
import { openConversation } from '../seller/components/contact';
import { RequestFormDialog } from '../buyer/requests/request-form-dialog';
import { ExchangeFormDialog, ExchangeDetailDialog } from './exchange-dialogs';
import { KINDS, Description, RequestPost, ProductPost, ExchangePost } from './feed-cards';
// ----------------------------------------------------------------------

const PAGE_SIZE = 6;

const SOURCES = {
  product: { url: endpoints.products.list, params: (f) => ({ q: f.q, category_id: f.category_id, gouvernorat: f.gouvernorat, sort: f.sort }) },
  request: { url: endpoints.requests.list, params: (f) => ({ q: f.q, category_id: f.category_id, gouvernorat: f.gouvernorat }) },
  exchange: { url: endpoints.exchanges.list, params: (f) => ({ q: f.q, category_id: f.category_id, gouvernorat: f.gouvernorat }) },
};
const TABS = [
  ['all', 'Tout', 'solar:widget-5-bold'],
  ['product', 'À vendre', 'solar:tag-price-bold'],
  ['request', 'Demandes d’achat', 'solar:inbox-out-bold'],
  ['exchange', 'Échanges', 'solar:refresh-square-bold'],
];

const keyOf = (it) => `${it.kind}-${it.id}`;
const byDate = (a, b) => new Date(b.created_at) - new Date(a.created_at);

function PostSkeleton() {
  return (
    <Card sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Skeleton variant="circular" width={46} height={46} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width="40%" />
          <Skeleton width="25%" />
        </Box>
      </Stack>
      <Skeleton variant="rounded" height={280} />
      <Skeleton width="70%" sx={{ mt: 2 }} />
    </Card>
  );
}

function RequestDetailDialog({ request: r, onClose, actions }) {
  return (
    <Dialog fullWidth maxWidth="sm" open={!!r} onClose={onClose}>
      {r && (
        <>
          <DialogTitle>{t('Demande d’achat —')} {r.buyer.company_name || r.buyer.name}</DialogTitle>
          <DialogContent>
            <Typography variant="h6" sx={{ mb: 1 }}>{r.title}</Typography>
            <Description text={r.description} max={500} />
            <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
              {[
                [t('Quantité'), fQty(r.quantity, r.unit)],
                [t('Prix max'), r.max_price_per_unit != null ? `${fMoney(r.max_price_per_unit)} / ${r.unit}` : '—'],
                [t('Catégorie'), r.category_name ?? '—'],
                [t('Pour le'), fDate(r.needed_by)],
                [t('Lieu'), r.gouvernorat ?? '—'],
              ].map(([k, v]) => (
                <Box key={k}>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>{k}</Typography>
                  <Typography variant="subtitle2">{v}</Typography>
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button color="inherit" onClick={onClose}>{t('Fermer')}</Button>
            {actions}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

// ----------------------------------------------------------------------

/** Market: social-style feed of products for sale, purchase requests and exchange proposals. */
export function MarketView() {
  const router = useRouter();
  const sp = useSpace();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const { categories } = useReferenceData();
  const role = user?.role;

  const [tab, setTab] = useState('all');
  const [filters, setFilters] = useState({ q: '', category_id: '', gouvernorat: '', sort: 'recent' });
  const [items, setItems] = useState([]);
  const [cursors, setCursors] = useState({});
  const [loading, setLoading] = useState(true);
  const [incoming, setIncoming] = useState([]);
  const [fresh, setFresh] = useState([]);
  const [buying, setBuying] = useState(null);
  const [requestView, setRequestView] = useState(null);
  const [exchangeId, setExchangeId] = useState(searchParams.get('exchange'));
  const [creating, setCreating] = useState(null); // 'exchange' | 'request'
  const sentinel = useRef(null);
  const [view, setView] = useViewMode('market-feed');
  const baseCounts = useTabCounts(
    SOURCES.product.url,
    Object.entries(SOURCES).map(([k, src]) => ({ value: k, url: src.url, params: src.params(filters) })),
    {}
  );
  const counts = {
    ...baseCounts,
    all: Object.keys(SOURCES).every((k) => baseCounts[k] != null) ? Object.keys(SOURCES).reduce((sum, k) => sum + baseCounts[k], 0) : undefined,
  };

  useEffect(() => {
    const id = searchParams.get('exchange');
    if (id) setExchangeId(id);
  }, [searchParams]);

  const kinds = tab === 'all' ? Object.keys(SOURCES) : [tab];
  const hasMore = kinds.some((k) => cursors[k]?.more !== false);

  const loadMore = useCallback(
    async (reset) => {
      setLoading(true);
      const base = reset ? {} : cursors;
      const next = { ...base };
      try {
        const results = await Promise.all(
          kinds
            .filter((k) => base[k]?.more !== false)
            .map(async (k) => {
              const page = (base[k]?.page ?? 0) + 1;
              const res = await axios.get(SOURCES[k].url, { params: cleanParams({ ...SOURCES[k].params(filters), page, limit: PAGE_SIZE }) });
              next[k] = { page, more: page < res.data.meta.total_pages };
              return res.data.data.map((x) => ({ ...x, kind: k }));
            })
        );
        const batch = results.flat();
        setItems((list) => {
          const merged = reset ? batch : [...list, ...batch.filter((x) => !list.some((y) => keyOf(y) === keyOf(x)))];
          return tab === 'product' && filters.sort !== 'recent' ? merged : [...merged].sort(byDate);
        });
        setCursors(next);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cursors, filters, tab]
  );

  // tab or filters changed → restart the feed
  useEffect(() => {
    setItems([]);
    setCursors({});
    const tt = setTimeout(() => loadMore(true), 250);
    return () => clearTimeout(tt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filters]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && hasMore && !loading && loadMore(false), { rootMargin: '600px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadMore]);

  const reload = () => loadMore(true);

  // live publications
  const pushLive = (item) => {
    if (!kinds.includes(item.kind)) return;
    const own = (item.seller_id ?? item.author_id ?? item.buyer_id) === user?.id;
    if (own) setItems((list) => [item, ...list.filter((x) => keyOf(x) !== keyOf(item))]);
    else setIncoming((list) => [item, ...list.filter((x) => keyOf(x) !== keyOf(item))]);
  };
  useSocketEvent('product:published', (p) => pushLive({ ...p, kind: 'product' }));
  useSocketEvent('exchange:published', (e) => pushLive({ ...e, kind: 'exchange' }));
  useSocketEvent('request:new', (r) => pushLive({ ...r, kind: 'request' }));

  const showIncoming = () => {
    setItems((list) => [...incoming, ...list.filter((x) => !incoming.some((y) => keyOf(y) === keyOf(x)))]);
    setFresh(incoming.map(keyOf));
    setIncoming([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const contact = async (userId, body, ctx) => router.push(await openConversation(userId, { body, ...ctx }));

  const openDetail = (it) => {
    if (it.kind === 'product') router.push(sp.product(it.id));
    else if (it.kind === 'request') {
      if (it.buyer_id === user?.id || role === 'seller' || role === 'collector') router.push(`${sp.requests}?r=${it.id}`);
      else setRequestView(it);
    } else setExchangeId(it.id);
  };
  const personOf = (it) => it.seller ?? it.buyer ?? it.author;
  const titleOf = (it) => (it.kind === 'exchange' ? `${it.wanted_label} → ${it.given_label}` : it.title);
  const summaryOf = (it) => {
    if (it.kind === 'product') return [it.quantity != null && fQty(it.quantity, it.unit), `${fMoney(it.price_per_unit)} / ${it.unit}`].filter(Boolean).join(' · ');
    if (it.kind === 'request') return `${fQty(it.quantity, it.unit)}${it.max_price_per_unit != null ? t(' · max {{amount}}', { amount: fMoney(it.max_price_per_unit) }) : ''}`;
    return `${it.wanted_quantity} ${it.wanted_unit} = ${it.given_quantity} ${it.given_unit}`;
  };

  const renderItem = (it, i) => {
    const k = keyOf(it);
    const props = { item: it, index: i, fresh: fresh.includes(k) };
    if (it.kind === 'product') {
      const mine = it.seller_id === user?.id;
      return (
        <ProductPost
          key={k}
          {...props}
          mine={mine}
          canBuy={role === 'buyer' || role === 'collector'}
          onContact={role !== 'seller' ? () => contact(it.seller_id, t('Bonjour, je suis intéressé(e) par « {{title}} ».', { title: it.title }), { context_type: 'product', context_id: it.id }) : null}
          onDetail={() => router.push(sp.product(it.id))}
          onBuy={() => (role === 'buyer' ? setBuying(it) : router.push(`${sp.purchases}?product=${it.id}`))}
        />
      );
    }
    if (it.kind === 'request') {
      const mine = it.buyer_id === user?.id;
      return (
        <RequestPost
          key={k}
          {...props}
          mine={mine}
          onContact={role !== 'buyer' ? () => contact(it.buyer_id, t('Bonjour, au sujet de votre demande « {{title}} ».', { title: it.title }), { context_type: 'request', context_id: it.id }) : null}
          onDetail={() => (mine ? router.push(`${sp.requests}?r=${it.id}`) : setRequestView(it))}
        />
      );
    }
    return (
      <ExchangePost
        key={k}
        {...props}
        mine={it.author_id === user?.id}
        canContact={role !== 'buyer'}
        onContact={() => contact(it.author_id, t('Bonjour, je suis intéressé(e) par votre échange « {{wanted_label}} → {{given_label}} ».', { wanted_label: it.wanted_label, given_label: it.given_label }))}
        onDetail={() => setExchangeId(it.id)}
      />
    );
  };

  return (
    <DashboardContent maxWidth={view === 'table' ? 'xl' : 'lg'}>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: view === 'table' ? 'minmax(0, 1fr) 300px' : 'minmax(0, 640px) 300px' }, justifyContent: 'center', alignItems: 'start' }}>
        {/* ---------------- feed ---------------- */}
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 48, height: 48, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'common.white', background: (theme) => `linear-gradient(135deg, ${theme.vars.palette.primary.light}, ${theme.vars.palette.primary.dark})` }}>
              <Iconify icon="solar:shop-2-bold-duotone" width={26} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4">{t('Market')}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('Ventes, demandes d’achat et échanges — en direct')}
              </Typography>
            </Box>
          </Stack>

          {role === 'buyer' && (
            <Card sx={{ p: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ flex: '1 1 100%', mb: -0.5 }}>{t('Publier sur le Market')}</Typography>
              <Button variant="soft" color="info" startIcon={<Iconify icon="solar:inbox-out-bold" />} onClick={() => setCreating('request')} sx={{ flex: 1 }}>
                {t('Demande d’achat')}
              </Button>
              <Button variant="soft" color="warning" startIcon={<Iconify icon="solar:refresh-square-bold" />} onClick={() => setCreating('exchange')} sx={{ flex: 1 }}>
                {t('Proposer un échange')}
              </Button>
            </Card>
          )}

          <Card sx={{ px: 1.5, display: 'flex', alignItems: 'center' }}>
            <CountTabs
              value={tab}
              onChange={setTab}
              counts={counts}
              sx={{ flex: 1, minWidth: 0 }}
              tabs={TABS.map(([value, label, icon]) => ({ value, label, icon, color: value === 'all' ? 'default' : KINDS[value].color }))}
            />
            <ViewModeToggle value={view} onChange={setView} />
          </Card>

          <Card sx={{ p: 2, display: { lg: 'none' } }}>
            <TextField fullWidth size="small" value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder={t('Rechercher…')} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }} />
          </Card>

          <AnimatePresence>
            {incoming.length > 0 && (
              <Box component={m.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} sx={{ position: 'sticky', top: 84, zIndex: 10, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" onClick={showIncoming} startIcon={<Iconify icon="eva:arrow-upward-fill" />} sx={{ borderRadius: 5, boxShadow: (theme) => theme.customShadows.primary }}>
                  {incoming.length} {t('nouvelle(s) publication(s)')}
                </Button>
              </Box>
            )}
          </AnimatePresence>

          {view === 'table' && items.length > 0 ? (
            <DataTable
              rows={items}
              rowKey={keyOf}
              minWidth={600}
              onRowClick={openDetail}
              columns={[
                {
                  label: t('Publication'),
                  render: (it) =>
                    it.kind === 'product' && it.images?.[0] ? (
                      <CellMain image={it.images[0]} title={titleOf(it)} subtitle={summaryOf(it)} />
                    ) : (
                      <CellMain icon={<Iconify icon={KINDS[it.kind].icon} />} color={KINDS[it.kind].color} title={titleOf(it)} subtitle={summaryOf(it)} />
                    ),
                },
                { label: t('Type'), render: (it) => <Label color={KINDS[it.kind].color}>{t(KINDS[it.kind].label)}</Label> },
                { label: t('Par'), render: (it) => (personOf(it) ? personOf(it).company_name || personOf(it).name : '—') },
                { label: t('Lieu'), render: (it) => t(it.gouvernorat) ?? '—' },
                { label: t('Date'), nowrap: true, render: (it) => fDate(it.created_at) },
              ]}
            />
          ) : (
            items.map(renderItem)
          )}

          {loading && (items.length ? <Stack alignItems="center"><CircularProgress size={28} /></Stack> : [0, 1].map((k) => <PostSkeleton key={k} />))}
          {!loading && !items.length && (
            <Card sx={{ p: 5, textAlign: 'center' }}>
              <Iconify icon="solar:shop-minimalistic-bold-duotone" width={64} sx={{ color: 'primary.light' }} />
              <Typography variant="h6" sx={{ mt: 1 }}>{t('Aucune publication')}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('Modifiez vos filtres ou revenez plus tard.')}</Typography>
            </Card>
          )}
          {!hasMore && items.length > 0 && <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.disabled', py: 2 }}>{t('🌿 Vous avez tout vu')}</Typography>}
          <div ref={sentinel} />
        </Stack>

        {/* ---------------- sidebar ---------------- */}
        <Stack spacing={3} sx={{ display: { xs: 'none', lg: 'flex' }, position: 'sticky', top: 88 }}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>{t('Filtrer le fil')}</Typography>
            <Stack spacing={2}>
              <TextField size="small" value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder={t('Produit, matière…')} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }} />
              <TextField select size="small" label={t('Gouvernorat')} value={filters.gouvernorat} onChange={(e) => set({ gouvernorat: e.target.value })}>
                <MenuItem value="">{t('Toute la Tunisie')}</MenuItem>
                {GOVERNORATES.map((g) => <MenuItem key={g} value={g}>{t(g)}</MenuItem>)}
              </TextField>
              {tab === 'product' && (
                <TextField select size="small" label={t('Trier')} value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
                  <MenuItem value="recent">{t('Plus récentes')}</MenuItem>
                  <MenuItem value="popular">{t('Plus vues')}</MenuItem>
                  <MenuItem value="price_asc">{t('Prix croissant')}</MenuItem>
                </TextField>
              )}
            </Stack>
            <Typography variant="overline" sx={{ display: 'block', mt: 2.5, mb: 1, color: 'text.disabled' }}>{t('Catégories')}</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              <Chip size="small" label={t('Toutes')} color={filters.category_id === '' ? 'primary' : 'default'} onClick={() => set({ category_id: '' })} />
              {categories.map((c) => (
                <Chip key={c.id} size="small" label={c.name} color={filters.category_id === c.id ? 'primary' : 'default'} variant={filters.category_id === c.id ? 'filled' : 'outlined'} onClick={() => set({ category_id: c.id })} />
              ))}
            </Stack>
          </Card>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>{t('Légende')}</Typography>
            <Stack spacing={1}>
              {Object.entries(KINDS).map(([k, v]) => (
                <Stack key={k} direction="row" spacing={1} alignItems="center">
                  <Iconify icon={v.icon} sx={{ color: `${v.color}.main` }} />
                  <Typography variant="body2">{t(v.label)}</Typography>
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
              {t('Les produits « Visibles sur le marché », les demandes ouvertes et les échanges actifs apparaissent ici automatiquement, en temps réel.')}
            </Typography>
          </Card>
        </Stack>
      </Box>

      <RequestFormDialog open={!!buying} product={buying} onClose={() => setBuying(null)} onSaved={(r) => router.push(`${sp.requests}?r=${r.id}`)} />
      <RequestFormDialog open={creating === 'request'} onClose={() => setCreating(null)} onSaved={reload} />
      <ExchangeFormDialog open={creating === 'exchange'} onClose={() => setCreating(null)} onSaved={(e) => { reload(); setExchangeId(e.id); }} />
      <ExchangeDetailDialog id={exchangeId} onClose={() => { setExchangeId(null); if (searchParams.get('exchange')) router.push(sp.market); }} onChanged={reload} />
      <RequestDetailDialog request={requestView} onClose={() => setRequestView(null)} />
    </DashboardContent>
  );
}
