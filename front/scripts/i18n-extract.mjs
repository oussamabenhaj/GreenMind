/**
 * i18n key extraction — `npm run i18n:extract`
 *
 * Scans src/ for `t('…')` calls (and French labels kept in module-level constants that
 * are translated where they are rendered), then rewrites src/locales/{fr,ar}/<namespace>.json:
 *   - fr: identity map (French is the source language; keys are the French strings)
 *   - ar: existing Arabic translations are kept; new keys are listed in
 *         scripts/i18n-missing.json so they can be translated.
 * Namespaces follow the folders (common, auth, products, market, requests, …).
 * Optional: `node scripts/i18n-extract.mjs . extra-ar.json` merges extra translations.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const [, , rootArg = '.', dictPath] = process.argv;
const root = path.resolve(rootArg);
const require = createRequire(path.join(root, 'package.json'));
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const here = path.dirname(fileURLToPath(import.meta.url));

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return /components-overview|_examples|_mock|node_modules/.test(p) ? [] : walk(p);
    return /\.(jsx?|mjs)$/.test(d.name) ? [p] : [];
  });

const nsFor = (rel) => {
  if (/^src\/(auth|pages\/auth)\/|layouts\/auth-/.test(rel)) return 'auth';
  if (/sections\/admin\//.test(rel)) return 'admin';
  if (/sections\/market\//.test(rel)) return 'market';
  if (/sections\/seller\/map\//.test(rel)) return 'map';
  if (/sections\/seller\/(chat|notifications)\/|notifications-bell/.test(rel)) return 'messaging';
  if (/sections\/\w+\/(dashboard|reports)\//.test(rel)) return 'dashboard';
  if (/sections\/seller\/(products|discounts|marketplace|posts)\/|product-(form|card)|image-uploader|location-picker|buyer\/discounts/.test(rel)) return 'products';
  if (/sections\/\w+\/(requests|offers)\//.test(rel)) return 'requests';
  if (/sections\/collector\//.test(rel)) return 'collector';
  if (/sections\/seller\/profile\//.test(rel)) return 'settings';
  return 'common';
};

// strings translated at a sink (constants) — collected from these module-level declarations
const CONSTANT_SOURCES = [
  'src/utils/clac.js',
  'src/layouts/nav-config-seller.jsx',
  'src/utils/tunisia-cities.js',
];
const NOT_UI = /^<|@|^Clac2026!|^Admin2026!|&copy;|^https?:/;

const keys = new Map(); // key -> Set(ns)
const addKey = (k, ns) => {
  if (!k || typeof k !== 'string' || !/[A-Za-zÀ-ÿ]/.test(k)) return;
  if (!keys.has(k)) keys.set(k, new Set());
  keys.get(k).add(ns);
};

for (const abs of walk(path.join(root, 'src'))) {
  const rel = path.relative(root, abs).replace(/\\/g, '/');
  if (/src\/locales\//.test(rel)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['jsx'] });
  } catch {
    continue;
  }
  const ns = nsFor(rel);
  const isConstSource = CONSTANT_SOURCES.includes(rel);
  const usesT = /from 'src\/locales(\/i18n)?'/.test(src);
  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type === 'Identifier' && (c.name === 't' || c.name === 'tr') && p.node.arguments[0]?.type === 'StringLiteral') addKey(p.node.arguments[0].value, ns);
    },
    StringLiteral(p) {
      // module-level human strings (labels in constants, zod messages, …) are translated at their sink
      if (!usesT && !isConstSource) return;
      if (p.getFunctionParent() && !isConstSource) return;
      if (p.parent.type === 'ImportDeclaration' || (p.parentPath.isObjectProperty() && p.key === 'key')) return;
      const v = p.node.value;
      if (NOT_UI.test(v)) return;
      if (!/[a-zà-ÿ]{2}/.test(v) || /^[a-z0-9_.:\-/[\]]+$/.test(v) || /^(solar|eva|mingcute|ic|carbon):/.test(v)) return;
      if (/repeat\(|px|linear-gradient|rgba|^#|url\(/.test(v)) return;
      addKey(v, isConstSource && rel.includes('tunisia-cities') ? 'places' : ns);
    },
  });
}
// governorates & interpolated helper keys added in code paths that use t(variable)
const clac = fs.readFileSync(path.join(root, 'src/utils/clac.js'), 'utf8');
for (const g of clac.match(/GOVERNORATES = \[([\s\S]*?)\]/)[1].match(/'[^']+'/g)) addKey(g.slice(1, -1), 'places');
['TND', 'kg', 'Le Kef', 'Langue', 'tonne', 'litre', 'unité', 'unit'].forEach((k) => addKey(k, 'common'));

// current Arabic translations (all namespaces) + optional extra dictionary
const arDir = path.join(root, 'src/locales/ar');
const dict = {};
if (fs.existsSync(arDir)) for (const f of fs.readdirSync(arDir)) Object.assign(dict, JSON.parse(fs.readFileSync(path.join(arDir, f), 'utf8')));
if (dictPath && fs.existsSync(dictPath)) Object.assign(dict, JSON.parse(fs.readFileSync(dictPath, 'utf8')));
const files = { fr: {}, ar: {} };
const missing = [];
for (const [k, nss] of [...keys.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))) {
  const ns = nss.size > 1 ? (nss.has('places') ? 'places' : 'common') : [...nss][0];
  files.fr[ns] = files.fr[ns] ?? {};
  files.ar[ns] = files.ar[ns] ?? {};
  files.fr[ns][k] = k;
  if (dict[k] !== undefined) files.ar[ns][k] = dict[k];
  else missing.push(k);
}
for (const lang of ['fr', 'ar']) {
  const dir = path.join(root, 'src/locales', lang);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
  for (const [ns, obj] of Object.entries(files[lang])) fs.writeFileSync(path.join(dir, `${ns}.json`), `${JSON.stringify(obj, null, 2)}\n`);
  if (!files[lang].common) fs.writeFileSync(path.join(dir, 'common.json'), '{}\n');
}
fs.writeFileSync(path.join(here, 'i18n-missing.json'), `${JSON.stringify(missing, null, 1)}
`);
console.log(`keys: ${keys.size}, namespaces: ${Object.keys(files.fr).join(', ')}, missing ar: ${missing.length}`);
