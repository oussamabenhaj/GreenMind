import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';

const FIELDS = `e.id, e.author_id, e.wanted_category_id, e.wanted_label, e.wanted_quantity, e.wanted_unit,
  e.given_label, e.given_quantity, e.given_unit, e.image_url, e.description, e.max_total_wanted, e.gouvernorat,
  e.lat, e.lng, e.expires_at, e.status, e.created_at, e.updated_at, e.i18n`;
const WRITABLE = ['wanted_category_id', 'wanted_label', 'wanted_quantity', 'wanted_unit', 'given_label', 'given_quantity',
  'given_unit', 'image_url', 'description', 'max_total_wanted', 'gouvernorat', 'lat', 'lng', 'expires_at', 'status'];

const select = (viewer = 'NULL::uuid') => `
  SELECT ${FIELDS},
    json_build_object('id', u.id, 'name', u.name, 'company_name', u.company_name, 'role', u.role,
                      'avatar_url', u.avatar_url, 'gouvernorat', u.gouvernorat, 'is_verified', u.is_verified) AS author,
    c.name AS wanted_category_name, c.slug AS wanted_category_slug,
    (SELECT COUNT(*) FROM exchange_responses r WHERE r.exchange_id = e.id AND r.status <> 'withdrawn') AS responses_count,
    (SELECT COALESCE(SUM(r.quantity_offered), 0) FROM exchange_responses r WHERE r.exchange_id = e.id AND r.status = 'accepted') AS accepted_quantity,
    (SELECT r.status FROM exchange_responses r WHERE r.exchange_id = e.id AND r.responder_id = ${viewer}) AS my_response_status
  FROM exchange_offers e
  JOIN users u ON u.id = e.author_id
  LEFT JOIN categories c ON c.id = e.wanted_category_id`;

export async function list(f, page, viewerId, { authorId = null } = {}) {
  const qb = new QueryBuilder();
  const viewer = qb.param(viewerId);
  if (authorId) qb.where(`e.author_id = ${qb.param(authorId)}`);
  else qb.where(`e.status = 'active'`).where('u.is_active').where('(e.expires_at IS NULL OR e.expires_at >= CURRENT_DATE)');
  qb.whereIf(f.status, (p) => `e.status = ${p}`);
  qb.whereIf(f.category_id, (p) => `e.wanted_category_id = ${p}`);
  qb.whereIf(f.gouvernorat, (p) => `e.gouvernorat = ${p}`);
  qb.whereIf(f.author_id, (p) => `e.author_id = ${p}`);
  qb.whereIf(f.q && `%${f.q}%`, (p) => `(e.wanted_label ILIKE ${p} OR e.given_label ILIKE ${p} OR e.description ILIKE ${p} OR e.i18n::text ILIKE ${p})`);
  const { rows } = await query(`
    ${select(`${viewer}::uuid`).replace('SELECT', 'SELECT COUNT(*) OVER() AS total_count,')}
    ${qb.whereSql()}
    ORDER BY e.created_at DESC
    ${qb.limitOffset(page)}
  `, qb.params);
  return rows;
}

export async function findById(id, viewerId = null) {
  const { rows } = await query(`${select('$2::uuid')} WHERE e.id = $1`, [id, viewerId]);
  return rows[0];
}

export async function create(authorId, d) {
  const keys = WRITABLE.filter((k) => d[k] !== undefined);
  const qb = new QueryBuilder();
  const values = keys.map((k) => qb.param(d[k]));
  const { rows } = await query(
    `INSERT INTO exchange_offers (author_id, ${keys.join(', ')}) VALUES (${qb.param(authorId)}, ${values.join(', ')}) RETURNING id`,
    qb.params,
  );
  return rows[0].id;
}

export async function update(id, d) {
  const qb = new QueryBuilder();
  const sets = WRITABLE.filter((k) => d[k] !== undefined).map((k) => `${k} = ${qb.param(d[k])}`);
  if (sets.length) await query(`UPDATE exchange_offers SET ${sets.join(', ')} WHERE id = ${qb.param(id)}`, qb.params);
}

export const remove = (id) => query('DELETE FROM exchange_offers WHERE id = $1', [id]);

/* ---------------- responses ---------------- */

const RESPONSE_SELECT = `
  SELECT r.*,
    json_build_object('id', u.id, 'name', u.name, 'company_name', u.company_name, 'role', u.role,
                      'phone', u.phone, 'avatar_url', u.avatar_url, 'gouvernorat', u.gouvernorat, 'is_verified', u.is_verified) AS responder
  FROM exchange_responses r JOIN users u ON u.id = r.responder_id`;

export async function listResponses(exchangeId, responderId = null) {
  const { rows } = await query(`${RESPONSE_SELECT}
    WHERE r.exchange_id = $1 AND ($2::uuid IS NULL OR r.responder_id = $2) ORDER BY r.created_at DESC`, [exchangeId, responderId]);
  return rows;
}

export async function findResponse(exchangeId, responseId, db = { query }) {
  const { rows } = await db.query(`${RESPONSE_SELECT} WHERE r.id = $1 AND r.exchange_id = $2`, [responseId, exchangeId]);
  return rows[0];
}

/** Locks the exchange row: serialises concurrent acceptances (cap accounting). */
export async function lock(id, db = { query }) {
  const { rows } = await db.query(
    'SELECT id, author_id, wanted_unit, max_total_wanted FROM exchange_offers WHERE id = $1 FOR UPDATE',
    [id],
  );
  return rows[0];
}

/** Total quantity already accepted on an exchange. */
export async function acceptedQuantity(exchangeId, db = { query }) {
  const { rows } = await db.query(
    "SELECT COALESCE(SUM(quantity_offered), 0) AS total FROM exchange_responses WHERE exchange_id = $1 AND status = 'accepted'",
    [exchangeId],
  );
  return Number(rows[0].total);
}

/** Creates the response, or revives a previously withdrawn one. Pending/accepted ones → 409. */
export async function createResponse(exchangeId, responderId, d) {
  const { rows } = await query(`
    INSERT INTO exchange_responses (exchange_id, responder_id, quantity_offered, message)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (exchange_id, responder_id) DO UPDATE
      SET quantity_offered = EXCLUDED.quantity_offered, message = EXCLUDED.message, status = 'pending'
      WHERE exchange_responses.status IN ('withdrawn', 'rejected')
    RETURNING id
  `, [exchangeId, responderId, d.quantity_offered, d.message ?? null]);
  return rows[0]?.id ?? null;
}

export async function updateResponse(id, d, db = { query }) {
  const qb = new QueryBuilder();
  const sets = ['quantity_offered', 'message', 'status'].filter((k) => d[k] !== undefined).map((k) => `${k} = ${qb.param(d[k])}`);
  if (sets.length) await db.query(`UPDATE exchange_responses SET ${sets.join(', ')} WHERE id = ${qb.param(id)}`, qb.params);
}

/** Users likely to own the wanted material (sellers + collectors of that category). */
export async function idsConcerned(categoryId, excludeId) {
  if (!categoryId) return [];
  const { rows } = await query(`
    SELECT DISTINCT u.id FROM users u
    WHERE u.is_active AND u.role IN ('seller', 'collector') AND u.id <> $2 AND (
      $1::int = ANY(u.category_ids)
      OR EXISTS (SELECT 1 FROM products p WHERE p.seller_id = u.id AND p.is_active AND p.category_id = $1)
      OR EXISTS (SELECT 1 FROM collection_points cp WHERE cp.manager_id = u.id AND cp.is_active AND $1::int = ANY(cp.category_ids))
    )
  `, [categoryId, excludeId]);
  return rows.map((r) => r.id);
}
