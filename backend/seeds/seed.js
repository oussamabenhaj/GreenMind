/**
 * Realistic demo dataset — DEVELOPMENT ONLY.
 * Wipes business tables, then inserts actors located in real Tunisian towns,
 * market-consistent prices, 12 months of purchase history, stock computed from
 * movements, requests/responses, offers, discounts, posts, chats, notifications.
 * Business names are fictional. Run after `npm run migrate`:  npm run seed
 *
 * Bilingual: every translatable text is stored with its Arabic version in the
 * `i18n` JSONB column ({ field: { fr, ar } }) — translations live in seeds/ar.js.
 * Establishments cover the Tunisian food chain: olive mills, hotels, restaurants
 * (lablabi, couscous), bakeries, pâtisseries, cafés, coffee roasters, tomato
 * canning (Cap Bon), dairy (Mateur), orange-blossom distillery (Nabeul), harissa,
 * fish market (Sfax), semolina mill — and the recyclers/buyers of their waste.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool, { transaction } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { describeDbError } from '../src/config/db-error.js';
import { AR, pointDescriptionAr } from './ar.js';

if (env.isProduction) {
  console.error('Refusing to seed a production database.');
  process.exit(1);
}

// ---------------------------------------------------------------- helpers
let seed = 20261118;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (a, b) => a + rnd() * (b - a);
const round = (v, step = 1) => Math.round(v / step) * step;
const DAY = 86400000;
const ago = (days, hours = 9) => new Date(Date.now() - days * DAY + (hours - 9) * 3600000);
const ahead = (days) => new Date(Date.now() + days * DAY);
const isoDay = (d) => d.toISOString().slice(0, 10);

const PASSWORD = 'Clac2026!';

// ---------------------------------------------------------------- i18n
const missingAr = new Set();
const bi = (fr) => {
  if (fr == null) return null;
  if (AR[fr] === undefined) missingAr.add(fr);
  return { fr, ar: AR[fr] ?? null };
};
/** `{ title: 'Grignons…', description: '…' }` → JSON for the i18n column. */
const i18n = (fields) => JSON.stringify(Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null).map(([k, v]) => [k, bi(v)])));

// ---------------------------------------------------------------- demo images
// Photos live in the web app's public folder (front/public/demo), so the stored URLs stay
// valid on any host or port. Accounts without a photo get an initials avatar, written once.
const AVATAR_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../front/public/demo/avatars');
const AVATAR_PHOTOS = { zitouna: 'zitouna.jpg', biodiesel: 'biodiesel.jpg', pointvert: 'pointvert.jpg' };
const avatarUrl = (key) => `/demo/avatars/${AVATAR_PHOTOS[key] ?? `${key}.svg`}`;

function initialsAvatar(key, name) {
  const file = path.join(AVATAR_DIR, `${key}.svg`);
  if (AVATAR_PHOTOS[key] || fs.existsSync(file) || !fs.existsSync(path.dirname(AVATAR_DIR))) return;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const hue = [...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 11);
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
  fs.writeFileSync(file, `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue}, 42%, 36%)"/><stop offset="1" stop-color="hsl(${(hue + 26) % 360}, 50%, 24%)"/>
  </linearGradient></defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <text x="256" y="256" dy="0.35em" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif"
    font-size="196" font-weight="600" fill="#ffffff" fill-opacity="0.9">${initials}</text>
</svg>
`);
}

// ---------------------------------------------------------------- actors
// [key, email, role, name, company, gouvernorat, address, lat, lng, categories, phone, bio]
const SELLERS = [
  ['zitouna', 'huilerie.zitouna@clac.tn', 'Mohamed Ben Salah', 'Huilerie Zitouna', 'Sfax', 'Route de Tunis km 9, Sakiet Ezzit', 34.8046, 10.7621, ['olive-pomace'], '+216 74 456 210', 'Huilerie familiale depuis 1987, système 3 phases. 1 200 t d’olives triturées par campagne.'],
  ['amal', 'moulin.elamal@clac.tn', 'Hedi Trabelsi', 'Moulin El Amal', 'Sfax', 'Zone agricole, El Hencha', 35.1316, 10.7369, ['olive-pomace'], '+216 74 680 115', 'Moulin coopératif — grignons et noyaux disponibles de novembre à mars.'],
  ['chebba', 'contact@sahelbio-oil.tn', 'Sonia Gharbi', 'Huilerie Sahel Bio', 'Mahdia', 'Route de Melloulech, Chebba', 35.2372, 11.1150, ['olive-pomace', 'organic-waste'], '+216 73 641 300', 'Huile d’olive bio certifiée. Valorisation complète des sous-produits.'],
  ['hammamet', 'achats@medina-hammamet.tn', 'Karim Jaziri', 'Hôtel Médina Hammamet', 'Nabeul', 'Yasmine Hammamet', 36.3738, 10.5408, ['used-cooking-oil', 'organic-waste', 'glass'], '+216 72 241 000', 'Complexe hôtelier 600 lits — collecte hebdomadaire d’huiles et biodéchets.'],
  ['darjeld', 'dar.jeld@clac.tn', 'Leila Bouzid', 'Restaurant Dar El Jeld', 'Tunis', 'Rue Dar El Jeld, Médina de Tunis', 36.7986, 10.1694, ['used-cooking-oil'], '+216 71 560 916', 'Restaurant traditionnel — huile de friture filtrée et stockée en fûts.'],
  ['lac2', 'operations@snackchain-lac.tn', 'Amine Chaabane', 'Snack Chain Les Berges du Lac', 'Tunis', 'Les Berges du Lac 2', 36.8431, 10.2737, ['used-cooking-oil', 'paper-cardboard'], '+216 70 020 450', '14 points de vente sur le Grand Tunis.'],
  ['primeurs', 'coop.primeurs@clac.tn', 'Fethi Mansouri', 'Coopérative Primeurs Bir El Kassaa', 'Ben Arous', 'Marché de gros, Bir El Kassaa', 36.7372, 10.2306, ['organic-waste'], '+216 71 383 220', 'Invendus fruits & légumes du marché de gros — 8 à 12 t / semaine.'],
  ['capbon', 'env@capbon-boissons.tn', 'Rim Hamdi', 'Cap Bon Boissons', 'Nabeul', 'Zone industrielle, Grombalia', 36.5987, 10.5003, ['plastic', 'paper-cardboard'], '+216 72 255 780', 'Embouteillage eaux & jus : rebuts PET et cartons d’emballage.'],
  ['kalaa', 'logistique@hyper-kalaa.tn', 'Nizar Ayari', 'Hyper Kalâa Sousse', 'Sousse', 'Route de Kalâa Kebira', 35.8613, 10.5950, ['paper-cardboard', 'plastic'], '+216 73 343 900', 'Hypermarché : cartons en balles et films étirables.'],
  ['megrine', 'atelier.megrine@clac.tn', 'Slim Ferchichi', 'Atelier Métallique Mégrine', 'Ben Arous', 'Zone industrielle, Mégrine', 36.7690, 10.2338, ['metal'], '+216 71 433 512', 'Charpente métallique — chutes acier et aluminium.'],
  ['ksar', 'production@ksarhellal-textile.tn', 'Najet Khelifi', 'Confection Ksar Hellal', 'Monastir', 'Zone industrielle, Ksar Hellal', 35.6460, 10.8906, ['textile'], '+216 73 475 640', 'Atelier jean & coton — 6 t de chutes par mois.'],
  ['djerba', 'eco@djerba-palace.tn', 'Walid Ben Youssef', 'Djerba Palace Resort', 'Medenine', 'Zone touristique, Midoun', 33.8085, 10.9940, ['used-cooking-oil', 'glass', 'organic-waste'], '+216 75 731 200', 'Resort 4* engagé dans la démarche zéro déchet.'],
  ['douz', 'station.douz@clac.tn', 'Ali Ghodbane', 'Station Dattes Douz', 'Kebili', 'Route de Kebili, Douz', 33.4570, 9.0230, ['organic-waste'], '+216 75 470 118', 'Conditionnement de dattes Deglet Nour : écarts de tri et noyaux.'],
  // food service & agrifood
  ['ennour', 'boulangerie.ennour@clac.tn', 'Moez Hammami', 'Boulangerie Ennour', 'Tunis', 'Rue Bab Souika, Tunis', 36.8045, 10.1690, ['bread-surplus'], '+216 71 562 330', 'Boulangerie de quartier : baguettes, tabouna et pain mlawi. 40 à 60 kg d’invendus par jour.'],
  ['cafe', 'cafe.sidibou@clac.tn', 'Nabil Ayed', 'Café Panorama Sidi Bou Saïd', 'Tunis', 'Rue Habib Thameur, Sidi Bou Saïd', 36.8687, 10.3416, ['coffee-grounds', 'organic-waste'], '+216 71 740 112', 'Café traditionnel — express et café turc, ~25 kg de marc par jour en été.'],
  ['torref', 'torrefaction.bensalem@clac.tn', 'Hichem Ben Salem', 'Torréfaction Ben Salem', 'Ariana', 'Zone industrielle, La Soukra', 36.8610, 10.2050, ['coffee-grounds', 'textile'], '+216 70 860 455', 'Torréfacteur depuis 1972 : pellicules de café et sacs de jute.'],
  ['lablabi', 'resto.lablabi@clac.tn', 'Chokri Mabrouk', 'Restaurant Lablabi El Hafsia', 'Tunis', 'Souk El Hafsia, Médina de Tunis', 36.8000, 10.1720, ['used-cooking-oil', 'organic-waste', 'bread-surplus'], '+216 71 563 908', 'Lablabi, kafteji et fricassé : huile de friture, pain rassis et épluchures.'],
  ['couscous', 'resto.couscous.sfax@clac.tn', 'Saloua Feki', 'Restaurant Dar Couscous Sfax', 'Sfax', 'Avenue Hedi Chaker, Sfax', 34.7400, 10.7600, ['organic-waste', 'used-cooking-oil'], '+216 74 225 610', 'Couscous au poisson, mloukhia, ojja : 300 couverts par jour.'],
  ['patisserie', 'patisserie.yasmine@clac.tn', 'Amel Chtioui', 'Pâtisserie Yasmine', 'Sousse', 'Boulevard du 14 Janvier, Sousse', 35.8350, 10.6300, ['bread-surplus', 'organic-waste', 'paper-cardboard'], '+216 73 228 140', 'Baklawa, makroudh et kaak warka : invendus, coquilles d’œufs et cartons.'],
  ['tomate', 'qualite@conserverie-korba.tn', 'Kamel Bouraoui', 'Conserverie Cap Bon Tomate', 'Nabeul', 'Zone industrielle, Korba', 36.5780, 10.8580, ['agrifood-byproducts', 'metal'], '+216 72 389 700', 'Concentré de tomate double : 900 t de pelures et pépins par saison (juillet–septembre).'],
  ['laiterie', 'environnement@laiterie-mateur.tn', 'Sami Jelassi', 'Laiterie du Nord', 'Bizerte', 'Route de Béja, Mateur', 37.0400, 9.6650, ['agrifood-byproducts', 'plastic'], '+216 72 468 300', 'Fromages et lben : 15 000 L de lactosérum par jour.'],
  ['zahr', 'distillerie.zahr@clac.tn', 'Hayet Ben Romdhane', 'Distillerie Zahr Nabeul', 'Nabeul', 'Route de Dar Chaabane, Nabeul', 36.4600, 10.7300, ['agrifood-byproducts', 'organic-waste'], '+216 72 271 515', 'Eau de fleur d’oranger (zhar) et néroli : résidus de distillation et écorces de bigarade.'],
  ['harissa', 'production@harissa-cap-bon.tn', 'Lotfi Gharsalli', 'Harissa du Cap Bon', 'Nabeul', 'Zone industrielle, Menzel Temime', 36.7800, 10.9850, ['agrifood-byproducts'], '+216 72 344 020', 'Harissa traditionnelle : queues, pépins et piments déclassés.'],
  ['poisson', 'marche.poisson.sfax@clac.tn', 'Habib Elloumi', 'Mareyeurs du Port de Sfax', 'Sfax', 'Port de pêche, Sfax', 34.7300, 10.7700, ['agrifood-byproducts', 'plastic'], '+216 74 497 260', 'Mareyage sardine, poulpe et daurade : têtes, arêtes et viscères triés chaque matin.'],
  ['semoulerie', 'achats@semoulerie-sfax.tn', 'Riadh Kammoun', 'Semoulerie Ezzitouna', 'Sfax', 'Route de Mahdia km 4, Sfax', 34.7650, 10.7850, ['agrifood-byproducts', 'paper-cardboard'], '+216 74 655 880', 'Semoule et couscous : son de blé et remoulage en sacs de 40 kg.'],
];

const BUYERS = [
  ['biodiesel', 'achats@biodiesel-sahel.tn', 'Yassine Mejri', 'BioDiesel Sahel', 'Monastir', 'Zone industrielle, Monastir', 35.7643, 10.8113, ['used-cooking-oil'], '+216 73 461 870', 'Production de biodiesel B100 à partir d’huiles usagées. Capacité 300 000 L/an.'],
  ['compostnord', 'appro@compost-nord.tn', 'Ines Dridi', 'Compost Nord', 'Bizerte', 'Route de Mateur, Bizerte', 37.2580, 9.8510, ['organic-waste', 'olive-pomace'], '+216 72 431 905', 'Plateforme de compostage 15 000 t/an — compost normé pour l’agriculture.'],
  ['biomasse', 'combustible@biomasse-kairouan.tn', 'Mourad Saidi', 'Énergie Biomasse Kairouan', 'Kairouan', 'Zone industrielle, Kairouan', 35.6781, 10.0963, ['olive-pomace'], '+216 77 230 640', 'Grignons séchés et noyaux pour chaudières industrielles et hammams.'],
  ['plastirec', 'matieres@plastirec.tn', 'Hatem Kefi', 'PlastiRec Tunisie', 'Ben Arous', 'Zone industrielle, Ben Arous', 36.7531, 10.2189, ['plastic'], '+216 71 389 450', 'Régénération PET/PEHD en paillettes et granulés.'],
  ['cartonnerie', 'achats@cartonnerie-med.tn', 'Olfa Rekik', 'Cartonnerie Méditerranée', 'Ariana', 'Zone industrielle, Charguia', 36.8410, 10.1990, ['paper-cardboard'], '+216 70 836 120', 'Fabrication de carton recyclé — achat de balles OCC.'],
  ['fonderie', 'ferraille@fonderie-gabes.tn', 'Bechir Jlassi', 'Fonderie du Sud', 'Gabes', 'Zone industrielle, Gabès', 33.8815, 10.0982, ['metal'], '+216 75 270 330', 'Fonderie acier & aluminium — achat ferraille triée.'],
  ['savonnerie', 'contact@savon-nabeul.tn', 'Mariem Zouari', 'Savonnerie Artisanale de Nabeul', 'Nabeul', 'Rue Farhat Hached, Nabeul', 36.4513, 10.7357, ['used-cooking-oil'], '+216 72 286 410', 'Savons artisanaux à base d’huiles recyclées.'],
  ['effilochage', 'achat@effilochage-sahel.tn', 'Anis Belhadj', 'Effilochage Textile Sahel', 'Sousse', 'Zone industrielle, Sidi Abdelhamid', 35.8030, 10.6250, ['textile'], '+216 73 323 700', 'Effilochage de chutes textiles pour isolants et rembourrage.'],
  ['elevage', 'ferme.mornag@clac.tn', 'Adel Sassi', 'Ferme Laitière Mornag', 'Ben Arous', 'Route de Mornag', 36.6800, 10.2900, ['bread-surplus', 'agrifood-byproducts'], '+216 71 360 215', 'Élevage de 250 vaches laitières : pain sec, son et lactosérum pour l’alimentation.'],
  ['champignon', 'pleurotes.zaghouan@clac.tn', 'Wided Mejri', 'Champignonnière de Zaghouan', 'Zaghouan', 'Zriba, Zaghouan', 36.3700, 10.1400, ['coffee-grounds', 'agrifood-byproducts'], '+216 72 680 044', 'Culture de pleurotes sur marc de café et paille.'],
  ['aliment', 'appro@aliment-betail-sahel.tn', 'Fathi Ben Amor', 'Aliments Bétail Sahel', 'Monastir', 'Zone industrielle, Moknine', 35.6300, 10.9000, ['bread-surplus', 'agrifood-byproducts', 'olive-pomace'], '+216 73 435 900', 'Fabricant d’aliments composés : achat de pain sec, son et coproduits.'],
  ['farinepoisson', 'achat@farine-poisson-mahdia.tn', 'Mounir Ghariani', 'Farine de Poisson Mahdia', 'Mahdia', 'Port de Mahdia', 35.5020, 11.0700, ['agrifood-byproducts'], '+216 73 681 377', 'Production de farine et huile de poisson pour l’aquaculture.'],
];

const COLLECTORS = [
  ['pointvert', 'collecte.sfax@clac.tn', 'Rania Masmoudi', 'Point Vert Sfax', 'Sfax', 'Zone Poudrière 2, Sfax', 34.7520, 10.7350, ['olive-pomace', 'plastic', 'paper-cardboard', 'metal', 'agrifood-byproducts'], '+216 74 297 600', 'Réseau de collecte sfaxien agréé ANGed.'],
  ['ecotunis', 'grandtunis@eco-collecte.tn', 'Sami Bouaziz', 'Éco-Collecte Grand Tunis', 'Tunis', 'Rue de l’Industrie, Charguia 1', 36.8380, 10.2050, ['used-cooking-oil', 'paper-cardboard', 'plastic', 'metal', 'coffee-grounds', 'bread-surplus'], '+216 71 771 300', 'Collecte multi-matériaux pour hôtels, restaurants et commerces.'],
  ['sahelrec', 'contact@sahel-recyclage.tn', 'Imen Ben Ammar', 'Sahel Recyclage', 'Sousse', 'Route de Monastir, Sousse', 35.8100, 10.6300, ['plastic', 'paper-cardboard', 'textile', 'glass'], '+216 73 220 870', 'Tri et conditionnement — Sousse & Monastir.'],
  ['djerbapropre', 'djerba.propre@clac.tn', 'Hamza Ouerghi', 'Djerba Propre', 'Medenine', 'Route de Midoun, Houmt Souk', 33.8700, 10.8560, ['used-cooking-oil', 'glass', 'plastic'], '+216 75 650 090', 'Association de collecte sélective de l’île de Djerba.'],
];

const PENDING_USERS = [
  ['newseller', 'nouvelle.huilerie@gmail.com', 'seller', 'Anouar Lahmar', 'Huilerie Lahmar', 'Sidi Bouzid', 35.0382, 9.4858, ['olive-pomace']],
  ['newbuyer', 'achats@agri-compost-beja.tn', 'buyer', 'Sarra Toumi', 'Agri-Compost Béja', 'Beja', 36.7256, 9.1817, ['organic-waste']],
];

// [collector, name, gouvernorat, address, lat, lng, capacity_kg, categories, verified, schedule]
const POINTS = [
  ['pointvert', 'Point Vert — Poudrière', 'Sfax', 'Zone Poudrière 2, Sfax', 34.7520, 10.7350, 120000, ['olive-pomace', 'plastic', 'paper-cardboard', 'metal', 'agrifood-byproducts'], true, 'weekdays_sat'],
  ['pointvert', 'Point Vert — Thyna', 'Sfax', 'Route de Gabès km 7, Thyna', 34.6890, 10.7060, 60000, ['olive-pomace', 'paper-cardboard'], true, 'weekdays'],
  ['ecotunis', 'Éco-Collecte Charguia', 'Ariana', 'Charguia 1, Tunis-Carthage', 36.8380, 10.2050, 80000, ['used-cooking-oil', 'paper-cardboard', 'plastic', 'coffee-grounds', 'bread-surplus'], true, 'weekdays_sat'],
  ['ecotunis', 'Éco-Collecte Ben Arous', 'Ben Arous', 'Zone industrielle, Ben Arous', 36.7480, 10.2280, 70000, ['metal', 'paper-cardboard', 'plastic'], true, 'weekdays'],
  ['ecotunis', 'Éco-Collecte La Marsa', 'Tunis', 'Avenue Taïeb Mhiri, La Marsa', 36.8782, 10.3247, 15000, ['used-cooking-oil', 'glass'], false, 'weekdays'],
  ['sahelrec', 'Sahel Recyclage — Sidi Abdelhamid', 'Sousse', 'Zone industrielle Sidi Abdelhamid', 35.8030, 10.6290, 90000, ['plastic', 'paper-cardboard', 'textile'], true, 'weekdays_sat'],
  ['sahelrec', 'Sahel Recyclage — Monastir', 'Monastir', 'Route de l’aéroport, Skanes', 35.7590, 10.7660, 50000, ['plastic', 'glass', 'textile'], true, 'weekdays'],
  ['djerbapropre', 'Djerba Propre — Houmt Souk', 'Medenine', 'Route de Midoun, Houmt Souk', 33.8700, 10.8560, 30000, ['used-cooking-oil', 'glass', 'plastic'], true, 'everyday'],
];

// [seller, slug, title, description, unit, qty, price, market, months_available, views]
const PRODUCTS = [
  ['zitouna', 'olive-pomace', 'Grignons d’olive humides — campagne 2026/27', 'Grignons 3 phases, humidité ~50 %. Enlèvement camion benne sur site, disponibles de novembre à mars.', 'kg', 320000, 0.07, 'national', 4, 182],
  ['zitouna', 'olive-pomace', 'Noyaux d’olive concassés (combustible)', 'Noyaux séparés et séchés, PCI ~4 200 kcal/kg. Idéal chaudières et hammams. Big bags 1 t.', 'kg', 45000, 0.24, 'national', 6, 137],
  ['amal', 'olive-pomace', 'Grignons d’olive frais', 'Grignons issus de trituration en continu, stockés sur aire bétonnée.', 'kg', 180000, 0.065, 'local', 4, 96],
  ['amal', 'olive-pomace', 'Grignons épuisés secs', 'Grignons épuisés (après extraction), humidité < 12 %, en vrac.', 'kg', 60000, 0.16, 'national', 8, 74],
  ['chebba', 'olive-pomace', 'Grignons bio certifiés', 'Grignons issus d’olives bio (certification Ecocert) — adapté au compostage bio.', 'kg', 90000, 0.09, 'export', 4, 121],
  ['chebba', 'organic-waste', 'Feuilles et brindilles d’olivier', 'Résidus de nettoyage des olives, broyés. Bon structurant pour compost.', 'kg', 25000, 0.03, 'local', 4, 38],
  ['hammamet', 'used-cooking-oil', 'Huile de friture usagée — hôtel', 'Huile végétale (tournesol/soja) filtrée, stockée en fûts de 200 L. Environ 1 800 L/mois en saison.', 'l', 1800, 1.35, 'local', 12, 211],
  ['hammamet', 'organic-waste', 'Biodéchets de restauration', 'Épluchures et restes de buffets triés à la source, bacs de 240 L, collecte 3x/semaine.', 'kg', 12000, 0.02, 'local', 12, 54],
  ['hammamet', 'glass', 'Bouteilles en verre (calcin)', 'Verre blanc et vert trié, bacs de 660 L.', 'kg', 6000, 0.08, 'local', 12, 22],
  ['darjeld', 'used-cooking-oil', 'Huile de friture filtrée', 'Huile d’olive et de tournesol de friture, filtrée. Bidons de 20 L.', 'l', 350, 1.45, 'local', 12, 88],
  ['lac2', 'used-cooking-oil', 'Huiles usagées — réseau 14 snacks', 'Collecte groupée sur nos 14 points de vente du Grand Tunis. ~2 500 L/mois.', 'l', 2500, 1.30, 'local', 12, 164],
  ['lac2', 'paper-cardboard', 'Cartons d’emballage aplatis', 'Cartons ondulés propres, aplatis et cerclés.', 'kg', 4000, 0.22, 'local', 12, 31],
  ['primeurs', 'organic-waste', 'Invendus fruits & légumes', 'Invendus du marché de gros, sans emballage. 8 à 12 t par semaine.', 'kg', 40000, 0.015, 'wholesale-bir-el-kassaa', 12, 143],
  ['primeurs', 'organic-waste', 'Cagettes bois cassées', 'Cagettes en bois non traité, broyables.', 'kg', 6000, 0.04, 'wholesale-bir-el-kassaa', 12, 19],
  ['capbon', 'plastic', 'Préformes et bouteilles PET déclassées', 'PET transparent, préformes et bouteilles hors spécifications, en octabins.', 'kg', 15000, 0.85, 'national', 12, 176],
  ['capbon', 'plastic', 'Bouchons PEHD', 'Bouchons PEHD multicolores en big bags.', 'kg', 3000, 0.75, 'national', 12, 58],
  ['capbon', 'paper-cardboard', 'Cartons de conditionnement', 'Cartons ondulés en balles de 400 kg.', 'kg', 9000, 0.27, 'national', 12, 47],
  ['kalaa', 'paper-cardboard', 'Balles de carton OCC', 'Cartons ondulés en balles compressées de 350–450 kg, stockés à l’abri.', 'kg', 22000, 0.28, 'national', 12, 129],
  ['kalaa', 'plastic', 'Film étirable PEBD', 'Film transparent de palettisation, propre, en balles.', 'kg', 5000, 0.45, 'national', 12, 66],
  ['megrine', 'metal', 'Chutes d’acier (ferraille E40)', 'Chutes de découpe de profilés et tôles acier, triées, sans peinture.', 'kg', 28000, 0.68, 'national', 12, 152],
  ['megrine', 'metal', 'Chutes d’aluminium 6060', 'Profilés aluminium propres, sans rupture de pont thermique.', 'kg', 2500, 3.6, 'export', 12, 118],
  ['megrine', 'metal', 'Câbles cuivre dénudés', 'Cuivre dénudé brillant (millberry).', 'kg', 400, 18.5, 'export', 12, 203],
  ['ksar', 'textile', 'Chutes de denim', 'Chutes de coupe jean 100 % coton, triées par couleur.', 'kg', 6000, 0.55, 'national', 12, 87],
  ['ksar', 'textile', 'Chutes coton blanc', 'Chutes de t-shirts coton blanc, idéal effilochage.', 'kg', 3500, 0.62, 'export', 12, 45],
  ['djerba', 'used-cooking-oil', 'Huile de friture — resort Djerba', 'Huile de tournesol filtrée, fûts de 200 L. Volumes x2 en été.', 'l', 1200, 1.40, 'local', 12, 72],
  ['djerba', 'glass', 'Verre blanc trié', 'Bouteilles de verre blanc sans bouchons.', 'kg', 8000, 0.09, 'local', 12, 28],
  ['douz', 'organic-waste', 'Écarts de tri de dattes', 'Dattes déclassées (calibre, aspect) — alimentation animale ou compost.', 'kg', 35000, 0.15, 'national', 5, 99],
  ['douz', 'organic-waste', 'Noyaux de dattes', 'Noyaux séchés, pour torréfaction ou biomasse.', 'kg', 8000, 0.20, 'export', 5, 61],
  // food service & agrifood (index 28+, no demo photo: the category cover is shown)
  ['ennour', 'bread-surplus', 'Pain rassis — baguettes et tabouna', 'Invendus de la veille, séchés à l’air, en sacs de 25 kg. Idéal alimentation animale.', 'kg', 1500, 0.12, 'local', 12, 64],
  ['lablabi', 'bread-surplus', 'Pain sec pour lablabi (surplus)', 'Pain rassis coupé, surplus non utilisé pour le lablabi, sacs de 20 kg.', 'kg', 600, 0.10, 'local', 12, 33],
  ['lablabi', 'used-cooking-oil', 'Huile de friture — fricassé et kafteji', 'Huile de tournesol de friture filtrée, bidons de 20 L.', 'l', 400, 1.35, 'local', 12, 41],
  ['cafe', 'coffee-grounds', 'Marc de café express', 'Marc de café 100 % arabica/robusta, collecté chaque soir, seaux de 15 kg.', 'kg', 700, 0.05, 'local', 12, 58],
  ['torref', 'coffee-grounds', 'Pellicules de torréfaction', 'Pellicules (silver skin) légères, en big bags — paillage, compost ou combustible.', 'kg', 1200, 0.04, 'national', 12, 27],
  ['torref', 'textile', 'Sacs de jute de café vides', 'Sacs en jute 60 kg (origine Brésil, Éthiopie), réutilisables ou pour l’artisanat.', 'unit', 2000, 0.80, 'national', 12, 49],
  ['couscous', 'organic-waste', 'Épluchures et restes de cuisine', 'Épluchures de légumes (couscous, mloukhia, ojja) triées à la source, bacs de 120 L.', 'kg', 3000, 0.02, 'local', 12, 21],
  ['patisserie', 'bread-surplus', 'Invendus de pâtisserie et kaak', 'Baklawa, makroudh et kaak warka invendus — pour élevage ou méthanisation.', 'kg', 400, 0.20, 'local', 12, 26],
  ['patisserie', 'organic-waste', 'Coquilles d’œufs', 'Coquilles d’œufs séchées (≈ 300 kg/mois) — amendement calcique.', 'kg', 300, 0.05, 'local', 12, 18],
  ['tomate', 'agrifood-byproducts', 'Pelures et pépins de tomate', 'Coproduit du concentré de tomate, frais ou séché. Disponible juillet–septembre.', 'kg', 250000, 0.03, 'national', 3, 112],
  ['laiterie', 'agrifood-byproducts', 'Lactosérum (petit-lait) frais', 'Lactosérum doux de fromagerie, citerne de 10 000 L. Enlèvement quotidien.', 'l', 150000, 0.02, 'local', 12, 77],
  ['zahr', 'agrifood-byproducts', 'Écorces de bigarade et résidus de distillation', 'Résidus de distillation de fleur d’oranger et écorces de bigaradier, mars–mai.', 'kg', 18000, 0.06, 'local', 3, 46],
  ['harissa', 'agrifood-byproducts', 'Queues et pépins de piment', 'Queues, pépins et piments déclassés de la fabrication de harissa.', 'kg', 22000, 0.05, 'national', 4, 39],
  ['poisson', 'agrifood-byproducts', 'Têtes et arêtes de sardine', 'Coproduits de mareyage sous glace, bacs de 50 kg, collecte avant 10 h.', 'kg', 9000, 0.18, 'local', 12, 84],
  ['semoulerie', 'agrifood-byproducts', 'Son de blé dur', 'Son et remoulage de semoulerie en sacs de 40 kg.', 'kg', 60000, 0.45, 'national', 12, 131],
];

// ---------------------------------------------------------------- seed
async function run(db) {
  await db.query(`TRUNCATE exchange_responses, exchange_offers, notifications, messages, conversation_participants, conversations, stock_movements,
    purchases, offers, request_responses, buy_requests, stock_items, collection_point_schedules, collection_points,
    discounts, posts, products, users RESTART IDENTITY CASCADE`);

  const cat = Object.fromEntries((await db.query('SELECT slug, id FROM categories')).rows.map((r) => [r.slug, r.id]));
  const market = Object.fromEntries((await db.query('SELECT slug, id FROM markets')).rows.map((r) => [r.slug, r.id]));
  const hash = await bcrypt.hash(PASSWORD, 10);

  // ---- users
  const U = {};
  const insertUser = async (key, email, role, name, company, gov, address, lat, lng, cats, phone, bio, { verified = true, createdDaysAgo } = {}) => {
    initialsAvatar(key, name);
    const { rows } = await db.query(`
      INSERT INTO users (email, password_hash, role, name, company_name, gouvernorat, address, lat, lng, category_ids,
        phone, bio, avatar_url, is_verified, created_at, last_login_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id
    `, [email, hash, role, name, company, gov, address, lat, lng, cats.map((s) => cat[s]), phone, bio, avatarUrl(key), verified,
      ago(createdDaysAgo ?? round(between(200, 420))), ago(between(0, 6))]);
    U[key] = { id: rows[0].id, role, name, company, gov, address, lat, lng, cats };
  };
  initialsAvatar('admin', 'Clac Tunisie');
  await db.query(`INSERT INTO users (email, password_hash, role, name, company_name, gouvernorat, address, avatar_url, is_verified, created_at)
    VALUES ('admin@clac.tn', $1, 'admin', 'Équipe CLAC', 'CLAC', 'Tunis', 'Avenue Habib Bourguiba, Tunis', $2, true, $3)`,
    [await bcrypt.hash('Admin2026!', 10), avatarUrl('admin'), ago(450)]);
  for (const [k, e, n, c, g, a, la, ln, cs, p, b] of SELLERS) await insertUser(k, e, 'seller', n, c, g, a, la, ln, cs, p, b);
  for (const [k, e, n, c, g, a, la, ln, cs, p, b] of BUYERS) await insertUser(k, e, 'buyer', n, c, g, a, la, ln, cs, p, b);
  for (const [k, e, n, c, g, a, la, ln, cs, p, b] of COLLECTORS) await insertUser(k, e, 'collector', n, c, g, a, la, ln, cs, p, b);
  for (const [k, e, r, n, c, g, la, ln, cs] of PENDING_USERS) {
    await insertUser(k, e, r, n, c, g, null, la, ln, cs, null, null, { verified: false, createdDaysAgo: round(between(1, 5)) });
  }

  // ---- products
  // Listings whose seller enabled the optional volume discount.
  const QUANTITY_DISCOUNT_LISTINGS = new Set([0, 2, 6, 13, 17, 22, 26, 37, 42]);
  const P = [];
  for (const [index, [seller, slug, title, description, unit, qty, price, mk, months, views]] of PRODUCTS.entries()) {
    const s = U[seller];
    const created = ago(round(between(20, 160)));
    // One photo per listing: front/public/demo/products/product-NN.jpg, in PRODUCTS order.
    const DEMO_PHOTOS = 28;
    const images = index < DEMO_PHOTOS ? [`/demo/products/product-${String(index + 1).padStart(2, '0')}.jpg`] : [];
    const { rows } = await db.query(`
      INSERT INTO products (seller_id, category_id, market_id, title, description, images, unit, quantity_available, price_per_unit,
        min_order_quantity, quantity_discount_enabled, gouvernorat, address, lat, lng, available_from, available_until, views_count, created_at, i18n)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id
    `, [s.id, cat[slug], market[mk], title, description, images, unit, qty, price, null, QUANTITY_DISCOUNT_LISTINGS.has(index),
      s.gov, s.address, s.lat, s.lng, isoDay(ago(30)), isoDay(ahead(months * 30)), views, created, i18n({ title, description })]);
    P.push({ id: rows[0].id, seller, slug, title, unit, price, qty });
  }
  // A withdrawn listing: the seller dashboard needs one inactive product to demonstrate.
  await db.query(`
    INSERT INTO products (seller_id, category_id, market_id, title, description, unit, quantity_available, price_per_unit,
      min_order_quantity, gouvernorat, address, lat, lng, available_from, available_until, is_active, views_count, created_at, i18n)
    VALUES ($1,$2,$3,$4,$5,'kg',0,0.24,NULL,$6,$7,$8,$9,$10,$11,false,64,$12,$13)
  `, [U.zitouna.id, cat['olive-pomace'], market.national, 'Noyaux d’olive concassés — lot 2025 épuisé',
    'Lot de la campagne précédente, entièrement vendu. Annonce désactivée en attendant la prochaine récolte.',
    U.zitouna.gov, U.zitouna.address, U.zitouna.lat, U.zitouna.lng, isoDay(ago(300)), isoDay(ago(60)), ago(310),
    i18n({ title: 'Noyaux d’olive concassés — lot 2025 épuisé', description: 'Lot de la campagne précédente, entièrement vendu. Annonce désactivée en attendant la prochaine récolte.' })]);
  const productsOf = (slug) => P.filter((p) => p.slug === slug);

  // ---- posts
  const posts = [
    ['zitouna', 0, 'La campagne 2026/27 a démarré ! 🫒 320 t de grignons disponibles à Sakiet Ezzit, enlèvement possible dès 10 t.'],
    ['megrine', 21, 'Nous avons 400 kg de cuivre dénudé prêt à l’enlèvement. Paiement à la livraison, pesée sur pont-bascule certifié.'],
    ['hammamet', 6, 'Notre hôtel a valorisé 14 000 L d’huile de friture l’an dernier grâce à CLAC. Merci à nos partenaires biodiesel ! 🌱'],
    ['kalaa', 17, 'Balles de carton OCC disponibles chaque semaine (≈ 5 t). Stockage couvert, chargement par chariot élévateur sur place.'],
    ['douz', 26, 'Fin de saison Deglet Nour : 35 t d’écarts de tri. Idéal pour l’alimentation animale ou le compostage.'],
    ['pointvert', null, '📍 Notre point de Thyna est désormais ouvert le samedi matin. Apport volontaire de cartons et grignons accepté.'],
    ['sahelrec', null, 'Nouveau : nous achetons les chutes textiles coton et denim — tarif affiché à l’entrée du site de Sidi Abdelhamid.'],
    ['capbon', 14, 'Déstockage de préformes PET déclassées : 15 t en octabins, prix négociable jusqu’à la fin du mois.'],
    ['djerbapropre', null, 'Opération “Djerba sans plastique” : 3,2 t collectées sur les plages ce week-end. Merci aux 120 bénévoles ! 🏝️'],
    ['ksar', 22, 'Chutes de denim triées par couleur (bleu brut, stone, noir). Échantillons disponibles sur demande.'],
  ];
  for (const [author, productIdx, content] of posts) {
    await db.query('INSERT INTO posts (author_id, product_id, content, created_at) VALUES ($1,$2,$3,$4)',
      [U[author].id, productIdx == null ? null : P[productIdx].id, content, ago(between(0.2, 40))]);
  }

  // ---- collection points + schedules
  const SCHEDULES = {
    weekdays: [[1, '08:00', '17:00'], [2, '08:00', '17:00'], [3, '08:00', '17:00'], [4, '08:00', '17:00'], [5, '08:00', '13:00']],
    weekdays_sat: [[1, '07:30', '17:30'], [2, '07:30', '17:30'], [3, '07:30', '17:30'], [4, '07:30', '17:30'], [5, '07:30', '13:00'], [6, '08:00', '13:00']],
    everyday: [0, 1, 2, 3, 4, 5, 6].map((d) => [d, '08:00', '18:00']),
  };
  const CP = [];
  for (const [owner, name, gov, address, lat, lng, capacity, cats, verified, sched] of POINTS) {
    const { rows } = await db.query(`
      INSERT INTO collection_points (manager_id, name, description, address, gouvernorat, lat, lng, phone, email,
        storage_capacity_kg, category_ids, is_verified, created_at, i18n)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id
    `, [U[owner].id, name, `Point de collecte ${U[owner].company} — pesée sur place, paiement sous 7 jours.`, address, gov, lat, lng,
      COLLECTORS.find((c) => c[0] === owner)[9], COLLECTORS.find((c) => c[0] === owner)[1], capacity, cats.map((s) => cat[s]), verified, ago(between(120, 300)),
      JSON.stringify({ name: bi(name), description: { fr: `Point de collecte ${U[owner].company} — pesée sur place, paiement sous 7 jours.`, ar: pointDescriptionAr(U[owner].company) } })]);
    const id = rows[0].id;
    const open = new Set(SCHEDULES[sched].map(([d]) => d));
    for (const [d, o, c] of SCHEDULES[sched]) {
      await db.query('INSERT INTO collection_point_schedules (collection_point_id, day_of_week, opens_at, closes_at) VALUES ($1,$2,$3,$4)', [id, d, o, c]);
    }
    for (const d of [0, 1, 2, 3, 4, 5, 6].filter((x) => !open.has(x))) {
      await db.query('INSERT INTO collection_point_schedules (collection_point_id, day_of_week, is_closed) VALUES ($1,$2,true)', [id, d]);
    }
    CP.push({ id, owner, name, gov, capacity, cats, verified, items: {} });
  }

  // ---- purchases (12 months) + stock movements computed chronologically
  const LABELS = {
    'olive-pomace': 'Grignons d’olive', 'used-cooking-oil': 'Huiles usagées (converties en kg)', 'organic-waste': 'Biodéchets',
    plastic: 'Plastiques (PET/PEHD/PEBD)', 'paper-cardboard': 'Carton OCC', metal: 'Ferraille & métaux', glass: 'Calcin verre', textile: 'Chutes textiles',
    'bread-surplus': 'Pain sec', 'coffee-grounds': 'Marc de café', 'agrifood-byproducts': 'Coproduits agroalimentaires',
  };
  const QTY = { 'olive-pomace': [8000, 25000], 'used-cooking-oil': [400, 1500], plastic: [800, 4000], 'paper-cardboard': [1500, 6000], metal: [1500, 7000], glass: [800, 3000], textile: [500, 2500], 'organic-waste': [2000, 8000], 'bread-surplus': [200, 1200], 'coffee-grounds': [150, 900], 'agrifood-byproducts': [2000, 12000] };
  const events = []; // { point, slug, date, qty (+in / -out), purchaseIdx, reason }
  const purchaseRows = [];
  for (const point of CP.filter((p) => p.verified)) {
    const nb = Math.round(between(8, 13));
    for (let i = 0; i < nb; i += 1) {
      const slug = pick(point.cats);
      const candidates = productsOf(slug);
      const product = candidates.length && rnd() < 0.8 ? pick(candidates) : null;
      const days = i < 2 ? between(0.5, 6) : between(3, 360); // 2 recent ones awaiting action per point
      const status = days < 12 ? pick(['pending', 'confirmed', 'pending']) : rnd() < 0.9 ? 'received' : 'cancelled';
      const qty = round(between(...QTY[slug]), 50);
      const unitPrice = product ? Number((product.price * (product.unit === 'l' ? 1.1 : 0.92)).toFixed(3)) : Number({ 'olive-pomace': 0.06, 'used-cooking-oil': 1.2, plastic: 0.55, 'paper-cardboard': 0.22, metal: 0.6, glass: 0.07, textile: 0.45, 'organic-waste': 0.02, 'bread-surplus': 0.1, 'coffee-grounds': 0.04, 'agrifood-byproducts': 0.08 }[slug].toFixed(3));
      const row = {
        point, slug, product, qty, unitPrice, status, created: ago(days), scheduled: ago(days - 2),
        label: product ? product.title : `${LABELS[slug]} — apport direct`,
        seller: product ? U[product.seller].id : null,
      };
      purchaseRows.push(row);
      if (status === 'received') events.push({ point, slug, date: ago(days - 2), qty, purchase: row, reason: `Achat — ${row.label}` });
    }
    // monthly sales to recyclers (stock out)
    for (const mth of [10, 7, 4, 1]) {
      events.push({ point, slug: null, date: ago(mth * 30 + 10), out: true });
    }
  }
  for (const r of purchaseRows) {
    const { rows } = await db.query(`
      INSERT INTO purchases (collection_point_id, created_by, seller_id, product_id, category_id, label, quantity_kg,
        unit_price, status, scheduled_at, received_at, notes, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id
    `, [r.point.id, U[r.point.owner].id, r.seller, r.product?.id ?? null, cat[r.slug], r.label, r.qty, r.unitPrice, r.status,
      r.scheduled, r.status === 'received' ? r.scheduled : null, r.product ? null : 'Apport volontaire au point de collecte', r.created]);
    r.id = rows[0].id;
  }

  events.sort((a, b) => a.date - b.date);
  for (const ev of events) {
    const { point } = ev;
    if (ev.out) {
      // quarterly: sell 25–45 % of each item to recyclers
      for (const item of Object.values(point.items)) {
        const qty = round(item.balance * between(0.25, 0.45), 10);
        if (qty <= 0) continue;
        item.balance -= qty;
        item.moves.push({ type: 'out', qty: -qty, balance: item.balance, date: ev.date, reason: pick(['Vente à recycleur', 'Expédition usine de recyclage', 'Livraison client']) });
      }
      continue;
    }
    const item = (point.items[ev.slug] ??= { slug: ev.slug, balance: 0, moves: [] });
    const used = Object.values(point.items).reduce((s, i) => s + i.balance, 0);
    const qty = Math.min(ev.qty, Math.max(0, point.capacity * 0.95 - used));
    if (qty <= 0) continue;
    item.balance += qty;
    item.moves.push({ type: 'in', qty, balance: item.balance, date: ev.date, reason: ev.reason, purchase: ev.purchase });
  }
  for (const point of CP) {
    for (const item of Object.values(point.items)) {
      const { rows } = await db.query(`
        INSERT INTO stock_items (collection_point_id, category_id, label, quantity_kg, min_threshold_kg, i18n)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
      `, [point.id, cat[item.slug], LABELS[item.slug], item.balance, round(point.capacity * 0.03, 100), i18n({ label: LABELS[item.slug] })]);
      item.id = rows[0].id;
      for (const mv of item.moves) {
        await db.query(`
          INSERT INTO stock_movements (collection_point_id, stock_item_id, type, quantity_kg, balance_after_kg, reason, purchase_id, created_by, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `, [point.id, item.id, mv.type, mv.qty, mv.balance, mv.reason, mv.purchase?.id ?? null, U[point.owner].id, mv.date]);
        if (mv.purchase) await db.query('UPDATE purchases SET stock_item_id = $1 WHERE id = $2', [item.id, mv.purchase.id]);
      }
    }
  }

  // ---- offers published by collection points
  const OFFER_DESCRIPTION = 'Lot conditionné et pesé sur pont-bascule. Visite du lot possible sur rendez-vous.';
  const offerSpecs = [
    [0, 'olive-pomace', 'Lot de grignons secs — 40 t', 40000, 0.11, 4, 34, 'published', 'national'],
    [0, 'metal', 'Ferraille triée E40 — 12 t', 12000, 0.78, -3, 20, 'published', 'national'],
    [2, 'used-cooking-oil', 'Huiles usagées filtrées — 6 000 kg', 6000, 1.55, 6, 40, 'published', 'local'],
    [2, 'paper-cardboard', 'Balles de carton OCC — 18 t', 18000, 0.32, -5, 25, 'published', 'national'],
    [3, 'plastic', 'PET broyé lavé — 8 t', 8000, 1.10, 10, 45, 'published', 'export'],
    [5, 'textile', 'Chutes textiles triées coton — 5 t', 5000, 0.70, 2, 30, 'published', 'export'],
    [6, 'glass', 'Calcin verre trié — 10 t', 10000, 0.11, 15, 60, 'published', 'local'],
    [7, 'used-cooking-oil', 'Huiles usagées Djerba — saison été', 9000, 1.50, 120, 200, 'draft', 'local'],
    [5, 'plastic', 'Film PEBD en balles — 6 t', 6000, 0.62, -40, -10, 'closed', 'national'],
    [2, 'coffee-grounds', 'Marc de café collecté — 2 t', 2000, 0.07, 3, 30, 'published', 'local'],
  ];
  const O = [];
  for (const [pi, slug, title, qty, price, start, end, status, mk] of offerSpecs) {
    const point = CP[pi];
    const item = point.items[slug];
    const { rows } = await db.query(`
      INSERT INTO offers (publisher_id, collection_point_id, category_id, market_id, stock_item_id, title, description, quantity, unit,
        price_per_unit, gouvernorat, lat, lng, starts_at, ends_at, status, published_at, created_at, i18n)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'kg',$9,$10,(SELECT lat FROM collection_points WHERE id=$2),(SELECT lng FROM collection_points WHERE id=$2),$11,$12,$13,$14,$15,$16)
      RETURNING id
    `, [U[point.owner].id, point.id, cat[slug], market[mk], item?.id ?? null, title,
      OFFER_DESCRIPTION, qty, price, point.gov,
      ahead(start), ahead(end), status, status === 'draft' ? null : ahead(Math.min(start, 0) - 2), ahead(Math.min(start, 0) - 3),
      i18n({ title, description: OFFER_DESCRIPTION })]);
    O.push(rows[0].id);
  }

  // ---- buy requests + responses
  const requestSpecs = [
    ['biodiesel', 'used-cooking-oil', 'Huiles alimentaires usagées — 5 000 L/mois', 'Contrat annuel. Enlèvement par notre citerne sur tout le Sahel et le Grand Tunis. Analyse d’acidité à la réception.', 5000, 'l', 1.50, 30, 'open', 1],
    ['biodiesel', 'used-cooking-oil', 'Huile de friture — lot ponctuel Djerba', 'Besoin ponctuel avant l’arrêt technique de juillet.', 1500, 'l', 1.45, 15, 'in_progress', 6],
    ['compostnord', 'organic-waste', 'Biodéchets & invendus maraîchers', 'Matière verte pour andains de compostage. Livraison Bizerte ou enlèvement par nos bennes.', 60000, 'kg', 0.02, 45, 'open', 2],
    ['compostnord', 'olive-pomace', 'Grignons humides pour co-compostage', 'Grignons 3 phases, 200 t sur la campagne.', 200000, 'kg', 0.06, 60, 'open', 4],
    ['biomasse', 'olive-pomace', 'Noyaux d’olive séchés — 100 t', 'Combustible pour chaudières industrielles. Humidité max 12 %.', 100000, 'kg', 0.26, 40, 'open', 0.5],
    ['biomasse', 'olive-pomace', 'Grignons épuisés secs', 'Livraison Kairouan, camions de 25 t.', 75000, 'kg', 0.17, 30, 'fulfilled', 50],
    ['plastirec', 'plastic', 'PET transparent en balles', 'PET bouteilles et préformes, sans PVC. Balles ou octabins.', 20000, 'kg', 0.90, 21, 'open', 3],
    ['plastirec', 'plastic', 'PEHD bouchons & bidons', 'PEHD coloré accepté.', 6000, 'kg', 0.80, 30, 'in_progress', 9],
    ['cartonnerie', 'paper-cardboard', 'Carton OCC en balles — 50 t/mois', 'Balles de 300 à 500 kg, humidité < 12 %, sans film plastique.', 50000, 'kg', 0.30, 20, 'open', 1.5],
    ['fonderie', 'metal', 'Ferraille acier triée', 'Ferraille E40/E3, chutes de découpe. Pesée à Gabès.', 40000, 'kg', 0.72, 25, 'open', 5],
    ['fonderie', 'metal', 'Chutes d’aluminium', 'Profilés propres 6060/6063.', 3000, 'kg', 3.8, 25, 'open', 2],
    ['savonnerie', 'used-cooking-oil', 'Huile d’olive de friture pour savon', 'Petites quantités régulières, de préférence huile d’olive.', 300, 'l', 1.60, 20, 'open', 0.3],
    ['effilochage', 'textile', 'Chutes coton & denim', 'Chutes de coupe 100 % coton, triées par couleur.', 10000, 'kg', 0.65, 30, 'open', 4],
    ['effilochage', 'textile', 'Chutes polyester', 'Tous coloris, pour rembourrage.', 4000, 'kg', 0.30, 30, 'cancelled', 70],
    // targeted request: the buyer points at one listing and one seller
    ['savonnerie', 'used-cooking-oil', 'Huile d’olive de friture — Dar El Jeld',
      'Demande adressée directement à Dar El Jeld : 200 L de son huile d’olive de friture pour notre atelier de savon de Nabeul.',
      200, 'l', 1.60, 14, 'open', 0.6, { product: 9, market: 'local' }],
    // food service & agrifood
    ['elevage', 'bread-surplus', 'Pain sec pour alimentation bovine — 3 t/mois', 'Pain rassis sans moisissure, en sacs. Enlèvement Grand Tunis.', 3000, 'kg', 0.15, 20, 'open', 1],
    ['champignon', 'coffee-grounds', 'Marc de café pour culture de pleurotes', 'Marc frais (< 48 h), 500 kg par semaine. Enlèvement Tunis Nord.', 2000, 'kg', 0.06, 15, 'open', 2],
    ['aliment', 'agrifood-byproducts', 'Son de blé et remoulage — 40 t', 'Pour aliment composé. Livraison Moknine.', 40000, 'kg', 0.48, 30, 'open', 3],
    ['farinepoisson', 'agrifood-byproducts', 'Déchets de poisson frais', 'Têtes, arêtes et viscères sous glace. Mahdia, Sfax, Monastir.', 15000, 'kg', 0.20, 10, 'open', 0.8],
    ['elevage', 'agrifood-byproducts', 'Lactosérum pour veaux', '2 000 L par semaine, citerne inox.', 8000, 'l', 0.03, 15, 'in_progress', 7],
  ];
  const R = [];
  for (const [buyer, slug, title, description, qty, unit, maxPrice, neededIn, status, daysAgo, extra = {}] of requestSpecs) {
    const b = U[buyer];
    const product = extra.product != null ? P[extra.product] : null;
    const { rows } = await db.query(`
      INSERT INTO buy_requests (buyer_id, category_id, market_id, product_id, target_user_id, title, description, quantity, unit,
        max_price_per_unit, gouvernorat, lat, lng, needed_by, status, created_at, i18n)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id
    `, [b.id, cat[slug], extra.market ? market[extra.market] : null, product?.id ?? null, product ? U[product.seller].id : null,
      title, description, qty, unit, maxPrice, b.gov, b.lat, b.lng, isoDay(ahead(neededIn - daysAgo)), status, ago(daysAgo),
      i18n({ title, description })]);
    R.push({ id: rows[0].id, buyer, slug, status, qty, maxPrice, title, daysAgo, target: product?.seller ?? null });
  }
  const MSG = [
    'Bonjour, nous pouvons fournir cette quantité avec enlèvement sur notre site. Disponible dès la semaine prochaine.',
    'Matière conforme à votre cahier des charges. Possibilité de livraison avec notre camion (+0,01 TND/kg).',
    'Nous proposons un contrat sur 6 mois avec un prix ferme. Échantillon disponible sur demande.',
    'Stock disponible immédiatement, pesée sur pont-bascule certifié.',
  ];
  for (const r of R) {
    const sellers = [...new Set(productsOf(r.slug).map((p) => p.seller))];
    const collectors = COLLECTORS.filter((c) => c[9].includes(r.slug)).map((c) => c[0]);
    const responders = [...sellers.slice(0, 3), ...collectors.slice(0, 1)];
    if (r.target) {
      const at = responders.indexOf(r.target);
      if (at > 0) responders.unshift(...responders.splice(at, 1));
      else if (at < 0) responders.unshift(r.target);
    }
    let accepted = false;
    for (const [i, who] of responders.entries()) {
      if (r.daysAgo < 1 && i > 0) break;
      const product = productsOf(r.slug).find((p) => p.seller === who);
      let status = 'pending';
      if ((r.status === 'in_progress' || r.status === 'fulfilled') && !accepted) { status = 'accepted'; accepted = true; }
      else if (r.status !== 'open' && rnd() < 0.6) status = 'rejected';
      await db.query(`
        INSERT INTO request_responses (request_id, responder_id, product_id, message, proposed_quantity, proposed_price_per_unit, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [r.id, U[who].id, product?.id ?? null, pick(MSG), round(r.qty * between(0.4, 1), 10),
        Number((r.maxPrice * between(0.85, 1.02)).toFixed(3)), status, ago(Math.max(r.daysAgo - between(0.1, 2), 0.05))]);
    }
  }

  // ---- exchange proposals (troc)
  const X = [];
  const exchangeSpecs = [
    ['savonnerie', 'used-cooking-oil', 'Huile de friture usagée', 5, 'l', 'Savon artisanal à l’huile d’olive', 1, 'unit', '/demo/exchange/soap.jpg', 'Apportez vos huiles usagées filtrées dans notre atelier de Nabeul : pour chaque bidon de 5 L, repartez avec un pain de savon artisanal de 200 g.', 500, 2],
    ['biodiesel', 'used-cooking-oil', 'Huile de friture usagée', 20, 'l', 'Litres de biodiesel B100', 4, 'l', '/demo/exchange/biodiesel-jerrycans.jpg', 'Restaurants et hôtels : échangez vos huiles usagées contre du biodiesel pour vos groupes électrogènes.', 3000, 5],
    ['compostnord', 'organic-waste', 'Biodéchets triés', 100, 'kg', 'Compost normé (sac de 25 kg)', 1, 'unit', '/demo/exchange/compost-sacks.jpg', 'Pour 100 kg de biodéchets apportés, nous vous remettons un sac de 25 kg de compost mûr.', 20000, 1],
    ['cartonnerie', 'paper-cardboard', 'Carton ondulé propre', 500, 'kg', 'Cartons d’emballage neufs', 100, 'unit', '/demo/exchange/cartons.jpg', 'Commerces : 500 kg de cartons usagés = 100 cartons neufs de déménagement.', 50000, 8],
    ['effilochage', 'textile', 'Chutes de coton', 50, 'kg', 'Plaids en coton recyclé', 1, 'unit', '/demo/exchange/plaids.jpg', 'Ateliers de confection : vos chutes de coton deviennent des plaids recyclés.', 5000, 3],
    ['champignon', 'coffee-grounds', 'Marc de café', 20, 'kg', 'Barquette de pleurotes frais', 1, 'unit', null, 'Cafés : pour 20 kg de marc apporté, une barquette de 500 g de pleurotes cultivés sur votre marc !', 2000, 1],
    ['elevage', 'bread-surplus', 'Pain sec', 50, 'kg', 'Litres de lait frais', 5, 'l', null, 'Boulangeries : échangez votre pain sec contre du lait frais de la ferme.', 3000, 2],
  ];
  for (const [who, slug, wanted, wq, wu, given, gq, gu, image, description, maxTotal, daysAgo] of exchangeSpecs) {
    const a = U[who];
    const { rows: [ex] } = await db.query(`
      INSERT INTO exchange_offers (author_id, wanted_category_id, wanted_label, wanted_quantity, wanted_unit, given_label, given_quantity,
        given_unit, image_url, description, max_total_wanted, gouvernorat, lat, lng, expires_at, created_at, i18n)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id
    `, [a.id, cat[slug], wanted, wq, wu, given, gq, gu, image, description, maxTotal, a.gov, a.lat, a.lng, isoDay(ahead(60)), ago(daysAgo),
      i18n({ wanted_label: wanted, given_label: given, description })]);
    X.push({ id: ex.id, who, slug });
    const responders = [...new Set(productsOf(slug).map((p) => p.seller))].slice(0, 2);
    for (const [i, rk] of responders.entries()) {
      await db.query(`INSERT INTO exchange_responses (exchange_id, responder_id, quantity_offered, message, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6)`, [ex.id, U[rk].id, wq * (i + 2) * 2, 'Intéressé ! Nous pouvons apporter cette quantité dès cette semaine.', i === 0 && daysAgo > 2 ? 'accepted' : 'pending', ago(Math.max(daysAgo - 0.5, 0.1))]);
    }
  }

  // ---- conversations
  const convs = [
    ['hammamet', 'biodiesel', [
      ['biodiesel', 'Bonjour, nous sommes intéressés par votre huile de friture. Quel est votre volume mensuel en haute saison ?'],
      ['hammamet', 'Bonjour ! Environ 1 800 L/mois de mai à octobre, 900 L le reste de l’année. Stockage en fûts de 200 L.'],
      ['biodiesel', 'Parfait. Nous proposons 1,40 TND/L avec enlèvement mensuel par notre citerne. Ça vous convient ?'],
      ['hammamet', 'Ça nous convient. Pouvez-vous passer jeudi 10h pour le premier enlèvement ?'],
      ['biodiesel', 'C’est noté pour jeudi 10h 👍 Je vous envoie le bon d’enlèvement.'],
    ]],
    ['zitouna', 'biomasse', [
      ['biomasse', 'Bonjour, avez-vous des noyaux concassés disponibles en big bags ?'],
      ['zitouna', 'Oui, 45 t disponibles, humidité mesurée à 10 %. Big bags de 1 t.'],
      ['biomasse', 'Excellent, on prendrait 25 t pour commencer. Livraison Kairouan possible ?'],
    ]],
    ['pointvert', 'zitouna', [
      ['pointvert', 'Bonjour Si Mohamed, on peut enlever 20 t de grignons cette semaine pour notre site de Thyna ?'],
      ['zitouna', 'Oui, mardi ou mercredi matin. Prévoyez la benne de 25 t.'],
      ['pointvert', 'Mercredi 8h alors. Merci !'],
    ]],
    ['kalaa', 'cartonnerie', [
      ['cartonnerie', 'Vos balles OCC font combien en moyenne ? Nous cherchons 50 t/mois.'],
      ['kalaa', 'Entre 380 et 420 kg. Nous produisons environ 20 t/mois.'],
    ]],
    ['ecotunis', 'plastirec', [
      ['ecotunis', 'Nous avons 8 t de PET broyé lavé, prêt fin du mois. Intéressés ?'],
      ['plastirec', 'Oui ! Pouvez-vous envoyer un échantillon de 5 kg pour test de viscosité ?'],
      ['ecotunis', 'Envoyé ce matin par transporteur, vous l’aurez demain.'],
    ]],
    ['megrine', 'fonderie', [
      ['fonderie', 'Bonjour, prix pour la ferraille E40 livrée Gabès ?'],
      ['megrine', '0,68 TND/kg départ Mégrine, ou 0,74 livré Gabès par lot de 20 t.'],
    ]],
  ];
  const C = {};
  for (const [a, b, msgs] of convs) {
    const { rows: [conv] } = await db.query('INSERT INTO conversations (direct_key, created_at) VALUES ($1,$2) RETURNING id',
      [[U[a].id, U[b].id].sort().join(':'), ago(msgs.length + 2)]);
    C[[U[a].id, U[b].id].sort().join(':')] = conv.id;
    let t = msgs.length * 6 + 3;
    let last;
    for (const [from, body] of msgs) {
      t -= between(1, 6);
      last = ago(t / 24);
      await db.query('INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES ($1,$2,$3,$4)', [conv.id, U[from].id, body, last]);
    }
    await db.query('UPDATE conversations SET last_message_at = $2 WHERE id = $1', [conv.id, last]);
    // everyone has read everything except the last message
    await db.query('INSERT INTO conversation_participants (conversation_id, user_id, last_read_at) VALUES ($1,$2,$4), ($1,$3,$4)',
      [conv.id, U[a].id, U[b].id, new Date(last.getTime() - 1000)]);
    const lastSender = msgs[msgs.length - 1][0];
    await db.query('UPDATE conversation_participants SET last_read_at = $3 WHERE conversation_id = $1 AND user_id = $2', [conv.id, U[lastSender].id, last]);
  }

  // ---- notifications: a small, realistic inbox per account (most already read)
  const requestId = (startsWith) => R.find((r) => r.title.startsWith(startsWith))?.id ?? null;
  const convId = (a, b) => C[[U[a].id, U[b].id].sort().join(':')] ?? null;
  const purchaseId = (owner, seller) => (purchaseRows.find((r) => r.point.owner === owner && r.seller === U[seller]?.id && r.status === 'received')
    ?? purchaseRows.find((r) => r.point.owner === owner))?.id ?? null;
  const targeted = R.find((r) => r.target);
  const data = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));

  const notifs = [
    // Vendeur — Huilerie Zitouna (compte de démonstration)
    ['zitouna', 'message.new', 'Nouveau message de Mourad Saidi', 'Excellent, on prendrait 25 t pour commencer. Livraison Kairouan possible ?', data({ conversation_id: convId('zitouna', 'biomasse') }), false, 0.05],
    ['zitouna', 'request.new', 'Nouvelle demande d’achat : noyaux d’olive', 'Énergie Biomasse Kairouan recherche 100 000 kg de noyaux séchés (humidité max 12 %).', data({ request_id: requestId('Noyaux d’olive séchés') }), false, 0.4],
    ['zitouna', 'purchase.new', 'Point Vert — Thyna veut enlever 20 t de grignons', 'Nouvelle proposition d’achat sur « Grignons d’olive humides — campagne 2026/27 ». Enlèvement souhaité cette semaine.', data({ purchase_id: purchaseId('pointvert', 'zitouna') }), true, 1.3],
    ['zitouna', 'purchase.status', 'Achat réceptionné : 20 t de grignons', 'Point Vert — Thyna a pesé et réceptionné votre enlèvement de la semaine.', data({ purchase_id: purchaseId('pointvert', 'zitouna') }), true, 2.6],
    ['zitouna', 'request.response_status', 'Votre proposition a été acceptée', 'Énergie Biomasse Kairouan a accepté votre offre sur « Grignons épuisés secs ».', data({ request_id: requestId('Grignons épuisés secs') }), true, 7],
    ['zitouna', 'account.verified', 'Votre compte est vérifié', 'Vos annonces sont visibles sur la carte et dans la marketplace.', {}, true, 30],

    // Acheteur — BioDiesel Sahel
    ['biodiesel', 'request.response', 'Hôtel Médina Hammamet a répondu à votre demande', '« Huiles alimentaires usagées — 5 000 L/mois » : 1,40 TND/L, enlèvement mensuel par citerne.', data({ request_id: requestId('Huiles alimentaires usagées') }), false, 0.2],
    ['biodiesel', 'message.new', 'Nouveau message de Karim Jaziri', 'Ça nous convient. Pouvez-vous passer jeudi 10h pour le premier enlèvement ?', data({ conversation_id: convId('hammamet', 'biodiesel') }), true, 0.9],
    ['biodiesel', 'request.response', 'Nouvelle réponse à votre demande d’huiles usagées', 'Éco-Collecte Charguia propose 5 000 L/mois avec enlèvement inclus.', data({ request_id: requestId('Huiles alimentaires usagées') }), true, 2.1],
    ['biodiesel', 'exchange.response', 'Nouvelle réponse à votre troc biodiesel', 'Huilerie Zitouna propose 2 000 L d’huile usagée contre votre biodiesel B100.', data({ exchange_id: X[1]?.id }), true, 4],
    ['biodiesel', 'request.response_status', 'Votre demande a été acceptée', 'Hôtel Médina Hammamet a accepté votre proposition sur le lot ponctuel de Djerba.', data({ request_id: requestId('Huile de friture — lot ponctuel') }), true, 9],

    // Point de collecte — Point Vert Sfax
    ['pointvert', 'stock.alert', 'Stock proche de la capacité', 'Point Vert — Poudrière : le taux d’occupation dépasse 85 %, planifiez une vente à recycler.', data({ collection_point_id: CP[0].id }), false, 0.5],
    ['pointvert', 'purchase.status', 'Achat reçu : grignons d’olive', 'La livraison de Huilerie Zitouna a été pesée sur pont-bascule et ajoutée au stock.', data({ purchase_id: purchaseId('pointvert', 'zitouna') }), false, 0.9],
    ['pointvert', 'offer.published', 'Votre offre est publiée', '« Lot de grignons secs — 40 t » est visible sur le marché national.', data({ offer_id: O[0] }), true, 1.6],
    ['pointvert', 'exchange.new', 'Nouveau troc dans vos catégories', 'Compost Nord échange du compost normé contre des biodéchets triés.', data({ exchange_id: X[2]?.id }), true, 3.2],

    // Hôtel Médina Hammamet
    ['hammamet', 'request.new', 'Nouvelle demande : huiles de friture', 'BioDiesel Sahel recherche 5 000 L/mois sur tout le Sahel et le Grand Tunis.', data({ request_id: requestId('Huiles alimentaires usagées') }), false, 0.45],
    ['hammamet', 'message.new', 'Nouveau message de Yassine Mejri', 'C’est noté pour jeudi 10h 👍 Je vous envoie le bon d’enlèvement.', data({ conversation_id: convId('hammamet', 'biodiesel') }), true, 1.7],
    ['hammamet', 'message.new', 'Nouveau message de Karim Jaziri', 'Nous confirmons l’enlèvement de jeudi, merci de préparer les fûts.', data({ conversation_id: convId('hammamet', 'biodiesel') }), true, 5],
    ['hammamet', 'purchase.status', 'Achat reçu : huiles usagées', 'Éco-Collecte Charguia a réceptionné 1 800 L d’huile de friture.', data({ purchase_id: purchaseId('ecotunis', 'hammamet') }), true, 13],

    // Dar El Jeld — destinataire de la demande ciblée
    ['darjeld', 'request.new', 'Nouvelle demande qui vous est adressée', 'Savonnerie Artisanale de Nabeul demande 200 L de votre huile de friture filtrée.', data({ request_id: targeted?.id }), false, 0.25],

    // Autres comptes : quelques notifications lues, pour ne pas laisser de boîte vide
    ['amal', 'purchase.status', 'Achat confirmé : grignons d’olive frais', 'Point Vert Sfax a confirmé l’enlèvement de 18 t sur votre aire bétonnée.', data({ purchase_id: purchaseId('pointvert', 'amal') }), true, 2.4],
    ['amal', 'request.new', 'Nouvelle demande : noyaux d’olive séchés', 'Énergie Biomasse Kairouan recherche 100 t de noyaux secs pour la campagne.', data({ request_id: requestId('Noyaux d’olive séchés') }), true, 26],
    ['ecotunis', 'message.new', 'Nouveau message de Hatem Kefi', 'Oui ! Pouvez-vous envoyer un échantillon de 5 kg pour test de viscosité ?', data({ conversation_id: convId('ecotunis', 'plastirec') }), true, 1.1],
    ['ecotunis', 'offer.published', 'Votre offre est publiée', '« Huiles usagées filtrées — 6 000 kg » est visible sur le marché local.', data({ offer_id: O[2] }), true, 8],
    ['sahelrec', 'exchange.new', 'Nouveau troc dans vos catégories', 'Effilochage Textile Sahel échange des plaids recyclés contre des chutes de coton.', data({ exchange_id: X[4]?.id }), true, 2],
    ['sahelrec', 'stock.alert', 'Stock à surveiller', 'Sahel Recyclage — Sidi Abdelhamid : les balles de carton approchent du seuil bas.', data({ collection_point_id: CP[5].id }), true, 21],
    ['biomasse', 'message.new', 'Nouveau message de Mohamed Ben Salah', 'Oui, 45 t disponibles, humidité mesurée à 10 %. Big bags de 1 t.', data({ conversation_id: convId('zitouna', 'biomasse') }), true, 0.8],
    ['biomasse', 'request.response', 'Huilerie Zitouna a répondu à votre demande', '« Noyaux d’olive séchés — 100 t » : proposition à 0,26 TND/kg.', data({ request_id: requestId('Noyaux d’olive séchés') }), true, 3],
    ['savonnerie', 'request.status', 'Demande ciblée transmise à Dar El Jeld', '200 L d’huile d’olive de friture demandés pour votre atelier de Nabeul. Réponse attendue sous 48 h.', data({ request_id: targeted?.id }), true, 0.6],
    ['compostnord', 'exchange.response', 'Nouvelle réponse à votre troc compost', 'Huilerie Sahel Bio propose 2 000 kg de grignons bio contre du compost normé.', data({ exchange_id: X[2]?.id }), true, 5],
    // food service
    ['ennour', 'request.new', 'Nouvelle demande d’achat : pain sec', 'Ferme Laitière Mornag recherche 3 000 kg de pain sec pour l’alimentation bovine.', data({ request_id: requestId('Pain sec pour alimentation bovine') }), false, 0.7],
    ['cafe', 'exchange.new', 'Nouveau troc dans vos catégories', 'Champignonnière de Zaghouan échange des pleurotes frais contre votre marc de café.', data({ exchange_id: X[5]?.id }), false, 1.2],
  ];
  for (const [who, type, title, message, payload, isRead, hoursAgo] of notifs) {
    const at = new Date(Date.now() - hoursAgo * 3600000);
    await db.query(`INSERT INTO notifications (user_id, type, title, message, data, is_read, read_at, created_at, i18n)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [U[who].id, type, title, message, JSON.stringify(payload), isRead,
        isRead ? new Date(at.getTime() + 40 * 60000) : null, at, i18n({ title, message })]);
  }

  if (missingAr.size) console.warn(`⚠️  ${missingAr.size} text(s) without Arabic translation (seeds/ar.js):`, [...missingAr]);
  return {
    users: Object.keys(U).length + 1, products: P.length + 1, archivedProduct: 1, points: CP.length,
    purchases: purchaseRows.length, requests: R.length, notifications: notifs.length,
  };
}

try {
  const stats = await transaction(run);
  console.log('✅ Seed done:', stats);
  console.log(`
  Comptes (mot de passe ${PASSWORD}) :
    Vendeur           huilerie.zitouna@clac.tn   (+ 24 autres : boulangerie, café, restaurants, conserverie…)
    Acheteur          achats@biodiesel-sahel.tn  (+ 11 autres acheteurs)
    Point de collecte collecte.sfax@clac.tn      (+ 3 autres gérants)
    Admin             admin@clac.tn / Admin2026!`);
} catch (error) {
  console.error('❌ Seed failed:', describeDbError(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
