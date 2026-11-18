import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export function EmptyContent({
  sx,
  imgUrl,
  action,
  filled,
  slotProps,
  description,
  title = 'No data',
  ...other
}) {
  return (
    <Box
      sx={[
        (theme) => ({
          px: 3,
          py: 5,
          gap: 1,
          flexGrow: 1,
          display: 'flex',
          borderRadius: 2,
          textAlign: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
          ...(filled && {
            border: `dashed 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
            bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.04),
          }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        component="img"
        alt="Empty content"
        src={imgUrl ?? `${CONFIG.assetsDir}/assets/icons/empty/ic-content.svg`}
        sx={{ width: 1, maxWidth: 160 }}
        {...slotProps?.img}
      />

      {title && (
        <Typography variant="h6" sx={{ mt: 1, color: 'text.disabled' }} {...slotProps?.title}>
          {title}
        </Typography>
      )}

      {description && (
        <Typography variant="caption" sx={{ color: 'text.disabled' }} {...slotProps?.description}>
          {description}
        </Typography>
      )}

      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}
