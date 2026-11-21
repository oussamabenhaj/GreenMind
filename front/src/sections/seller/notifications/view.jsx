import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { useSpace } from 'src/hooks/use-space';
import { useApi, cleanParams } from 'src/hooks/use-api';

import { fFromNow } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';
import { linkFor, NotificationItem } from 'src/layouts/components/clac/notifications-bell';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { DataTable } from 'src/components/clac/data-table';
import { CountTabs, useTabCounts } from 'src/components/clac/count-tabs';
import { useViewMode, ViewModeToggle } from 'src/components/clac/view-mode';

import { Empty, PageHeader, PagePagination } from '../components/ui';
// ----------------------------------------------------------------------

export function NotificationsView() {
  const router = useRouter();
  const sp = useSpace();
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const { data, meta, setData, reload } = useApi(endpoints.notifications.list, cleanParams({ page, limit: 20, unread_only: tab === 'unread' || '' }));

  const [view, setView] = useViewMode('notifications');
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const counts = useTabCounts(
    endpoints.notifications.list,
    [
      { value: 'all', params: {} },
      { value: 'unread', params: { unread_only: true } },
    ],
    {},
    version
  );

  useSocketEvent('notification:new', (n) => {
    bump();
    if (page === 1) setData((list) => [n, ...(list ?? [])]);
  });

  const open = async (n) => {
    if (!n.is_read) await axios.patch(endpoints.notifications.read(n.id));
    router.push(linkFor(n, sp));
  };
  const remove = async (n) => {
    await axios.delete(endpoints.notifications.details(n.id));
    setData((list) => list.filter((x) => x.id !== n.id));
    bump();
  };
  const markAll = async () => {
    await axios.patch(endpoints.notifications.readAll);
    reload();
    bump();
  };

  return (
    <DashboardContent maxWidth="md">
      <PageHeader
        icon="solar:bell-bing-bold-duotone"
        title={t('Notifications')}
        subtitle={t('Toutes vos alertes en temps réel')}
        action={
          <Button variant="soft" startIcon={<Iconify icon="solar:check-read-line-duotone" />} onClick={markAll}>
            {t('Tout marquer comme lu')}
          </Button>
        }
      />
      <Card sx={{ mb: 2, px: 2.5, display: 'flex', alignItems: 'center' }}>
        <CountTabs
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
          counts={counts}
          sx={{ flex: 1 }}
          tabs={[
            { value: 'all', label: t('Toutes'), color: 'default' },
            { value: 'unread', label: t('Non lues'), color: 'error' },
          ]}
        />
        <ViewModeToggle value={view} onChange={setView} />
      </Card>
      {view === 'table' && data?.length ? (
        <DataTable
          rows={data}
          minWidth={640}
          onRowClick={open}
          columns={[
            {
              label: t('Notification'),
              render: (n) => (
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: n.is_read ? 500 : 700 }}>{n.title}</Typography>
                  {n.body && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{n.body}</Typography>}
                </Box>
              ),
            },
            { label: t('État'), render: (n) => (n.is_read ? <Label>{t('Lue')}</Label> : <Label color="error">{t('Nouvelle')}</Label>) },
            { label: t('Date'), nowrap: true, render: (n) => fFromNow(n.created_at) },
            {
              label: '',
              align: 'right',
              stopPropagation: true,
              render: (n) => (
                <IconButton onClick={() => remove(n)}>
                  <Iconify icon="solar:trash-bin-minimalistic-bold" />
                </IconButton>
              ),
            },
          ]}
        />
      ) : (
      <Card sx={{ p: 1 }}>
        {data?.length === 0 && <Empty title={t('Rien de neuf')} description={t('Vous êtes à jour 🌿')} icon="solar:bell-off-bold-duotone" />}
        <AnimatePresence>
          {(data ?? []).map((n) => (
            <Stack key={n.id} direction="row" alignItems="center" sx={{ mb: 0.5 }}>
              <NotificationItem item={n} onClick={() => open(n)} />
              <IconButton onClick={() => remove(n)} sx={{ ml: 0.5 }}>
                <Iconify icon="solar:trash-bin-minimalistic-bold" />
              </IconButton>
            </Stack>
          ))}
        </AnimatePresence>
      </Card>
      )}
      <PagePagination meta={meta} onChange={setPage} />
    </DashboardContent>
  );
}
