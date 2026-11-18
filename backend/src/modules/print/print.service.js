import * as model from './print.model.js';

const esc = (value) => String(value ?? '—')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (d) => (d ? new Date(d).toLocaleString('fr-TN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const fmtNum = (n, suffix = '') => (n == null ? '—' : `${Number(n).toLocaleString('fr-TN')}${suffix}`);

function rows(pairs) {
  return pairs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
}

function table(headers, lines) {
  if (!lines.length) return '<p class="muted">Aucun élément.</p>';
  return `<table class="list"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${lines.map((l) => `<tr>${l.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function layout(title, reference, body, autoprint) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1a1a1a; margin: 32px; }
  header { display: flex; justify-content: space-between; border-bottom: 2px solid #135e5e; padding-bottom: 12px; margin-bottom: 24px; }
  h1 { margin: 0; font-size: 22px; color: #135e5e; } h2 { font-size: 16px; margin-top: 28px; }
  .muted { color: #666; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e3e3e3; vertical-align: top; }
  table:not(.list) th { width: 220px; color: #444; font-weight: 600; }
  table.list thead th { background: #f1f6f6; }
  footer { margin-top: 40px; font-size: 11px; color: #888; }
  @media print { body { margin: 12mm; } .no-print { display: none; } }
</style></head>
<body>
<header><div><h1>${esc(title)}</h1><div class="muted">Réf. ${esc(reference)}</div></div>
<div class="muted">Tunisia Circular<br>Imprimé le ${esc(fmtDate(new Date()))}</div></header>
${body}
<p class="no-print"><button onclick="window.print()">Imprimer</button></p>
<footer>Document généré automatiquement — Tunisia Circular.</footer>
${autoprint ? '<script>window.addEventListener("load", () => window.print());</script>' : ''}
</body></html>`;
}

const builders = {
  async products(user, id) {
    const p = await model.getProduct(user, id);
    return ['Fiche produit', p.id, `<table>${rows([
      ['Produit', p.title], ['Catégorie', p.category_name], ['Marché', p.market_name],
      ['Vendeur', p.seller.company_name || p.seller.name], ['Téléphone', p.seller.phone],
      ['Quantité disponible', fmtNum(p.quantity_available, ` ${p.unit}`)],
      ['Prix unitaire', fmtNum(p.price_per_unit, ' TND')], ['Prix remisé', fmtNum(p.final_price_per_unit, ' TND')],
      ['Commande minimum', fmtNum(p.min_order_quantity, ` ${p.unit}`)],
      ['Gouvernorat', p.gouvernorat], ['Adresse', p.address],
      ['Disponible du', p.available_from], ['Disponible jusqu\'au', p.available_until],
      ['Description', p.description],
    ])}</table>`];
  },
  async offers(user, id) {
    const o = await model.getOffer(user, id);
    return ['Offre', o.id, `<table>${rows([
      ['Offre', o.title], ['Statut', `${o.status} (${o.timing})`], ['Catégorie', o.category_name], ['Marché', o.market_name],
      ['Point de collecte', o.collection_point?.name], ['Adresse', o.collection_point?.address],
      ['Quantité', fmtNum(o.quantity, ` ${o.unit}`)], ['Prix unitaire', fmtNum(o.price_per_unit, ' TND')],
      ['Début', fmtDate(o.starts_at)], ['Fin', fmtDate(o.ends_at)], ['Description', o.description],
    ])}</table>`];
  },
  async requests(user, id) {
    const r = await model.getRequest(user, id);
    return ['Demande d\'achat', r.id, `<table>${rows([
      ['Demande', r.title], ['Statut', r.status], ['Acheteur', r.buyer.company_name || r.buyer.name],
      ['Catégorie', r.category_name], ['Quantité', fmtNum(r.quantity, ` ${r.unit}`)],
      ['Prix max', fmtNum(r.max_price_per_unit, ' TND')], ['Besoin pour le', r.needed_by],
      ['Gouvernorat', r.gouvernorat], ['Créée le', fmtDate(r.created_at)], ['Description', r.description],
    ])}</table><h2>Réponses</h2>${table(
      ['Acteur', 'Quantité', 'Prix', 'Statut', 'Date'],
      r.responses.map((x) => [x.responder.company_name || x.responder.name, fmtNum(x.proposed_quantity),
        fmtNum(x.proposed_price_per_unit, ' TND'), x.status, fmtDate(x.created_at)]),
    )}`];
  },
  async purchases(user, id) {
    const p = await model.getPurchase(user, id);
    return ['Bon d\'achat', p.id, `<table>${rows([
      ['Point de collecte', p.collection_point.name], ['Vendeur', p.seller ? (p.seller.company_name || p.seller.name) : 'Vendeur non inscrit'],
      ['Article', p.label], ['Catégorie', p.category_name], ['Quantité', fmtNum(p.quantity_kg, ' kg')],
      ['Prix unitaire', fmtNum(p.unit_price, ' TND/kg')], ['Montant total', fmtNum(p.total_amount, ' TND')],
      ['Statut', p.status], ['Planifié le', fmtDate(p.scheduled_at)], ['Réceptionné le', fmtDate(p.received_at)],
      ['Notes', p.notes],
    ])}</table>
    <table style="margin-top:48px"><tr><td>Signature point de collecte</td><td>Signature vendeur</td></tr>
    <tr><td style="height:80px"></td><td></td></tr></table>`];
  },
  async storage(user, id) {
    const s = await model.getStorage(user, id);
    return [`État du stock — ${s.name}`, s.collection_point_id, `<table>${rows([
      ['Capacité', fmtNum(s.storage_capacity_kg, ' kg')], ['Occupé', fmtNum(s.used_kg, ' kg')],
      ['Disponible', fmtNum(s.available_kg, ' kg')], ['Taux d\'occupation', fmtNum(s.usage_percent, ' %')],
    ])}</table><h2>Articles</h2>${table(
      ['Article', 'Catégorie', 'Quantité (kg)', 'Seuil (kg)', 'Alerte'],
      s.items.map((i) => [i.label, i.category_name, fmtNum(i.quantity_kg), fmtNum(i.min_threshold_kg), i.is_low_stock ? 'Stock bas' : '']),
    )}`];
  },
  async 'collection-points'(user, id) {
    const c = await model.getCollectionPoint(user, id);
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return ['Point de collecte', c.id, `<table>${rows([
      ['Nom', c.name], ['Adresse', c.address], ['Gouvernorat', c.gouvernorat], ['GPS', `${c.lat}, ${c.lng}`],
      ['Téléphone', c.phone], ['Email', c.email], ['Responsable', c.manager.company_name || c.manager.name],
    ])}</table><h2>Horaires</h2>${table(
      ['Jour', 'Ouverture', 'Fermeture'],
      c.schedule.map((s) => [days[s.day_of_week], s.is_closed ? 'Fermé' : s.opens_at, s.is_closed ? '' : s.closes_at]),
    )}`];
  },
};

export const RESOURCES = Object.keys(builders);

/** US-G08 — returns a printable HTML document. */
export async function render(user, resource, id, autoprint) {
  const [title, reference, body] = await builders[resource](user, id);
  return layout(title, reference, body, autoprint);
}
