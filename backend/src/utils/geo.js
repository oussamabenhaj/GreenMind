export const TUNISIA_BOUNDS = { minLat: 30, maxLat: 38.5, minLng: 7, maxLng: 12.5 };

export const GOVERNORATE_CENTERS = {
  Ariana: [36.8625, 10.1956],
  Beja: [36.7256, 9.1817],
  'Ben Arous': [36.753, 10.2189],
  Bizerte: [37.2744, 9.8739],
  Gabes: [33.8815, 10.0982],
  Gafsa: [34.425, 8.7842],
  Jendouba: [36.5011, 8.7802],
  Kairouan: [35.6781, 10.0963],
  Kasserine: [35.1676, 8.8365],
  Kebili: [33.7045, 8.969],
  Kef: [36.1742, 8.7049],
  Mahdia: [35.5047, 11.0622],
  Manouba: [36.8078, 10.1011],
  Medenine: [33.3549, 10.5055],
  Monastir: [35.7643, 10.8113],
  Nabeul: [36.4513, 10.7357],
  Sfax: [34.74, 10.76],
  'Sidi Bouzid': [35.0382, 9.4858],
  Siliana: [36.0849, 9.3708],
  Sousse: [35.8256, 10.637],
  Tataouine: [32.9297, 10.4518],
  Tozeur: [33.9197, 8.1335],
  Tunis: [36.8065, 10.1815],
  Zaghouan: [36.4029, 10.1429],
};

export const GOVERNORATES = Object.keys(GOVERNORATE_CENTERS);

export const normalizeText = (value) => String(value || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Fills lat/lng from the governorate center when coordinates are missing. */
export function withDefaultCoordinates(data) {
  if (data.lat != null && data.lng != null) return data;
  const center = GOVERNORATE_CENTERS[data.gouvernorat];
  return center ? { ...data, lat: center[0], lng: center[1] } : data;
}
