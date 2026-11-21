import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useApi, cleanParams } from 'src/hooks/use-api';

import { fNum, fMoney, fDateTime, PURCHASE_STATUS } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CountTabs, useTabCounts } from 'src/components/clac/count-tabs';
import { useViewMode, ViewModeToggle } from 'src/components/clac/view-mode';

import { PurchaseCard } from '../components/purchase-card';
import { printDocument } from '../components/print-button';
import { Empty, KpiCard, PageHeader, StatusLabel, PagePagination } from '../components/ui';
// ----------------------------------------------------------------------

export function PurchasesView() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const { data, meta, loading, reload } = useApi(endpoints.purchases.list, cleanParams({ status, page, limit: 15 }));
  const pending = useApi(endpoints.purchases.list, { status: 'pending', limit: 1 });
  const received = useApi(endpoints.reports.overview);

  const [view, setView] = useViewMode('seller-purchases', 'table');
  const [version, setVersion] = useState(0);
  const counts = useTabCounts(
    endpoints.purchases.list,
    [{ value: '', params: {} }, ...Object.keys(PURCHASE_STATUS).map((v) => ({ value: v, params: { status: v } }))],
    {},
    version
  );
  useSocketEvent('purchase:updated', () => {
    reload();
    setVersion((v) => v + 1);
  });
  useSocketEvent('notification:new', (n) => n.type === 'purchase.new' && (reload(), pending.reload()));

  const change = async (row, next) => {
    setBusy(row.id);
    try {
      await axios.patch(endpoints.purchases.status(row.id), { status: next });
      await Promise.all([reload(), pending.reload()]);
      setVersion((v) => v + 1);
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        icon="solar:cart-large-4-bold-duotone"
        title={t('Ventes aux points de collecte')}
        subtitle={t('Confirmez les propositions d’achat ; la réception met à jour votre stock automatiquement.')}
      />

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, mb: 3 }}>
        <KpiCard title={t('À confirmer')} value={pending.meta?.total ?? 0} icon="solar:hourglass-bold-duotone" color="warning" />
        <KpiCard title={t('Quantité vendue (12 mois)')} value={`${fNum(received.data?.sales.sold_kg ?? 0)} ${t('kg')}`} icon="solar:box-bold-duotone" color="primary" delay={0.05} />
        <KpiCard title={t('Revenus (12 mois)')} value={fMoney(received.data?.sales.revenue ?? 0)} icon="solar:wallet-money-bold-duotone" color="secondary" delay={0.1} />
      </Box>

      <Card>
        <Stack direction="row" alignItems="center" sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}>
          <CountTabs
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            counts={counts}
            sx={{ flex: 1 }}
            tabs={[{ value: '', label: t('Toutes'), color: 'default' }, ...Object.entries(PURCHASE_STATUS).map(([value, st]) => ({ value, label: st.label, color: st.color }))]}
          />
          <ViewModeToggle value={view} onChange={setView} />
        </Stack>

        {!loading && !data?.length ? (
          <Box sx={{ p: 3 }}>
            <Empty title={t('Aucune vente')} description={t('Quand un point de collecte vous propose un achat, il apparaît ici.')} icon="solar:cart-large-minimalistic-bold-duotone" />
          </Box>
        ) : view === 'cards' ? (
          <Box sx={{ p: 2.5, display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(3, 1fr)' } }}>
            {(data ?? []).map((row, i) => (
              <PurchaseCard
                key={row.id}
                row={row}
                party="seller"
                delay={i * 0.03}
                actions={
                  <>
                    {row.status === 'pending' && (
                      <Button size="small" variant="contained" disabled={busy === row.id} onClick={() => change(row, 'confirmed')}>{t('Confirmer')}</Button>
                    )}
                    {['pending', 'confirmed'].includes(row.status) && (
                      <Button size="small" color="error" variant="soft" disabled={busy === row.id} onClick={() => change(row, 'cancelled')}>{t('Annuler')}</Button>
                    )}
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton onClick={() => printDocument('purchases', row.id)}><Iconify icon="solar:printer-minimalistic-bold" /></IconButton>
                  </>
                }
              />
            ))}
          </Box>
        ) : (
          <TableContainer>
            <Scrollbar>
              <Table sx={{ minWidth: 860 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('Matière')}</TableCell>
                    <TableCell>{t('Point de collecte')}</TableCell>
                    <TableCell align="right">{t('Quantité')}</TableCell>
                    <TableCell align="right">{t('Montant')}</TableCell>
                    <TableCell>{t('Enlèvement')}</TableCell>
                    <TableCell>{t('Statut')}</TableCell>
                    <TableCell align="right">{t('Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data ?? []).map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{row.label}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {row.category_name ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.collection_point.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {t(row.collection_point.gouvernorat)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{fNum(row.quantity_kg)} {t('kg')}</TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2">{fMoney(row.total_amount)}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {row.unit_price != null ? `${row.unit_price} TND/kg` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>{fDateTime(row.scheduled_at)}</TableCell>
                      <TableCell>
                        <StatusLabel map={PURCHASE_STATUS} value={row.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {row.status === 'pending' && (
                            <Button size="small" variant="contained" disabled={busy === row.id} onClick={() => change(row, 'confirmed')}>
                              {t('Confirmer')}
                            </Button>
                          )}
                          {['pending', 'confirmed'].includes(row.status) && (
                            <Button size="small" color="error" variant="soft" disabled={busy === row.id} onClick={() => change(row, 'cancelled')}>
                              {t('Annuler')}
                            </Button>
                          )}
                          <Tooltip title={t('Imprimer le bon d’achat')}>
                            <IconButton onClick={() => printDocument('purchases', row.id)}>
                              <Iconify icon="solar:printer-minimalistic-bold" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>
        )}
      </Card>
      <PagePagination meta={meta} onChange={setPage} />
    </DashboardContent>
  );
}
