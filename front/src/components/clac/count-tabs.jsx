import { useState, useEffect } from 'react';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { cleanParams } from 'src/hooks/use-api';

import axios from 'src/lib/axios';
import { t } from 'src/locales/i18n';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const formatCount = (n) => (n == null ? '…' : n > 99 ? '99+' : String(n));

/**
 * Totals per tab, fetched with limit=1 (uses meta.total).
 * tabs: [{ value, params }] — params are merged into baseParams for that tab.
 * `refreshKey` lets the caller refetch after a change.
 */
export function useTabCounts(url, tabs, baseParams = {}, refreshKey = 0) {
  const [counts, setCounts] = useState({});
  const key = JSON.stringify([url, tabs.map((tab) => [tab.value, tab.params]), baseParams, refreshKey]);

  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    Promise.all(
      tabs.map((tab) =>
        axios
          .get(typeof tab.url === 'string' ? tab.url : url, { params: cleanParams({ ...baseParams, ...tab.params, page: 1, limit: 1 }) })
          .then((res) => [tab.value, res.data.meta?.total ?? (Array.isArray(res.data.data) ? res.data.data.length : 0)])
          .catch(() => [tab.value, null])
      )
    ).then((entries) => alive && setCounts(Object.fromEntries(entries)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return counts;
}

/**
 * Tabs with a count Label on each tab.
 * tabs: [{ value, label, icon?, color? }]
 */
export function CountTabs({ value, onChange, tabs, counts = {}, sx, ...other }) {
  return (
    <Tabs value={value} onChange={(_, v) => onChange(v)} variant="scrollable" allowScrollButtonsMobile sx={sx} {...other}>
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          value={tab.value}
          iconPosition="end"
          label={
            tab.icon ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Iconify icon={tab.icon} width={18} />
                {t(tab.label)}
              </span>
            ) : (
              t(tab.label)
            )
          }
          icon={
            <Label variant={value === tab.value ? 'filled' : 'soft'} color={tab.color ?? 'default'} sx={{ ml: 0.75 }}>
              {formatCount(counts[tab.value])}
            </Label>
          }
        />
      ))}
    </Tabs>
  );
}
