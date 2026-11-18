import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { fDate, fMoney, DISCOUNT_STATE } from 'src/utils/clac';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { DiscountFormDialog } from './discount-form-dialog';
import { Empty, PageHeader, StatusLabel, ListSkeleton, PagePagination } from '../components/ui';

// ----------------------------------------------------------------------

function progressOf(d) {
  const start = new Date(d.starts_at).getTime();
  const end = new Date(d.ends_at).getTime();
  return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
}

function DiscountCard({ d, onEdit, onDelete, onToggle, delay }) {
  return (
    <Card component={m.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} sx={{ p: 0, overflow: 'hidden' }}>
      <Box
        sx={{
          p: 2.5,
          color: 'common.white',
          position: 'relative',
          background: (theme) => `linear-gradient(135deg, ${theme.vars.palette.error.main}, ${theme.vars.palette.warning.main})`,
        }}
      >
        <Typography variant="h2" sx={{ lineHeight: 1 }}>
          -{d.percentage}%
        </Typography>
        <Typography variant="subtitle2" sx={{ opacity: 0.9, mt: 0.5 }} noWrap>
          {d.title}
        </Typography>
        <Iconify icon="solar:tag-price-bold-duotone" width={88} sx={{ position: 'absolute', right: 12, top: 12, opacity: 0.25 }} />
        {/* ticket notches */}
        {['left', 'right'].map((side) => (
          <Box key={side} sx={{ position: 'absolute', bottom: -10, [side]: -10, width: 20, height: 20, borderRadius: '50%', bgcolor: 'background.paper' }} />
        ))}
      </Box>
      <Stack spacing={1.5} sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" noWrap sx={{ maxWidth: 200 }}>
            {d.product.title}
          </Typography>
          <StatusLabel map={DISCOUNT_STATE} value={d.state} />
        </Stack>
        {d.discounted_price_per_unit != null && (
          <Typography variant="body2">
            <b>{fMoney(d.discounted_price_per_unit)}</b>{' '}
            <Box component="span" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>
              {fMoney(d.product.price_per_unit)}
            </Box>{' '}
            / {d.product.unit}
          </Typography>
        )}
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ typography: 'caption', color: 'text.secondary', mb: 0.5 }}>
            <span>{fDate(d.starts_at)}</span>
            <span>{fDate(d.ends_at)}</span>
          </Stack>
          <LinearProgress variant="determinate" value={progressOf(d)} color={d.state === 'active' ? 'primary' : 'inherit'} />
        </Box>
        <Stack direction="row" alignItems="center">
          <Tooltip title={d.is_active ? 'Désactiver' : 'Activer'}>
            <Switch checked={d.is_active} onChange={() => onToggle(d)} />
          </Tooltip>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={() => onEdit(d)}>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
          <IconButton color="error" onClick={() => onDelete(d)}>
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
        </Stack>
      </Stack>
    </Card>
  );
}

export function DiscountsView() {
  const [state, setState] = useState('all');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, discount: null });
  const [toDelete, setToDelete] = useState(null);

  const { data, meta, loading, reload } = useApi(endpoints.discounts.mine, cleanParams({ state, page, limit: 12 }));

  const toggle = async (d) => {
    await axios.patch(endpoints.discounts.details(d.id), { is_active: !d.is_active });
    reload();
  };

  const remove = async () => {
    await axios.delete(endpoints.discounts.details(toDelete.id));
    setToDelete(null);
    reload();
  };

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:tag-price-bold-duotone"
        title="Remises"
        subtitle="Attirez plus d’acheteurs : les acheteurs intéressés par la catégorie sont notifiés en temps réel."
        action={
          <Button variant="contained" size="large" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setForm({ open: true, discount: null })}>
            Nouvelle remise
          </Button>
        }
      />

      <Tabs value={state} onChange={(_, v) => { setState(v); setPage(1); }} sx={{ mb: 3 }}>
        <Tab value="all" label="Toutes" />
        <Tab value="active" label="Actives" />
        <Tab value="upcoming" label="À venir" />
        <Tab value="expired" label="Expirées" />
      </Tabs>

      {loading && !data ? (
        <ListSkeleton height={300} />
      ) : data?.length ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' } }}>
          {data.map((d, i) => (
            <DiscountCard key={d.id} d={d} delay={i * 0.03} onEdit={(discount) => setForm({ open: true, discount })} onDelete={setToDelete} onToggle={toggle} />
          ))}
        </Box>
      ) : (
        <Empty
          title="Aucune remise"
          description="Créez une remise sur un de vos produits pour booster sa visibilité."
          icon="solar:tag-price-bold-duotone"
          action={<Button variant="contained" onClick={() => setForm({ open: true, discount: null })}>Créer une remise</Button>}
        />
      )}

      <PagePagination meta={meta} onChange={setPage} />

      <DiscountFormDialog open={form.open} discount={form.discount} onClose={() => setForm({ open: false, discount: null })} onSaved={reload} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Supprimer la remise ?"
        cancelText="Annuler"
        action={<Button variant="contained" color="error" onClick={remove}>Supprimer</Button>}
      />
    </DashboardContent>
  );
}
