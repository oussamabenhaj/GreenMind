import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useState, useEffect } from 'react';
import { useMap, Marker, TileLayer, MapContainer, useMapEvents } from 'react-leaflet';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { GOVERNORATES } from 'src/utils/clac';

import axios, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

import { useReferenceData } from '../../seller/components/ui';

// ----------------------------------------------------------------------

export const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

const pin = L.divIcon({
  className: '',
  iconSize: [34, 44],
  iconAnchor: [17, 42],
  html: `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,.3))"><path d="M17 0C7.6 0 0 7.4 0 16.6 0 29 17 44 17 44s17-15 17-27.4C34 7.4 26.4 0 17 0z" fill="#2DA8D8"/><circle cx="17" cy="16.5" r="7" fill="white"/></svg>`,
});

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().contains([lat, lng])) map.setView([lat, lng]);
  }, [map, lat, lng]);
  return null;
}

function ClickPicker({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return null;
}

const defaultSchedule = () =>
  ORDER.map((day) => ({ day_of_week: day, is_closed: day === 0, opens_at: '08:00', closes_at: day === 6 ? '12:00' : '17:00' }));

const toForm = (p) => ({
  name: p?.name ?? '',
  description: p?.description ?? '',
  address: p?.address ?? '',
  gouvernorat: p?.gouvernorat ?? '',
  lat: p?.lat ?? 35.8,
  lng: p?.lng ?? 10.2,
  phone: p?.phone ?? '',
  email: p?.email ?? '',
  storage_capacity_kg: p?.storage_capacity_kg ?? 10000,
  category_ids: p?.category_ids ?? [],
});

/** US-PC08 (GPS) + US-PC07 (horaires) — create / edit a collection point. */
export function PointFormDialog({ open, onClose, point, onSaved }) {
  const { categories } = useReferenceData();
  const [form, setForm] = useState(toForm(point));
  const [schedule, setSchedule] = useState(defaultSchedule());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(toForm(point));
    setError('');
    if (point?.id) {
      axios.get(`${endpoints.collectionPoints}/${point.id}/schedule`).then((res) => {
        const byDay = Object.fromEntries(res.data.data.map((d) => [d.day_of_week, d]));
        setSchedule(
          ORDER.map((day) =>
            byDay[day]
              ? { day_of_week: day, is_closed: byDay[day].is_closed, opens_at: byDay[day].opens_at?.slice(0, 5) ?? '08:00', closes_at: byDay[day].closes_at?.slice(0, 5) ?? '17:00' }
              : { day_of_week: day, is_closed: true, opens_at: '08:00', closes_at: '17:00' }
          )
        );
      });
    } else setSchedule(defaultSchedule());
  }, [open, point]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setDay = (day, patch) => setSchedule((list) => list.map((d) => (d.day_of_week === day ? { ...d, ...patch } : d)));

  const locate = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }));
        setLocating(false);
      },
      () => {
        setError('Géolocalisation refusée par le navigateur — cliquez sur la carte pour placer le point.');
        setLocating(false);
      }
    );
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const body = {
      ...form,
      lat: Number(form.lat),
      lng: Number(form.lng),
      storage_capacity_kg: Number(form.storage_capacity_kg) || 0,
      ...(form.email ? {} : { email: undefined }),
    };
    if (!body.email) delete body.email;
    const days = schedule.map(({ day_of_week: day, is_closed: closed, opens_at: o, closes_at: c }) => (closed ? { day_of_week: day, is_closed: true } : { day_of_week: day, opens_at: o, closes_at: c }));
    try {
      let saved;
      if (point?.id) {
        saved = (await axios.patch(`${endpoints.collectionPoints}/${point.id}`, body)).data.data;
        await axios.put(`${endpoints.collectionPoints}/${point.id}/schedule`, { days });
      } else {
        saved = (await axios.post(endpoints.collectionPoints, { ...body, schedule: days })).data.data;
      }
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="lg" open={open} onClose={onClose}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Iconify icon="solar:map-point-wave-bold-duotone" width={28} sx={{ color: 'info.main' }} />
        {point ? 'Modifier le point de collecte' : 'Nouveau point de collecte'}
      </DialogTitle>
      <DialogContent>
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!point && <Alert severity="info" sx={{ mb: 2 }}>Le point sera visible sur la carte après validation par un administrateur.</Alert>}
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, pt: 1 }}>
          <Stack spacing={2}>
            <TextField label="Nom du point" value={form.name} onChange={set('name')} />
            <TextField label="Description" multiline rows={2} value={form.description} onChange={set('description')} />
            <Stack direction="row" spacing={2}>
              <TextField fullWidth select label="Gouvernorat" value={form.gouvernorat} onChange={set('gouvernorat')}>
                {GOVERNORATES.map((g) => (
                  <MenuItem key={g} value={g}>{g}</MenuItem>
                ))}
              </TextField>
              <TextField fullWidth label="Capacité de stockage (kg)" type="number" value={form.storage_capacity_kg} onChange={set('storage_capacity_kg')} />
            </Stack>
            <TextField label="Adresse" value={form.address} onChange={set('address')} />
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="Téléphone" value={form.phone} onChange={set('phone')} />
              <TextField fullWidth label="Email" value={form.email} onChange={set('email')} />
            </Stack>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Matières acceptées</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {categories.map((c) => {
                  const on = form.category_ids.includes(c.id);
                  return (
                    <Chip
                      key={c.id}
                      size="small"
                      label={c.name}
                      color={on ? 'primary' : 'default'}
                      variant={on ? 'filled' : 'outlined'}
                      onClick={() => setForm((f) => ({ ...f, category_ids: on ? f.category_ids.filter((x) => x !== c.id) : [...f.category_ids, c.id] }))}
                    />
                  );
                })}
              </Stack>
            </Box>
          </Stack>

          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">Position GPS — cliquez sur la carte</Typography>
              <LoadingButton size="small" variant="soft" loading={locating} onClick={locate} startIcon={<Iconify icon="solar:gps-bold-duotone" />}>
                Ma position
              </LoadingButton>
            </Stack>
            <Box sx={{ height: 260, borderRadius: 1.5, overflow: 'hidden', '& .leaflet-container': { height: 1 } }}>
              {open && (
                <MapContainer key={point?.id ?? 'new'} center={[form.lat, form.lng]} zoom={9} scrollWheelZoom>
                  <Recenter lat={form.lat} lng={form.lng} />
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <ClickPicker onPick={({ lat, lng }) => setForm((f) => ({ ...f, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }))} />
                  <Marker position={[form.lat, form.lng]} icon={pin} />
                </MapContainer>
              )}
            </Box>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth size="small" label="Latitude" type="number" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: Number(e.target.value) }))} />
              <TextField fullWidth size="small" label="Longitude" type="number" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: Number(e.target.value) }))} />
            </Stack>

            <Typography variant="subtitle2" sx={{ pt: 1 }}>Horaires d’ouverture</Typography>
            {schedule.map((d) => (
              <Stack key={d.day_of_week} direction="row" spacing={1.5} alignItems="center">
                <Typography variant="body2" sx={{ width: 84 }}>{DAYS[d.day_of_week]}</Typography>
                <FormControlLabel
                  sx={{ m: 0, width: 96 }}
                  control={<Switch size="small" checked={!d.is_closed} onChange={(e) => setDay(d.day_of_week, { is_closed: !e.target.checked })} />}
                  label={<Typography variant="caption">{d.is_closed ? 'Fermé' : 'Ouvert'}</Typography>}
                />
                <TextField size="small" type="time" disabled={d.is_closed} value={d.opens_at} onChange={(e) => setDay(d.day_of_week, { opens_at: e.target.value })} sx={{ flex: 1 }} />
                <TextField size="small" type="time" disabled={d.is_closed} value={d.closes_at} onChange={(e) => setDay(d.day_of_week, { closes_at: e.target.value })} sx={{ flex: 1 }} />
              </Stack>
            ))}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>Annuler</Button>
        <LoadingButton variant="contained" loading={saving} onClick={save} startIcon={<Iconify icon="solar:check-circle-bold" />}>
          Enregistrer
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
