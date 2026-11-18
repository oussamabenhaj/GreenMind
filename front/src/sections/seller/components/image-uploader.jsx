import { useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import axios, { endpoints } from 'src/lib/axios';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * Upload up to `max` images to POST /api/uploads/images (stored in backend/upload/).
 * `value` = array of public URLs. `onUploaded(urls)` lets the parent track
 * files created in this session (to clean them up if the form is cancelled).
 */
export function ImageUploader({ value = [], onChange, onUploaded, max = 3 }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const remaining = max - value.length;

  const upload = async (fileList) => {
    setError('');
    const files = [...fileList];
    const invalid = files.find((f) => !ACCEPT.includes(f.type) || f.size > MAX_SIZE);
    if (invalid) {
      setError(!ACCEPT.includes(invalid.type) ? `« ${invalid.name} » : format non supporté (JPG, PNG, WEBP, GIF)` : `« ${invalid.name} » dépasse 5 Mo`);
      return;
    }
    if (files.length > remaining) {
      setError(remaining ? `Vous pouvez encore ajouter ${remaining} image(s) (maximum ${max}).` : `Maximum ${max} images.`);
      return;
    }
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    try {
      setProgress(0);
      const res = await axios.post(endpoints.uploads.images, form, {
        onUploadProgress: (e) => setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 50),
      });
      const urls = res.data.data.map((f) => f.url);
      onUploaded?.(urls);
      onChange([...value, ...urls]);
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (i) => onChange(value.filter((_, idx) => idx !== i));
  const makeCover = (i) => onChange([value[i], ...value.filter((_, idx) => idx !== i)]);

  return (
    <Box>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: `repeat(${max}, 1fr)` }}>
        <AnimatePresence initial={false}>
          {value.map((url, i) => (
            <Box
              key={url}
              component={m.div}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              sx={{
                position: 'relative',
                aspectRatio: '1 / 1',
                borderRadius: 1.5,
                overflow: 'hidden',
                border: (theme) => `2px solid ${i === 0 ? theme.vars.palette.primary.main : 'transparent'}`,
                boxShadow: (theme) => theme.customShadows.z4,
                '&:hover .img-actions': { opacity: 1 },
              }}
            >
              <Box component="img" src={url} alt="" sx={{ width: 1, height: 1, objectFit: 'cover' }} />
              {i === 0 && (
                <Label variant="filled" color="primary" sx={{ position: 'absolute', left: 6, bottom: 6 }}>
                  Couverture
                </Label>
              )}
              <Stack
                className="img-actions"
                direction="row"
                spacing={0.5}
                sx={{ position: 'absolute', top: 6, right: 6, opacity: { xs: 1, md: 0 }, transition: 'opacity .2s' }}
              >
                {i > 0 && (
                  <Tooltip title="Mettre en couverture">
                    <IconButton size="small" onClick={() => makeCover(i)} sx={{ bgcolor: 'rgba(255,255,255,.9)', '&:hover': { bgcolor: 'common.white' } }}>
                      <Iconify icon="solar:star-bold" width={16} sx={{ color: 'warning.main' }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Retirer">
                  <IconButton size="small" onClick={() => removeAt(i)} sx={{ bgcolor: 'rgba(255,255,255,.9)', '&:hover': { bgcolor: 'common.white' } }}>
                    <Iconify icon="mingcute:close-line" width={16} sx={{ color: 'error.main' }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          ))}
        </AnimatePresence>

        {remaining > 0 && (
          <Box
            onClick={() => progress === null && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              upload(e.dataTransfer.files);
            }}
            sx={{
              aspectRatio: value.length ? '1 / 1' : 'auto',
              gridColumn: value.length ? 'auto' : `span ${max}`,
              minHeight: value.length ? 0 : 150,
              borderRadius: 1.5,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              p: 2,
              textAlign: 'center',
              transition: 'all .2s',
              border: (theme) => `2px dashed ${drag ? theme.vars.palette.primary.main : theme.vars.palette.divider}`,
              bgcolor: drag ? 'primary.lighter' : 'background.neutral',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lighter' },
            }}
          >
            <Box
              component={m.div}
              animate={drag ? { y: [0, -6, 0] } : { y: 0 }}
              transition={{ repeat: drag ? Infinity : 0, duration: 0.8 }}
              sx={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper', color: 'primary.main', boxShadow: (theme) => theme.customShadows.z1 }}
            >
              <Iconify icon="solar:gallery-add-bold-duotone" width={26} />
            </Box>
            <Typography variant="subtitle2">{value.length ? 'Ajouter' : 'Glissez vos photos ici ou cliquez'}</Typography>
            {!value.length && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                JPG, PNG, WEBP · 5 Mo max · jusqu’à {max} images
              </Typography>
            )}
            <input
              ref={inputRef}
              hidden
              type="file"
              multiple
              accept={ACCEPT.join(',')}
              onChange={(e) => e.target.files?.length && upload(e.target.files)}
            />
          </Box>
        )}
      </Box>

      {progress !== null && (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1.5 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
          <Typography variant="caption">{progress}%</Typography>
        </Stack>
      )}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ color: error ? 'error.main' : 'text.secondary' }}>
          {error || 'La première image sert de couverture.'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {value.length}/{max}
        </Typography>
      </Stack>
    </Box>
  );
}
