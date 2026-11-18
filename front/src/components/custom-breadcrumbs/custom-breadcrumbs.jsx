import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';

import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export function CustomBreadcrumbs({ links = [], action, heading, moreLinks = [], sx, ...other }) {
  const lastLink = links[links.length - 1]?.name;

  const renderLink = (link) => {
    const content = (
      <Box component="span" sx={{ gap: 0.75, display: 'inline-flex', alignItems: 'center' }}>
        {link.icon}
        {link.name}
      </Box>
    );

    if (link.name === lastLink) {
      return (
        <Typography key={link.name} variant="body2" sx={{ color: 'text.disabled' }}>
          {content}
        </Typography>
      );
    }

    return (
      <Link
        key={link.name}
        component={link.href ? RouterLink : 'span'}
        href={link.href}
        variant="body2"
        color="inherit"
      >
        {content}
      </Link>
    );
  };

  return (
    <Box sx={[{ mb: 5 }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <Box sx={{ gap: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ flexGrow: 1 }}>
          {heading && (
            <Typography variant="h4" sx={{ mb: 2 }}>
              {heading}
            </Typography>
          )}

          {!!links.length && (
            <Breadcrumbs separator={<Separator />}>{links.map(renderLink)}</Breadcrumbs>
          )}
        </Box>

        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>

      {!!moreLinks.length && (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column' }}>
          {moreLinks.map((href) => (
            <Link key={href} href={href} variant="body2" target="_blank" rel="noopener">
              {href}
            </Link>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

function Separator() {
  return (
    <Box
      component="span"
      sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled' }}
    />
  );
}
