import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fNum, fMoney, fDateTime, PURCHASE_STATUS } from 'src/utils/clac';

import { t } from 'src/locales/i18n';

import { Iconify } from 'src/components/iconify';

import { StatusLabel } from './ui';
// ----------------------------------------------------------------------

/** Card version of a purchase operation (seller "Ventes" and collector "Opérations d’achat"). */
export function PurchaseCard({ row, party = 'seller', actions, delay = 0 }) {
  const counterpart = party === 'seller' ? row.collection_point.name : row.seller ? row.seller.company_name || row.seller.name : t('Vendeur non inscrit');
  return (
    <Card component={m.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} sx={{ display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2.5, pb: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.lighter', color: 'primary.dark', flexShrink: 0 }}>
          <Iconify icon="solar:cart-large-4-bold-duotone" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>{row.label}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="div">
            {row.category_name ?? '—'}
          </Typography>
        </Box>
        <StatusLabel map={PURCHASE_STATUS} value={row.status} />
      </Stack>
      <Stack spacing={1} sx={{ px: 2.5, pb: 2, flexGrow: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          <Iconify icon={party === 'seller' ? 'solar:map-point-wave-bold' : 'solar:shop-bold'} width={16} sx={{ mr: 0.75, verticalAlign: '-3px' }} />
          {counterpart}
          {party === 'collector' && ` → ${row.collection_point.name}`}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, p: 1.5, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>{t('Quantité')}</Typography>
            <Typography variant="subtitle2">{fNum(row.quantity_kg)} {t('kg')}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>{t('Montant')}</Typography>
            <Typography variant="subtitle2" sx={{ color: 'primary.dark' }}>{fMoney(row.total_amount)}</Typography>
          </Box>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          <Iconify icon="solar:calendar-bold" width={14} sx={{ mr: 0.5, verticalAlign: '-2px' }} />
          {row.received_at ? t('Réceptionné le {{date}}', { date: fDateTime(row.received_at) }) : t('Enlèvement : {{date}}', { date: fDateTime(row.scheduled_at) })}
        </Typography>
      </Stack>
      {actions && (
        <>
          <Divider sx={{ borderStyle: 'dashed' }} />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.5 }}>
            {actions}
          </Stack>
        </>
      )}
    </Card>
  );
}
