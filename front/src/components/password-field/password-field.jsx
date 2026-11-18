import { useState } from 'react';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

const LEVELS = [
  { label: 'Too weak', color: 'error' },
  { label: 'Weak', color: 'error' },
  { label: 'Fair', color: 'warning' },
  { label: 'Good', color: 'info' },
  { label: 'Strong', color: 'success' },
];

export function getPasswordStrength(password = '') {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export function PasswordField({ showStrength, value = '', slotProps, ...other }) {
  const [visible, setVisible] = useState(false);

  const score = getPasswordStrength(value);
  const level = LEVELS[score];

  return (
    <Box sx={{ width: 1 }}>
      <TextField
        fullWidth
        value={value}
        type={visible ? 'text' : 'password'}
        slotProps={{
          ...slotProps,
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  edge="end"
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  onClick={() => setVisible((prev) => !prev)}
                >
                  <Iconify icon={visible ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
            ...slotProps?.input,
          },
        }}
        {...other}
      />

      {showStrength && !!value && (
        <Box sx={{ mt: 1, gap: 1.5, display: 'flex', alignItems: 'center' }}>
          <LinearProgress
            variant="determinate"
            color={level.color}
            value={(score / 4) * 100}
            sx={{ flexGrow: 1, height: 6 }}
          />
          <Box
            component="span"
            sx={{ minWidth: 56, typography: 'caption', color: `${level.color}.main` }}
          >
            {level.label}
          </Box>
        </Box>
      )}
    </Box>
  );
}
