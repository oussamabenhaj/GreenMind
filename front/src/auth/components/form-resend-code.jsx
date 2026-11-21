import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

import { t } from 'src/locales/i18n';
// ----------------------------------------------------------------------

export function FormResendCode({ value, disabled, onResendCode, sx, ...other }) {
  return (
    <Box
      sx={[
        () => ({
          mt: 3,
          typography: 'body2',
          alignSelf: 'center',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {t('Don’t have a code? ')}
      <Link
        variant="subtitle2"
        onClick={onResendCode}
        sx={{
          cursor: 'pointer',
          ...(disabled && { color: 'text.disabled', pointerEvents: 'none' }),
        }}
      >
        {t('Resend')} {disabled && value && value > 0 && `(${value}s)`}
      </Link>
    </Box>
  );
}
