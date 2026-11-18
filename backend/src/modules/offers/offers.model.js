import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';

const FIELDS = `o.id, o.publisher_id, o.collection_point_id, o.category_id, o.market_id, o.stock_item_id, o.title,
  o.description, o.quantity, o.unit, o.price_per_unit, o.gouvernorat, o.lat, o.lng, o.starts_at, o.ends_at,
  o.status, o.published_at, o.created_at, o.updated_at`;

const WRITABLE = ['collection_point_id', 'category_id', 'market_id', 'stock_item_id', 'title', 'description', 'quantity',
  'unit', 'price_per_unit', 'gouvernorat', 'lat', 'lng', 'starts_at', 'ends_at', 'status', 'published_at'];

const select = (distance = 'NULL::numeric') => `
  SELECT ${FIELDS},
    CASE WHEN o.status <> 'published' THEN o.status
         WHEN NOW() < o.starts_at THEN 'upcoming'
         WHEN o.ends_at IS NOT NULL AND NOW() > o.ends_at THEN 'ended'
         ELSE 'ongoing' END AS timing,
    json_build_object('id', u.id, 'name', u.name, 'company_name', u.company_name, 'role', u.role,
                      'is_verified', u.is_verified) AS publisher,
    CASE WHEN cp.id IS NULL THEN NULL ELSE json_build_object('id', cp.id, 'name', cp.name,
      'address', cp.address, 'gouvernorat', cp.gouvernorat) END AS collection_point,
    c.name AS category_name, m.name AS market_name,
    ${distance} AS distance_km
  FROM offers o
  JOIN users u ON u.id = o.publisher_id
  LEFT JOIN collection_points cp ON cp.id = o.collection_point_id
  LEFT JOIN categories c ON c.id = o.category_id
  LEFT JOIN markets m ON m.id = o.market_id`;

const TIMING = {
  upcoming: 'NOW() < o.starts_at',
  ongoing: 'NOW() >= o.starts_at AND (o.ends_at IS NULL OR NOW() <= o.ends_at)',
  ended: 'o.ends_at IS NOT NULL AND NOW() > o.ends_at',
};

export async function list(f, page, { publisherId = null } = {}) {
  const qb = new QueryBuilder();
  if (publisherId) {
    qb.where(`o.publisher_id = ${qb.param(publisherId)}`);
    qb.whereIf(f.status, (p) => `o.status = ${p}`);
  } else {
    qb.where(`o.status = 'published'`).where('u.is_active');
    if (!f.timing) qb.where(`(${TIMING.upcoming} OR ${TIMING.ongoing})`);
  }
  if (f.timing && TIMING[f.timing]) qb.where(TIMING[f.timing]);
  qb.whereIf(f.category_id, (p) => `o.category_id = ${p}`);
  qb.whereIf(f.market_id, (p) => `o.market_id = ${p}`);
  qb.whereIf(f.gouvernorat, (p) => `o.gouvernorat = ${p}`);
  qb.whereIf(f.collection_point_id, (p) => `o.collection_point_id = ${p}`);
  qb.whereIf(f.publisher_id, (p) => `o.publisher_id = ${p}`);
  qb.whereIf(f.min_quantity, (p) => `o.quantity >= ${p}`);
  qb.whereIf(f.max_price, (p) => `o.price_per_unit <= ${p}`);
  qb.whereIf(f.q && `%${f.q}%`, (p) => `(o.title ILIKE ${p} OR o.description ILIKE ${p})`);
  const distance = qb.near('o', f);
  const order = f.sort === 'distance' && f.lat !== undefined ? 'distance_km ASC NULLS LAST'
    : f.sort === 'starts_at' || f.timing === 'upcoming' ? 'o.starts_at ASC'
      : f.sort === 'price_asc' ? 'o.price_per_unit ASC NULLS LAST' : 'o.created_at DESC';
  const { rows } = await query(`
    ${select(distance).replace('SELECT', 'SELECT COUNT(*) OVER() AS total_count,')}
    ${qb.whereSql()}
    ORDER BY ${order}
    ${qb.limitOffset(page)}
  `, qb.params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${select()} WHERE o.id = $1`, [id]);
  return rows[0];
}

export async function create(publisherId, d) {
  const keys = WRITABLE.filter((k) => d[k] !== undefined);
  const qb = new QueryBuilder();
  const values = keys.map((k) => qb.param(d[k]));
  const { rows } = await query(
    `INSERT INTO offers (publisher_id, ${keys.join(', ')}) VALUES (${qb.param(publisherId)}, ${values.join(', ')}) RETURNING id`,
    qb.params,
  );
  return rows[0].id;
}

export async function update(id, d) {
  const qb = new QueryBuilder();
  const sets = WRITABLE.filter((k) => d[k] !== undefined).map((k) => `${k} = ${qb.param(d[k])}`);
  if (sets.length) await query(`UPDATE offers SET ${sets.join(', ')} WHERE id = ${qb.param(id)}`, qb.params);
}

export const remove = (id) => query('DELETE FROM offers WHERE id = $1', [id]);
