import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

export function NumberInput({
  value = 0,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  disabled,
  sx,
  ...other
}) {
  const clamp = (next) => Math.min(Math.max(next, min), max);

  const update = (next) => {
    if (!Number.isNaN(next)) onChange?.(clamp(next));
  };

  return (
    <Box
      sx={[
        (theme) => ({
          p: 0.5,
          gap: 0.5,
          width: 132,
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 1,
          border: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.24)}`,
          ...(disabled && { opacity: 0.48 }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <IconButton
        size="small"
        aria-label="Decrease"
        disabled={disabled || value <= min}
        onClick={() => update(value - step)}
      >
        <Iconify icon="eva:minus-fill" width={16} />
      </IconButton>

      <InputBase
        value={value}
        disabled={disabled}
        onChange={(event) => update(Number(event.target.value))}
        inputProps={{ inputMode: 'numeric', style: { textAlign: 'center' } }}
        sx={{ flex: 1, typography: 'subtitle2' }}
      />

      <IconButton
        size="small"
        aria-label="Increase"
        disabled={disabled || value >= max}
        onClick={() => update(value + step)}
      >
        <Iconify icon="eva:plus-fill" width={16} />
      </IconButton>
    </Box>
  );
}
