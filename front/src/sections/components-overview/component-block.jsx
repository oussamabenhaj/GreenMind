import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';
import { CopyButton } from 'src/components/copy-button';

// ----------------------------------------------------------------------

export function ComponentBlock({ item, sx }) {
  const { id, name, exportName, category, description, importPath, isNew, Demo } = item;

  const importLine = `import { ${exportName ?? name} } from '${importPath}';`;

  return (
    <Card
      id={id}
      sx={[
        { display: 'flex', flexDirection: 'column', scrollMarginTop: 96 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {name}
          </Typography>
          <Label variant="outlined">{category}</Label>
          <Label color={isNew ? 'success' : 'default'} variant="soft">
            {isNew ? 'New' : 'Existing'}
          </Label>
        </Box>

        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
          {description}
        </Typography>

        <Box
          sx={(theme) => ({
            mt: 1.5,
            pl: 1.5,
            pr: 0.5,
            gap: 1,
            display: 'flex',
            borderRadius: 1,
            alignItems: 'center',
            typography: 'caption',
            fontFamily: 'monospace',
            color: 'text.secondary',
            bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
          })}
        >
          <Box component="code" sx={{ flexGrow: 1, overflow: 'auto', whiteSpace: 'nowrap' }}>
            {importPath}
          </Box>
          <CopyButton value={importLine} title="Copy import" />
        </Box>
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box
        sx={(theme) => ({
          p: 3,
          flexGrow: 1,
          minHeight: 160,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.04),
        })}
      >
        <Demo />
      </Box>
    </Card>
  );
}
