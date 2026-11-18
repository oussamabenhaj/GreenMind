import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import FormHelperText from '@mui/material/FormHelperText';
import FormControlLabel from '@mui/material/FormControlLabel';

// ----------------------------------------------------------------------

export function RHFSwitch({ name, label, helperText, slotProps, ...other }) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Box>
          <FormControlLabel
            label={label}
            control={<Switch {...field} checked={!!field.value} {...slotProps?.switch} />}
            {...other}
          />

          {(!!error || helperText) && (
            <FormHelperText error={!!error}>{error?.message ?? helperText}</FormHelperText>
          )}
        </Box>
      )}
    />
  );
}
