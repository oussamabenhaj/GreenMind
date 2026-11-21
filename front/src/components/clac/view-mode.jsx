import { useState, useCallback } from 'react';

import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STORAGE_PREFIX = 'clac-view-mode:';

/** 'cards' | 'table', remembered per page in localStorage. */
export function useViewMode(pageKey, initial = 'cards') {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_PREFIX + pageKey) || initial;
    } catch {
      return initial;
    }
  });
  const change = useCallback(
    (next) => {
      if (!next) return;
      setMode(next);
      try {
        localStorage.setItem(STORAGE_PREFIX + pageKey, next);
      } catch {
        // private mode: keep in memory only
      }
    },
    [pageKey]
  );
  return [mode, change];
}

export function ViewModeToggle({ value, onChange, sx }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, v) => onChange(v)}
      sx={[{ bgcolor: 'background.paper', flexShrink: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Tooltip title="Affichage en cartes">
        <ToggleButton value="cards" aria-label="cartes">
          <Iconify icon="solar:widget-4-bold-duotone" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Affichage en tableau">
        <ToggleButton value="table" aria-label="tableau">
          <Iconify icon="solar:list-bold-duotone" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
