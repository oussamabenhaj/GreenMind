import { m, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
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

import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

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
          <DialogTitle>Demande d’achat — {r.buyer.company_name || r.buyer.name}</DialogTitle>
          <DialogContent>
            <Typography variant="h6" sx={{ mb: 1 }}>{r.title}</Typography>
            <Description text={r.description} max={500} />
            <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
              {[
                ['Quantité', fQty(r.quantity, r.unit)],
                ['Prix max', r.max_price_per_unit != null ? `${fMoney(r.max_price_per_unit)} / ${r.unit}` : '—'],
                ['Catégorie', r.category_name ?? '—'],
                ['Pour le', fDate(r.needed_by)],
                ['Lieu', r.gouvernorat ?? '—'],
                ['Propositions', r.responses_count],
              ].map(([k, v]) => (
                <Box key={k}>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>{k}</Typography>
                  <Typography variant="subtitle2">{v}</Typography>
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button color="inherit" onClick={onClose}>Fermer</Button>
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
    const t = setTimeout(() => loadMore(true), 250);
    return () => clearTimeout(t);
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
          onContact={role !== 'seller' ? () => contact(it.seller_id, `Bonjour, je suis intéressé(e) par « ${it.title} ».`, { context_type: 'product', context_id: it.id }) : null}
          onDetail={() => router.push(sp.product(it.id))}
          onBuy={() => (role === 'buyer' ? setBuying(it) : router.push(`${sp.purchases}?product=${it.id}`))}
        />
      );
    }
    if (it.kind === 'request') {
      const mine = it.buyer_id === user?.id;
      const canPropose = role === 'seller' || role === 'collector';
      return (
        <RequestPost
          key={k}
          {...props}
          mine={mine}
          canPropose={canPropose}
          onContact={role !== 'buyer' ? () => contact(it.buyer_id, `Bonjour, au sujet de votre demande « ${it.title} ».`, { context_type: 'request', context_id: it.id }) : null}
          onDetail={() => (mine || canPropose ? router.push(`${sp.requests}?r=${it.id}`) : setRequestView(it))}
          onPropose={() => router.push(`${sp.requests}?r=${it.id}`)}
        />
      );
    }
    return (
      <ExchangePost
        key={k}
        {...props}
        mine={it.author_id === user?.id}
        canContact={role !== 'buyer'}
        onContact={() => contact(it.author_id, `Bonjour, je suis intéressé(e) par votre échange « ${it.wanted_label} → ${it.given_label} ».`)}
        onDetail={() => setExchangeId(it.id)}
      />
    );
  };

  return (
    <DashboardContent maxWidth="lg">
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 640px) 300px' }, justifyContent: 'center', alignItems: 'start' }}>
        {/* ---------------- feed ---------------- */}
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 48, height: 48, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'common.white', background: (theme) => `linear-gradient(135deg, ${theme.vars.palette.primary.light}, ${theme.vars.palette.primary.dark})` }}>
              <Iconify icon="solar:shop-2-bold-duotone" width={26} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4">Market</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Ventes, demandes d’achat et échanges — en direct
              </Typography>
            </Box>
          </Stack>

          {role === 'buyer' && (
            <Card sx={{ p: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ flex: '1 1 100%', mb: -0.5 }}>Publier sur le Market</Typography>
              <Button variant="soft" color="info" startIcon={<Iconify icon="solar:inbox-out-bold" />} onClick={() => setCreating('request')} sx={{ flex: 1 }}>
                Demande d’achat
              </Button>
              <Button variant="soft" color="warning" startIcon={<Iconify icon="solar:refresh-square-bold" />} onClick={() => setCreating('exchange')} sx={{ flex: 1 }}>
                Proposer un échange
              </Button>
            </Card>
          )}

          <Card sx={{ px: 1 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
              {TABS.map(([v, label, icon]) => (
                <Tab key={v} value={v} label={label} icon={<Iconify icon={icon} width={18} />} iconPosition="start" sx={{ color: v !== 'all' ? `${KINDS[v].color}.main` : undefined }} />
              ))}
            </Tabs>
          </Card>

          <Card sx={{ p: 2, display: { lg: 'none' } }}>
            <TextField fullWidth size="small" value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="Rechercher…" slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }} />
          </Card>

          <AnimatePresence>
            {incoming.length > 0 && (
              <Box component={m.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} sx={{ position: 'sticky', top: 84, zIndex: 10, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" onClick={showIncoming} startIcon={<Iconify icon="eva:arrow-upward-fill" />} sx={{ borderRadius: 5, boxShadow: (theme) => theme.customShadows.primary }}>
                  {incoming.length} nouvelle(s) publication(s)
                </Button>
              </Box>
            )}
          </AnimatePresence>

          {items.map(renderItem)}

          {loading && (items.length ? <Stack alignItems="center"><CircularProgress size={28} /></Stack> : [0, 1].map((k) => <PostSkeleton key={k} />))}
          {!loading && !items.length && (
            <Card sx={{ p: 5, textAlign: 'center' }}>
              <Iconify icon="solar:shop-minimalistic-bold-duotone" width={64} sx={{ color: 'primary.light' }} />
              <Typography variant="h6" sx={{ mt: 1 }}>Aucune publication</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Modifiez vos filtres ou revenez plus tard.</Typography>
            </Card>
          )}
          {!hasMore && items.length > 0 && <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.disabled', py: 2 }}>🌿 Vous avez tout vu</Typography>}
          <div ref={sentinel} />
        </Stack>

        {/* ---------------- sidebar ---------------- */}
        <Stack spacing={3} sx={{ display: { xs: 'none', lg: 'flex' }, position: 'sticky', top: 88 }}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Filtrer le fil</Typography>
            <Stack spacing={2}>
              <TextField size="small" value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="Produit, matière…" slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }} />
              <TextField select size="small" label="Gouvernorat" value={filters.gouvernorat} onChange={(e) => set({ gouvernorat: e.target.value })}>
                <MenuItem value="">Toute la Tunisie</MenuItem>
                {GOVERNORATES.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
              {tab === 'product' && (
                <TextField select size="small" label="Trier" value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
                  <MenuItem value="recent">Plus récentes</MenuItem>
                  <MenuItem value="popular">Plus vues</MenuItem>
                  <MenuItem value="price_asc">Prix croissant</MenuItem>
                </TextField>
              )}
            </Stack>
            <Typography variant="overline" sx={{ display: 'block', mt: 2.5, mb: 1, color: 'text.disabled' }}>Catégories</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              <Chip size="small" label="Toutes" color={filters.category_id === '' ? 'primary' : 'default'} onClick={() => set({ category_id: '' })} />
              {categories.map((c) => (
                <Chip key={c.id} size="small" label={c.name} color={filters.category_id === c.id ? 'primary' : 'default'} variant={filters.category_id === c.id ? 'filled' : 'outlined'} onClick={() => set({ category_id: c.id })} />
              ))}
            </Stack>
          </Card>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Légende</Typography>
            <Stack spacing={1}>
              {Object.entries(KINDS).map(([k, v]) => (
                <Stack key={k} direction="row" spacing={1} alignItems="center">
                  <Iconify icon={v.icon} sx={{ color: `${v.color}.main` }} />
                  <Typography variant="body2">{v.label}</Typography>
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
              Les produits « Visibles sur le marché », les demandes ouvertes et les échanges actifs apparaissent ici automatiquement, en temps réel.
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
