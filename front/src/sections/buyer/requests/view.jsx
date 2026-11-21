import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { fQty, fDate, fMoney, fFromNow, REQUEST_STATUS } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CellMain, DataTable } from 'src/components/clac/data-table';
import { CountTabs, useTabCounts } from 'src/components/clac/count-tabs';
import { useViewMode, ViewModeToggle } from 'src/components/clac/view-mode';

import { RequestFormDialog } from './request-form-dialog';
import { printDocument } from '../../seller/components/print-button';
import { Empty, PageHeader, StatusLabel, ListSkeleton, PagePagination } from '../../seller/components/ui';
// ----------------------------------------------------------------------

function RequestDrawer({ id, onClose, onChanged }) {
  const { data: r, reload } = useApi(id ? endpoints.requests.details(id) : null);
  const [edit, setEdit] = useState(false);
  // Editing a request linked to a listing needs that listing's stock to offer the volume discount.
  const { data: linkedProduct } = useApi(r?.product_id ? endpoints.products.details(r.product_id) : null, {}, { skip: !edit });

  useSocketEvent('notification:new', (n) => n.data?.request_id === id && reload());

  const setStatus = async (status) => {
    await axios.patch(`${endpoints.requests.details(r.id)}/status`, { status });
    await reload();
    onChanged();
  };

  const open = r && ['open', 'in_progress'].includes(r.status);

  return (
    <Drawer anchor="right" open={!!id} onClose={onClose} PaperProps={{ sx: { width: 1, maxWidth: 560 } }}>
      {r && (
        <>
          <Stack direction="row" alignItems="center" sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {t('Ma demande')}
            </Typography>
            <IconButton onClick={() => printDocument('requests', r.id)}>
              <Iconify icon="solar:printer-minimalistic-bold" />
            </IconButton>
            <IconButton onClick={onClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
          <Divider />
          <Scrollbar sx={{ p: 2.5 }}>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1}>
                <StatusLabel map={REQUEST_STATUS} value={r.status} />
                {r.category_name && <Label color="primary">{r.category_name}</Label>}
                {r.product_title && <Label color="info">{t('Produit ciblé')}</Label>}
              </Stack>
              <Typography variant="h5">{r.title}</Typography>
              {r.description && (
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                  {r.description}
                </Typography>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
                {[
                  [t('Quantité'), fQty(r.quantity, r.unit)],
                  [t('Prix max'), fMoney(r.max_price_per_unit)],
                  [t('Pour le'), fDate(r.needed_by)],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {label}
                    </Typography>
                    <Typography variant="subtitle2">{value}</Typography>
                  </Box>
                ))}
              </Box>

              {r.quantity_discount && (
                <Label color="success" startIcon={<Iconify icon="solar:tag-price-bold" width={14} />}>
                  {t('Remise quantité appliquée')}
                </Label>
              )}

              <Stack direction="row" flexWrap="wrap" gap={1}>
                {open && (
                  <>
                    <Button size="small" variant="soft" startIcon={<Iconify icon="solar:pen-bold" />} onClick={() => setEdit(true)}>
                      {t('Modifier')}
                    </Button>
                    <Button size="small" variant="soft" color="success" onClick={() => setStatus('fulfilled')}>
                      {t('Marquer satisfaite')}
                    </Button>
                    <Button size="small" variant="soft" color="inherit" onClick={() => setStatus('closed')}>
                      {t('Clôturer')}
                    </Button>
                    <Button size="small" variant="soft" color="error" onClick={() => setStatus('cancelled')}>
                      {t('Annuler')}
                    </Button>
                  </>
                )}
                {!open && (
                  <Button size="small" variant="soft" onClick={() => setStatus('open')} startIcon={<Iconify icon="solar:restart-bold" />}>
                    {t('Rouvrir')}
                  </Button>
                )}
              </Stack>

            </Stack>
          </Scrollbar>
          <RequestFormDialog open={edit} request={r} discountProduct={linkedProduct} onClose={() => setEdit(false)} onSaved={() => { reload(); onChanged(); }} />
        </>
      )}
    </Drawer>
  );
}

// ----------------------------------------------------------------------

export function BuyerRequestsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get('r');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [create, setCreate] = useState(false);
  const { data, meta, loading, reload: reloadList } = useApi(`${endpoints.requests.list}/mine`, cleanParams({ status, page, limit: 12 }));
  const [view, setView] = useViewMode('buyer-requests');
  const [version, setVersion] = useState(0);
  const reload = () => {
    reloadList();
    setVersion((v) => v + 1);
  };
  const counts = useTabCounts(
    `${endpoints.requests.list}/mine`,
    [{ value: '', params: {} }, ...Object.keys(REQUEST_STATUS).map((v) => ({ value: v, params: { status: v } }))],
    {},
    version
  );

  useSocketEvent('notification:new', (n) => n.type?.startsWith('request.') && reload());

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:inbox-out-bold-duotone"
        title={t('Mes demandes')}
        subtitle={t('Exprimez vos besoins : les vendeurs intéressés vous contactent directement')}
        action={
          <Button variant="contained" size="large" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setCreate(true)}>
            {t('Nouvelle demande')}
          </Button>
        }
      />
      <Card sx={{ mb: 3, px: 2.5, display: 'flex', alignItems: 'center' }}>
        <CountTabs
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          counts={counts}
          sx={{ flex: 1 }}
          tabs={[{ value: '', label: t('Toutes'), color: 'default' }, ...Object.entries(REQUEST_STATUS).map(([value, st]) => ({ value, label: st.label, color: st.color }))]}
        />
        <ViewModeToggle value={view} onChange={setView} />
      </Card>

      {loading && !data ? (
        <ListSkeleton height={200} />
      ) : data?.length && view === 'table' ? (
        <DataTable
          rows={data}
          onRowClick={(r) => router.push(`?r=${r.id}`)}
          columns={[
            { label: t('Demande'), render: (r) => <CellMain icon={<Iconify icon="solar:inbox-out-bold-duotone" />} title={r.title} subtitle={r.category_name ?? '—'} /> },
            { label: t('Quantité'), align: 'right', nowrap: true, render: (r) => <b>{fQty(r.quantity, r.unit)}</b> },
            { label: t('Prix max'), align: 'right', nowrap: true, render: (r) => fMoney(r.max_price_per_unit) },
            { label: t('Pour le'), nowrap: true, render: (r) => fDate(r.needed_by) },
            { label: t('Statut'), render: (r) => <StatusLabel map={REQUEST_STATUS} value={r.status} /> },
            { label: t('Propositions'), align: 'right', render: (r) => <Label color={r.responses_count ? 'primary' : 'default'}>{r.responses_count}</Label> },
            { label: t('Publiée'), nowrap: true, render: (r) => fFromNow(r.created_at) },
          ]}
        />
      ) : data?.length ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(3, 1fr)' } }}>
          {data.map((r, i) => (
            <Card
              key={r.id}
              component={m.div}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => router.push(`?r=${r.id}`)}
              sx={{ p: 2.5, cursor: 'pointer', '&:hover': { boxShadow: (theme) => theme.customShadows.z16 } }}
            >
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <StatusLabel map={REQUEST_STATUS} value={r.status} />
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {fFromNow(r.created_at)}
                </Typography>
              </Stack>
              <Typography variant="subtitle1">{r.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {r.category_name ?? '—'} · {fQty(r.quantity, r.unit)} · {t(r.gouvernorat) ?? '—'}
              </Typography>
              {r.quantity_discount && (
                <Label color="success" sx={{ mt: 1 }}>{t('Remise quantité appliquée')}</Label>
              )}
            </Card>
          ))}
        </Box>
      ) : (
        <Empty
          title={t('Aucune demande')}
          description={t('Publiez votre premier besoin : quantité, prix et délai. Les vendeurs vous contactent.')}
          icon="solar:inbox-out-bold-duotone"
          action={<Button variant="contained" onClick={() => setCreate(true)}>{t('Créer une demande')}</Button>}
        />
      )}
      <PagePagination meta={meta} onChange={setPage} />

      <RequestFormDialog open={create} onClose={() => setCreate(false)} onSaved={(r) => { reload(); router.push(`?r=${r.id}`); }} />
      <RequestDrawer id={openId} onClose={() => router.push('?')} onChanged={reload} />
    </DashboardContent>
  );
}
