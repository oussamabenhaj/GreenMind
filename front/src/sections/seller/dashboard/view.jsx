import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useApi } from 'src/hooks/use-api';

import { fNum, fQty, fDate, fMoney, initials, fFromNow, REQUEST_STATUS } from 'src/utils/clac';

import { endpoints } from 'src/lib/axios';
import { useSocketEvent } from 'src/lib/socket';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { LOGO_URL } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { ProductFormDialog } from '../components/product-form-dialog';
import { Ring, Empty, KpiCard, EcoChart, StatusLabel } from '../components/ui';

// ----------------------------------------------------------------------

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const monthLabel = (ym) => MONTHS[Number(ym.slice(5, 7)) - 1];

function Hero({ onNewProduct }) {
  const { user } = useAuthContext();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
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
          Espace vendeur
        </Typography>
        <Typography variant="h3" sx={{ mt: 1 }}>
          {hello}, {user?.displayName} 👋
        </Typography>
        <Typography sx={{ mt: 1.5, opacity: 0.85 }}>
          Suivez vos ventes, répondez aux demandes des acheteurs et donnez une seconde vie à vos matières.
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={onNewProduct}
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            sx={{ bgcolor: 'common.white', color: 'primary.darker', '&:hover': { bgcolor: 'primary.lighter' } }}
          >
            Publier une matière
          </Button>
          <Button
            component={RouterLink}
            href={paths.seller.requests}
            variant="outlined"
            startIcon={<Iconify icon="solar:inbox-in-bold-duotone" />}
            sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.5)' }}
          >
            Demandes reçues
          </Button>
          <Button
            component={RouterLink}
            href={paths.seller.marketplace}
            variant="outlined"
            startIcon={<Iconify icon="solar:magic-stick-3-bold-duotone" />}
            sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.5)' }}
          >
            Recherche IA
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
  const discounts = useApi(endpoints.discounts.mine, { state: 'active', limit: 4 });

  useSocketEvent('request:new', () => requests.reload());
  useSocketEvent('purchase:updated', () => overview.reload());

  const o = overview.data;
  const series = (timeline.data ?? []).map((t) => ({ label: monthLabel(t.month), value: t.amount }));

  return (
    <DashboardContent maxWidth="xl">
      <Hero onNewProduct={() => setOpenForm(true)} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            loading={overview.loading}
            title="Produits actifs"
            value={o ? `${o.products.active}/${o.products.total}` : '—'}
            caption={o ? `${fNum(o.products.stock_kg)} kg en stock` : ''}
            icon="solar:box-bold-duotone"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            loading={overview.loading}
            delay={0.05}
            color="info"
            title="Vues des produits"
            value={o ? fNum(o.products.total_views) : '—'}
            caption="Toutes périodes"
            icon="solar:eye-bold-duotone"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            loading={overview.loading}
            delay={0.1}
            color="secondary"
            title="Chiffre d’affaires (12 mois)"
            value={o ? fMoney(o.sales.revenue) : '—'}
            caption={o ? `${fNum(o.sales.sold_kg)} kg vendus` : ''}
            icon="solar:wallet-money-bold-duotone"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            loading={overview.loading}
            delay={0.15}
            color="warning"
            title="Remises actives"
            value={o ? o.discounts.active : '—'}
            caption={o ? `${o.discounts.total} au total` : ''}
            icon="solar:tag-price-bold-duotone"
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader
              title="Revenus mensuels"
              subheader="Achats réceptionnés par les points de collecte"
              action={
                <Button component={RouterLink} href={paths.seller.reports} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>
                  Détails
                </Button>
              }
            />
            <Box sx={{ p: 3, pt: 2 }}>
              <EcoChart series={series} format={(v) => fNum(v)} />
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: 1, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <Typography variant="h6" sx={{ alignSelf: 'flex-start' }}>
              Taux d’acceptation
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', alignSelf: 'flex-start', mb: 3 }}>
              Vos propositions acceptées par les acheteurs
            </Typography>
            <Ring value={o?.requests.acceptance_rate_percent ?? 0} size={160} label="acceptées" />
            <Stack direction="row" divider={<Divider orientation="vertical" flexItem />} spacing={3} sx={{ mt: 3 }}>
              {[
                ['Envoyées', o?.requests.responses_sent],
                ['Acceptées', o?.requests.responses_accepted],
                ['En attente', o?.requests.responses_pending],
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography variant="h6">{value ?? 0}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader
              title="Dernières demandes reçues"
              subheader="Acheteurs intéressés par vos catégories"
              action={
                <Button component={RouterLink} href={paths.seller.requests} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>
                  Tout voir
                </Button>
              }
            />
            <Box sx={{ p: 1.5 }}>
              {(requests.data ?? []).length === 0 && !requests.loading && (
                <Empty title="Aucune demande pour le moment" description="Elles apparaîtront ici en temps réel." icon="solar:inbox-bold-duotone" />
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
                      {r.buyer.company_name || r.buyer.name} · {r.gouvernorat ?? '—'} · {fFromNow(r.created_at)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle2">{fQty(r.quantity, r.unit)}</Typography>
                    {r.my_response_status ? (
                      <Label color="success">Répondu</Label>
                    ) : (
                      <StatusLabel map={REQUEST_STATUS} value={r.status} />
                    )}
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
                title="Offres à venir"
                action={
                  <Button component={RouterLink} href={paths.seller.offers} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>
                    Voir
                  </Button>
                }
              />
              <Stack spacing={1.5} sx={{ p: 2.5 }}>
                {(offers.data ?? []).length === 0 && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Aucune offre programmée.
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

            <Card>
              <CardHeader
                title="Mes remises en cours"
                action={
                  <Button component={RouterLink} href={paths.seller.discounts} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>
                    Gérer
                  </Button>
                }
              />
              <Stack spacing={1.5} sx={{ p: 2.5 }}>
                {(discounts.data ?? []).length === 0 && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Aucune remise active — attirez plus d’acheteurs avec une promotion.
                  </Typography>
                )}
                {(discounts.data ?? []).map((d) => (
                  <Stack key={d.id} direction="row" spacing={2} alignItems="center">
                    <Label color="error" variant="filled" sx={{ minWidth: 56 }}>
                      -{d.percentage}%
                    </Label>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>
                        {d.product.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Jusqu’au {fDate(d.ends_at)}
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
