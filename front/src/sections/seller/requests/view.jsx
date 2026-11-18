import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { fQty, fDate, fMoney, initials, fFromNow, GOVERNORATES, REQUEST_STATUS, RESPONSE_STATUS } from 'src/utils/clac';

import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuthContext } from 'src/auth/hooks';

import { openConversation } from '../components/contact';
import { printDocument } from '../components/print-button';
import { Empty, PageHeader, StatusLabel, ListSkeleton, PagePagination, useReferenceData } from '../components/ui';

// ----------------------------------------------------------------------

function RequestCard({ r, onOpen, fresh, delay }) {
  return (
    <Card
      component={m.div}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={() => onOpen(r.id)}
      sx={{
        p: 2.5,
        cursor: 'pointer',
        transition: 'box-shadow .2s, transform .2s',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: (theme) => theme.customShadows.z16 },
        ...(fresh && { outline: (theme) => `2px solid ${theme.vars.palette.primary.main}` }),
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Avatar src={r.buyer.avatar_url ?? undefined} sx={{ bgcolor: 'info.lighter', color: 'info.dark' }}>
          {initials(r.buyer.company_name || r.buyer.name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {r.buyer.company_name || r.buyer.name}
            {r.buyer.is_verified && <Iconify icon="solar:verified-check-bold" width={16} sx={{ color: 'info.main', ml: 0.5, verticalAlign: 'middle' }} />}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {fFromNow(r.created_at)}
          </Typography>
        </Box>
        {fresh && <Label color="primary" variant="filled">Nouveau</Label>}
        {r.target_user_id && <Label color="secondary">Pour vous</Label>}
      </Stack>

      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
        {r.title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40 }}>
        {r.description || 'Pas de description.'}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, p: 1.5, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
        {[
          ['Quantité', fQty(r.quantity, r.unit)],
          ['Prix max', r.max_price_per_unit != null ? fMoney(r.max_price_per_unit) : '—'],
          ['Pour le', fDate(r.needed_by)],
        ].map(([label, value]) => (
          <Box key={label}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {label}
            </Typography>
            <Typography variant="subtitle2" noWrap>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
        <Label color="primary">{r.category_name ?? '—'}</Label>
        <Label>
          <Iconify icon="solar:map-point-bold" width={14} sx={{ mr: 0.5 }} />
          {r.gouvernorat ?? '—'}
        </Label>
        <Box sx={{ flexGrow: 1 }} />
        {r.my_response_status ? (
          <StatusLabel map={RESPONSE_STATUS} value={r.my_response_status} />
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {r.responses_count} réponse(s)
          </Typography>
        )}
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

function RequestDrawer({ id, onClose, onChanged }) {
  const router = useRouter();
  const { data: r, reload } = useApi(id ? endpoints.requests.details(id) : null);
  const { user } = useAuthContext();
  const isSeller = user?.role === 'seller';
  const { data: products } = useApi(endpoints.products.mine, { limit: 100, is_active: true }, { skip: !isSeller });
  const [form, setForm] = useState({ message: '', proposed_quantity: '', proposed_price_per_unit: '', product_id: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const mine = r?.responses?.[0];

  useEffect(() => {
    setError('');
    setForm({
      message: mine?.message ?? '',
      proposed_quantity: mine?.proposed_quantity ?? r?.quantity ?? '',
      proposed_price_per_unit: mine?.proposed_price_per_unit ?? '',
      product_id: mine?.product_id ?? '',
    });
  }, [r, mine]);

  const submit = async () => {
    setSending(true);
    setError('');
    const payload = {
      message: form.message || undefined,
      product_id: form.product_id || null,
      proposed_quantity: form.proposed_quantity === '' ? null : Number(form.proposed_quantity),
      proposed_price_per_unit: form.proposed_price_per_unit === '' ? null : Number(form.proposed_price_per_unit),
    };
    try {
      if (mine) await axios.patch(endpoints.requests.response(r.id, mine.id), payload);
      else await axios.post(endpoints.requests.responses(r.id), payload);
      await reload();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const withdraw = async () => {
    await axios.patch(endpoints.requests.response(r.id, mine.id), { status: 'withdrawn' });
    await reload();
    onChanged();
  };

  const contact = async () => router.push(await openConversation(r.buyer_id, { body: `Bonjour, au sujet de votre demande « ${r.title} »`, context_type: 'request', context_id: r.id }));

  const canAnswer = r && ['open', 'in_progress'].includes(r.status) && (!mine || mine.status === 'pending');

  return (
    <Drawer anchor="right" open={!!id} onClose={onClose} PaperProps={{ sx: { width: 1, maxWidth: 520 } }}>
      {r && (
        <>
          <Stack direction="row" alignItems="center" sx={{ p: 2.5, pb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Demande d’achat
            </Typography>
            <IconButton onClick={() => printDocument('requests', r.id)}>
              <Iconify icon="solar:printer-minimalistic-bold" />
            </IconButton>
            <IconButton onClick={onClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
          <Divider />
          <Scrollbar sx={{ p: 2.5 }}>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1}>
                <StatusLabel map={REQUEST_STATUS} value={r.status} />
                {r.category_name && <Label color="primary">{r.category_name}</Label>}
              </Stack>
              <Typography variant="h5">{r.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                {r.description || 'Pas de description.'}
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
                {[
                  ['solar:box-bold-duotone', 'Quantité', fQty(r.quantity, r.unit)],
                  ['solar:wallet-money-bold-duotone', 'Prix max', r.max_price_per_unit != null ? `${fMoney(r.max_price_per_unit)} / ${r.unit}` : 'Non précisé'],
                  ['solar:calendar-bold-duotone', 'Besoin pour le', fDate(r.needed_by)],
                  ['solar:map-point-bold-duotone', 'Lieu', r.gouvernorat ?? '—'],
                ].map(([icon, label, value]) => (
                  <Stack key={label} direction="row" spacing={1} alignItems="center">
                    <Iconify icon={icon} sx={{ color: 'primary.main' }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {label}
                      </Typography>
                      <Typography variant="subtitle2">{value}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Box>

              <Card variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.lighter', color: 'info.dark' }}>{initials(r.buyer.company_name || r.buyer.name)}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">{r.buyer.company_name || r.buyer.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Acheteur · {r.buyer.gouvernorat}
                  </Typography>
                </Box>
                <Button variant="soft" color="primary" startIcon={<Iconify icon="solar:chat-round-dots-bold" />} onClick={contact}>
                  Contacter
                </Button>
              </Card>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">{mine ? 'Ma proposition' : 'Faire une proposition'}</Typography>
                {mine && <StatusLabel map={RESPONSE_STATUS} value={mine.status} />}
              </Stack>

              {mine?.status === 'accepted' && (
                <Alert severity="success" icon={<Iconify icon="solar:confetti-bold-duotone" />}>
                  L’acheteur a accepté votre proposition ! Contactez-le pour organiser la livraison.
                </Alert>
              )}
              {!!error && <Alert severity="error">{error}</Alert>}

              {isSeller && (<TextField
                select
                label="Lier un de mes produits (optionnel)"
                value={form.product_id}
                disabled={!canAnswer}
                onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
              >
                <MenuItem value="">Aucun</MenuItem>
                {(products ?? []).map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.title} — {fQty(p.quantity_available, p.unit)}
                  </MenuItem>
                ))}
              </TextField>)}
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantité proposée"
                  value={form.proposed_quantity}
                  disabled={!canAnswer}
                  onChange={(e) => setForm((f) => ({ ...f, proposed_quantity: e.target.value }))}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">{r.unit}</InputAdornment> } }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Prix / unité"
                  value={form.proposed_price_per_unit}
                  disabled={!canAnswer}
                  onChange={(e) => setForm((f) => ({ ...f, proposed_price_per_unit: e.target.value }))}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">TND</InputAdornment> } }}
                />
              </Stack>
              <TextField
                multiline
                rows={4}
                label="Message à l’acheteur"
                placeholder="Qualité, conditionnement, délais de livraison…"
                value={form.message}
                disabled={!canAnswer}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
              {canAnswer && (
                <Stack direction="row" spacing={1.5}>
                  <LoadingButton fullWidth size="large" variant="contained" loading={sending} onClick={submit} startIcon={<Iconify icon="solar:plain-bold" />}>
                    {mine ? 'Mettre à jour' : 'Envoyer ma proposition'}
                  </LoadingButton>
                  {mine && (
                    <Button size="large" color="error" variant="soft" onClick={withdraw}>
                      Retirer
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Scrollbar>
        </>
      )}
    </Drawer>
  );
}

// ----------------------------------------------------------------------

export function RequestsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get('r');
  const { categories } = useReferenceData();
  const [filters, setFilters] = useState({ tab: 'open', q: '', category_id: '', gouvernorat: '', page: 1 });
  const [fresh, setFresh] = useState([]);

  const params = cleanParams({
    q: filters.q,
    category_id: filters.category_id,
    gouvernorat: filters.gouvernorat,
    page: filters.page,
    limit: 12,
    ...(filters.tab === 'all' ? { include_closed: true } : { status: filters.tab }),
  });
  const { data, meta, loading, reload, setData } = useApi(endpoints.requests.received, params);

  useSocketEvent('request:new', (request) => {
    setFresh((ids) => [request.id, ...ids]);
    if (filters.tab === 'open' && filters.page === 1) setData((list) => [request, ...(list ?? [])]);
  });

  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));
  const open = (id) => router.push(`?r=${id}`);
  const close = () => router.push('?');

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:inbox-in-bold-duotone"
        title="Demandes reçues"
        subtitle="Les besoins des acheteurs dans vos catégories — répondez avant les autres !"
      />

      <Card sx={{ mb: 3 }}>
        <Tabs value={filters.tab} onChange={(_, tab) => set({ tab })} sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}>
          <Tab value="open" label="Ouvertes" />
          <Tab value="in_progress" label="En cours" />
          <Tab value="all" label="Toutes" />
        </Tabs>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            placeholder="Rechercher dans les demandes…"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }}
          />
          <TextField select label="Catégorie" value={filters.category_id} onChange={(e) => set({ category_id: e.target.value })} sx={{ minWidth: 220 }}>
            <MenuItem value="">Toutes</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Gouvernorat" value={filters.gouvernorat} onChange={(e) => set({ gouvernorat: e.target.value })} sx={{ minWidth: 200 }}>
            <MenuItem value="">Tous</MenuItem>
            {GOVERNORATES.map((g) => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {loading && !data ? (
        <ListSkeleton height={280} />
      ) : data?.length ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(3, 1fr)' } }}>
          <AnimatePresence>
            {data.map((r, i) => (
              <RequestCard key={r.id} r={r} delay={i * 0.03} fresh={fresh.includes(r.id)} onOpen={open} />
            ))}
          </AnimatePresence>
        </Box>
      ) : (
        <Empty
          title="Aucune demande"
          description="Ajoutez des catégories suivies dans votre profil ou publiez des produits pour recevoir plus de demandes."
          icon="solar:inbox-bold-duotone"
        />
      )}

      <PagePagination meta={meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />

      <RequestDrawer id={openId} onClose={close} onChanged={reload} />
    </DashboardContent>
  );
}
