import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';

const COLUMNS = ['category_id', 'market_id', 'title', 'description', 'unit', 'quantity_available', 'price_per_unit',
  'min_order_quantity', 'quantity_discount_enabled', 'images', 'gouvernorat', 'address', 'lat', 'lng', 'available_from',
  'available_until', 'is_active'];

/** SELECT shared by list / detail / smart search. `qb` receives the distance params. */
export const PRODUCT_FIELDS = `p.id, p.seller_id, p.category_id, p.market_id, p.title, p.description, p.unit,
  p.quantity_available, p.price_per_unit, p.min_order_quantity, p.quantity_discount_enabled, p.images, p.gouvernorat,
  p.address, p.lat, p.lng,
  p.available_from, p.available_until, p.is_active, p.views_count, p.created_at, p.updated_at, p.i18n`;

export const productSelect = (distanceSql = 'NULL::numeric') => `
  SELECT ${PRODUCT_FIELDS},
    json_build_object('id', s.id, 'name', s.name, 'company_name', s.company_name, 'gouvernorat', s.gouvernorat,
                      'phone', s.phone, 'avatar_url', s.avatar_url, 'is_verified', s.is_verified) AS seller,
    c.name AS category_name, c.slug AS category_slug, m.name AS market_name,
    d.best_discount_percentage,
    -- Price displayed for the smallest orderable quantity: a discount only
    -- applies once its own min_quantity is reached.
    CASE WHEN p.price_per_unit IS NULL THEN NULL
         ELSE ROUND(p.price_per_unit * (1 - COALESCE(d.order_discount_percentage, 0) / 100), 3) END AS final_price_per_unit,
    CASE WHEN p.price_per_unit IS NULL THEN NULL
         ELSE ROUND(p.price_per_unit * (1 - COALESCE(d.reachable_discount_percentage, 0) / 100), 3) END AS best_price_per_unit,
    ${distanceSql} AS distance_km
  FROM products p
  JOIN users s ON s.id = p.seller_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN markets m ON m.id = p.market_id
  LEFT JOIN LATERAL (
    SELECT MAX(percentage) AS best_discount_percentage,
           MAX(percentage) FILTER (WHERE min_quantity IS NULL OR min_quantity <= COALESCE(p.min_order_quantity, 0))
             AS order_discount_percentage,
           MAX(percentage) FILTER (WHERE min_quantity IS NULL OR min_quantity <= p.quantity_available)
             AS reachable_discount_percentage
    FROM discounts
    WHERE product_id = p.id AND is_active AND NOW() BETWEEN starts_at AND ends_at
  ) d ON true`;

const SORTS = {
  recent: 'p.created_at DESC',
  price_asc: 'final_price_per_unit ASC NULLS LAST',
  price_desc: 'final_price_per_unit DESC NULLS LAST',
  quantity_desc: 'p.quantity_available DESC',
  popular: 'p.views_count DESC',
  distance: 'distance_km ASC NULLS LAST',
};

/** US-S05 / US-B05 / US-G02 / US-G03 / US-G05 / US-G06 */
export async function list(f, page, { ownerId = null } = {}) {
  const qb = new QueryBuilder();
  if (ownerId) {
    qb.where(`p.seller_id = ${qb.param(ownerId)}`);
    qb.whereIf(f.is_active, (p) => `p.is_active = ${p}`);
  } else {
    qb.where('p.is_active').where('s.is_active');
    qb.where('(p.available_until IS NULL OR p.available_until >= CURRENT_DATE)');
  }
  qb.whereIf(f.category_id, (p) => `p.category_id = ${p}`);
  qb.whereIf(f.market_id, (p) => `p.market_id = ${p}`);
  qb.whereIf(f.seller_id, (p) => `p.seller_id = ${p}`);
  qb.whereIf(f.product_id, (p) => `p.id = ${p}`);
  qb.whereIf(f.gouvernorat, (p) => `p.gouvernorat = ${p}`);
  qb.whereIf(f.min_price, (p) => `p.price_per_unit >= ${p}`);
  qb.whereIf(f.max_price, (p) => `p.price_per_unit <= ${p}`);
  qb.whereIf(f.min_quantity, (p) => `p.quantity_available >= ${p}`);
  if (f.has_discount) qb.where('d.best_discount_percentage IS NOT NULL');
  if (f.q) {
    const like = qb.param(`%${f.q}%`);
    const raw = qb.param(f.q);
    qb.where(`(p.title ILIKE ${like} OR p.description ILIKE ${like} OR c.name ILIKE ${like} OR p.i18n::text ILIKE ${like} OR c.i18n::text ILIKE ${like} OR similarity(p.title, ${raw}) > 0.25)`);
  }
  const distance = qb.near('p', f);
  const sort = SORTS[f.sort] ?? (f.q ? null : SORTS.recent);
  const order = sort ?? `similarity(p.title, ${qb.param(f.q)}) DESC, p.created_at DESC`;
  // Wrapped in a sub-select so ORDER BY can use computed columns (final price, distance).
  const { rows } = await query(`
    SELECT p.*, COUNT(*) OVER() AS total_count
    FROM (${productSelect(distance)} ${qb.whereSql()}) AS p
    ORDER BY ${order}
    ${qb.limitOffset(page)}
  `, qb.params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`
    SELECT x.*, COALESCE((
      SELECT json_agg(dd ORDER BY dd.percentage DESC) FROM discounts dd
      WHERE dd.product_id = x.id AND dd.is_active AND NOW() BETWEEN dd.starts_at AND dd.ends_at
    ), '[]') AS active_discounts
    FROM (${productSelect()} WHERE p.id = $1) x
  `, [id]);
  return rows[0];
}

export async function findOwner(id) {
  const { rows } = await query(`
    SELECT id, seller_id, title, category_id, is_active, unit, quantity_available, price_per_unit, min_order_quantity,
           quantity_discount_enabled
    FROM products WHERE id = $1
  `, [id]);
  return rows[0];
}

export async function create(sellerId, data) {
  const keys = COLUMNS.filter((k) => data[k] !== undefined);
  const qb = new QueryBuilder();
  const values = keys.map((k) => qb.param(data[k]));
  const { rows } = await query(
    `INSERT INTO products (seller_id, ${keys.join(', ')}) VALUES (${qb.param(sellerId)}, ${values.join(', ')}) RETURNING id`,
    qb.params,
  );
  return rows[0].id;
}

export async function update(id, data) {
  const qb = new QueryBuilder();
  const sets = COLUMNS.filter((k) => data[k] !== undefined).map((k) => `${k} = ${qb.param(data[k])}`);
  if (sets.length) await query(`UPDATE products SET ${sets.join(', ')} WHERE id = ${qb.param(id)}`, qb.params);
}

export const remove = (id) => query('DELETE FROM products WHERE id = $1', [id]);
export const incrementViews = (id) => query('UPDATE products SET views_count = views_count + 1 WHERE id = $1', [id]);
