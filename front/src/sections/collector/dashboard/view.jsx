import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import ListItemButton from '@mui/material/ListItemButton';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useApi } from 'src/hooks/use-api';
import { useSpace } from 'src/hooks/use-space';

import { fNum, fQty, fMoney, fFromNow, PURCHASE_STATUS } from 'src/utils/clac';

import { endpoints } from 'src/lib/axios';
import { useSocketEvent } from 'src/lib/socket';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { LOGO_URL } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { Ring, Empty, KpiCard, EcoChart, greeting, HeroBanner, StatusLabel, heroButtonSx } from '../../seller/components/ui';

// ----------------------------------------------------------------------

export function CollectorDashboardView() {
  const router = useRouter();
  const sp = useSpace();
  const { user } = useAuthContext();
  const overview = useApi(endpoints.reports.overview);
  const timeline = useApi(endpoints.reports.timeline, { months: 12 });
  const points = useApi(`${endpoints.collectionPoints}/mine`, { limit: 6 });
  const purchases = useApi(endpoints.purchases.list, { limit: 5 });
  const requests = useApi(endpoints.requests.received, { limit: 4 });

  useSocketEvent('purchase:updated', () => { purchases.reload(); overview.reload(); });
  useSocketEvent('stock:updated', () => { points.reload(); overview.reload(); });
  useSocketEvent('request:new', () => requests.reload());

  const o = overview.data;
  const series = (timeline.data ?? []).map((t) => ({ label: dayjs(`${t.month}-01`).format('MMM'), value: t.quantity_kg }));

  return (
    <DashboardContent maxWidth="xl">
      <HeroBanner
        logo={LOGO_URL}
        kicker="Espace point de collecte"
        title={`${greeting()}, ${user?.displayName} 👋`}
        subtitle="Gérez vos achats, votre stock et vos offres — et répondez aux demandes des acheteurs de votre région."
        actions={
          <>
            <Button component={RouterLink} href={sp.purchases} variant="contained" startIcon={<Iconify icon="solar:cart-plus-bold" />} sx={heroButtonSx.primary}>
              Nouvel achat
            </Button>
            <Button component={RouterLink} href={sp.offers} variant="outlined" startIcon={<Iconify icon="solar:calendar-add-bold-duotone" />} sx={heroButtonSx.ghost}>
              Publier une offre
            </Button>
            <Button component={RouterLink} href={sp.storage} variant="outlined" startIcon={<Iconify icon="solar:box-bold-duotone" />} sx={heroButtonSx.ghost}>
              Mon stock
            </Button>
          </>
        }
      />

      <Grid container spacing={3}>
        {[
          ['Points de collecte', o?.storage.points ?? 0, 'solar:map-point-wave-bold-duotone', 'info', `${fNum(o?.storage.capacity_kg ?? 0)} kg de capacité`],
          ['Achats à traiter', (o?.purchases.pending ?? 0) + (o?.purchases.confirmed ?? 0), 'solar:hourglass-bold-duotone', 'warning', `${o?.purchases.pending ?? 0} en attente · ${o?.purchases.confirmed ?? 0} confirmés`],
          ['Réceptionné (12 mois)', `${fNum(o?.purchases.received_kg ?? 0)} kg`, 'solar:import-bold-duotone', 'primary', `${o?.purchases.received ?? 0} opérations`],
          ['Dépensé (12 mois)', fMoney(o?.purchases.spent ?? 0), 'solar:wallet-money-bold-duotone', 'secondary', `${o?.offers.published ?? 0} offre(s) publiée(s)`],
        ].map(([title, value, icon, color, caption], i) => (
          <Grid key={title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard title={title} value={value} caption={caption} icon={icon} color={color} loading={overview.loading} delay={i * 0.05} />
          </Grid>
        ))}

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="Matières réceptionnées (kg)" subheader="12 derniers mois" />
            <Box sx={{ p: 3 }}>
              <EcoChart series={series} type="bar" format={fNum} />
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: 1, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ alignSelf: 'flex-start', mb: 2 }}>Occupation globale</Typography>
            <Ring value={o?.storage.usage_percent ?? 0} size={170} label="du stockage" />
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              {fNum(o?.storage.used_kg ?? 0)} / {fNum(o?.storage.capacity_kg ?? 0)} kg
            </Typography>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="Mes points" action={<Button component={RouterLink} href={sp.points} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>Gérer</Button>} />
            <Stack spacing={2.5} sx={{ p: 3 }}>
              {points.data?.length === 0 && <Empty title="Aucun point" description="Créez votre premier point de collecte." icon="solar:map-point-add-bold-duotone" />}
              {(points.data ?? []).map((p) => {
                const usage = p.storage_capacity_kg ? (p.storage_used_kg / p.storage_capacity_kg) * 100 : 0;
                return (
                  <Box key={p.id} onClick={() => router.push(`${sp.storage}?p=${p.id}`)} sx={{ cursor: 'pointer' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                      <Typography variant="subtitle2">
                        {p.name} {!p.is_verified && <Label color="warning" sx={{ ml: 1 }}>À valider</Label>}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {Math.round(usage)}% · {p.is_open_now ? '🟢 ouvert' : '⚪ fermé'}
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.min(usage, 100)} color={usage > 90 ? 'error' : usage > 70 ? 'warning' : 'primary'} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="Derniers achats" action={<Button component={RouterLink} href={sp.purchases} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>Tout voir</Button>} />
            <Stack spacing={1.5} sx={{ p: 2.5 }}>
              {(purchases.data ?? []).map((pu) => (
                <Stack key={pu.id} direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.lighter', color: 'primary.dark' }}>
                    <Iconify icon="solar:cart-large-4-bold-duotone" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{pu.label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {pu.seller?.company_name || pu.seller?.name || 'Non inscrit'} · {fNum(pu.quantity_kg)} kg · {fMoney(pu.total_amount)}
                    </Typography>
                  </Box>
                  <StatusLabel map={PURCHASE_STATUS} value={pu.status} />
                </Stack>
              ))}
              {purchases.data?.length === 0 && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Aucun achat.</Typography>}
            </Stack>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardHeader title="Demandes d’achat de la région" subheader="Les acheteurs qui cherchent ce que vous stockez" action={<Button component={RouterLink} href={sp.requests} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>Répondre</Button>} />
            <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              {(requests.data ?? []).map((r) => (
                <ListItemButton key={r.id} onClick={() => router.push(`${sp.requests}?r=${r.id}`)} sx={{ borderRadius: 1.5, gap: 2 }}>
                  <Iconify icon="solar:inbox-in-bold-duotone" width={28} sx={{ color: 'info.main' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{r.title}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {r.buyer.company_name || r.buyer.name} · {fQty(r.quantity, r.unit)} · {fFromNow(r.created_at)}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
              {requests.data?.length === 0 && <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>Aucune demande ouverte dans vos catégories.</Typography>}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
