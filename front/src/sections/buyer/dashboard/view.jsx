import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useApi } from 'src/hooks/use-api';
import { useSpace } from 'src/hooks/use-space';

import { fQty, fFromNow, REQUEST_STATUS } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import { endpoints } from 'src/lib/axios';
import { useSocketEvent } from 'src/lib/socket';
import { DashboardContent } from 'src/layouts/dashboard';

import { LOGO_URL } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { ProductCard } from '../../seller/components/product-card';
import { RequestFormDialog } from '../requests/request-form-dialog';
import { Empty, KpiCard, greeting, HeroBanner, StatusLabel, heroButtonSx } from '../../seller/components/ui';

// ----------------------------------------------------------------------

export function BuyerDashboardView() {
  const router = useRouter();
  const sp = useSpace();
  const { user } = useAuthContext();
  const [create, setCreate] = useState(false);

  const overview = useApi(endpoints.reports.overview);
  const requests = useApi(`${endpoints.requests.list}/mine`, { limit: 5 });
  const products = useApi(endpoints.products.list, { limit: 4, sort: 'popular', ...(user?.category_ids?.[0] && { category_id: user.category_ids[0] }) });

  useSocketEvent('notification:new', (n) => n.type?.startsWith('request.') && (requests.reload(), overview.reload()));

  const o = overview.data;

  return (
    <DashboardContent maxWidth="xl">
      <HeroBanner
        logo={LOGO_URL}
        kicker={t('Espace acheteur')}
        title={`${greeting()}, ${user?.displayName} 👋`}
        subtitle={t('Trouvez les matières dont vous avez besoin et commandez au prix affiché, remise quantité comprise.')}
        actions={
          <>
            <Button variant="contained" onClick={() => setCreate(true)} startIcon={<Iconify icon="solar:add-circle-bold" />} sx={heroButtonSx.primary}>
              {t('Publier un besoin')}
            </Button>
            <Button component={RouterLink} href={sp.marketplace} variant="outlined" startIcon={<Iconify icon="solar:magic-stick-3-bold-duotone" />} sx={heroButtonSx.ghost}>
              {t('Recherche IA')}
            </Button>          </>
        }
      />

      <Grid container spacing={3}>
        {[
          [t('Demandes ouvertes'), o?.requests.open, 'solar:inbox-out-bold-duotone', 'primary', t('{{v}} au total', { v: o?.requests.total ?? 0 })],
          [t('En cours'), o?.requests.in_progress, 'solar:hourglass-bold-duotone', 'info', t('Contact établi')],
          [t('Satisfaites'), o?.requests.fulfilled, 'solar:check-circle-bold-duotone', 'secondary', t('Besoins couverts')],
        ].map(([title, value, icon, color, caption], i) => (
          <Grid key={title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard title={title} value={value ?? 0} icon={icon} color={color} caption={caption} loading={overview.loading} delay={i * 0.05} />
          </Grid>
        ))}

        <Grid size={12}>
          <Card sx={{ height: 1 }}>
            <CardHeader
              title={t('Mes dernières demandes')}
              action={<Button component={RouterLink} href={sp.requests} size="small" endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>{t('Tout voir')}</Button>}
            />
            <Box sx={{ p: 1.5 }}>
              {requests.data?.length === 0 && (
                <Empty title={t('Aucune demande')} description={t('Publiez un besoin pour être contacté par les vendeurs.')} icon="solar:inbox-out-bold-duotone" action={<Button variant="contained" onClick={() => setCreate(true)}>{t('Publier un besoin')}</Button>} />
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
                  <StatusLabel map={REQUEST_STATUS} value={r.status} />
                </ListItemButton>
              ))}
            </Box>
          </Card>
        </Grid>

        <Grid size={12}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('Sélectionnés pour vous')}
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
