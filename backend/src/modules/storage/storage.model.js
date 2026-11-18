import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';

export async function overview(pointId) {
  const { rows } = await query(`
    SELECT cp.id AS collection_point_id, cp.name, cp.storage_capacity_kg,
      COALESCE(SUM(si.quantity_kg), 0) AS used_kg,
      GREATEST(cp.storage_capacity_kg - COALESCE(SUM(si.quantity_kg), 0), 0) AS available_kg,
      CASE WHEN cp.storage_capacity_kg > 0
           THEN ROUND(COALESCE(SUM(si.quantity_kg), 0) / cp.storage_capacity_kg * 100, 1) END AS usage_percent,
      COUNT(si.id) AS items_count,
      COUNT(si.id) FILTER (WHERE si.min_threshold_kg IS NOT NULL AND si.quantity_kg < si.min_threshold_kg) AS low_stock_count
    FROM collection_points cp
    LEFT JOIN stock_items si ON si.collection_point_id = cp.id
    WHERE cp.id = $1
    GROUP BY cp.id
  `, [pointId]);
  return rows[0];
}

export async function listItems(pointId) {
  const { rows } = await query(`
    SELECT si.*, c.name AS category_name,
      (si.min_threshold_kg IS NOT NULL AND si.quantity_kg < si.min_threshold_kg) AS is_low_stock
    FROM stock_items si LEFT JOIN categories c ON c.id = si.category_id
    WHERE si.collection_point_id = $1 ORDER BY si.label
  `, [pointId]);
  return rows;
}

export async function findItem(pointId, itemId, db = { query }, { lock = false } = {}) {
  const { rows } = await db.query(
    `SELECT * FROM stock_items WHERE id = $1 AND collection_point_id = $2 ${lock ? 'FOR UPDATE' : ''}`,
    [itemId, pointId],
  );
  return rows[0];
}

export async function findItemByLabel(pointId, label, db) {
  const { rows } = await db.query('SELECT * FROM stock_items WHERE collection_point_id = $1 AND label = $2 FOR UPDATE', [pointId, label]);
  return rows[0];
}

export async function createItem(pointId, d, db = { query }) {
  const { rows } = await db.query(`
    INSERT INTO stock_items (collection_point_id, category_id, label, min_threshold_kg)
    VALUES ($1, $2, $3, $4) RETURNING *
  `, [pointId, d.category_id ?? null, d.label, d.min_threshold_kg ?? null]);
  return rows[0];
}

export async function updateItem(itemId, d) {
  const qb = new QueryBuilder();
  const sets = ['label', 'category_id', 'min_threshold_kg'].filter((k) => d[k] !== undefined).map((k) => `${k} = ${qb.param(d[k])}`);
  if (!sets.length) return;
  await query(`UPDATE stock_items SET ${sets.join(', ')} WHERE id = ${qb.param(itemId)}`, qb.params);
}

export const removeItem = (itemId) => query('DELETE FROM stock_items WHERE id = $1', [itemId]);

export async function lockPoint(pointId, db) {
  const { rows } = await db.query(`
    SELECT cp.id, cp.manager_id, cp.name, cp.storage_capacity_kg,
      (SELECT COALESCE(SUM(quantity_kg), 0) FROM stock_items WHERE collection_point_id = cp.id) AS used_kg
    FROM collection_points cp WHERE cp.id = $1 FOR UPDATE OF cp
  `, [pointId]);
  return rows[0];
}

export const setItemQuantity = (itemId, qty, db) =>
  db.query('UPDATE stock_items SET quantity_kg = $1 WHERE id = $2', [qty, itemId]);

export async function insertMovement(m, db) {
  const { rows } = await db.query(`
    INSERT INTO stock_movements (collection_point_id, stock_item_id, type, quantity_kg, balance_after_kg, reason, purchase_id, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
  `, [m.pointId, m.itemId, m.type, m.quantity, m.balanceAfter, m.reason ?? null, m.purchaseId ?? null, m.userId ?? null]);
  return rows[0];
}

export async function listMovements(pointId, f, page) {
  const qb = new QueryBuilder();
  qb.where(`sm.collection_point_id = ${qb.param(pointId)}`);
  qb.whereIf(f.stock_item_id, (p) => `sm.stock_item_id = ${p}`);
  qb.whereIf(f.type, (p) => `sm.type = ${p}`);
  qb.whereIf(f.from, (p) => `sm.created_at >= ${p}`);
  qb.whereIf(f.to, (p) => `sm.created_at <= ${p}`);
  const { rows } = await query(`
    SELECT sm.*, si.label AS item_label, u.name AS created_by_name, COUNT(*) OVER() AS total_count
    FROM stock_movements sm
    JOIN stock_items si ON si.id = sm.stock_item_id
    LEFT JOIN users u ON u.id = sm.created_by
    ${qb.whereSql()}
    ORDER BY sm.created_at DESC
    ${qb.limitOffset(page)}
  `, qb.params);
  return rows;
}
