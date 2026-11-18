import dayjs from 'dayjs';
import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { fQty, fMoney, fDateTime, GOVERNORATES } from 'src/utils/clac';

import { endpoints } from 'src/lib/axios';
import { useSocketEvent } from 'src/lib/socket';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { openConversation } from '../components/contact';
import { printDocument } from '../components/print-button';
import { Empty, PageHeader, ListSkeleton, PagePagination, useReferenceData } from '../components/ui';

// ----------------------------------------------------------------------

function Countdown({ date }) {
  const d = dayjs(date);
  const days = d.diff(dayjs(), 'day');
  const hours = d.diff(dayjs(), 'hour') % 24;
  if (d.isBefore(dayjs())) return <Label color="success">En cours</Label>;
  return (
    <Label color="info" startIcon={<Iconify icon="solar:clock-circle-bold" />}>
      J-{days} {hours}h
    </Label>
  );
}

export function OffersView({ embedded = false }) {
  const Wrapper = embedded ? Box : DashboardContent;
  const { user } = useAuthContext();
  const router = useRouter();
  const { categories, markets } = useReferenceData();
  const [filters, setFilters] = useState({ timing: 'upcoming', category_id: '', market_id: '', gouvernorat: '', page: 1 });

  const url = filters.timing === 'upcoming' ? endpoints.offers.upcoming : endpoints.offers.list;
  const { data, meta, loading, reload } = useApi(
    url,
    cleanParams({ ...filters, timing: filters.timing === 'all' ? '' : filters.timing, limit: 12 })
  );
  useSocketEvent('offer:published', reload);

  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  return (
    <Wrapper {...(!embedded && { maxWidth: 'xl' })}>
      {!embedded && <PageHeader
        icon="solar:calendar-mark-bold-duotone"
        title="Offres des points de collecte"
        subtitle="Anticipez les opportunités : lots à venir et offres en cours sur le marché"
      />}

      <Card sx={{ mb: 3 }}>
        <Tabs value={filters.timing} onChange={(_, timing) => set({ timing })} sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}>
          <Tab value="upcoming" label="À venir" icon={<Iconify icon="solar:calendar-add-bold" />} iconPosition="start" />
          <Tab value="ongoing" label="En cours" icon={<Iconify icon="solar:play-circle-bold" />} iconPosition="start" />
          <Tab value="all" label="Toutes" />
        </Tabs>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          {[
            ['category_id', 'Catégorie', categories.map((c) => [c.id, c.name])],
            ['market_id', 'Marché', markets.map((mk) => [mk.id, mk.name])],
            ['gouvernorat', 'Gouvernorat', GOVERNORATES.map((g) => [g, g])],
          ].map(([key, label, options]) => (
            <TextField key={key} select fullWidth label={label} value={filters[key]} onChange={(e) => set({ [key]: e.target.value })}>
              <MenuItem value="">Tous</MenuItem>
              {options.map(([value, text]) => (
                <MenuItem key={value} value={value}>
                  {text}
                </MenuItem>
              ))}
            </TextField>
          ))}
        </Stack>
      </Card>

      {loading && !data ? (
        <ListSkeleton height={200} />
      ) : data?.length ? (
        <Stack spacing={2}>
          {data.map((o, i) => (
            <Card
              key={o.id}
              component={m.div}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              sx={{ p: 0, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, overflow: 'hidden' }}
            >
              <Box
                sx={{
                  width: { sm: 130 },
                  py: 3,
                  flexShrink: 0,
                  textAlign: 'center',
                  color: 'common.white',
                  background: (theme) => `linear-gradient(160deg, ${theme.vars.palette.primary.main}, ${theme.vars.palette.primary.darker})`,
                }}
              >
                <Typography variant="h2" sx={{ lineHeight: 1 }}>
                  {dayjs(o.starts_at).format('DD')}
                </Typography>
                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase' }}>
                  {dayjs(o.starts_at).format('MMM YYYY')}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {dayjs(o.starts_at).format('HH:mm')}
                </Typography>
              </Box>
              <Box sx={{ p: 2.5, flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Countdown date={o.starts_at} />
                  {o.category_name && <Label color="primary">{o.category_name}</Label>}
                  {o.market_name && <Label color="secondary">{o.market_name}</Label>}
                </Stack>
                <Typography variant="h6">{o.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  <Iconify icon="solar:map-point-wave-bold" width={16} sx={{ mr: 0.5, verticalAlign: 'middle', color: 'primary.main' }} />
                  {o.collection_point?.name ?? (o.publisher.company_name || o.publisher.name)} · {o.gouvernorat ?? '—'}
                </Typography>
                <Stack direction="row" spacing={4} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      Quantité
                    </Typography>
                    <Typography variant="subtitle1">{fQty(o.quantity, o.unit)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      Prix
                    </Typography>
                    <Typography variant="subtitle1">{o.price_per_unit != null ? `${fMoney(o.price_per_unit)} / ${o.unit}` : 'Sur devis'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      Fin
                    </Typography>
                    <Typography variant="subtitle1">{fDateTime(o.ends_at)}</Typography>
                  </Box>
                </Stack>
              </Box>
              <Stack spacing={1} justifyContent="center" sx={{ p: 2.5 }}>
{o.publisher_id !== user?.id && (
                <Button variant="contained" startIcon={<Iconify icon="solar:chat-round-dots-bold" />} onClick={async () => router.push(await openConversation(o.publisher_id, { body: `Bonjour, je suis intéressé(e) par votre offre « ${o.title} ».`, context_type: 'offer', context_id: o.id }))}>
                  Contacter
                </Button>
                )}
                <Button variant="outlined" color="inherit" startIcon={<Iconify icon="solar:printer-minimalistic-bold" />} onClick={() => printDocument('offers', o.id)}>
                  Imprimer
                </Button>
              </Stack>
            </Card>
          ))}
        </Stack>
      ) : (
        <Empty title="Aucune offre" description="Les nouvelles offres apparaissent ici dès leur publication." icon="solar:calendar-search-bold-duotone" />
      )}

      <PagePagination meta={meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </Wrapper>
  );
}
