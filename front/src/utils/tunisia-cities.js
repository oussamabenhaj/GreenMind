/** Main Tunisian towns: [name, gouvernorat, lat, lng] — used for the map city search. */
const RAW = [
  ['Tunis', 'Tunis', 36.8065, 10.1815], ['La Marsa', 'Tunis', 36.8782, 10.3247], ['Carthage', 'Tunis', 36.8528, 10.3233],
  ['Le Bardo', 'Tunis', 36.8092, 10.1406], ['La Goulette', 'Tunis', 36.8183, 10.305], ['Les Berges du Lac', 'Tunis', 36.8431, 10.2737],
  ['Ariana', 'Ariana', 36.8625, 10.1956], ['La Soukra', 'Ariana', 36.8667, 10.2167], ['Raoued', 'Ariana', 36.9333, 10.1833],
  ['Charguia', 'Ariana', 36.838, 10.205], ['Ben Arous', 'Ben Arous', 36.7531, 10.2189], ['Mégrine', 'Ben Arous', 36.769, 10.2338],
  ['Radès', 'Ben Arous', 36.7686, 10.275], ['Hammam Lif', 'Ben Arous', 36.73, 10.3417], ['Bir El Kassaa', 'Ben Arous', 36.7372, 10.2306],
  ['Mornag', 'Ben Arous', 36.6833, 10.2833], ['Manouba', 'Manouba', 36.8078, 10.1011], ['Oued Ellil', 'Manouba', 36.8333, 10.0333],
  ['Bizerte', 'Bizerte', 37.2744, 9.8739], ['Menzel Bourguiba', 'Bizerte', 37.1536, 9.7853], ['Mateur', 'Bizerte', 37.04, 9.665],
  ['Nabeul', 'Nabeul', 36.4513, 10.7357], ['Hammamet', 'Nabeul', 36.4, 10.6167], ['Yasmine Hammamet', 'Nabeul', 36.3738, 10.5408],
  ['Kélibia', 'Nabeul', 36.8475, 11.0939], ['Grombalia', 'Nabeul', 36.5987, 10.5003], ['Korba', 'Nabeul', 36.5786, 10.8586],
  ['Menzel Temime', 'Nabeul', 36.7811, 10.9867], ['Zaghouan', 'Zaghouan', 36.4029, 10.1429], ['El Fahs', 'Zaghouan', 36.3744, 9.9064],
  ['Béja', 'Beja', 36.7256, 9.1817], ['Medjez el-Bab', 'Beja', 36.6497, 9.6125], ['Jendouba', 'Jendouba', 36.5011, 8.7802],
  ['Tabarka', 'Jendouba', 36.9544, 8.7581], ['Le Kef', 'Kef', 36.1742, 8.7049], ['Siliana', 'Siliana', 36.0849, 9.3708],
  ['Makthar', 'Siliana', 35.8572, 9.2061], ['Sousse', 'Sousse', 35.8256, 10.637], ['Msaken', 'Sousse', 35.7333, 10.5833],
  ['Kalâa Kebira', 'Sousse', 35.8667, 10.5333], ['Hammam Sousse', 'Sousse', 35.8611, 10.5933], ['Enfidha', 'Sousse', 36.1333, 10.3833],
  ['Monastir', 'Monastir', 35.7643, 10.8113], ['Ksar Hellal', 'Monastir', 35.646, 10.8906], ['Moknine', 'Monastir', 35.6333, 10.9],
  ['Jemmal', 'Monastir', 35.6233, 10.7594], ['Mahdia', 'Mahdia', 35.5047, 11.0622], ['Chebba', 'Mahdia', 35.2372, 11.115],
  ['El Jem', 'Mahdia', 35.2964, 10.7128], ['Ksour Essef', 'Mahdia', 35.4181, 10.9936], ['Kairouan', 'Kairouan', 35.6781, 10.0963],
  ['Haffouz', 'Kairouan', 35.6333, 9.6667], ['Sfax', 'Sfax', 34.74, 10.76], ['Sakiet Ezzit', 'Sfax', 34.8046, 10.7621],
  ['Sakiet Eddaïer', 'Sfax', 34.8, 10.7833], ['Thyna', 'Sfax', 34.689, 10.706], ['El Hencha', 'Sfax', 35.1316, 10.7369],
  ['Mahrès', 'Sfax', 34.5333, 10.5], ['Agareb', 'Sfax', 34.7414, 10.5311], ['Kerkennah', 'Sfax', 34.7128, 11.1928],
  ['Sidi Bouzid', 'Sidi Bouzid', 35.0382, 9.4858], ['Regueb', 'Sidi Bouzid', 34.8594, 9.7864], ['Kasserine', 'Kasserine', 35.1676, 8.8365],
  ['Sbeïtla', 'Kasserine', 35.2297, 9.1297], ['Gafsa', 'Gafsa', 34.425, 8.7842], ['Métlaoui', 'Gafsa', 34.3214, 8.4014],
  ['Tozeur', 'Tozeur', 33.9197, 8.1335], ['Nefta', 'Tozeur', 33.8731, 7.8778], ['Kébili', 'Kebili', 33.7045, 8.969],
  ['Douz', 'Kebili', 33.457, 9.023], ['Gabès', 'Gabes', 33.8815, 10.0982], ['El Hamma', 'Gabes', 33.8864, 9.7958],
  ['Mareth', 'Gabes', 33.6333, 10.3], ['Médenine', 'Medenine', 33.3549, 10.5055], ['Djerba — Houmt Souk', 'Medenine', 33.8756, 10.8575],
  ['Djerba — Midoun', 'Medenine', 33.8085, 10.994], ['Zarzis', 'Medenine', 33.5039, 11.1122], ['Ben Gardane', 'Medenine', 33.1378, 11.2197],
  ['Tataouine', 'Tataouine', 32.9297, 10.4518], ['Remada', 'Tataouine', 32.3167, 10.4],
];

export const TUNISIA_CITIES = RAW.map(([name, gouvernorat, lat, lng]) => ({ name, gouvernorat, lat, lng }));

export const TUNISIA_CENTER = [34.3, 9.6];
