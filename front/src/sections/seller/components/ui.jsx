import { m } from 'framer-motion';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import Pagination from '@mui/material/Pagination';

import axios, { endpoints } from 'src/lib/axios';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function PageHeader({ title, subtitle, icon, action, sx }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={2}
      sx={[{ mb: { xs: 3, md: 4 } }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {icon && (
        <Box
          sx={{
            width: 52,
            height: 52,
            flexShrink: 0,
            borderRadius: 1.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'common.white',
            background: (theme) =>
              `linear-gradient(135deg, ${theme.vars.palette.primary.light}, ${theme.vars.palette.primary.dark})`,
            boxShadow: (theme) => theme.customShadows.primary,
          }}
        >
          <Iconify icon={icon} width={28} />
        </Box>
      )}
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h4">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function KpiCard({ title, value, caption, icon, color = 'primary', loading, delay = 0 }) {
  return (
    <Card
      component={m.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      sx={{ p: 3, position: 'relative', overflow: 'hidden', height: 1 }}
    >
      <Box
        sx={{
          top: -24,
          right: -24,
          width: 110,
          height: 110,
          position: 'absolute',
          borderRadius: '50%',
          bgcolor: `${color}.lighter`,
          opacity: 0.7,
        }}
      />
      <Box
        sx={{
          width: 48,
          height: 48,
          mb: 2,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          color: `${color}.dark`,
          bgcolor: `${color}.lighter`,
        }}
      >
        <Iconify icon={icon} width={28} />
      </Box>
      <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
        {title}
      </Typography>
      {loading ? (
        <Skeleton width={90} height={44} />
      ) : (
        <Typography variant="h3" sx={{ my: 0.5 }}>
          {value}
        </Typography>
      )}
      {caption && (
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {caption}
        </Typography>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

export function StatusLabel({ map, value }) {
  const meta = map[value] ?? { label: value, color: 'default' };
  return <Label color={meta.color}>{meta.label}</Label>;
}

export function ListSkeleton({ count = 6, height = 120 }) {
  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' } }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={height} />
      ))}
    </Box>
  );
}

export function Empty({ title, description, action, icon = 'solar:leaf-bold-duotone' }) {
  return (
    <Box
      sx={{
        py: 8,
        px: 3,
        gap: 1,
        display: 'flex',
        borderRadius: 2,
        alignItems: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        border: (theme) => `dashed 1px ${theme.vars.palette.divider}`,
        bgcolor: 'background.neutral',
      }}
    >
      <Box
        sx={{
          width: 88,
          height: 88,
          mb: 1,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'primary.lighter',
          color: 'primary.main',
        }}
      >
        <Iconify icon={icon} width={48} />
      </Box>
      <Typography variant="h6">{title}</Typography>
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}

export function PagePagination({ meta, onChange }) {
  if (!meta || meta.total_pages <= 1) return null;
  return (
    <Pagination
      count={meta.total_pages}
      page={meta.page}
      onChange={(_, page) => onChange(page)}
      color="primary"
      sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}
    />
  );
}

// ----------------------------------------------------------------------

let referenceCache = null;

/** Categories + markets (cached for the session). */
export function useReferenceData() {
  const [data, setData] = useState(referenceCache ?? { categories: [], markets: [] });

  useEffect(() => {
    if (referenceCache) return;
    Promise.all([axios.get(endpoints.categories), axios.get(endpoints.markets)])
      .then(([c, mk]) => {
        referenceCache = { categories: c.data.data, markets: mk.data.data };
        setData(referenceCache);
      })
      .catch(() => {});
  }, []);

  return data;
}

// ----------------------------------------------------------------------

/**
 * Minimal responsive SVG area/bar chart (no chart dependency).
 * series: [{ label, value }]
 */
export function EcoChart({ series = [], type = 'area', height = 260, format = (v) => v, color = 'primary' }) {
  const W = 640;
  const H = height;
  const pad = { t: 20, r: 16, b: 32, l: 48 };
  const max = Math.max(1, ...series.map((s) => s.value));
  const step = series.length > 1 ? (W - pad.l - pad.r) / (series.length - 1) : 0;
  const barW = series.length ? ((W - pad.l - pad.r) / series.length) * 0.56 : 0;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const x = (i) => pad.l + i * step;
  const points = series.map((s, i) => [x(i), y(s.value)]);
  const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' ');
  const area = points.length ? `${line} L${x(series.length - 1)},${H - pad.b} L${pad.l},${H - pad.b} Z` : '';
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  const gradId = `eco-grad-${color}`;

  return (
    <Box sx={{ width: 1, color: `${color}.main`, '& text': { fill: (theme) => theme.vars.palette.text.disabled, fontSize: 11 } }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end">
              {format(Math.round(t))}
            </text>
          </g>
        ))}
        {type === 'area' ? (
          <>
            <path d={area} fill={`url(#${gradId})`} />
            <m.path
              d={line}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2 }}
            />
            {points.map(([px, py], i) => (
              <circle key={i} cx={px} cy={py} r="4" fill="white" stroke="currentColor" strokeWidth="2.5">
                <title>{`${series[i].label} : ${format(series[i].value)}`}</title>
              </circle>
            ))}
          </>
        ) : (
          series.map((s, i) => {
            const bx = pad.l + ((W - pad.l - pad.r) / series.length) * (i + 0.5) - barW / 2;
            return (
              <m.rect
                key={s.label}
                x={bx}
                width={barW}
                rx="6"
                fill="currentColor"
                initial={{ y: H - pad.b, height: 0 }}
                animate={{ y: y(s.value), height: H - pad.b - y(s.value) }}
                transition={{ duration: 0.8, delay: i * 0.04 }}
              >
                <title>{`${s.label} : ${format(s.value)}`}</title>
              </m.rect>
            );
          })
        )}
        {series.map((s, i) => {
          const lx = type === 'area' ? x(i) : pad.l + ((W - pad.l - pad.r) / series.length) * (i + 0.5);
          return (
            <text key={s.label} x={lx} y={H - 10} textAnchor="middle">
              {s.label}
            </text>
          );
        })}
      </svg>
    </Box>
  );
}

/** Donut progress ring (e.g. acceptance rate). */
export function Ring({ value = 0, size = 120, label }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, color: 'primary.main' }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeOpacity="0.12" strokeWidth="12" fill="none" />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(value, 100) / 100) }}
          transition={{ duration: 1.2 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h4">{Math.round(value)}%</Typography>
        {label && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

/** Gradient welcome banner with the CLAC logo (used by every role dashboard). */
export function HeroBanner({ kicker, title, subtitle, actions, logo }) {
  return (
    <Card
      sx={{
        p: { xs: 3, md: 5 },
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        background: (theme) =>
          `linear-gradient(120deg, ${theme.vars.palette.primary.darker} 0%, ${theme.vars.palette.primary.dark} 45%, ${theme.vars.palette.primary.main} 100%)`,
      }}
    >
      {logo && (
        <Box
          component={m.img}
          src={logo}
          alt=""
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 0.95, x: 0 }}
          transition={{ duration: 0.8 }}
          sx={{
            position: 'absolute',
            right: { xs: -60, md: 24 },
            bottom: { xs: -20, md: 10 },
            width: { xs: 240, md: 340 },
            filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.25))',
            opacity: { xs: 0.35, md: 0.95 },
          }}
        />
      )}
      <Box sx={{ position: 'relative', maxWidth: 580 }}>
        <Typography variant="overline" sx={{ opacity: 0.8 }}>
          {kicker}
        </Typography>
        <Typography variant="h3" sx={{ mt: 1 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 1.5, opacity: 0.85 }}>{subtitle}</Typography>
        {actions && (
          <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mt: 3 }}>
            {actions}
          </Stack>
        )}
      </Box>
    </Card>
  );
}

/** Buttons styled for the green hero banner. */
export const heroButtonSx = { primary: { bgcolor: 'common.white', color: 'primary.darker', '&:hover': { bgcolor: 'primary.lighter' } }, ghost: { color: 'common.white', borderColor: 'rgba(255,255,255,0.5)' } };

export const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
};
