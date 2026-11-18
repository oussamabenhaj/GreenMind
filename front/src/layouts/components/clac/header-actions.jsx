import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { useSpace } from 'src/hooks/use-space';

import { initials, ROLE_LABELS } from 'src/utils/clac';

import { useSocket } from 'src/lib/socket';
import axios, { endpoints } from 'src/lib/axios';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';
import { signOut } from 'src/auth/context/jwt/action';

// ----------------------------------------------------------------------

export function ChatButton() {
  const router = useRouter();
  const sp = useSpace();
  const { counters } = useSocket();
  return (
    <Tooltip title="Messagerie">
      <IconButton onClick={() => router.push(sp.chat)}>
        <Badge badgeContent={counters.messages} color="primary" max={99}>
          <Iconify icon="solar:chat-round-dots-bold-duotone" width={24} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}

export function LiveIndicator() {
  const { connected } = useSocket();
  return (
    <Tooltip title={connected ? 'Temps réel connecté' : 'Temps réel déconnecté'}>
      <Box
        sx={{
          width: 10,
          height: 10,
          mx: 1,
          borderRadius: '50%',
          bgcolor: connected ? 'success.main' : 'grey.400',
          boxShadow: connected ? '0 0 0 4px rgba(34,197,94,0.18)' : 'none',
          display: { xs: 'none', sm: 'block' },
        }}
      />
    </Tooltip>
  );
}

// ----------------------------------------------------------------------

const TYPE_META = {
  products: { label: 'Produits', icon: 'solar:box-bold-duotone' },
  buyers: { label: 'Acheteurs', icon: 'solar:user-bold-duotone' },
  sellers: { label: 'Vendeurs', icon: 'solar:shop-bold-duotone' },
  offers: { label: 'Offres', icon: 'solar:calendar-mark-bold-duotone' },
  requests: { label: 'Demandes', icon: 'solar:inbox-in-bold-duotone' },
  collection_points: { label: 'Points de collecte', icon: 'solar:map-point-bold-duotone' },
};

/** Global search (⌘K / Ctrl+K) backed by GET /api/search. */
export function QuickSearch() {
  const router = useRouter();
  const sp = useSpace();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return undefined;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(endpoints.search.quick, { params: { q, limit: 4 } });
        setResults(res.data.data);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (item) => {
    setOpen(false);
    setQ('');
    const routes = {
      product: sp.product(item.id),
      buyer: sp.buyers,
      seller: sp.sellers,
      offer: sp.offers,
      request: `${sp.requests}?r=${item.id}`,
      collection_point: sp.map,
    };
    router.push(routes[item.type] ?? sp.root);
  };

  const groups = Object.entries(results ?? {}).filter(([, rows]) => rows.length);

  return (
    <>
      <Box
        onClick={() => setOpen(true)}
        sx={{
          px: 1.5,
          py: 0.75,
          gap: 1,
          cursor: 'pointer',
          borderRadius: 1.5,
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          color: 'text.disabled',
          bgcolor: 'background.neutral',
          minWidth: 240,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Iconify icon="eva:search-fill" />
        <Typography variant="body2" sx={{ flexGrow: 1 }}>
          Rechercher…
        </Typography>
        <Label sx={{ fontSize: 11 }}>Ctrl K</Label>
      </Box>
      <IconButton onClick={() => setOpen(true)} sx={{ display: { md: 'none' } }}>
        <Iconify icon="eva:search-fill" />
      </IconButton>

      <Dialog fullWidth maxWidth="sm" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { mt: 12, verticalAlign: 'top', alignSelf: 'flex-start' } }}>
        <TextField
          autoFocus
          fullWidth
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Produits, acheteurs, offres, demandes…"
          variant="standard"
          sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider' }}
          slotProps={{
            input: {
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={24} />
                </InputAdornment>
              ),
              endAdornment: loading ? <CircularProgress size={20} /> : null,
            },
          }}
        />
        <Box sx={{ maxHeight: 420, overflow: 'auto', p: 1 }}>
          {!groups.length && (
            <Typography variant="body2" sx={{ p: 3, color: 'text.secondary', textAlign: 'center' }}>
              {q.length < 2 ? 'Tapez au moins 2 caractères' : 'Aucun résultat'}
            </Typography>
          )}
          {groups.map(([type, rows]) => (
            <Box key={type} sx={{ mb: 1 }}>
              <Typography variant="overline" sx={{ px: 1.5, color: 'text.disabled' }}>
                {TYPE_META[type]?.label}
              </Typography>
              {rows.map((item) => (
                <ListItemButton key={item.id} onClick={() => go(item)} sx={{ borderRadius: 1, gap: 1.5 }}>
                  <Iconify icon={TYPE_META[type]?.icon} sx={{ color: 'primary.main' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                      {[item.subtitle, item.gouvernorat].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
            </Box>
          ))}
        </Box>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------------

/** "Market" shortcut shown in the top bar, next to the search box. */
export function MarketButton() {
  const router = useRouter();
  const sp = useSpace();
  const pathname = usePathname();
  const active = pathname.startsWith(sp.market);
  return (
    <Button
      onClick={() => router.push(sp.market)}
      startIcon={<Iconify icon="solar:shop-2-bold-duotone" />}
      variant={active ? 'contained' : 'soft'}
      sx={{ ml: { xs: 1, md: 1.5 }, borderRadius: 1.5, px: { xs: 1.25, md: 2 }, flexShrink: 0, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } } }}
    >
      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
        Market
      </Box>
    </Button>
  );
}

// ----------------------------------------------------------------------

export function AccountMenu() {
  const router = useRouter();
  const sp = useSpace();
  const { user, checkUserSession } = useAuthContext();
  const [anchor, setAnchor] = useState(null);

  const handleLogout = async () => {
    setAnchor(null);
    await signOut().catch(() => {});
    await checkUserSession();
    router.replace(paths.auth.jwt.signIn);
  };

  const items = [
    { label: 'Mon profil', icon: 'solar:user-id-bold-duotone', href: sp.profile },
    ...(user?.role === 'seller' ? [{ label: 'Statistiques', icon: 'solar:chart-2-bold-duotone', href: sp.reports }] : []),
    { label: 'Notifications', icon: 'solar:bell-bold-duotone', href: sp.notifications },
  ];

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ p: 0.25, ml: 0.5 }}>
        <Avatar
          src={user?.avatar_url ?? undefined}
          sx={{
            width: 38,
            height: 38,
            bgcolor: 'primary.main',
            border: (theme) => `2px solid ${theme.vars.palette.primary.light}`,
          }}
        >
          {initials(user?.displayName)}
        </Avatar>
      </IconButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 260, p: 1, mt: 1 } } }}
      >
        <Box sx={{ p: 1.5 }}>
          <Typography variant="subtitle1" noWrap>
            {user?.displayName}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {user?.email}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
            <Label color="primary">{ROLE_LABELS[user?.role]}</Label>
            {user?.is_verified && (
              <Label color="success" startIcon={<Iconify icon="solar:verified-check-bold" />}>
                Vérifié
              </Label>
            )}
          </Box>
        </Box>
        <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />
        {items.map((item) => (
          <MenuItem
            key={item.label}
            onClick={() => {
              setAnchor(null);
              router.push(item.href);
            }}
            sx={{ gap: 1.5 }}
          >
            <Iconify icon={item.icon} />
            {item.label}
          </MenuItem>
        ))}
        <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />
        <MenuItem onClick={handleLogout} sx={{ gap: 1.5, color: 'error.main' }}>
          <Iconify icon="solar:logout-2-bold-duotone" />
          Se déconnecter
        </MenuItem>
      </Popover>
    </>
  );
}

// ----------------------------------------------------------------------

export function NavEcoCard() {
  return (
    <Box
      sx={{
        m: 2,
        p: 2.5,
        borderRadius: 2,
        color: 'common.white',
        position: 'relative',
        overflow: 'hidden',
        background: (theme) =>
          `linear-gradient(135deg, ${theme.vars.palette.primary.dark}, ${theme.vars.palette.primary.main} 60%, ${theme.vars.palette.secondary.main})`,
      }}
    >
      <Iconify
        icon="solar:leaf-bold-duotone"
        width={96}
        sx={{ position: 'absolute', right: -18, bottom: -18, opacity: 0.2 }}
      />
      <Typography variant="subtitle2">Chaque déchet a une valeur 🌱</Typography>
      <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 0.5 }}>
        Publiez vos matières, répondez aux demandes et donnez une seconde vie à vos ressources.
      </Typography>
    </Box>
  );
}
