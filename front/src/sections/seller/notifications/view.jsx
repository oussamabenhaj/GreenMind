import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';

import { useRouter } from 'src/routes/hooks';

import { useSpace } from 'src/hooks/use-space';
import { useApi, cleanParams } from 'src/hooks/use-api';

import { useSocketEvent } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';
import { linkFor, NotificationItem } from 'src/layouts/components/clac/notifications-bell';

import { Iconify } from 'src/components/iconify';

import { Empty, PageHeader, PagePagination } from '../components/ui';

// ----------------------------------------------------------------------

export function NotificationsView() {
  const router = useRouter();
  const sp = useSpace();
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const { data, meta, setData, reload } = useApi(endpoints.notifications.list, cleanParams({ page, limit: 20, unread_only: tab === 'unread' || '' }));

  useSocketEvent('notification:new', (n) => page === 1 && setData((list) => [n, ...(list ?? [])]));

  const open = async (n) => {
    if (!n.is_read) await axios.patch(endpoints.notifications.read(n.id));
    router.push(linkFor(n, sp));
  };
  const remove = async (n) => {
    await axios.delete(endpoints.notifications.details(n.id));
    setData((list) => list.filter((x) => x.id !== n.id));
  };
  const markAll = async () => {
    await axios.patch(endpoints.notifications.readAll);
    reload();
  };

  return (
    <DashboardContent maxWidth="md">
      <PageHeader
        icon="solar:bell-bing-bold-duotone"
        title="Notifications"
        subtitle="Toutes vos alertes en temps réel"
        action={
          <Button variant="soft" startIcon={<Iconify icon="solar:check-read-line-duotone" />} onClick={markAll}>
            Tout marquer comme lu
          </Button>
        }
      />
      <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} sx={{ mb: 2 }}>
        <Tab value="all" label="Toutes" />
        <Tab value="unread" label="Non lues" />
      </Tabs>
      <Card sx={{ p: 1 }}>
        {data?.length === 0 && <Empty title="Rien de neuf" description="Vous êtes à jour 🌿" icon="solar:bell-off-bold-duotone" />}
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
      <PagePagination meta={meta} onChange={setPage} />
    </DashboardContent>
  );
}
