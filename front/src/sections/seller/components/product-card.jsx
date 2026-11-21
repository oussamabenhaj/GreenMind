import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { useSpace } from 'src/hooks/use-space';

import { fQty, fMoney, priceOf, quantityDiscountThreshold } from 'src/utils/clac';

import { t } from 'src/locales/i18n';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
// ----------------------------------------------------------------------

const CATEGORY_VISUALS = {
  'olive-pomace': { icon: 'game-icons:olive', from: '#5F7F1F', to: '#9CC24B' },
  'used-cooking-oil': { icon: 'mdi:oil', from: '#C08A12', to: '#F4C94B' },
  'organic-waste': { icon: 'mdi:sprout', from: '#2A7A23', to: '#8BD35A' },
  plastic: { icon: 'mdi:bottle-soda-classic-outline', from: '#18719C', to: '#7FD3EE' },
  'paper-cardboard': { icon: 'mdi:package-variant', from: '#8D5A2B', to: '#D9A86C' },
  metal: { icon: 'mdi:nut', from: '#455A64', to: '#B0BEC5' },
  glass: { icon: 'mdi:glass-fragile', from: '#00838F', to: '#80DEEA' },
  textile: { icon: 'mdi:tshirt-crew-outline', from: '#6A1B9A', to: '#CE93D8' },
};

export const visualFor = (slug) => CATEGORY_VISUALS[slug] ?? { icon: 'solar:leaf-bold-duotone', from: '#2A7A23', to: '#8BD35A' };

/** Cover: first photo, or a category gradient with its icon. */
export function ProductCover({ product, height = 168, sx }) {
  const visual = visualFor(product.category_slug);
  const image = product.images?.[0];
  return (
    <Box
      sx={[
        {
          height,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: image ? undefined : `linear-gradient(135deg, ${visual.from}, ${visual.to})`,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {image ? (
        <Box component="img" src={image} alt={product.title} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
      ) : (
        <>
          <Iconify icon={visual.icon} width={72} sx={{ color: 'rgba(255,255,255,0.92)' }} />
          <Iconify
            icon="solar:refresh-circle-bold-duotone"
            width={140}
            sx={{ position: 'absolute', right: -30, bottom: -30, color: 'rgba(255,255,255,0.15)' }}
          />
        </>
      )}
    </Box>
  );
}

export function ProductCard({ product, onEdit, onDelete, showSeller = false, delay = 0 }) {
  const sp = useSpace();
  const { base, price, best, percent, bestPercent } = priceOf(product);
  const discountThreshold = product.quantity_discount_enabled ? quantityDiscountThreshold(product) : null;
  return (
    <Card
      component={m.div}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      whileHover={{ y: -4 }}
      sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 1 }}
    >
      <Box sx={{ position: 'relative' }}>
        <ProductCover product={product} />
        <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 12, left: 12 }}>
          {!product.is_active && <Label color="default" variant="filled">{t('Masqué')}</Label>}
          {percent > 0 && (
            <Label color="error" variant="filled">
              -{percent}%
            </Label>
          )}
        </Stack>
        {(onEdit || onDelete) && (
          <Stack direction="row" sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.9)', borderRadius: 1 }}>
            {onEdit && (
              <Tooltip title={t('Modifier')}>
                <IconButton size="small" onClick={() => onEdit(product)}>
                  <Iconify icon="solar:pen-bold" width={18} />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title={t('Supprimer')}>
                <IconButton size="small" color="error" onClick={() => onDelete(product)}>
                  <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
      </Box>

      <Stack spacing={1} sx={{ p: 2.5, flexGrow: 1 }}>
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
          {product.category_name ?? t('Matière')}
          {product.market_name ? ` · ${product.market_name}` : ''}
        </Typography>
        <Typography
          component={RouterLink}
          href={sp.product(product.id)}
          variant="subtitle1"
          sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
        >
          {product.title}
        </Typography>
        {showSeller && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {product.seller?.company_name || product.seller?.name}
            {product.seller?.is_verified && (
              <Iconify icon="solar:verified-check-bold" width={16} sx={{ color: 'info.main', ml: 0.5, verticalAlign: 'middle' }} />
            )}
          </Typography>
        )}
        <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', typography: 'caption' }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify icon="solar:map-point-bold" width={16} />
            <span>{t(product.gouvernorat) ?? '—'}</span>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify icon="solar:eye-bold" width={16} />
            <span>{product.views_count ?? 0}</span>
          </Stack>
          {product.distance_km != null && <span>{product.distance_km} {t('km')}</span>}
        </Stack>

        {discountThreshold != null && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ typography: 'caption', color: 'success.darker' }}>
            <Iconify icon="solar:tag-price-bold" width={14} />
            <span>{t('-10 % au-delà de')} {fQty(discountThreshold, product.unit)} {t('· -15 % sur tout')}</span>
          </Stack>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ pt: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {t('Disponible')}
            </Typography>
            <Typography variant="subtitle2">{fQty(product.quantity_available, product.unit)}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            {percent > 0 && (
              <Typography variant="caption" sx={{ color: 'text.disabled', textDecoration: 'line-through', display: 'block' }}>
                {fMoney(base)}
              </Typography>
            )}
            <Typography variant="h6" sx={{ color: 'primary.dark' }}>
              {base == null ? t('Sur devis') : fMoney(price)}
            </Typography>
            {bestPercent > percent && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {t('jusqu’à')} {fMoney(best)}
              </Typography>
            )}
          </Box>
        </Stack>
      </Stack>
    </Card>
  );
}
