import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// Animated "film" for the auth page: 4 SVG scenes telling the CLAC story,
// auto-playing like a video (story progress bars, Ken Burns, pause on hover).
// ----------------------------------------------------------------------

const SCENE_DURATION = 7000;

const KEYFRAMES = `
@keyframes eco-spin { to { transform: rotate(360deg); } }
@keyframes eco-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
@keyframes eco-drift { from { transform: translateX(-160px); } to { transform: translateX(900px); } }
@keyframes eco-drive { 0% { transform: translateX(-260px); } 55% { transform: translateX(330px); } 70%,100% { transform: translateX(330px); } }
@keyframes eco-wheel { to { transform: rotate(360deg); } }
@keyframes eco-fall { 0% { transform: translateY(-40px); opacity: 0; } 15% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(150px); opacity: 0; } }
@keyframes eco-pulse { 0% { r: 6; opacity: .9; } 100% { r: 34; opacity: 0; } }
@keyframes eco-dash { to { stroke-dashoffset: -60; } }
@keyframes eco-pop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes eco-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes eco-sway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
@keyframes eco-shine { 0%,100% { opacity: .25; } 50% { opacity: .6; } }
@keyframes eco-scene-in { from { opacity: 0; transform: scale(1.04); } to { opacity: 1; transform: scale(1); } }
@keyframes eco-caption-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes eco-progress { from { width: 0%; } to { width: 100%; } }
@keyframes eco-ken { from { transform: scale(1.02) translate(0,0); } to { transform: scale(1.12) translate(-14px,-10px); } }
`;

const C = {
  leaf: '#3E9F2E',
  leafLight: '#8BD35A',
  lime: '#C5E86C',
  deep: '#17481A',
  trunk: '#7A4B23',
  river: '#2DA8D8',
  sky1: '#E9F8E1',
  sky2: '#C9EEDB',
  sun: '#FFE38A',
  white: '#FFFFFF',
};

const spin = (duration, origin) => ({ animation: `eco-spin ${duration}s linear infinite`, transformOrigin: origin, transformBox: 'fill-box' });

function Sky({ children }) {
  return (
    <>
      <defs>
        <linearGradient id="eco-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.sky1} />
          <stop offset="1" stopColor={C.sky2} />
        </linearGradient>
        <radialGradient id="eco-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.sun} />
          <stop offset="1" stopColor={C.sun} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="800" fill="url(#eco-sky)" />
      <circle cx="660" cy="110" r="120" fill="url(#eco-sun)" style={{ animation: 'eco-shine 5s ease-in-out infinite' }} />
      <circle cx="660" cy="110" r="42" fill={C.sun} />
      {[0, 1].map((i) => (
        <g key={i} style={{ animation: `eco-drift ${38 + i * 14}s linear infinite`, animationDelay: `-${i * 17}s` }}>
          <g transform={`translate(0 ${70 + i * 60})`} fill={C.white} opacity="0.9">
            <ellipse cx="60" cy="20" rx="46" ry="18" />
            <ellipse cx="95" cy="12" rx="34" ry="20" />
            <ellipse cx="30" cy="14" rx="26" ry="14" />
          </g>
        </g>
      ))}
      {children}
    </>
  );
}

function Hills() {
  return (
    <>
      <path d="M0 350 C 150 280 260 320 380 300 C 520 275 640 315 800 280 L800 800 L0 800Z" fill={C.leafLight} opacity="0.55" />
      <path d="M0 390 C 180 340 330 390 480 370 C 610 352 700 375 800 360 L800 800 L0 800Z" fill={C.leaf} opacity="0.85" />
    </>
  );
}

function Tree({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g style={{ animation: 'eco-sway 6s ease-in-out infinite', transformOrigin: '0px 0px', transformBox: 'view-box' }}>
        <path d="M-8 0 C -6 -50 -14 -80 -4 -120 L 6 -120 C 12 -80 6 -50 8 0 Z" fill={C.trunk} />
        <path d="M0 -95 C -30 -110 -40 -120 -55 -135 M2 -100 C 30 -115 40 -125 55 -140" stroke={C.trunk} strokeWidth="6" strokeLinecap="round" fill="none" />
        {[[-55, -150, 34], [0, -175, 44], [55, -155, 36], [-25, -130, 30], [30, -128, 30]].map(([cx, cy, r]) => (
          <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={r} fill={C.leaf} />
        ))}
        {[[-40, -165, 14], [20, -190, 16], [50, -150, 12]].map(([cx, cy, r]) => (
          <circle key={`h${cx}`} cx={cx} cy={cy} r={r} fill={C.leafLight} />
        ))}
      </g>
    </g>
  );
}

function RecycleBadge({ x, y, r = 46 }) {
  const c = 2 * Math.PI * r;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r + 16} fill={C.white} opacity="0.92" />
      <g style={spin(8, 'center')}>
        <circle r={r} fill="none" stroke={C.leaf} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${c / 3 - 22} 22`} />
        {[0, 120, 240].map((a) => (
          <path key={a} transform={`rotate(${a - 18}) translate(0 ${-r})`} d="M-9 -9 L5 0 L-9 9 Z" fill={C.leaf} />
        ))}
      </g>
      <path d={`M${-r * 0.32} ${r * 0.28} C ${-r * 0.4} ${-r * 0.3} ${r * 0.2} ${-r * 0.45} ${r * 0.4} ${-r * 0.4} C ${r * 0.42} ${r * 0.1} ${-r * 0.05} ${r * 0.42} ${-r * 0.32} ${r * 0.28} Z`} fill={C.leafLight} />
    </g>
  );
}

// Scene 1 — Olive mill: olives fall from the tree into a bin and become a resource.
function SceneHarvest() {
  return (
    <svg viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <Sky>
        <Hills />
        <Tree x={170} y={395} s={1.05} />
        {[246, 266, 286].map((cx, i) => (
          <circle
            key={cx}
            cx={cx}
            cy={225}
            r="7"
            fill="#4E5B1E"
            style={{ animation: `eco-fall 2.6s ease-in infinite`, animationDelay: `${i * 0.6}s` }}
          />
        ))}
        <g transform="translate(240 372)">
          <path d="M0 0 L150 0 L135 70 L15 70 Z" fill={C.trunk} />
          <rect x="-6" y="-10" width="162" height="14" rx="6" fill="#5E3A1A" />
          <text x="75" y="45" textAnchor="middle" fontSize="20" fontWeight="700" fill={C.lime}>GRIGNONS</text>
        </g>
        <g transform="translate(470 215)">
          <rect width="190" height="140" rx="14" fill={C.white} />
          <rect y="0" width="190" height="34" rx="14" fill={C.deep} />
          <text x="95" y="23" textAnchor="middle" fontSize="16" fontWeight="700" fill={C.white}>Huilerie Sfax Nord</text>
          <text x="20" y="66" fontSize="14" fill="#476">Matière disponible</text>
          <text x="20" y="96" fontSize="26" fontWeight="800" fill={C.leaf}>25 t</text>
          <rect x="20" y="110" width="150" height="10" rx="5" fill="#E3F6D3" />
          <rect x="20" y="110" width="0" height="10" rx="5" fill={C.leaf}>
            <animate attributeName="width" from="0" to="120" dur="2.5s" fill="freeze" />
          </rect>
        </g>
        <RecycleBadge x={565} y={130} r={34} />
      </Sky>
    </svg>
  );
}

// Scene 2 — Collection: a truck drives the material to a green collection point.
function SceneCollect() {
  return (
    <svg viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <Sky>
        <Hills />
        <rect y="400" width="800" height="64" fill="#5B6770" />
        <line x1="0" y1="432" x2="800" y2="432" stroke={C.white} strokeWidth="5" strokeDasharray="34 26" style={{ animation: 'eco-dash 1.2s linear infinite' }} />
        <g transform="translate(560 220)">
          <rect width="200" height="180" rx="8" fill={C.white} />
          <path d="M-12 0 L100 -60 L212 0 Z" fill={C.deep} />
          <rect x="70" y="100" width="60" height="80" fill={C.leaf} />
          <rect x="18" y="40" width="44" height="40" rx="4" fill="#CFEFF9" />
          <rect x="138" y="40" width="44" height="40" rx="4" fill="#CFEFF9" />
          <g transform="translate(100 -22)">
            <circle r="18" fill={C.lime} />
            <path d="M-8 4 C -8 -10 6 -14 10 -12 C 10 0 2 8 -8 4 Z" fill={C.leaf} />
          </g>
          <text x="100" y="30" textAnchor="middle" fontSize="15" fontWeight="700" fill={C.deep}>POINT DE COLLECTE</text>
        </g>
        <g style={{ animation: 'eco-drive 7s ease-in-out infinite' }}>
          <g transform="translate(0 318)">
            <rect x="0" y="10" width="190" height="80" rx="8" fill={C.leaf} />
            <text x="95" y="58" textAnchor="middle" fontSize="20" fontWeight="800" fill={C.white}>CLAC ♻</text>
            <path d="M190 30 L240 30 L268 62 L268 90 L190 90 Z" fill={C.deep} />
            <rect x="200" y="38" width="36" height="22" rx="3" fill="#CFEFF9" />
            {[45, 225].map((cx) => (
              <g key={cx} transform={`translate(${cx} 95)`}>
                <circle r="20" fill="#263238" />
                <g style={spin(0.6, 'center')}>
                  <circle r="8" fill="#B0BEC5" />
                  <rect x="-2" y="-16" width="4" height="32" fill="#90A4AE" />
                </g>
              </g>
            ))}
          </g>
        </g>
      </Sky>
    </svg>
  );
}

// Scene 3 — Network: pins pulse across a stylised Tunisia and connect.
const CITIES = [
  { name: 'Bizerte', x: 372, y: 108 },
  { name: 'Tunis', x: 400, y: 132 },
  { name: 'Sousse', x: 440, y: 232 },
  { name: 'Kairouan', x: 395, y: 252 },
  { name: 'Sfax', x: 452, y: 322 },
  { name: 'Gabès', x: 428, y: 400 },
];

function SceneNetwork() {
  const links = [[1, 2], [2, 4], [4, 5], [0, 1], [3, 4], [1, 3]];
  return (
    <svg viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id="eco-sea" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D8F3FB" />
          <stop offset="1" stopColor="#A9E2F3" />
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill="url(#eco-sea)" />
      {Array.from({ length: 12 }).map((_, i) => (
        <path key={i} d={`M ${-40 + i * 80} ${560 - (i % 3) * 20} q 20 -10 40 0 t 40 0`} stroke={C.white} strokeWidth="3" fill="none" opacity="0.6" />
      ))}
      <g transform="translate(40 30) scale(0.9)">
      <path
        d="M350 90 L405 84 L428 112 L418 146 L445 162 L440 200 L466 232 L456 272 L482 312 L470 344 L494 378 L478 418 L436 432 L420 478 L430 528 L404 578 L380 548 L366 498 L346 458 L322 408 L318 358 L304 318 L318 270 L308 222 L322 172 L328 122 Z"
        fill="#F4EBD0"
        stroke={C.leaf}
        strokeWidth="4"
      />
      <path d="M350 90 L405 84 L428 112 L418 146 L445 162 L440 200 L466 232 L456 272 L482 312 L470 344 L494 378 L436 432 L346 458 L318 358 L304 318 L318 270 L308 222 L322 172 L328 122 Z" fill={C.leafLight} opacity="0.35" />
      {links.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={CITIES[a].x}
          y1={CITIES[a].y}
          x2={CITIES[b].x}
          y2={CITIES[b].y}
          stroke={C.leaf}
          strokeWidth="3"
          strokeDasharray="8 7"
          style={{ animation: 'eco-dash 1.6s linear infinite' }}
        />
      ))}
      {CITIES.map((c, i) => (
        <g key={c.name}>
          <circle cx={c.x} cy={c.y} r="6" fill="none" stroke={C.leaf} strokeWidth="3" style={{ animation: 'eco-pulse 2s ease-out infinite', animationDelay: `${i * 0.33}s` }} />
          <circle cx={c.x} cy={c.y} r="8" fill={i % 2 ? C.river : C.leaf} stroke={C.white} strokeWidth="3" />
          <g transform={`translate(${c.x + 16} ${c.y - 10})`}>
            <g style={{ animation: 'eco-pop .6s ease-out both', animationDelay: `${0.4 + i * 0.25}s`, transformBox: 'fill-box' }}>
              <rect width={c.name.length * 9 + 18} height="24" rx="12" fill={C.white} />
              <text x="9" y="17" fontSize="13" fontWeight="700" fill={C.deep}>{c.name}</text>
            </g>
          </g>
        </g>
      ))}
      </g>
      <g transform="translate(560 140)">
        <g style={{ animation: 'eco-float 4s ease-in-out infinite' }}>
          <rect width="190" height="120" rx="16" fill={C.white} />
          <text x="20" y="38" fontSize="14" fill="#476">Acteurs connectés</text>
          <text x="20" y="80" fontSize="38" fontWeight="800" fill={C.leaf}>24</text>
          <text x="80" y="80" fontSize="16" fill="#476">gouvernorats</text>
        </g>
      </g>
    </svg>
  );
}

// Scene 4 — Real-time: a buyer and a seller negotiate, notifications pop.
function SceneDeal() {
  const bubbles = [
    { x: 120, y: 110, w: 300, text: 'Bonjour, 500 L d’huile usagée ?', me: false },
    { x: 380, y: 190, w: 300, text: 'Disponible chaque semaine ✅', me: true },
    { x: 120, y: 270, w: 260, text: 'Prix : 0,95 TND / L ?', me: false },
    { x: 400, y: 350, w: 280, text: 'Marché conclu 🤝🌿', me: true },
  ];
  return (
    <svg viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id="eco-deal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E3F6D3" />
          <stop offset="1" stopColor="#B9E4C9" />
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill="url(#eco-deal)" />
      <RecycleBadge x={690} y={110} r={30} />
      {bubbles.map((b, i) => (
        <g key={b.text} transform={`translate(${b.x} ${b.y})`}>
          <g style={{ animation: 'eco-pop .7s cubic-bezier(.2,.9,.3,1.3) both', animationDelay: `${0.5 + i * 1.2}s`, transformOrigin: b.me ? '100% 100%' : '0% 100%', transformBox: 'fill-box' }}>
            <rect width={b.w} height="58" rx="22" fill={b.me ? C.leaf : C.white} />
            <text x="22" y="36" fontSize="18" fontWeight="600" fill={b.me ? C.white : C.deep}>{b.text}</text>
          </g>
        </g>
      ))}
      <g transform="translate(60 420)">
        <circle cx="30" cy="30" r="30" fill={C.river} />
        <text x="30" y="38" textAnchor="middle" fontSize="22" fontWeight="800" fill={C.white}>A</text>
      </g>
      <g transform="translate(680 420)">
        <circle cx="30" cy="30" r="30" fill={C.leaf} />
        <text x="30" y="38" textAnchor="middle" fontSize="22" fontWeight="800" fill={C.white}>V</text>
      </g>
      <g transform="translate(560 470)">
        <g style={{ animation: 'eco-pop .6s ease-out both', animationDelay: '5.2s', transformBox: 'fill-box' }}>
          <rect width="190" height="44" rx="22" fill={C.deep} />
          <text x="95" y="28" textAnchor="middle" fontSize="15" fontWeight="700" fill={C.white}>🔔 Vente confirmée</text>
        </g>
      </g>
    </svg>
  );
}

const SCENES = [
  {
    Component: SceneHarvest,
    kicker: 'Vendeurs',
    title: 'Vos résidus deviennent des ressources',
    text: 'Grignons, huiles usagées, cartons… publiez vos matières en quelques clics.',
  },
  {
    Component: SceneCollect,
    kicker: 'Points de collecte',
    title: 'Une collecte locale et organisée',
    text: 'Les points de collecte achètent, stockent et redistribuent près de chez vous.',
  },
  {
    Component: SceneNetwork,
    kicker: 'Carte interactive',
    title: 'Toute la Tunisie circulaire, connectée',
    text: 'Trouvez acheteurs et partenaires par gouvernorat, catégorie ou distance.',
  },
  {
    Component: SceneDeal,
    kicker: 'Temps réel',
    title: 'Négociez et concluez en direct',
    text: 'Messagerie instantanée, demandes et notifications en temps réel.',
  },
];

// ----------------------------------------------------------------------

export function EcoFilm({ sx }) {
  const [{ index, prev }, setSlide] = useState({ index: 0, prev: null });
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const running = playing && !hover;

  // `prev` stays underneath while the new scene cross-fades in (pure CSS).
  const setIndex = (next) =>
    setSlide((cur) => {
      const target = typeof next === 'function' ? next(cur.index) : next;
      return target === cur.index ? cur : { index: target, prev: cur.index };
    });

  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SCENES.length), SCENE_DURATION);
    return () => clearTimeout(t);
  }, [index, running]);

  useEffect(() => {
    if (prev === null) return undefined;
    const t = setTimeout(() => setSlide((cur) => ({ ...cur, prev: null })), 1000);
    return () => clearTimeout(t);
  }, [prev]);

  const scene = SCENES[index];
  const { Component } = scene;
  const Previous = prev !== null ? SCENES[prev].Component : null;

  return (
    <Box
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      sx={[{ position: 'relative', overflow: 'hidden', bgcolor: C.deep }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <style>{KEYFRAMES}</style>

      {Previous && (
        <Box key={`prev-${prev}`} sx={{ position: 'absolute', inset: 0 }}>
          <Previous />
        </Box>
      )}
      <Box
        key={`scene-${index}`}
        sx={{ position: 'absolute', inset: 0, animation: 'eco-scene-in .9s ease-in-out both' }}
      >
        <Box sx={{ width: 1, height: 1, animation: `eco-ken ${SCENE_DURATION / 1000 + 1}s ease-out both` }}>
          <Component />
        </Box>
      </Box>

      {/* cinematic gradient */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(180deg, rgba(23,72,26,0.55) 0%, rgba(23,72,26,0) 22%, rgba(23,72,26,0) 48%, rgba(14,46,17,0.92) 100%)`,
        }}
      />

      {/* story progress bars */}
      <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 24, left: 32, right: 32 }}>
        {SCENES.map((s, i) => (
          <Box
            key={s.title}
            onClick={() => setIndex(i)}
            sx={{ flex: 1, height: 4, borderRadius: 2, cursor: 'pointer', bgcolor: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}
          >
            <Box
              key={`${index}-${i}`}
              sx={{
                height: 1,
                bgcolor: 'common.white',
                width: i < index ? '100%' : '0%',
                ...(i === index && {
                  animation: `eco-progress ${SCENE_DURATION}ms linear forwards`,
                  animationPlayState: running ? 'running' : 'paused',
                }),
              }}
            />
          </Box>
        ))}
      </Stack>

      {/* caption */}
      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: { md: 5, lg: 7 }, color: 'common.white' }}>
        <Box key={`caption-${index}`} sx={{ animation: 'eco-caption-in .6s ease-out both' }}>
            <Typography
              variant="overline"
              sx={{ px: 1.25, py: 0.5, borderRadius: 1, bgcolor: 'rgba(139,211,90,0.25)', color: C.lime, letterSpacing: 2 }}
            >
              {scene.kicker}
            </Typography>
            <Typography variant="h2" sx={{ mt: 2, mb: 1.5, maxWidth: 560, lineHeight: 1.15 }}>
              {scene.title}
            </Typography>
            <Typography sx={{ opacity: 0.85, maxWidth: 480, fontSize: 17 }}>{scene.text}</Typography>
          </Box>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 4 }}>
          <IconButton
            onClick={() => setPlaying((p) => !p)}
            sx={{ color: 'common.white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
          >
            <Iconify icon={playing ? 'solar:pause-bold' : 'solar:play-bold'} />
          </IconButton>
          <IconButton
            onClick={() => setIndex((i) => (i - 1 + SCENES.length) % SCENES.length)}
            sx={{ color: 'common.white' }}
          >
            <Iconify icon="eva:arrow-ios-back-fill" />
          </IconButton>
          <IconButton onClick={() => setIndex((i) => (i + 1) % SCENES.length)} sx={{ color: 'common.white' }}>
            <Iconify icon="eva:arrow-ios-forward-fill" />
          </IconButton>
          <Typography variant="caption" sx={{ opacity: 0.7, ml: 1 }}>
            {String(index + 1).padStart(2, '0')} / {String(SCENES.length).padStart(2, '0')}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
