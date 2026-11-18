import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import FormHelperText from '@mui/material/FormHelperText';

// ----------------------------------------------------------------------

export function RHFSlider({ name, label, helperText, ...other }) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Box>
          {label && (
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {label}
            </Typography>
          )}

          <Slider {...field} valueLabelDisplay="auto" {...other} />

          {(!!error || helperText) && (
            <FormHelperText error={!!error}>{error?.message ?? helperText}</FormHelperText>
          )}
        </Box>
      )}
    />
  );
}
