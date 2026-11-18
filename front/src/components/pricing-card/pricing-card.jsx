import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { Label } from '../label';
import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

export function PricingCard({
  plan,
  icon,
  highlighted,
  currency = '$',
  period = 'mo',
  actionLabel = 'Choose plan',
  onSelect,
  sx,
  ...other
}) {
  const { name, price, caption, features = [] } = plan;

  const isFree = !price;

  return (
    <Card
      sx={[
        (theme) => ({
          p: 4,
          gap: 3,
          display: 'flex',
          flexDirection: 'column',
          ...(highlighted && {
            boxShadow: theme.vars.customShadows.z24,
            outline: `solid 2px ${theme.vars.palette.primary.main}`,
          }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ width: 48, height: 48 }}>{icon}</Box>
        {highlighted && <Label color="info">Popular</Label>}
      </Box>

      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          {name}
        </Typography>

        <Box sx={{ mt: 1, display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          {isFree ? (
            <Typography variant="h3">Free</Typography>
          ) : (
            <>
              <Typography variant="h5">{currency}</Typography>
              <Typography variant="h3">{price}</Typography>
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                /{period}
              </Typography>
            </>
          )}
        </Box>

        {caption && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {caption}
          </Typography>
        )}
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box component="ul" sx={{ p: 0, m: 0, gap: 1.5, display: 'flex', flexDirection: 'column' }}>
        {features.map((feature) => (
          <Box
            key={feature.text}
            component="li"
            sx={{
              gap: 1.5,
              display: 'flex',
              listStyle: 'none',
              alignItems: 'center',
              typography: 'body2',
              ...(feature.disabled && { color: 'text.disabled' }),
            }}
          >
            <Iconify
              width={18}
              icon={feature.disabled ? 'mingcute:close-line' : 'eva:checkmark-fill'}
              sx={{ color: feature.disabled ? 'inherit' : 'success.main' }}
            />
            {feature.text}
          </Box>
        ))}
      </Box>

      <Button
        fullWidth
        size="large"
        variant={highlighted ? 'contained' : 'outlined'}
        color={highlighted ? 'primary' : 'inherit'}
        onClick={() => onSelect?.(plan)}
        sx={{ mt: 'auto' }}
      >
        {actionLabel}
      </Button>
    </Card>
  );
}
