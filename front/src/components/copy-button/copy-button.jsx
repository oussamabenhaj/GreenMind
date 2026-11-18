import { useState, useEffect } from 'react';

import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

export function CopyButton({ value, title = 'Copy', onCopy, size = 'small', sx, ...other }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value ?? '');
      setCopied(true);
      onCopy?.(value);
    } catch (error) {
      console.error('Copy failed', error);
    }
  };

  return (
    <Tooltip title={copied ? 'Copied!' : title} placement="top">
      <IconButton
        size={size}
        onClick={handleCopy}
        sx={[{ color: copied ? 'success.main' : 'inherit' }, ...(Array.isArray(sx) ? sx : [sx])]}
        {...other}
      >
        <Iconify icon={copied ? 'eva:checkmark-fill' : 'solar:copy-bold'} width={18} />
      </IconButton>
    </Tooltip>
  );
}
