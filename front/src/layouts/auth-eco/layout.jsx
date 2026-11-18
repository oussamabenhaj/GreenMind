import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Logo } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';

import { EcoFilm } from './eco-film';
import { SettingsButton } from '../components/settings-button';

// ----------------------------------------------------------------------

/**
 * Auth layout: animated CLAC film on the left (desktop), form on the right.
 */
export function AuthEcoLayout({ children, wide = false }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      <EcoFilm
        sx={{
          display: { xs: 'none', md: 'block' },
          flex: '1 1 58%',
          minHeight: '100vh',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      />

      <Box
        sx={{
          flex: { xs: '1 1 auto', md: `0 0 ${wide ? 620 : 520}px` },
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          background: (theme) =>
            `radial-gradient(circle at 100% 0%, ${theme.vars.palette.primary.lighter} 0, transparent 38%), ${theme.vars.palette.background.default}`,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 3, md: 5 }, pt: 3 }}>
          <Logo />
          <SettingsButton />
        </Stack>

        <Box
          component={m.div}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: { xs: 3, md: 6 }, py: 4 }}
        >
          {children}
        </Box>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="center"
          sx={{ pb: 3, color: 'text.disabled' }}
        >
          <Iconify icon="solar:leaf-bold-duotone" width={18} sx={{ color: 'primary.main' }} />
          <Typography variant="caption">CLAC · Économie circulaire en Tunisie</Typography>
        </Stack>
      </Box>
    </Box>
  );
}
