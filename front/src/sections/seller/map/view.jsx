import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { m, AnimatePresence } from 'framer-motion';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Popup, useMap, Circle, Marker, TileLayer, MapContainer, useMapEvents } from 'react-leaflet';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';

import { useRouter } from 'src/routes/hooks';

import { useSpace } from 'src/hooks/use-space';
import { cleanParams } from 'src/hooks/use-api';

import { fQty, fMoney } from 'src/utils/clac';
import { TUNISIA_CITIES, TUNISIA_CENTER } from 'src/utils/tunisia-cities';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuthContext } from 'src/auth/hooks';

import { useReferenceData } from '../components/ui';
import { openConversation } from '../components/contact';

// ----------------------------------------------------------------------

const LAYERS = {
  seller: { label: 'Vendeurs', color: '#3E9F2E', glyph: '🌿' },
  collection_point: { label: 'Points de collecte', color: '#2DA8D8', glyph: '♻️' },
  buyer: { label: 'Acheteurs', color: '#F2A516', glyph: '🛒' },
  product: { label: 'Produits', color: '#C2185B', glyph: '📦' },
};
const ROLE_OF = { seller: 'seller', buyer: 'buyer', collection_point: 'collector' };

/** Key-free base maps. */
const BASEMAPS = {
  plan: { label: 'Plan', icon: 'solar:map-bold-duotone', url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors, HOT' },
  satellite: { label: 'Satellite', icon: 'solar:planet-bold-duotone', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Imagery &copy; Esri' },
  relief: { label: 'Relief', icon: 'solar:mountains-bold-duotone', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap, SRTM | &copy; OpenTopoMap', maxZoom: 17 },
};
const MAX_BOUNDS = [[28.3, 5.3], [39.4, 13.5]];

const CSS = `
.clac-pin { position: relative; width: 38px; height: 48px; transform-origin: 50% 100%;
  animation: clac-drop .65s cubic-bezier(.2,1.5,.4,1) both; }
.clac-pin svg { display: block; filter: drop-shadow(0 6px 8px rgba(0,0,0,.28)); transition: transform .25s ease; transform-origin: 50% 100%; }
.clac-pin:hover svg, .clac-pin.is-active svg { transform: scale(1.22) translateY(-2px); }
.clac-pin-glyph { position: absolute; top: 8px; left: 0; right: 0; text-align: center; font-size: 15px; line-height: 1; pointer-events: none; transition: transform .25s ease; }
.clac-pin:hover .clac-pin-glyph, .clac-pin.is-active .clac-pin-glyph { transform: translateY(-6px) scale(1.15); }
.clac-pin-ring { position: absolute; left: 50%; bottom: -3px; width: 16px; height: 8px; margin-left: -8px; border-radius: 50%; background: var(--c); opacity: 0; }
.clac-pin.is-active .clac-pin-ring { animation: clac-ring 1.6s ease-out infinite; }
@keyframes clac-drop { 0% { transform: translateY(-46px) scale(.6); opacity: 0; } 60% { opacity: 1; } 100% { transform: translateY(0) scale(1); } }
@keyframes clac-ring { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(5); opacity: 0; } }
.clac-zone { stroke-dasharray: 10 8; animation: clac-dash 18s linear infinite; }
@keyframes clac-dash { to { stroke-dashoffset: -500; } }
.clac-zone-wave { transform-box: fill-box; transform-origin: center; animation: clac-wave 2.8s ease-out infinite; }
@keyframes clac-wave { 0% { transform: scale(.15); opacity: .55; } 100% { transform: scale(1); opacity: 0; } }
.clac-me { width: 20px; height: 20px; border-radius: 50%; background: #1E88E5; border: 3px solid #fff; animation: clac-me 1.8s infinite; }
@keyframes clac-me { 0% { box-shadow: 0 0 0 0 rgba(30,136,229,.55); } 100% { box-shadow: 0 0 0 22px rgba(30,136,229,0); } }
.leaflet-popup-content-wrapper { border-radius: 14px; box-shadow: 0 12px 32px rgba(0,0,0,.18); }
.leaflet-popup-content { margin: 14px 16px; min-width: 230px; }
.leaflet-container { font-family: inherit; background: #dfeee6; }
`;

// Icons are cached so re-renders don't recreate markers (and replay the drop animation).
const iconCache = new Map();
function pinIcon(type, active) {
  const key = `${type}-${active}`;
  if (!iconCache.has(key)) {
    const { color, glyph } = LAYERS[type];
    iconCache.set(
      key,
      L.divIcon({
        className: '',
        iconSize: [38, 48],
        iconAnchor: [19, 46],
        popupAnchor: [0, -44],
        html: `<div class="clac-pin ${active ? 'is-active' : ''}" style="--c:${color}">
          <span class="clac-pin-ring"></span>
          <svg width="38" height="48" viewBox="0 0 38 48"><path d="M19 1C9 1 1 8.9 1 18.6 1 32 19 47 19 47s18-15 18-28.4C37 8.9 29 1 19 1z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="19" cy="18" r="11" fill="white" fill-opacity=".95"/></svg>
          <span class="clac-pin-glyph">${glyph}</span></div>`,
      })
    );
  }
  return iconCache.get(key);
}
const meIcon = L.divIcon({ className: '', iconSize: [20, 20], iconAnchor: [10, 10], html: '<div class="clac-me"></div>' });

const zoomForRadius = (km) => (km <= 8 ? 12 : km <= 15 ? 11 : km <= 30 ? 10 : km <= 60 ? 9 : km <= 120 ? 8 : 7);
const jitter = (i) => (((i * 9301 + 49297) % 233280) / 233280 - 0.5) * 0.006;

// ----------------------------------------------------------------------

function MapController({ target, full, onBounds }) {
  const map = useMap();
  useMapEvents({ moveend: () => onBounds(map.getBounds().toBBoxString()) });
  useEffect(() => {
    onBounds(map.getBounds().toBBoxString());
  }, [map, onBounds]);
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom ?? map.getZoom(), { duration: 1.3 });
  }, [map, target]);
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 350);
    return () => clearTimeout(t);
  }, [map, full]);
  return null;
}

function GlassCard({ sx, children, ...other }) {
  return (
    <Card
      sx={[
        (theme) => ({
          backdropFilter: 'blur(14px)',
          backgroundColor: `rgba(${theme.vars.palette.background.paperChannel} / 0.9)`,
          boxShadow: theme.customShadows.dropdown,
          border: `1px solid ${theme.vars.palette.divider}`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {children}
    </Card>
  );
}

function FloatButton({ title, icon, active, onClick }) {
  return (
    <Tooltip title={title} placement="left">
      <IconButton
        onClick={onClick}
        sx={{
          width: 44,
          height: 44,
          bgcolor: active ? 'primary.main' : 'background.paper',
          color: active ? 'common.white' : 'text.primary',
          boxShadow: (theme) => theme.customShadows.z8,
          '&:hover': { bgcolor: active ? 'primary.dark' : 'background.neutral' },
        }}
      >
        <Iconify icon={icon} width={22} />
      </IconButton>
    </Tooltip>
  );
}

// ----------------------------------------------------------------------

export function MapView() {
  const router = useRouter();
  const sp = useSpace();
  const { user } = useAuthContext();
  const { categories } = useReferenceData();

  const allowed = useMemo(
    () => (user?.role === 'buyer' ? ['seller', 'collection_point', 'product'] : ['seller', 'collection_point', 'buyer', 'product']),
    [user?.role]
  );
  const [mode, setMode] = useState('city');
  const [types, setTypes] = useState(allowed);
  const [city, setCity] = useState(null);
  const [center, setCenter] = useState(null); // { lat, lng, label }
  const [radius, setRadius] = useState(30);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [bounds, setBounds] = useState(null);
  const [actors, setActors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [target, setTarget] = useState(null);
  const [zones, setZones] = useState(true);
  const [full, setFull] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [me, setMe] = useState(null);
  const [base, setBase] = useState('plan');
  const markerRefs = useRef({});

  // ---- data: actors (radius around the chosen place, else visible area) + products
  useEffect(() => {
    const actorTypes = types.filter((t) => t !== 'product');
    let params = null;
    if (center) params = { lat: center.lat, lng: center.lng, radius_km: radius };
    else if (bounds) {
      const [w, s, e, n] = bounds.split(',').map(Number);
      const b = [Math.max(w, 6.1), Math.max(s, 29.1), Math.min(e, 13.4), Math.min(n, 39.4)];
      if (b[0] < b[2] && b[1] < b[3]) params = { bounds: b.join(',') };
    }
    const wantProducts = types.includes('product') && (center || q.trim().length >= 2 || categoryId || mode === 'product');
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const [a, p] = await Promise.all([
          actorTypes.length && params
            ? axios.get(endpoints.map.markers, { params: cleanParams({ ...params, types: actorTypes.join(','), category_id: categoryId, limit: 500 }) })
            : null,
          wantProducts
            ? axios.get(endpoints.products.list, {
                params: cleanParams({
                  q: q.trim().length >= 2 ? q.trim() : '',
                  category_id: categoryId,
                  limit: 100,
                  ...(center && { lat: center.lat, lng: center.lng, radius_km: radius, sort: 'distance' }),
                }),
              })
            : null,
        ]);
        setActors(a?.data.data ?? []);
        setProducts(
          (p?.data.data ?? [])
            .filter((x) => x.lat != null)
            .map((x, i) => ({ ...x, type: 'product', lat: x.lat + jitter(i), lng: x.lng + jitter(i + 7) }))
        );
      } catch {
        // keep previous results
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [types, center, radius, bounds, q, categoryId, mode]);

  const all = useMemo(() => [...products, ...actors], [products, actors]);
  const visible = useMemo(() => all.filter((x) => types.includes(x.type)), [all, types]);
  const counts = useMemo(() => all.reduce((acc, x) => ({ ...acc, [x.type]: (acc[x.type] ?? 0) + 1 }), {}), [all]);
  const list = useMemo(() => {
    const items = (mode === 'product' ? [...products, ...actors] : [...actors, ...products]).filter((x) => types.includes(x.type));
    return center ? [...items].sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999)) : items;
  }, [mode, products, actors, center, types]);
  const coverage = useMemo(() => actors.filter((x) => x.type === 'collection_point'), [actors]);

  // ---- actions
  const fly = (lat, lng, zoom) => setTarget({ lat, lng, zoom, at: Date.now() });

  const chooseCity = (c) => {
    setCity(c);
    if (!c) {
      setCenter(null);
      return;
    }
    setCenter({ lat: c.lat, lng: c.lng, label: c.name });
    fly(c.lat, c.lng, zoomForRadius(radius));
  };

  const commitRadius = (km) => {
    setRadius(km);
    if (center) fly(center.lat, center.lng, zoomForRadius(km));
  };

  const applyProfileLocation = () => {
    const pos = user?.lat != null ? { lat: user.lat, lng: user.lng } : { lat: 36.8065, lng: 10.1815 };
    setMe(pos);
    setCity(null);
    setCenter({ ...pos, label: 'Mon adresse' });
    fly(pos.lat, pos.lng, zoomForRadius(radius));
  };

  const locate = () => {
    if (!navigator.geolocation) {
      applyProfileLocation();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const inTunisia = coords.latitude > 30 && coords.latitude < 38.5 && coords.longitude > 7 && coords.longitude < 12.5;
        if (!inTunisia) {
          applyProfileLocation();
          return;
        }
        const pos = { lat: coords.latitude, lng: coords.longitude };
        setMe(pos);
        setCity(null);
        setCenter({ ...pos, label: 'Ma position' });
        fly(pos.lat, pos.lng, zoomForRadius(radius));
      },
      applyProfileLocation,
      { timeout: 8000 }
    );
  };

  const resetView = () => {
    setCity(null);
    setCenter(null);
    setSelected(null);
    fly(TUNISIA_CENTER[0], TUNISIA_CENTER[1], 7);
  };

  const focus = useCallback(
    (item) => {
      const key = `${item.type}-${item.id}`;
      setSelected(key);
      setTarget({ lat: item.lat, lng: item.lng, zoom: Math.max(12, zoomForRadius(radius)), at: Date.now() });
      setTimeout(() => markerRefs.current[key]?.openPopup(), 1400);
    },
    [radius]
  );

  const toggleType = (type) => setTypes((ts) => (ts.includes(type) ? ts.filter((t) => t !== type) : [...ts, type]));

  const ownerOf = (item) => (item.type === 'product' ? item.seller_id : item.type === 'collection_point' ? item.manager_id : item.id);
  const canContact = (item) => (item.type === 'product' ? 'seller' : ROLE_OF[item.type]) !== user?.role && ownerOf(item) !== user?.id;
  const contact = async (item) => router.push(await openConversation(ownerOf(item)));

  // ---- render helpers
  const popup = (item) => (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: LAYERS[item.type].color }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {LAYERS[item.type].label}
          {item.distance_km != null && ` · ${item.distance_km} km`}
        </Typography>
      </Stack>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {item.type === 'product' ? item.title : item.name}
      </Typography>
      {item.type === 'product' ? (
        <>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {item.seller?.company_name || item.seller?.name} · {item.gouvernorat}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="baseline" sx={{ my: 1 }}>
            <Typography variant="h6" sx={{ color: 'primary.dark' }}>
              {item.price_per_unit != null ? fMoney(item.final_price_per_unit) : 'Sur devis'}
            </Typography>
            {item.best_discount_percentage && <Label color="error">-{item.best_discount_percentage}%</Label>}
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Disponible : {fQty(item.quantity_available, item.unit)}
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {[item.address, item.gouvernorat].filter(Boolean).join(', ')}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ my: 1 }}>
            {item.is_verified && <Label color="info">Vérifié</Label>}
            {item.type === 'collection_point' && <Label color={item.is_open_now ? 'success' : 'default'}>{item.is_open_now ? 'Ouvert' : 'Fermé'}</Label>}
            {!!item.products_count && <Label color="primary">{item.products_count} produit(s)</Label>}
          </Stack>
          {item.phone && (
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              📞 {item.phone}
            </Typography>
          )}
        </>
      )}
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
        {item.type === 'product' && (
          <Button size="small" variant="contained" onClick={() => router.push(sp.product(item.id))}>
            Voir le produit
          </Button>
        )}
        {canContact(item) && (
          <Button size="small" variant="soft" onClick={() => contact(item)} startIcon={<Iconify icon="solar:chat-round-dots-bold" width={16} />}>
            Contacter
          </Button>
        )}
        <Button
          size="small"
          color="inherit"
          component="a"
          href={`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`}
          target="_blank"
          rel="noopener"
          startIcon={<Iconify icon="solar:routing-2-bold" width={16} />}
        >
          Itinéraire
        </Button>
      </Stack>
    </Box>
  );

  return (
    <DashboardContent maxWidth={false} disablePadding sx={{ flex: '1 1 auto', display: 'flex', p: { xs: 1, md: 2 }, pt: { xs: 1, md: 1 } }}>
      <style>{CSS}</style>
      <Box
        sx={{
          position: full ? 'fixed' : 'relative',
          inset: full ? 0 : 'auto',
          zIndex: full ? 1300 : 'auto',
          flex: 1,
          minHeight: full ? '100vh' : { xs: 'calc(100vh - 90px)', md: 'calc(100vh - var(--layout-header-desktop-height, 72px) - 24px)' },
          borderRadius: full ? 0 : 2,
          overflow: 'hidden',
          boxShadow: (theme) => (full ? 'none' : theme.customShadows.card),
          '& .leaflet-container': { position: 'absolute', inset: 0 },
        }}
      >
        <MapContainer
          center={user?.lat != null ? [user.lat, user.lng] : TUNISIA_CENTER}
          zoom={user?.lat != null ? 8 : 7}
          minZoom={6}
          maxBounds={MAX_BOUNDS}
          zoomControl={false}
          scrollWheelZoom
        >
          <TileLayer key={base} attribution={BASEMAPS[base].attribution} url={BASEMAPS[base].url} maxZoom={BASEMAPS[base].maxZoom ?? 19} />
          <MapController target={target} full={full} onBounds={setBounds} />

          {zones &&
            coverage.map((cp) => (
              <Circle
                key={`cov-${cp.id}`}
                center={[cp.lat, cp.lng]}
                radius={12000}
                pathOptions={{ color: LAYERS.collection_point.color, weight: 1, opacity: 0.6, fillOpacity: 0.08 }}
                interactive={false}
              />
            ))}

          {center && (
            <>
              <Circle
                center={[center.lat, center.lng]}
                radius={radius * 1000}
                pathOptions={{ color: '#2A7A23', weight: 2.5, fillColor: '#8BD35A', fillOpacity: 0.1, className: 'clac-zone' }}
                interactive={false}
              />
              <Circle
                key={`wave-${radius}-${center.lat}-${center.lng}`}
                center={[center.lat, center.lng]}
                radius={radius * 1000}
                pathOptions={{ color: '#3E9F2E', weight: 2, fill: false, className: 'clac-zone-wave' }}
                interactive={false}
              />
            </>
          )}
          {me && <Marker position={[me.lat, me.lng]} icon={meIcon} />}

          {visible.map((item) => {
            const key = `${item.type}-${item.id}`;
            return (
              <Marker
                key={key}
                position={[item.lat, item.lng]}
                icon={pinIcon(item.type, selected === key)}
                ref={(r) => {
                  if (r) markerRefs.current[key] = r;
                }}
                eventHandlers={{ click: () => setSelected(key) }}
              >
                <Popup>{popup(item)}</Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, height: 3 }} />}

        {/* ---------------- search panel ---------------- */}
        <AnimatePresence>
          {panelOpen && (
            <GlassCard
              component={m.div}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              sx={{
                position: 'absolute',
                zIndex: 1000,
                top: 16,
                left: 16,
                bottom: { sm: 16 },
                width: { xs: 'calc(100% - 92px)', sm: 380 },
                maxHeight: { xs: '60%', sm: 'none' },
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 2, pb: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'common.white',
                    background: (theme) => `linear-gradient(135deg, ${theme.vars.palette.primary.light}, ${theme.vars.palette.primary.dark})`,
                  }}
                >
                  <Iconify icon="solar:map-point-search-bold-duotone" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1">Explorer la carte</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="div">
                    {visible.length} résultat(s){center ? ` · ${radius} km autour de ${center.label}` : ' dans la zone visible'}
                  </Typography>
                </Box>
                <Tooltip title="Masquer">
                  <IconButton size="small" onClick={() => setPanelOpen(false)}>
                    <Iconify icon="eva:arrow-ios-back-fill" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Tabs value={mode} onChange={(_, v) => setMode(v)} variant="fullWidth" sx={{ px: 2 }}>
                <Tab value="city" label="Par ville" icon={<Iconify icon="solar:city-bold" width={18} />} iconPosition="start" />
                <Tab value="product" label="Par produit" icon={<Iconify icon="solar:box-bold" width={18} />} iconPosition="start" />
              </Tabs>

              <Stack spacing={1.5} sx={{ p: 2 }}>
                {mode === 'product' && (
                  <TextField
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Grignons, huile usagée, carton, PET…"
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" /></InputAdornment> } }}
                  />
                )}
                <Autocomplete
                  options={TUNISIA_CITIES}
                  value={city}
                  onChange={(_, c) => chooseCity(c)}
                  groupBy={(c) => c.gouvernorat}
                  getOptionLabel={(c) => c.name}
                  isOptionEqualToValue={(a, b) => a.name === b.name}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={mode === 'city' ? 'Ville : Sfax, Djerba, Hammamet…' : 'Autour de… (optionnel)'}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Iconify icon="solar:city-bold-duotone" sx={{ color: 'primary.main' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
                <Stack direction="row" spacing={1}>
                  <TextField select fullWidth size="small" label="Matière" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <MenuItem value="">Toutes les matières</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </TextField>
                  <Button variant="soft" size="small" onClick={locate} startIcon={<Iconify icon="solar:gps-bold" width={18} />} sx={{ flexShrink: 0 }}>
                    Près de moi
                  </Button>
                </Stack>

                <AnimatePresence>
                  {center && (
                    <Box component={m.div} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} sx={{ overflow: 'hidden' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          Rayon de recherche
                        </Typography>
                        <Label color="primary">{radius} km</Label>
                      </Stack>
                      <Slider
                        value={radius}
                        min={5}
                        max={150}
                        step={5}
                        onChange={(_, v) => setRadius(v)}
                        onChangeCommitted={(_, v) => commitRadius(v)}
                        marks={[{ value: 10, label: '10' }, { value: 50, label: '50' }, { value: 100, label: '100' }, { value: 150, label: '150' }]}
                        sx={{ mt: 0.5, mx: 1, width: 'calc(100% - 16px)' }}
                      />
                    </Box>
                  )}
                </AnimatePresence>

                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {allowed.map((type) => {
                    const on = types.includes(type);
                    const layer = LAYERS[type];
                    return (
                      <Chip
                        key={type}
                        size="small"
                        onClick={() => toggleType(type)}
                        label={`${layer.glyph} ${layer.label} · ${counts[type] ?? 0}`}
                        sx={{
                          fontWeight: 600,
                          border: `1px solid ${layer.color}`,
                          bgcolor: on ? layer.color : 'transparent',
                          color: on ? 'common.white' : 'text.primary',
                          '&:hover': { bgcolor: on ? layer.color : 'action.hover' },
                        }}
                      />
                    );
                  })}
                </Stack>
              </Stack>

              <Box sx={{ borderTop: 1, borderColor: 'divider', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Scrollbar sx={{ flex: 1, minHeight: 120, px: 1, py: 1 }}>
                  {list.length === 0 && (
                    <Typography variant="body2" sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
                      {mode === 'product' && q.length < 2 && !center && !categoryId
                        ? 'Tapez un produit ou choisissez une ville.'
                        : 'Aucun résultat — élargissez le rayon ou déplacez la carte.'}
                    </Typography>
                  )}
                  {list.slice(0, 100).map((item) => {
                    const key = `${item.type}-${item.id}`;
                    const layer = LAYERS[item.type];
                    return (
                      <ListItemButton key={key} selected={selected === key} onClick={() => focus(item)} sx={{ borderRadius: 1.25, gap: 1.5, py: 1, mb: 0.25, flex: '0 0 auto' }}>
                        <Box sx={{ width: 34, height: 34, flexShrink: 0, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: layer.color, fontSize: 16 }}>
                          {layer.glyph}
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle2" noWrap>
                            {item.type === 'product' ? item.title : item.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="div">
                            {item.type === 'product'
                              ? `${item.price_per_unit != null ? fMoney(item.final_price_per_unit) : 'Sur devis'} · ${item.seller?.company_name || item.seller?.name}`
                              : `${layer.label} · ${item.gouvernorat}`}
                          </Typography>
                        </Box>
                        {item.distance_km != null && (
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', flexShrink: 0 }}>
                            {item.distance_km} km
                          </Typography>
                        )}
                      </ListItemButton>
                    );
                  })}
                </Scrollbar>
              </Box>
            </GlassCard>
          )}
        </AnimatePresence>

        {!panelOpen && (
          <Button
            variant="contained"
            onClick={() => setPanelOpen(true)}
            startIcon={<Iconify icon="solar:map-point-search-bold" />}
            sx={{ position: 'absolute', zIndex: 1000, top: 16, left: 16, boxShadow: (theme) => theme.customShadows.z8 }}
          >
            Rechercher
          </Button>
        )}

        {/* ---------------- floating controls ---------------- */}
        <Stack spacing={1} sx={{ position: 'absolute', zIndex: 1000, top: 16, right: 16 }}>
          <FloatButton title="Ma position" icon="solar:gps-bold-duotone" onClick={locate} />
          <FloatButton title="Toute la Tunisie" icon="solar:global-bold-duotone" onClick={resetView} />
          <FloatButton
            title={`Fond de carte : ${BASEMAPS[base].label} (cliquer pour changer)`}
            icon={BASEMAPS[base].icon}
            onClick={() => setBase((b) => ({ plan: 'satellite', satellite: 'relief', relief: 'plan' })[b])}
          />
          <FloatButton title="Zones de couverture des points" icon="solar:radar-2-bold-duotone" active={zones} onClick={() => setZones((z) => !z)} />
          <FloatButton
            title={full ? 'Quitter le plein écran' : 'Plein écran'}
            icon={full ? 'solar:quit-full-screen-square-bold' : 'solar:full-screen-square-bold'}
            active={full}
            onClick={() => setFull((f) => !f)}
          />
        </Stack>

        {/* ---------------- zone summary ---------------- */}
        <AnimatePresence>
          {center && (
            <Box sx={{ position: 'absolute', zIndex: 1000, bottom: 24, left: 0, right: 0, display: { xs: 'none', md: 'flex' }, justifyContent: 'center', pointerEvents: 'none' }}>
              <GlassCard
                component={m.div}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                sx={{ px: 2.5, py: 1.25, borderRadius: 5, display: 'flex', alignItems: 'center', gap: 2, pointerEvents: 'auto' }}
              >
                <Iconify icon="solar:map-point-wave-bold-duotone" sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle2">
                  {center.label} · {radius} km
                </Typography>
                {allowed.map((t) => (
                  <Typography key={t} variant="caption" sx={{ color: 'text.secondary' }}>
                    {LAYERS[t].glyph} <b>{counts[t] ?? 0}</b>
                  </Typography>
                ))}
                <IconButton size="small" onClick={() => chooseCity(null)}>
                  <Iconify icon="mingcute:close-line" width={16} />
                </IconButton>
              </GlassCard>
            </Box>
          )}
        </AnimatePresence>

        {/* ---------------- legend ---------------- */}
        <GlassCard sx={{ position: 'absolute', zIndex: 1000, bottom: 24, right: 16, p: 1.5, display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="overline" sx={{ color: 'text.disabled' }}>
            Légende
          </Typography>
          <Stack spacing={0.75} sx={{ mt: 0.5 }}>
            {allowed.map((t) => (
              <Stack key={t} direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: LAYERS[t].color, border: '2px solid white', boxShadow: 1 }} />
                <Typography variant="caption">{LAYERS[t].label}</Typography>
              </Stack>
            ))}
            {zones && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'rgba(45,168,216,0.2)', border: '1px solid #2DA8D8' }} />
                <Typography variant="caption">Couverture (12 km)</Typography>
              </Stack>
            )}
            {center && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'rgba(139,211,90,0.25)', border: '2px dashed #2A7A23' }} />
                <Typography variant="caption">Zone de recherche</Typography>
              </Stack>
            )}
          </Stack>
        </GlassCard>
      </Box>
    </DashboardContent>
  );
}
