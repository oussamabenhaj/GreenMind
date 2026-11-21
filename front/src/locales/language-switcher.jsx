import { useState } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import ButtonBase from '@mui/material/ButtonBase';
import ListItemText from '@mui/material/ListItemText';

import axios from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { t, LANGS } from './i18n';
import { useLang } from './language-provider';

// ----------------------------------------------------------------------

/** FR / ع selector used in the header and on the auth pages. */
export function LanguageSwitcher({ sx }) {
  const { lang, meta, changeLanguage } = useLang();
  const { authenticated } = useAuthContext();
  const [anchor, setAnchor] = useState(null);

  const select = (value) => {
    setAnchor(null);
    if (value === lang) return;
    changeLanguage(value);
    // remembered on the profile too, so the choice follows the user on every device
    if (authenticated) axios.patch('/api/users/me', { preferred_lang: value }).catch(() => {});
  };

  return (
    <>
      <Tooltip title={t('Langue')}>
        <ButtonBase
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={t('Langue')}
          sx={[
            {
              gap: 0.75,
              px: 1.25,
              height: 40,
              borderRadius: 1.25,
              typography: 'subtitle2',
              color: 'text.secondary',
              border: (theme) => `solid 1px ${theme.vars.palette.divider}`,
              '&:hover': { bgcolor: 'action.hover' },
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
        >
          <Iconify icon="solar:global-bold-duotone" width={20} />
          <Box component="span" sx={{ minWidth: 16, textAlign: 'center' }}>{meta.short}</Box>
        </ButtonBase>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { minWidth: 180 } } }}>
        {LANGS.map((l) => (
          <MenuItem
            key={l.value}
            selected={l.value === lang}
            onClick={() => select(l.value)}
          >
            <Box component="span" sx={{ fontSize: 20, me: 1.5 }}>{l.flag}</Box>
            <ListItemText primary={l.label} secondary={l.dir === 'rtl' ? 'RTL' : 'LTR'} />
            {l.value === lang && <Iconify icon="eva:checkmark-fill" sx={{ color: 'primary.main' }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
