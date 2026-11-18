import { useRef, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from '../iconify';
import { FileThumbnail } from '../file-thumbnail';

// ----------------------------------------------------------------------

export function UploadBox({
  value = [],
  onChange,
  accept,
  multiple = true,
  disabled,
  helperText,
  sx,
  ...other
}) {
  const inputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (fileList) => {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    onChange?.(multiple ? [...value, ...files] : files.slice(0, 1));
  };

  const handleRemove = (file) => {
    onChange?.(value.filter((item) => item !== file));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) addFiles(event.dataTransfer.files);
  };

  return (
    <Box sx={[{ width: 1 }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <Box
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        sx={(theme) => ({
          p: 4,
          gap: 1,
          display: 'flex',
          cursor: 'pointer',
          borderRadius: 1.5,
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
          textAlign: 'center',
          color: 'text.secondary',
          transition: theme.transitions.create(['opacity', 'background-color', 'border-color']),
          border: `1px dashed ${varAlpha(theme.vars.palette.grey['500Channel'], 0.32)}`,
          bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
          '&:hover': { opacity: 0.72 },
          ...(isDragging && {
            color: 'primary.main',
            borderColor: 'primary.main',
            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
          }),
          ...(disabled && { opacity: 0.48, pointerEvents: 'none' }),
        })}
      >
        <input
          hidden
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />

        <Iconify icon="eva:cloud-upload-fill" width={40} />
        <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>
          Drop or select file{multiple && 's'}
        </Typography>
        <Typography variant="body2">
          Drop files here or click to{' '}
          <Box component="span" sx={{ color: 'primary.main', textDecoration: 'underline' }}>
            browse
          </Box>{' '}
          through your machine.
        </Typography>
      </Box>

      {helperText && (
        <Typography variant="caption" component="div" sx={{ mt: 1, color: 'text.secondary' }}>
          {helperText}
        </Typography>
      )}

      {!!value.length && (
        <Box component="ul" sx={{ mt: 2, p: 0, gap: 1, display: 'flex', flexDirection: 'column' }}>
          {value.map((file, index) => (
            <Box
              component="li"
              key={`${file.name}-${index}`}
              sx={(theme) => ({
                py: 1,
                pl: 1.5,
                pr: 1,
                gap: 1.5,
                display: 'flex',
                listStyle: 'none',
                borderRadius: 1,
                alignItems: 'center',
                border: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
              })}
            >
              <FileThumbnail file={file.name} />

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {file.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatBytes(file.size)}
                </Typography>
              </Box>

              <IconButton size="small" onClick={() => handleRemove(file)}>
                <Iconify icon="mingcute:close-line" width={16} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
