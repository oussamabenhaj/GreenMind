import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';

const SELECT = `
  SELECT pu.*,
    json_build_object('id', cp.id, 'name', cp.name, 'gouvernorat', cp.gouvernorat, 'manager_id', cp.manager_id) AS collection_point,
    CASE WHEN s.id IS NULL THEN NULL ELSE json_build_object('id', s.id, 'name', s.name,
      'company_name', s.company_name, 'phone', s.phone) END AS seller,
    pr.title AS product_title, c.name AS category_name
  FROM purchases pu
  JOIN collection_points cp ON cp.id = pu.collection_point_id
  LEFT JOIN users s ON s.id = pu.seller_id
  LEFT JOIN products pr ON pr.id = pu.product_id
  LEFT JOIN categories c ON c.id = pu.category_id`;

export async function list(user, f, page) {
  const qb = new QueryBuilder();
  if (user.role === 'collector') qb.where(`cp.manager_id = ${qb.param(user.id)}`);
  else if (user.role === 'seller') qb.where(`pu.seller_id = ${qb.param(user.id)}`);
  qb.whereIf(f.status, (p) => `pu.status = ${p}`);
  qb.whereIf(f.collection_point_id, (p) => `pu.collection_point_id = ${p}`);
  qb.whereIf(f.seller_id, (p) => `pu.seller_id = ${p}`);
  qb.whereIf(f.category_id, (p) => `pu.category_id = ${p}`);
  qb.whereIf(f.from, (p) => `pu.created_at >= ${p}`);
  qb.whereIf(f.to, (p) => `pu.created_at <= ${p}`);
  const { rows } = await query(`
    ${SELECT.replace('SELECT', 'SELECT COUNT(*) OVER() AS total_count,')}
    ${qb.whereSql()}
    ORDER BY pu.created_at DESC
    ${qb.limitOffset(page)}
  `, qb.params);
  return rows;
}

export async function findById(id, db = { query }) {
  const { rows } = await db.query(`${SELECT} WHERE pu.id = $1`, [id]);
  return rows[0];
}

export async function lock(id, db) {
  const { rows } = await db.query(`
    SELECT pu.*, cp.manager_id FROM purchases pu
    JOIN collection_points cp ON cp.id = pu.collection_point_id
    WHERE pu.id = $1 FOR UPDATE OF pu
  `, [id]);
  return rows[0];
}

export async function create(userId, d) {
  const { rows } = await query(`
    INSERT INTO purchases (collection_point_id, created_by, seller_id, product_id, category_id, stock_item_id,
      label, quantity_kg, unit_price, scheduled_at, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id
  `, [d.collection_point_id, userId, d.seller_id ?? null, d.product_id ?? null, d.category_id ?? null,
    d.stock_item_id ?? null, d.label, d.quantity_kg, d.unit_price ?? null, d.scheduled_at ?? null, d.notes ?? null]);
  return rows[0].id;
}

export async function update(id, d, db = { query }) {
  const qb = new QueryBuilder();
  const sets = ['label', 'quantity_kg', 'unit_price', 'scheduled_at', 'notes', 'status', 'received_at', 'stock_item_id']
    .filter((k) => d[k] !== undefined).map((k) => `${k} = ${qb.param(d[k])}`);
  if (sets.length) await db.query(`UPDATE purchases SET ${sets.join(', ')} WHERE id = ${qb.param(id)}`, qb.params);
}

/** Decrements the seller's listed quantity once the goods are received (kg products only). */
export const consumeProductQuantity = (productId, qty, db) => db.query(`
  UPDATE products SET quantity_available = GREATEST(quantity_available - $2, 0)
  WHERE id = $1 AND unit = 'kg'
`, [productId, qty]);
