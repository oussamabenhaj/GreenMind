import { useMemo, useState, useEffect, useCallback } from 'react';

import axios from 'src/lib/axios';
import { t } from 'src/locales/i18n';
import { useSocketEvent } from 'src/lib/socket';

import { Label } from 'src/components/label';
import { formatCount } from 'src/components/clac/count-tabs';

// ----------------------------------------------------------------------

/** GET /api/users/me/counters, refreshed on real-time events and every minute. */
export function useNavCounters() {
  const [counters, setCounters] = useState({});

  const load = useCallback(() => {
    axios
      .get('/api/users/me/counters')
      .then((res) => setCounters(res.data.data ?? {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  useSocketEvent('notification:new', load);
  useSocketEvent('notification:unread_count', load);
  useSocketEvent('chat:unread_count', load);
  useSocketEvent('purchase:updated', load);
  useSocketEvent('stock:updated', load);
  useSocketEvent('request:new', load);
  useSocketEvent('product:published', load);

  return counters;
}

/** Adds an info Label ("20", "99+") to every nav item that declares a `counter` key. */
export function useNavWithCounters(navData) {
  const counters = useNavCounters();
  return useMemo(
    () =>
      navData.map((section) => ({
        ...section,
        subheader: t(section.subheader),
        items: section.items.map(({ counter, counterColor, ...raw }) => {
          const item = { ...raw, title: t(raw.title) };
          const value = counter ? counters[counter] : undefined;
          if (!counter || value === undefined || value === null) return item;
          return {
            ...item,
            info: (
              <Label color={value > 0 ? (counterColor ?? 'info') : 'default'} variant="soft">
                {formatCount(Number(value))}
              </Label>
            ),
          };
        }),
      })),
    [navData, counters]
  );
}
