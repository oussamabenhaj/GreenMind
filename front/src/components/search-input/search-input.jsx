import { useState, useEffect } from 'react';

import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

/**
 * Search field with a clear button. `onSearch` is called after the user
 * stops typing for `debounce` ms.
 */
export function SearchInput({
  value: valueProp = '',
  onSearch,
  debounce = 300,
  placeholder = 'Search...',
  ...other
}) {
  const [value, setValue] = useState(valueProp);

  useEffect(() => {
    setValue(valueProp);
  }, [valueProp]);

  useEffect(() => {
    if (value === valueProp) return undefined;
    const timer = setTimeout(() => onSearch?.(value), debounce);
    return () => clearTimeout(timer);
  }, [value, valueProp, debounce, onSearch]);

  const handleClear = () => {
    setValue('');
    onSearch?.('');
  };

  return (
    <TextField
      value={value}
      placeholder={placeholder}
      onChange={(event) => setValue(event.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleClear} aria-label="Clear search">
                <Iconify icon="mingcute:close-line" width={16} />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
      {...other}
    />
  );
}
