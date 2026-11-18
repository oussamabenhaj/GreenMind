import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';

const FIELDS = `r.id, r.buyer_id, r.category_id, r.market_id, r.product_id, r.target_user_id, r.title, r.description,
  r.quantity, r.unit, r.max_price_per_unit, r.gouvernorat, r.lat, r.lng, r.needed_by, r.status, r.created_at, r.updated_at`;

const select = (distance = 'NULL::numeric', viewerParam = 'NULL::uuid') => `
  SELECT ${FIELDS},
    json_build_object('id', b.id, 'name', b.name, 'company_name', b.company_name, 'gouvernorat', b.gouvernorat,
                      'avatar_url', b.avatar_url, 'is_verified', b.is_verified) AS buyer,
    c.name AS category_name, m.name AS market_name, pr.title AS product_title,
    (SELECT COUNT(*) FROM request_responses rr WHERE rr.request_id = r.id AND rr.status <> 'withdrawn') AS responses_count,
    (SELECT rr.status FROM request_responses rr WHERE rr.request_id = r.id AND rr.responder_id = ${viewerParam}) AS my_response_status,
    ${distance} AS distance_km
  FROM buy_requests r
  JOIN users b ON b.id = r.buyer_id
  LEFT JOIN categories c ON c.id = r.category_id
  LEFT JOIN markets m ON m.id = r.market_id
  LEFT JOIN products pr ON pr.id = r.product_id`;

function applyFilters(qb, f) {
  qb.whereIf(f.status, (p) => `r.status = ${p}`);
  qb.whereIf(f.category_id, (p) => `r.category_id = ${p}`);
  qb.whereIf(f.market_id, (p) => `r.market_id = ${p}`);
  qb.whereIf(f.buyer_id, (p) => `r.buyer_id = ${p}`);
  qb.whereIf(f.product_id, (p) => `r.product_id = ${p}`);
  qb.whereIf(f.gouvernorat, (p) => `r.gouvernorat = ${p}`);
  qb.whereIf(f.min_quantity, (p) => `r.quantity >= ${p}`);
  qb.whereIf(f.q && `%${f.q}%`, (p) => `(r.title ILIKE ${p} OR r.description ILIKE ${p})`);
}

async function run(qb, f, page, viewerId) {
  const viewer = qb.param(viewerId);
  const distance = qb.near('r', f);
  const order = f.sort === 'distance' && f.lat !== undefined ? 'distance_km ASC NULLS LAST'
    : f.sort === 'needed_by' ? 'r.needed_by ASC NULLS LAST' : f.sort === 'quantity_desc' ? 'r.quantity DESC' : 'r.created_at DESC';
  const { rows } = await query(`
    ${select(distance, `${viewer}::uuid`).replace('SELECT', 'SELECT COUNT(*) OVER() AS total_count,')}
    ${qb.whereSql()}
    ORDER BY ${order}
    ${qb.limitOffset(page)}
  `, qb.params);
  return rows;
}

/** Public list of requests (US-G04 filter by buyer). */
export function list(f, page, viewerId) {
  const qb = new QueryBuilder();
  qb.where('b.is_active');
  qb.where(`(r.target_user_id IS NULL OR r.target_user_id = ${qb.param(viewerId)} OR r.buyer_id = ${qb.param(viewerId)})`);
  applyFilters(qb, { status: 'open', ...f });
  return run(qb, f, page, viewerId);
}

export function listByBuyer(buyerId, f, page) {
  const qb = new QueryBuilder();
  qb.where(`r.buyer_id = ${qb.param(buyerId)}`);
  applyFilters(qb, f);
  return run(qb, f, page, buyerId);
}

/**
 * US-S07 / US-PC04 — requests "received" by a seller / collector: addressed to
 * them directly, or open requests in a category they handle.
 */
export function listReceived(userId, f, page) {
  const qb = new QueryBuilder();
  const me = qb.param(userId);
  qb.where('b.is_active');
  qb.where(`(r.target_user_id = ${me} OR (r.target_user_id IS NULL AND r.category_id IN (
    SELECT unnest(category_ids) FROM users WHERE id = ${me}
    UNION SELECT unnest(category_ids) FROM collection_points WHERE manager_id = ${me} AND is_active
    UNION SELECT category_id FROM products WHERE seller_id = ${me} AND is_active AND category_id IS NOT NULL)))`);
  applyFilters(qb, { status: f.status ?? (f.include_closed ? undefined : 'open'), ...f });
  return run(qb, f, page, userId);
}

export async function findById(id, viewerId = null) {
  const { rows } = await query(`${select('NULL::numeric', '$2::uuid')} WHERE r.id = $1`, [id, viewerId]);
  return rows[0];
}

export async function create(buyerId, d) {
  const { rows } = await query(`
    INSERT INTO buy_requests (buyer_id, category_id, market_id, product_id, target_user_id, title, description,
      quantity, unit, max_price_per_unit, gouvernorat, lat, lng, needed_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id
  `, [buyerId, d.category_id ?? null, d.market_id ?? null, d.product_id ?? null, d.target_user_id ?? null, d.title,
    d.description ?? null, d.quantity, d.unit ?? 'kg', d.max_price_per_unit ?? null, d.gouvernorat ?? null,
    d.lat ?? null, d.lng ?? null, d.needed_by ?? null]);
  return rows[0].id;
}

export async function update(id, d) {
  const qb = new QueryBuilder();
  const sets = ['category_id', 'market_id', 'title', 'description', 'quantity', 'unit', 'max_price_per_unit',
    'gouvernorat', 'lat', 'lng', 'needed_by', 'status']
    .filter((k) => d[k] !== undefined).map((k) => `${k} = ${qb.param(d[k])}`);
  if (sets.length) await query(`UPDATE buy_requests SET ${sets.join(', ')} WHERE id = ${qb.param(id)}`, qb.params);
}

/* ---------------- responses ---------------- */

const RESPONSE_SELECT = `
  SELECT rr.*,
    json_build_object('id', u.id, 'name', u.name, 'company_name', u.company_name, 'role', u.role,
                      'phone', u.phone, 'avatar_url', u.avatar_url, 'is_verified', u.is_verified) AS responder,
    pr.title AS product_title
  FROM request_responses rr
  JOIN users u ON u.id = rr.responder_id
  LEFT JOIN products pr ON pr.id = rr.product_id`;

export async function listResponses(requestId, { responderId = null } = {}) {
  const { rows } = await query(`
    ${RESPONSE_SELECT}
    WHERE rr.request_id = $1 AND ($2::uuid IS NULL OR rr.responder_id = $2)
    ORDER BY rr.created_at DESC
  `, [requestId, responderId]);
  return rows;
}

export async function findResponse(requestId, responseId) {
  const { rows } = await query(`${RESPONSE_SELECT} WHERE rr.id = $1 AND rr.request_id = $2`, [responseId, requestId]);
  return rows[0];
}

export async function createResponse(requestId, responderId, d) {
  const { rows } = await query(`
    INSERT INTO request_responses (request_id, responder_id, product_id, message, proposed_quantity, proposed_price_per_unit)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
  `, [requestId, responderId, d.product_id ?? null, d.message ?? null, d.proposed_quantity ?? null, d.proposed_price_per_unit ?? null]);
  return rows[0].id;
}

export async function updateResponse(responseId, d) {
  const qb = new QueryBuilder();
  const sets = ['product_id', 'message', 'proposed_quantity', 'proposed_price_per_unit', 'status']
    .filter((k) => d[k] !== undefined).map((k) => `${k} = ${qb.param(d[k])}`);
  if (sets.length) await query(`UPDATE request_responses SET ${sets.join(', ')} WHERE id = ${qb.param(responseId)}`, qb.params);
}

export async function activeResponderIds(requestId) {
  const { rows } = await query(
    `SELECT responder_id FROM request_responses WHERE request_id = $1 AND status IN ('pending', 'accepted')`,
    [requestId],
  );
  return rows.map((r) => r.responder_id);
}

/** Sellers + collectors concerned by a new request in this category. */
export async function idsConcernedByCategory(categoryId, excludeId) {
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
