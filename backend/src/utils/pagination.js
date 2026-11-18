export function paginationOf(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

/**
 * Standard paginated payload: { data, meta }.
 * Queries add `COUNT(*) OVER() AS total_count`; it is stripped from rows here.
 */
export function paginated(rows, { page, limit }) {
  const total = rows[0]?.total_count ?? 0;
  const data = rows.map(({ total_count: _ignored, ...row }) => row);
  return {
    data,
    meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
  };
}
