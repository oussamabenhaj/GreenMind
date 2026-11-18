import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';

import { Scrollbar } from '../scrollbar';
import { EmptyContent } from '../empty-content';

// ----------------------------------------------------------------------

/**
 * Lightweight client-side table with sorting and pagination.
 *
 * columns: [{ id, label, align?, width?, sortable?, render?: (row) => node }]
 */
export function DataTable({
  rows = [],
  columns = [],
  rowKey = 'id',
  dense,
  defaultOrderBy = '',
  defaultRowsPerPage = 5,
  rowsPerPageOptions = [5, 10, 25],
  emptyTitle = 'No data',
  sx,
}) {
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState(defaultOrderBy);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  const sortedRows = useMemo(() => {
    if (!orderBy) return rows;

    return [...rows].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      if (aValue === bValue) return 0;
      const result = aValue > bValue ? 1 : -1;
      return order === 'asc' ? result : -result;
    });
  }, [rows, order, orderBy]);

  const pagedRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSort = (id) => {
    const isAsc = orderBy === id && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(id);
  };

  return (
    <Box sx={sx}>
      <Scrollbar>
        <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align ?? 'left'}
                  sx={{ width: column.width }}
                  sortDirection={orderBy === column.id ? order : false}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {pagedRows.map((row) => (
              <TableRow hover key={row[rowKey]}>
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align ?? 'left'}>
                    {column.render ? column.render(row) : row[column.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))}

            {!rows.length && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyContent filled title={emptyTitle} sx={{ py: 8 }} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Scrollbar>

      <TablePagination
        component="div"
        page={page}
        count={rows.length}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={rowsPerPageOptions}
        onPageChange={(event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />
    </Box>
  );
}
