import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import FormHelperText from '@mui/material/FormHelperText';

// ----------------------------------------------------------------------

export function RHFRating({ name, label, helperText, ...other }) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Box>
          {label && (
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {label}
            </Typography>
          )}

          <Rating
            {...field}
            value={Number(field.value)}
            onChange={(event, newValue) => field.onChange(newValue ?? 0)}
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
