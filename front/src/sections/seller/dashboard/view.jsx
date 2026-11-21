import dayjs from 'dayjs';
import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useApi } from 'src/hooks/use-api';

import { fNum, fQty, fDate, fMoney, initials, fFromNow, REQUEST_STATUS } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import { endpoints } from 'src/lib/axios';
import { useSocketEvent } from 'src/lib/socket';
import { DashboardContent } from 'src/layouts/dashboard';

import { LOGO_URL } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { ProductFormDialog } from '../components/product-form-dialog';
import { Empty, KpiCard, EcoChart, StatusLabel } from '../components/ui';

// ----------------------------------------------------------------------

// localized short month (fr: « févr. », ar-tn: « فيفري »)
const monthLabel = (ym) => dayjs(`${ym}-01`).format('MMM');

function Hero({ onNewProduct }) {
  const { user } = useAuthContext();
  const hour = new Date().getHours();
  const hello = hour < 12 ? t('Bonjour') : hour < 18 ? t('Bon après-midi') : t('Bonsoir');
  return (
    <Card
      sx={{
        p: { xs: 3, md: 5 },
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        background: (theme) =>
          `linear-gradient(120deg, ${theme.vars.palette.primary.darker} 0%, ${theme.vars.palette.primary.dark} 45%, ${theme.vars.palette.primary.main} 100%)`,
      }}
    >
      <Box
        component={m.img}
        src={LOGO_URL}
        alt=""
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 0.95, x: 0 }}
        transition={{ duration: 0.8 }}
        sx={{
          position: 'absolute',
          right: { xs: -60, md: 24 },
          bottom: { xs: -20, md: 10 },
          width: { xs: 240, md: 360 },
          filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.25))',
          opacity: { xs: 0.35, md: 0.95 },
        }}
      />
      <Box sx={{ position: 'relative', maxWidth: 560 }}>
        <Typography variant="overline" sx={{ opacity: 0.8 }}>
          {t('Espace vendeur')}
        </Typography>
        <Typography variant="h3" sx={{ mt: 1 }}>
          {hello}, {user?.displayName} 👋
        </Typography>
        <Typography sx={{ mt: 1.5, opacity: 0.85 }}>
          {t('Suivez vos ventes, répondez aux demandes des acheteurs et donnez une seconde vie à vos matières.')}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={onNewProduct}
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            sx={{ bgcolor: 'common.white', color: 'primary.darker', '&:hover': { bgcolor: 'primary.lighter' } }}
          >
            {t('Publier une matière')}
          </Button>
          <Button
            component={RouterLink}
            href={paths.seller.requests}
            variant="outlined"
            startIcon={<Iconify icon="solar:inbox-in-bold-duotone" />}
            sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.5)' }}
          >
            {t('Demandes reçues')}
          </Button>
          <Button
            component={RouterLink}
            href={paths.seller.marketplace}
            variant="outlined"
            startIcon={<Iconify icon="solar:magic-stick-3-bold-duotone" />}
            sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.5)' }}
          >
            {t('Recherche IA')}
          </Button>
        </Stack>
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function SellerDashboardView() {
  const router = useRouter();
  const [openForm, setOpenForm] = useState(false);

  const overview = useApi(endpoints.reports.overview);
  const timeline = useApi(endpoints.reports.timeline, { months: 12 });
  const requests = useApi(endpoints.requests.received, { limit: 5 });
  const offers = useApi(endpoints.offers.upcoming, { limit: 4 });

  useSocketEvent('request:new', () => requests.reload());
  useSocketEvent('purchase:updated', () => overview.reload());

  const o = overview.data;
  const series = (timeline.data ?? []).map((tt) => ({ label: monthLabel(tt.month), value: tt.amount }));

  return (
    <DashboardContent maxWidth="xl">
      <Hero onNewProduct={() => setOpenForm(true)} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            loading={overview.loading}
            title={t('Produits actifs')}
            value={o ? `${o.products.active}/${o.products.total}` : '—'}
            caption={o ? t('{{n}} kg en stock', { n: fNum(o.products.stock_kg) }) : ''}
            icon="solar:box-bold-duotone"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            loading={overview.loading}
            delay={0.05}
            color="info"
            title={t('Vues des produits')}
            value={o ? fNum(o.products.total_views) : '—'}
            caption={t('Toutes périodes')}
            icon="solar:eye-bold-duotone"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            loading={overview.loading}
            delay={0.1}
            color="secondary"
            title={t('Chiffre d’affaires (12 mois)')}
            value={o ? fMoney(o.sales.revenue) : '—'}
            caption={o ? t('{{n}} kg vendus', { n: fNum(o.sales.sold_kg) }) : ''}
            icon="solar:wallet-money-bold-duotone"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader
              title={t('Revenus mensuels')}
              subheader={t('Achats réceptionnés par les points de collecte')}
              action={
                <Button component={RouterLink} href={paths.seller.reports} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>
                  {t('Détails')}
                </Button>
              }
            />
            <Box sx={{ p: 3, pt: 2 }}>
              <EcoChart series={series} format={(v) => fNum(v)} />
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title={t('Dernières demandes reçues')}
              subheader={t('Acheteurs intéressés par vos catégories')}
              action={
                <Button component={RouterLink} href={paths.seller.requests} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>
                  {t('Tout voir')}
                </Button>
              }
            />
            <Box sx={{ p: 1.5 }}>
              {(requests.data ?? []).length === 0 && !requests.loading && (
                <Empty title={t('Aucune demande pour le moment')} description={t('Elles apparaîtront ici en temps réel.')} icon="solar:inbox-bold-duotone" />
              )}
              {(requests.data ?? []).map((r) => (
                <ListItemButton
                  key={r.id}
                  onClick={() => router.push(`${paths.seller.requests}?r=${r.id}`)}
                  sx={{ borderRadius: 1.5, gap: 2, py: 1.5 }}
                >
                  <Avatar sx={{ bgcolor: 'info.lighter', color: 'info.dark' }}>{initials(r.buyer.company_name || r.buyer.name)}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {r.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {r.buyer.company_name || r.buyer.name} · {t(r.gouvernorat) ?? '—'} · {fFromNow(r.created_at)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle2">{fQty(r.quantity, r.unit)}</Typography>
                    <StatusLabel map={REQUEST_STATUS} value={r.status} />
                  </Box>
                </ListItemButton>
              ))}
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            <Card>
              <CardHeader
                title={t('Offres à venir')}
                action={
                  <Button component={RouterLink} href={paths.seller.offers} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>
                    {t('Voir')}
                  </Button>
                }
              />
              <Stack spacing={1.5} sx={{ p: 2.5 }}>
                {(offers.data ?? []).length === 0 && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t('Aucune offre programmée.')}
                  </Typography>
                )}
                {(offers.data ?? []).map((offer) => (
                  <Stack key={offer.id} direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 52,
                        py: 0.75,
                        borderRadius: 1.25,
                        textAlign: 'center',
                        bgcolor: 'primary.lighter',
                        color: 'primary.darker',
                      }}
                    >
                      <Typography variant="subtitle2">{fDate(offer.starts_at).split(' ')[0]}</Typography>
                      <Typography variant="caption">{fDate(offer.starts_at).split(' ')[1]}</Typography>
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" noWrap>
                        {offer.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {offer.collection_point?.name ?? offer.publisher.name} · {fQty(offer.quantity, offer.unit)}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <ProductFormDialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSaved={(p) => router.push(paths.seller.product(p.id))}
      />
    </DashboardContent>
  );
}
