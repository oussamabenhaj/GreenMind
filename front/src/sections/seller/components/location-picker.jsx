import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useMemo, useState, useEffect } from 'react';
import { useMap, Marker, TileLayer, MapContainer, useMapEvents } from 'react-leaflet';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { GOVERNORATES } from 'src/utils/clac';
import { TUNISIA_CITIES } from 'src/utils/tunisia-cities';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// Geocoding: OpenStreetMap Nominatim (free, no key). Debounced to respect
// its 1 request/second usage policy, restricted to Tunisia, French labels.
// ----------------------------------------------------------------------

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const GOV_CENTERS = TUNISIA_CITIES.filter((c) => GOVERNORATES.some((g) => norm(g) === norm(c.name))).concat(
  TUNISIA_CITIES.filter((c) => c.name === 'Le Kef')
);

/** "Gouvernorat Sfax" / "Gouvernorat de Médenine" → our enum value; else nearest governorate center. */
function governorateOf(address, lat, lng) {
  const raw = norm(address?.state ?? '').replace(/gouvernorat( de| du)?/, '').trim();
  const hit = GOVERNORATES.find((g) => raw && (raw.includes(norm(g)) || norm(g).includes(raw)));
  if (hit) return hit;
  let best = null;
  let bestD = Infinity;
  for (const c of GOV_CENTERS) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c.gouvernorat;
    }
  }
  return best;
}

function shortAddress(r) {
  const a = r.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const place = a.village || a.town || a.city || a.suburb || a.county;
  return [street, a.industrial ? `Zone ${a.industrial}` : null, place].filter(Boolean).join(', ') || r.display_name;
}

const pin = L.divIcon({
  className: '',
  iconSize: [40, 50],
  iconAnchor: [20, 48],
  html: `<div style="animation: clac-lp-drop .5s cubic-bezier(.2,1.5,.4,1) both; transform-origin: 50% 100%">
    <svg width="40" height="50" viewBox="0 0 38 48" style="filter:drop-shadow(0 6px 8px rgba(0,0,0,.3))"><path d="M19 1C9 1 1 8.9 1 18.6 1 32 19 47 19 47s18-15 18-28.4C37 8.9 29 1 19 1z" fill="#3E9F2E" stroke="white" stroke-width="2"/><circle cx="19" cy="18" r="7" fill="white"/></svg></div>`,
});

function Controller({ position, onPick }) {
  const map = useMap();
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 13), { duration: 0.8 });
  }, [map, position]);
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// ----------------------------------------------------------------------

/**
 * value = { lat, lng, address, gouvernorat }; onChange(patch) receives partial updates.
 */
export function LocationPicker({ value, onChange, height = 280 }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const hasPoint = value?.lat != null && value?.lng != null;
  const position = useMemo(() => (hasPoint ? [value.lat, value.lng] : null), [hasPoint, value?.lat, value?.lng]);

  // forward search
  useEffect(() => {
    if (query.trim().length < 3) {
      setOptions([]);
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&countrycodes=tn&accept-language=fr&limit=6&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { signal: ctrl.signal });
        setOptions(await res.json());
      } catch {
        // aborted or offline
      } finally {
        setSearching(false);
      }
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  // reverse geocoding after a click / drag
  const pick = async (lat, lng) => {
    const la = Number(lat.toFixed(6));
    const ln = Number(lng.toFixed(6));
    onChange({ lat: la, lng: ln });
    setResolving(true);
    try {
      const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&accept-language=fr&lat=${la}&lon=${ln}`);
      const r = await res.json();
      onChange({ address: r?.address ? shortAddress(r) : value?.address, gouvernorat: governorateOf(r?.address, la, ln) ?? value?.gouvernorat });
    } catch {
      onChange({ gouvernorat: governorateOf(null, la, ln) });
    } finally {
      setResolving(false);
    }
  };

  const choose = (r) => {
    if (!r) return;
    const la = Number(Number(r.lat).toFixed(6));
    const ln = Number(Number(r.lon).toFixed(6));
    onChange({ lat: la, lng: ln, address: shortAddress(r), gouvernorat: governorateOf(r.address, la, ln) });
  };

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(({ coords }) => pick(coords.latitude, coords.longitude), () => {}, { timeout: 8000 });

  return (
    <Stack spacing={1.5}>
      <style>{`@keyframes clac-lp-drop { 0% { transform: translateY(-30px) scale(.7); opacity: 0 } 100% { transform: none; opacity: 1 } }`}</style>
      <Autocomplete
        options={options}
        filterOptions={(x) => x}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.display_name)}
        onInputChange={(_, v, reason) => reason === 'input' && setQuery(v)}
        onChange={(_, r) => choose(r)}
        noOptionsText={query.length < 3 ? 'Tapez au moins 3 caractères' : 'Aucune adresse trouvée'}
        loading={searching}
        renderOption={(props, o) => (
          <li {...props} key={o.place_id}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Iconify icon="solar:map-point-bold-duotone" sx={{ color: 'primary.main', flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>{shortAddress(o)}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="div">
                  {o.display_name}
                </Typography>
              </Box>
            </Stack>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Rechercher une adresse"
            placeholder="Ex : Zone industrielle Sakiet Ezzit, Sfax"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:magnifer-linear" />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {searching && <CircularProgress size={18} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />

      <Box
        sx={{
          height,
          position: 'relative',
          borderRadius: 1.5,
          overflow: 'hidden',
          border: (theme) => `1px solid ${theme.vars.palette.divider}`,
          '& .leaflet-container': { height: 1, cursor: 'crosshair', fontFamily: 'inherit' },
        }}
      >
        <MapContainer center={position ?? [34.6, 9.8]} zoom={position ? 13 : 6} scrollWheelZoom>
          <TileLayer attribution="&copy; OpenStreetMap contributors, HOT" url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" />
          <Controller position={position} onPick={pick} />
          {position && (
            <Marker
              position={position}
              icon={pin}
              draggable
              eventHandlers={{ dragend: (e) => pick(e.target.getLatLng().lat, e.target.getLatLng().lng) }}
            />
          )}
        </MapContainer>
        <Box sx={{ position: 'absolute', zIndex: 500, top: 10, right: 10 }}>
          <Tooltip title="Utiliser ma position GPS">
            <IconButton onClick={locate} sx={{ bgcolor: 'background.paper', boxShadow: (theme) => theme.customShadows.z8, '&:hover': { bgcolor: 'background.neutral' } }}>
              <Iconify icon="solar:gps-bold-duotone" sx={{ color: 'primary.main' }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Chip
          size="small"
          icon={resolving ? <CircularProgress size={14} /> : <Iconify icon="solar:cursor-bold" width={16} />}
          label={hasPoint ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} — glissez le pin pour ajuster` : 'Cliquez sur la carte pour placer le pin'}
          sx={{ position: 'absolute', zIndex: 500, bottom: 10, left: 10, bgcolor: 'background.paper', boxShadow: (theme) => theme.customShadows.z8 }}
        />
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' } }}>
        <TextField select label="Gouvernorat" value={value?.gouvernorat ?? ''} onChange={(e) => onChange({ gouvernorat: e.target.value })}>
          {GOVERNORATES.map((g) => (
            <MenuItem key={g} value={g}>{g}</MenuItem>
          ))}
        </TextField>
        <TextField label="Adresse" value={value?.address ?? ''} onChange={(e) => onChange({ address: e.target.value })} />
      </Box>
    </Stack>
  );
}
