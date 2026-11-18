import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Iconify } from '../iconify';
import { AnimateCountUp } from '../animate';

// ----------------------------------------------------------------------

export function StatCard({ title, total, icon, percent, unit, color = 'primary', sx, ...other }) {
  const isPositive = percent >= 0;

  return (
    <Card
      sx={[
        (theme) => ({
          p: 3,
          gap: 2,
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            content: '""',
            borderRadius: '50%',
            position: 'absolute',
            bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.08),
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {icon && (
        <Box
          sx={(theme) => ({
            width: 56,
            height: 56,
            flexShrink: 0,
            display: 'flex',
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            color: `${color}.main`,
            bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.12),
          })}
        >
          {typeof icon === 'string' ? <Iconify icon={icon} width={28} /> : icon}
        </Box>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap sx={{ color: 'text.secondary' }}>
          {title}
        </Typography>

        <AnimateCountUp to={total} unit={unit} component="h3" sx={{ typography: 'h3' }} />

        {percent !== undefined && (
          <Box
            sx={{
              gap: 0.5,
              display: 'flex',
              alignItems: 'center',
              typography: 'body2',
              color: isPositive ? 'success.main' : 'error.main',
            }}
          >
            <Iconify
              width={18}
              icon={isPositive ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
            />
            <Box component="span" sx={{ typography: 'subtitle2' }}>
              {isPositive && '+'}
              {percent}%
            </Box>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              last 7 days
            </Box>
          </Box>
        )}
      </Box>
    </Card>
  );
}
