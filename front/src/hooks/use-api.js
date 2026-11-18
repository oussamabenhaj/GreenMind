import { useState, useEffect, useCallback } from 'react';

import axios from 'src/lib/axios';

// ----------------------------------------------------------------------

/**
 * GET `url` with `params`; re-fetches when they change.
 * Returns { data, meta, loading, error, reload, setData }.
 * `data` is the API `data` field (object or array).
 */
export function useApi(url, params, { skip = false } = {}) {
  const [state, setState] = useState({ data: null, meta: null, loading: !skip, error: null });
  const key = JSON.stringify(params ?? {});

  const load = useCallback(async () => {
    if (!url || skip) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await axios.get(url, { params: JSON.parse(key) });
      setState({ data: res.data.data, meta: res.data.meta ?? null, loading: false, error: null });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, [url, key, skip]);

  useEffect(() => {
    load();
  }, [load]);

  const setData = useCallback(
    (updater) =>
      setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    []
  );

  return { ...state, reload: load, setData };
}

/** Removes empty values so they are not sent as query params. */
export function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
}
