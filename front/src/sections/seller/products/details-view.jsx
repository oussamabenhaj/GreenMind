import { useState } from 'react';
import { useParams } from 'react-router';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useApi } from 'src/hooks/use-api';
import { useSpace } from 'src/hooks/use-space';

import { fQty, fDate, fMoney, priceOf, fDateTime, quantityDiscountThreshold } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { openConversation } from '../components/contact';
import { ProductCover } from '../components/product-card';
import { printDocument } from '../components/print-button';
import { ProductFormDialog } from '../components/product-form-dialog';
import { RequestFormDialog } from '../../buyer/requests/request-form-dialog';
// ----------------------------------------------------------------------

function Info({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box sx={{ width: 40, height: 40, borderRadius: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.lighter', color: 'primary.dark' }}>
        <Iconify icon={icon} />
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="subtitle2">{value ?? '—'}</Typography>
      </Box>
    </Stack>
  );
}

export function ProductDetailsView() {
  const { id } = useParams();
  const { user } = useAuthContext();
  const { data: p, loading, reload } = useApi(endpoints.products.details(id));
  const [edit, setEdit] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [photo, setPhoto] = useState(0);
  const sp = useSpace();
  const router = useRouter();

  if (loading && !p) {
    return (
      <DashboardContent>
        <Skeleton variant="rounded" height={420} />
      </DashboardContent>
    );
  }
  if (!p) return null;

  const mine = p.seller_id === user?.id;
  const { base, price, percent } = priceOf(p);
  const discountThreshold = p.quantity_discount_enabled ? quantityDiscountThreshold(p) : null;

  return (
    <DashboardContent maxWidth="lg">
      <Button component={RouterLink} href={mine ? sp.products : sp.market} startIcon={<Iconify icon="eva:arrow-ios-back-fill" />} sx={{ mb: 2 }}>
        {mine ? t('Mes produits') : t('Market')}
      </Button>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ overflow: 'hidden' }}>
            <ProductCover product={{ ...p, images: p.images?.length ? [p.images[photo] ?? p.images[0]] : [] }} height={380} />
            {p.images?.length > 1 && (
              <Stack direction="row" spacing={1} sx={{ p: 1.5 }}>
                {p.images.map((src, i) => (
                  <Box
                    key={src}
                    component="img"
                    src={src}
                    onClick={() => setPhoto(i)}
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 1,
                      objectFit: 'cover',
                      cursor: 'pointer',
                      transition: 'all .2s',
                      opacity: photo === i ? 1 : 0.6,
                      outline: (theme) => (photo === i ? `2px solid ${theme.vars.palette.primary.main}` : 'none'),
                      outlineOffset: 2,
                      '&:hover': { opacity: 1 },
                    }}
                  />
                ))}
              </Stack>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1}>
              <Label color="primary">{p.category_name}</Label>
              {p.market_name && <Label color="info">{p.market_name}</Label>}
              <Label color={p.is_active ? 'success' : 'default'}>{p.is_active ? t('Visible') : t('Masqué')}</Label>
            </Stack>
            <Typography variant="h3">{p.title}</Typography>

            <Stack direction="row" alignItems="baseline" spacing={1.5}>
              <Typography variant="h3" sx={{ color: 'primary.dark' }}>
                {base == null ? t('Sur devis') : fMoney(price)}
              </Typography>
              {percent > 0 && (
                <>
                  <Typography variant="h6" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>
                    {fMoney(base)}
                  </Typography>
                  <Label color="error" variant="filled">
                    -{percent}%
                  </Label>
                </>
              )}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                / {p.unit}
              </Typography>
            </Stack>

            {discountThreshold != null && (
              <Typography variant="body2" sx={{ color: 'success.darker' }}>
                {t('Remise quantité : -10 % pour toute commande supérieure à')} {fQty(discountThreshold, p.unit)} {t('(la moitié du stock affiché) et -15 % pour toute la quantité. Appliquée automatiquement aux demandes qui y donnent droit.')}
              </Typography>
            )}

            <Typography sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>{p.description || t('Aucune description.')}</Typography>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <Info icon="solar:box-bold-duotone" label={t('Disponible')} value={fQty(p.quantity_available, p.unit)} />
              <Info icon="solar:map-point-bold-duotone" label={t('Localisation')} value={[p.address, p.gouvernorat].filter(Boolean).join(', ')} />
              <Info icon="solar:calendar-bold-duotone" label={t('Disponible jusqu’au')} value={fDate(p.available_until)} />
              <Info icon="solar:eye-bold-duotone" label={t('Vues')} value={p.views_count} />
              <Info icon="solar:clock-circle-bold-duotone" label={t('Publié le')} value={fDateTime(p.created_at)} />
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Stack direction="row" flexWrap="wrap" gap={1.5}>
              {mine && (
                <Button variant="contained" startIcon={<Iconify icon="solar:pen-bold" />} onClick={() => setEdit(true)}>
                  {t('Modifier')}
                </Button>
              )}
              {!mine && user?.role === 'buyer' && (
                <Button variant="contained" startIcon={<Iconify icon="solar:inbox-out-bold" />} onClick={() => setRequestOpen(true)}>
                  {t('Faire une demande')}
                </Button>
              )}
              {!mine && user?.role !== 'seller' && (
                <Button
                  variant="soft"
                  startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
                  onClick={async () =>
                    router.push(await openConversation(p.seller_id, { body: t('Bonjour, je suis intéressé(e) par « {{title}} ».', { title: p.title }), context_type: 'product', context_id: p.id }))
                  }
                >
                  {t('Contacter le vendeur')}
                </Button>
              )}
              <Button variant="outlined" color="inherit" startIcon={<Iconify icon="solar:printer-minimalistic-bold" />} onClick={() => printDocument('products', p.id)}>
                {t('Imprimer la fiche')}
              </Button>
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      <ProductFormDialog open={edit} product={p} onClose={() => setEdit(false)} onSaved={reload} />
      <RequestFormDialog open={requestOpen} product={p} onClose={() => setRequestOpen(false)} onSaved={() => router.push(`${sp.requests}`)} />
    </DashboardContent>
  );
}
