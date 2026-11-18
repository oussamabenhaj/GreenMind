import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

/**
 * Pick one color (`value` is a string) or many (`value` is an array).
 */
export function ColorPicker({ options = [], value, onChange, size = 32, sx, ...other }) {
  const isMulti = Array.isArray(value);

  const isSelected = (color) => (isMulti ? value.includes(color) : value === color);

  const handleSelect = (color) => {
    if (!isMulti) {
      onChange?.(color);
      return;
    }
    onChange?.(value.includes(color) ? value.filter((c) => c !== color) : [...value, color]);
  };

  return (
    <Box
      role={isMulti ? 'group' : 'radiogroup'}
      sx={[{ gap: 1, display: 'flex', flexWrap: 'wrap' }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...other}
    >
      {options.map((color) => {
        const selected = isSelected(color);

        return (
          <ButtonBase
            key={color}
            aria-label={color}
            aria-pressed={selected}
            onClick={() => handleSelect(color)}
            sx={{
              width: size,
              height: size,
              borderRadius: '50%',
              bgcolor: color,
              color: 'common.white',
              transition: (theme) => theme.transitions.create(['transform', 'box-shadow']),
              boxShadow: `inset 0 0 0 1px ${alpha('#919EAB', 0.24)}`,
              ...(selected && {
                transform: 'scale(1.15)',
                boxShadow: `0 0 0 3px ${alpha(color, 0.32)}`,
              }),
            }}
          >
            {selected && (
              <Iconify
                icon="eva:checkmark-fill"
                width={size / 2}
                sx={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.6))' }}
              />
            )}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
