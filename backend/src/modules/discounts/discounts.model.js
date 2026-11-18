import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';

const SELECT = `
  SELECT d.*,
    CASE WHEN NOT d.is_active THEN 'inactive'
         WHEN NOW() < d.starts_at THEN 'upcoming'
         WHEN NOW() > d.ends_at THEN 'expired'
         ELSE 'active' END AS state,
    json_build_object('id', p.id, 'title', p.title, 'unit', p.unit, 'images', p.images,
      'price_per_unit', p.price_per_unit, 'category_id', p.category_id, 'gouvernorat', p.gouvernorat) AS product,
    CASE WHEN p.price_per_unit IS NULL THEN NULL
         ELSE ROUND(p.price_per_unit * (1 - d.percentage / 100), 3) END AS discounted_price_per_unit,
    json_build_object('id', s.id, 'name', s.name, 'company_name', s.company_name, 'is_verified', s.is_verified) AS seller
  FROM discounts d
  JOIN products p ON p.id = d.product_id
  JOIN users s ON s.id = d.seller_id`;

const STATES = {
  active: 'd.is_active AND NOW() BETWEEN d.starts_at AND d.ends_at',
  upcoming: 'd.is_active AND NOW() < d.starts_at',
  expired: 'NOW() > d.ends_at',
};

export async function list(f, page, { sellerId = null } = {}) {
  const qb = new QueryBuilder();
  if (sellerId) qb.where(`d.seller_id = ${qb.param(sellerId)}`);
  else qb.where('p.is_active AND s.is_active');
  if (f.state && STATES[f.state]) qb.where(STATES[f.state]);
  qb.whereIf(f.seller_id, (p) => `d.seller_id = ${p}`);
  qb.whereIf(f.product_id, (p) => `d.product_id = ${p}`);
  qb.whereIf(f.category_id, (p) => `p.category_id = ${p}`);
  qb.whereIf(f.market_id, (p) => `p.market_id = ${p}`);
  qb.whereIf(f.gouvernorat, (p) => `p.gouvernorat = ${p}`);
  qb.whereIf(f.min_percentage, (p) => `d.percentage >= ${p}`);
  const order = f.sort === 'percentage' ? 'd.percentage DESC' : f.sort === 'ending_soon' ? 'd.ends_at ASC' : 'd.created_at DESC';
  const { rows } = await query(`
    ${SELECT.replace('SELECT', 'SELECT COUNT(*) OVER() AS total_count,')}
    ${qb.whereSql()}
    ORDER BY ${order}
    ${qb.limitOffset(page)}
  `, qb.params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${SELECT} WHERE d.id = $1`, [id]);
  return rows[0];
}

export async function create(sellerId, d) {
  const { rows } = await query(`
    INSERT INTO discounts (seller_id, product_id, title, description, percentage, min_quantity, starts_at, ends_at, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), $8, COALESCE($9, true))
    RETURNING id
  `, [sellerId, d.product_id, d.title, d.description ?? null, d.percentage, d.min_quantity ?? null,
    d.starts_at ?? null, d.ends_at, d.is_active ?? null]);
  return rows[0].id;
}

export async function update(id, d) {
  const qb = new QueryBuilder();
  const sets = ['title', 'description', 'percentage', 'min_quantity', 'starts_at', 'ends_at', 'is_active']
    .filter((k) => d[k] !== undefined).map((k) => `${k} = ${qb.param(d[k])}`);
  if (sets.length) await query(`UPDATE discounts SET ${sets.join(', ')} WHERE id = ${qb.param(id)}`, qb.params);
}

export const remove = (id) => query('DELETE FROM discounts WHERE id = $1', [id]);
