import { useState, forwardRef } from 'react';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

// ----------------------------------------------------------------------

/**
 * Responsive image with an aspect ratio, a skeleton while loading,
 * and an optional overlay (string css background or node).
 *
 * ratio: '1/1' | '4/3' | '3/4' | '16/9' | '9/16' | '21/9' ...
 */
export const Image = forwardRef((props, ref) => {
  const { src, alt = '', ratio, overlay, sx, slotProps, ...other } = props;

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <Box
      ref={ref}
      component="span"
      sx={[
        {
          width: 1,
          lineHeight: 0,
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
          display: 'inline-block',
          verticalAlign: 'bottom',
          ...(ratio && { aspectRatio: ratio }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {!loaded && !error && (
        <Skeleton
          variant="rectangular"
          sx={{ top: 0, left: 0, width: 1, height: 1, position: 'absolute' }}
        />
      )}

      {error ? (
        <Box
          sx={{
            width: 1,
            height: 1,
            minHeight: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            typography: 'caption',
            color: 'text.disabled',
            bgcolor: 'background.neutral',
          }}
        >
          Image not available
        </Box>
      ) : (
        <Box
          component="img"
          alt={alt}
          src={src}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          sx={{
            width: 1,
            height: 1,
            objectFit: 'cover',
            transition: 'opacity 0.4s ease',
            opacity: loaded ? 1 : 0,
          }}
          {...slotProps?.img}
        />
      )}

      {overlay && (
        <Box
          sx={{
            inset: 0,
            zIndex: 1,
            position: 'absolute',
            ...(typeof overlay === 'string' && { background: overlay }),
          }}
        >
          {typeof overlay !== 'string' && overlay}
        </Box>
      )}
    </Box>
  );
});
