import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';

import { t } from 'src/locales/i18n';

import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

/**
 * Generic table for the "table" view mode.
 * columns: [{ label, render: (row) => node, align?, width?, nowrap? }]
 */
export function DataTable({ columns, rows = [], onRowClick, rowKey = (r) => r.id, minWidth = 860, card = true, sx }) {
  const table = (
    <Scrollbar>
      <Table sx={{ minWidth }}>
        <TableHead>
          <TableRow>
            {columns.map((c, i) => (
              <TableCell key={c.label || i} align={c.align} sx={{ width: c.width, whiteSpace: 'nowrap' }}>
                {typeof c.label === 'string' ? t(c.label) : c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={rowKey(row)}
              hover
              component={m.tr}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i, 10) * 0.02 }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((c, j) => (
                <TableCell
                  key={c.label || j}
                  align={c.align}
                  sx={{ whiteSpace: c.nowrap ? 'nowrap' : undefined }}
                  onClick={c.stopPropagation ? (e) => e.stopPropagation() : undefined}
                >
                  {c.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Scrollbar>
  );
  return card ? <Card sx={[{ overflow: 'hidden' }, ...(Array.isArray(sx) ? sx : [sx])]}>{table}</Card> : table;
}

/** Thumbnail + title + subtitle cell. */
export function CellMain({ title, subtitle, image, avatar, icon, color = 'primary' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      {image ? (
        <Box component="img" src={image} alt="" sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }} />
      ) : avatar !== undefined ? (
        <Avatar sx={{ width: 40, height: 40, bgcolor: `${color}.lighter`, color: `${color}.dark`, fontSize: 15, fontWeight: 700 }}>{avatar}</Avatar>
      ) : icon ? (
        <Box sx={{ width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}.lighter`, color: `${color}.dark`, flexShrink: 0 }}>
          {icon}
        </Box>
      ) : null}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap sx={{ maxWidth: 320 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
