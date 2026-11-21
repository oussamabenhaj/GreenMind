import { useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import ListItem from '@mui/material/ListItem';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';

import { useRouter } from 'src/routes/hooks';

import { useApi } from 'src/hooks/use-api';
import { useSpace } from 'src/hooks/use-space';

import { fFromNow, NOTIFICATION_ICONS } from 'src/utils/clac';

import { t } from 'src/locales/i18n';
import axios, { endpoints } from 'src/lib/axios';
import { useSocket, useSocketEvent } from 'src/lib/socket';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
// ----------------------------------------------------------------------

/** Maps a notification `link` from the API to a seller route. */
export function linkFor(notification, sp) {
  const d = notification.data ?? {};
  if (d.conversation_id) return `${sp.chat}?c=${d.conversation_id}`;
  if (d.exchange_id) return `${sp.market}?exchange=${d.exchange_id}`;
  if (d.request_id) return `${sp.requests}?r=${d.request_id}`;
  if (d.collection_point_id && notification.type === 'stock.alert') return sp.storage;
  if (d.collection_point_id) return sp.points;
  if (d.purchase_id) return sp.purchases;
  if (d.offer_id) return sp.offers;
  if (d.product_id) return sp.product(d.product_id);
  return sp.notifications;
}

export function NotificationItem({ item, onClick, dense }) {
  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        gap: 1.5,
        py: dense ? 1.25 : 1.75,
        px: 2,
        alignItems: 'flex-start',
        borderRadius: 1.5,
        ...(!item.is_read && { bgcolor: 'primary.lighter', '&:hover': { bgcolor: 'primary.lighter' } }),
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'primary.dark',
          bgcolor: 'background.paper',
          boxShadow: (theme) => theme.customShadows.z1,
        }}
      >
        <Iconify icon={NOTIFICATION_ICONS[item.type] ?? 'solar:bell-bing-bold-duotone'} width={22} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2">{item.title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap={dense}>
          {item.message}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {fFromNow(item.created_at)}
        </Typography>
      </Box>
      {!item.is_read && (
        <Box sx={{ width: 8, height: 8, mt: 1, borderRadius: '50%', bgcolor: 'primary.main' }} />
      )}
    </ListItemButton>
  );
}

export function NotificationsBell() {
  const router = useRouter();
  const sp = useSpace();
  const { counters } = useSocket();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const { data, setData, reload } = useApi(endpoints.notifications.list, { limit: 15 });

  useSocketEvent('notification:new', (notification) => {
    setData((list) => [notification, ...(list ?? [])].slice(0, 30));
    setToast(notification);
  });

  const handleOpen = () => {
    setOpen(true);
    reload();
  };

  const handleClick = useCallback(
    async (item) => {
      if (!item.is_read) {
        await axios.patch(endpoints.notifications.read(item.id)).catch(() => {});
        setData((list) => list.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
      }
      setOpen(false);
      setToast(null);
      router.push(linkFor(item, sp));
    },
    [router, setData, sp]
  );

  const markAll = async () => {
    await axios.patch(endpoints.notifications.readAll);
    setData((list) => list.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <>
      <Tooltip title={t('Notifications')}>
        <IconButton onClick={handleOpen}>
          <Badge badgeContent={counters.notifications} color="error" max={99}>
            <m.span
              key={counters.notifications}
              initial={{ rotate: 0 }}
              animate={counters.notifications ? { rotate: [0, -18, 14, -10, 6, 0] } : {}}
              transition={{ duration: 0.8 }}
              style={{ display: 'inline-flex' }}
            >
              <Iconify icon="solar:bell-bing-bold-duotone" width={24} />
            </m.span>
          </Badge>
        </IconButton>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{ sx: { width: 1, maxWidth: 420 } }}
      >
        <Box sx={{ py: 2, pl: 2.5, pr: 1, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t('Notifications')}
          </Typography>
          {!!counters.notifications && (
            <Tooltip title={t('Tout marquer comme lu')}>
              <IconButton color="primary" onClick={markAll}>
                <Iconify icon="solar:check-read-line-duotone" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton onClick={() => setOpen(false)}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Box>

        <Scrollbar>
          {data?.length ? (
            <List disablePadding sx={{ px: 1 }}>
              <AnimatePresence initial={false}>
                {data.map((item) => (
                  <ListItem
                    key={item.id}
                    disablePadding
                    component={m.li}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    sx={{ mb: 0.5 }}
                  >
                    <NotificationItem item={item} onClick={() => handleClick(item)} dense />
                  </ListItem>
                ))}
              </AnimatePresence>
            </List>
          ) : (
            <EmptyContent title={t('Aucune notification')} description={t('Vous êtes à jour 🌿')} sx={{ py: 10 }} />
          )}
        </Scrollbar>

        <Box sx={{ p: 1.5 }}>
          <Button
            fullWidth
            size="large"
            onClick={() => {
              setOpen(false);
              router.push(sp.notifications);
            }}
          >
            {t('Voir tout')}
          </Button>
        </Box>
      </Drawer>

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box
          sx={{
            width: 360,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.customShadows.dropdown,
            borderLeft: (theme) => `4px solid ${theme.vars.palette.primary.main}`,
          }}
        >
          {toast && <NotificationItem item={toast} onClick={() => handleClick(toast)} dense />}
        </Box>
      </Snackbar>
    </>
  );
}
