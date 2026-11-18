import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormHelperText from '@mui/material/FormHelperText';
import FormControlLabel from '@mui/material/FormControlLabel';

// ----------------------------------------------------------------------

export function RHFCheckbox({ name, label, helperText, slotProps, ...other }) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Box>
          <FormControlLabel
            label={label}
            control={<Checkbox {...field} checked={!!field.value} {...slotProps?.checkbox} />}
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
