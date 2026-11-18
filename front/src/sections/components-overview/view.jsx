import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { CustomTabs } from 'src/components/custom-tabs';
import { SearchInput } from 'src/components/search-input';
import { SearchNotFound } from 'src/components/search-not-found';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ComponentBlock } from './component-block';
import { COMPONENTS, WIDE_COMPONENTS } from './components-list';

// ----------------------------------------------------------------------

const CATEGORIES = ['All', ...new Set(COMPONENTS.map((item) => item.category))];

const TABS = [
  { value: 'all', label: 'All', count: COMPONENTS.length },
  { value: 'existing', label: 'Existing', count: COMPONENTS.filter((c) => !c.isNew).length },
  { value: 'new', label: 'New', count: COMPONENTS.filter((c) => c.isNew).length },
];

export function ComponentsOverviewView() {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return COMPONENTS.filter((item) => {
      if (tab === 'new' && !item.isNew) return false;
      if (tab === 'existing' && item.isNew) return false;
      if (category !== 'All' && item.category !== category) return false;
      if (!search) return true;
      return [item.name, item.description, item.category].join(' ').toLowerCase().includes(search);
    });
  }, [tab, query, category]);

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Components"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Components' }]}
      />

      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <CustomTabs
          value={tab}
          onChange={(event, newValue) => setTab(newValue)}
          sx={{ borderRadius: 1 }}
        >
          {TABS.map((item) => (
            <Tab
              key={item.value}
              value={item.value}
              iconPosition="end"
              label={item.label}
              icon={
                <Label
                  variant={item.value === tab ? 'filled' : 'soft'}
                  color={item.value === 'new' ? 'success' : 'default'}
                >
                  {item.count}
                </Label>
              }
            />
          ))}
        </CustomTabs>

        <SearchInput
          size="small"
          value={query}
          onSearch={setQuery}
          placeholder="Search components..."
          sx={{ width: { xs: 1, sm: 280 } }}
        />
      </Box>

      <Box sx={{ mb: 4, gap: 1, display: 'flex', flexWrap: 'wrap' }}>
        {CATEGORIES.map((item) => (
          <Chip
            key={item}
            label={item}
            size="small"
            variant={item === category ? 'filled' : 'outlined'}
            color={item === category ? 'primary' : 'default'}
            onClick={() => setCategory(item)}
          />
        ))}
      </Box>

      {filtered.length ? (
        <Box
          sx={{
            gap: 3,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          }}
        >
          {filtered.map((item) => (
            <ComponentBlock
              key={item.id}
              item={item}
              sx={WIDE_COMPONENTS.includes(item.id) ? { gridColumn: { md: '1 / -1' } } : undefined}
            />
          ))}
        </Box>
      ) : (
        <SearchNotFound query={query || category} sx={{ py: 10 }} />
      )}
    </DashboardContent>
  );
}
