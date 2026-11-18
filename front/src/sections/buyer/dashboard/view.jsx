import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useApi } from 'src/hooks/use-api';
import { useSpace } from 'src/hooks/use-space';

import { fQty, fDate, fMoney, fFromNow, REQUEST_STATUS } from 'src/utils/clac';

import { endpoints } from 'src/lib/axios';
import { useSocketEvent } from 'src/lib/socket';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { LOGO_URL } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { ProductCard } from '../../seller/components/product-card';
import { RequestFormDialog } from '../requests/request-form-dialog';
import { Ring, Empty, KpiCard, greeting, HeroBanner, StatusLabel, heroButtonSx } from '../../seller/components/ui';

// ----------------------------------------------------------------------

export function BuyerDashboardView() {
  const router = useRouter();
  const sp = useSpace();
  const { user } = useAuthContext();
  const [create, setCreate] = useState(false);

  const overview = useApi(endpoints.reports.overview);
  const requests = useApi(`${endpoints.requests.list}/mine`, { limit: 5 });
  const deals = useApi(endpoints.discounts.list, { limit: 4, sort: 'percentage' });
  const products = useApi(endpoints.products.list, { limit: 4, sort: 'popular', ...(user?.category_ids?.[0] && { category_id: user.category_ids[0] }) });

  useSocketEvent('notification:new', (n) => n.type?.startsWith('request.') && (requests.reload(), overview.reload()));

  const o = overview.data;
  const acceptance = o?.responses.received ? (o.responses.accepted / o.responses.received) * 100 : 0;

  return (
    <DashboardContent maxWidth="xl">
      <HeroBanner
        logo={LOGO_URL}
        kicker="Espace acheteur"
        title={`${greeting()}, ${user?.displayName} 👋`}
        subtitle="Trouvez les matières dont vous avez besoin, comparez les offres et négociez en direct avec les vendeurs."
        actions={
          <>
            <Button variant="contained" onClick={() => setCreate(true)} startIcon={<Iconify icon="solar:add-circle-bold" />} sx={heroButtonSx.primary}>
              Publier un besoin
            </Button>
            <Button component={RouterLink} href={sp.marketplace} variant="outlined" startIcon={<Iconify icon="solar:magic-stick-3-bold-duotone" />} sx={heroButtonSx.ghost}>
              Recherche IA
            </Button>
            <Button component={RouterLink} href={sp.discounts} variant="outlined" startIcon={<Iconify icon="solar:tag-price-bold-duotone" />} sx={heroButtonSx.ghost}>
              Bons plans
            </Button>
          </>
        }
      />

      <Grid container spacing={3}>
        {[
          ['Demandes ouvertes', o?.requests.open, 'solar:inbox-out-bold-duotone', 'primary', `${o?.requests.total ?? 0} au total`],
          ['En cours', o?.requests.in_progress, 'solar:hourglass-bold-duotone', 'info', 'Proposition acceptée'],
          ['Satisfaites', o?.requests.fulfilled, 'solar:check-circle-bold-duotone', 'secondary', 'Besoins couverts'],
          ['Propositions reçues', o?.responses.received, 'solar:chat-round-check-bold-duotone', 'warning', `${o?.responses.accepted ?? 0} acceptée(s)`],
        ].map(([title, value, icon, color, caption], i) => (
          <Grid key={title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard title={title} value={value ?? 0} icon={icon} color={color} caption={caption} loading={overview.loading} delay={i * 0.05} />
          </Grid>
        ))}

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader
              title="Mes dernières demandes"
              action={<Button component={RouterLink} href={sp.requests} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>Tout voir</Button>}
            />
            <Box sx={{ p: 1.5 }}>
              {requests.data?.length === 0 && (
                <Empty title="Aucune demande" description="Publiez un besoin pour recevoir des propositions." icon="solar:inbox-out-bold-duotone" action={<Button variant="contained" onClick={() => setCreate(true)}>Publier un besoin</Button>} />
              )}
              {(requests.data ?? []).map((r) => (
                <ListItemButton key={r.id} onClick={() => router.push(`${sp.requests}?r=${r.id}`)} sx={{ borderRadius: 1.5, gap: 2, py: 1.5 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.lighter', color: 'primary.dark', flexShrink: 0 }}>
                    <Iconify icon="solar:inbox-out-bold-duotone" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {r.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {fQty(r.quantity, r.unit)} · {fFromNow(r.created_at)}
                    </Typography>
                  </Box>
                  <Stack alignItems="flex-end" spacing={0.5}>
                    <StatusLabel map={REQUEST_STATUS} value={r.status} />
                    <Typography variant="caption" sx={{ color: r.responses_count ? 'primary.main' : 'text.disabled', fontWeight: 600 }}>
                      {r.responses_count} proposition(s)
                    </Typography>
                  </Stack>
                </ListItemButton>
              ))}
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: 1, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ alignSelf: 'flex-start', mb: 3 }}>
              Propositions acceptées
            </Typography>
            <Ring value={acceptance} size={160} label="du total reçu" />
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 3, textAlign: 'center' }}>
              Comparez les propositions et acceptez la meilleure directement depuis vos demandes.
            </Typography>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardHeader
              title="🏷️ Meilleures remises du moment"
              action={<Button component={RouterLink} href={sp.discounts} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>Toutes les remises</Button>}
            />
            <Box sx={{ p: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' } }}>
              {(deals.data ?? []).map((d) => (
                <Card key={d.id} variant="outlined" onClick={() => router.push(sp.product(d.product_id))} sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'error.main' } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Label color="error" variant="filled">-{d.percentage}%</Label>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>jusqu’au {fDate(d.ends_at)}</Typography>
                  </Stack>
                  <Typography variant="subtitle2" sx={{ mt: 1.5 }} noWrap>{d.product.title}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{d.seller.company_name || d.seller.name}</Typography>
                  <Typography variant="h6" sx={{ color: 'primary.dark', mt: 1 }}>
                    {fMoney(d.discounted_price_per_unit)}
                    <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.disabled', textDecoration: 'line-through' }}>{fMoney(d.product.price_per_unit)}</Typography>
                  </Typography>
                </Card>
              ))}
              {deals.data?.length === 0 && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Aucune remise active.</Typography>}
            </Box>
          </Card>
        </Grid>

        <Grid size={12}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Sélectionnés pour vous
          </Typography>
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' } }}>
            {(products.data ?? []).map((p, i) => (
              <ProductCard key={p.id} product={p} showSeller delay={i * 0.05} />
            ))}
          </Box>
        </Grid>
      </Grid>

      <RequestFormDialog open={create} onClose={() => setCreate(false)} onSaved={(r) => router.push(`${sp.requests}?r=${r.id}`)} />
    </DashboardContent>
  );
}
