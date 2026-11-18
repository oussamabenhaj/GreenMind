import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';
import { PRIVATE_COLUMNS } from '../users/users.model.js';

export async function listUsers(f, page) {
  const qb = new QueryBuilder();
  qb.whereIf(f.role, (p) => `u.role = ${p}`);
  qb.whereIf(f.is_verified, (p) => `u.is_verified = ${p}`);
  qb.whereIf(f.is_active, (p) => `u.is_active = ${p}`);
  qb.whereIf(f.q && `%${f.q}%`, (p) => `(u.name ILIKE ${p} OR u.email ILIKE ${p} OR u.company_name ILIKE ${p})`);
  const { rows } = await query(`
    SELECT ${PRIVATE_COLUMNS}, COUNT(*) OVER() AS total_count FROM users u
    ${qb.whereSql()} ORDER BY u.created_at DESC ${qb.limitOffset(page)}
  `, qb.params);
  return rows;
}

export async function setUserFlags(id, { is_verified: verified, is_active: active }) {
  const { rows } = await query(`
    UPDATE users SET is_verified = COALESCE($2, is_verified), is_active = COALESCE($3, is_active)
    WHERE id = $1 AND role <> 'admin' RETURNING ${PRIVATE_COLUMNS.replace(/u\./g, '')}
  `, [id, verified ?? null, active ?? null]);
  return rows[0];
}

export async function pendingCollectionPoints() {
  const { rows } = await query(`
    SELECT cp.id, cp.name, cp.address, cp.gouvernorat, cp.lat, cp.lng, cp.created_at, cp.updated_at,
      u.id AS manager_id, u.name AS manager_name, u.email AS manager_email
    FROM collection_points cp JOIN users u ON u.id = cp.manager_id
    WHERE cp.is_active AND NOT cp.is_verified ORDER BY cp.updated_at
  `);
  return rows;
}

export async function setPointVerified(id, verified) {
  const { rows } = await query(
    'UPDATE collection_points SET is_verified = $2 WHERE id = $1 RETURNING id, name, manager_id, is_verified',
    [id, verified],
  );
  return rows[0];
}

export async function stats() {
  const { rows } = await query(`
    SELECT
      (SELECT json_object_agg(role, n) FROM (SELECT role, COUNT(*) AS n FROM users GROUP BY role) r) AS users_by_role,
      (SELECT COUNT(*) FROM users WHERE NOT is_verified AND role <> 'admin') AS users_pending_verification,
      (SELECT COUNT(*) FROM products WHERE is_active) AS active_products,
      (SELECT COUNT(*) FROM buy_requests WHERE status = 'open') AS open_requests,
      (SELECT COUNT(*) FROM offers WHERE status = 'published') AS published_offers,
      (SELECT COUNT(*) FROM collection_points WHERE is_active AND NOT is_verified) AS points_pending_verification,
      (SELECT COALESCE(SUM(quantity_kg), 0) FROM purchases WHERE status = 'received') AS received_kg,
      (SELECT COALESCE(SUM(total_amount), 0) FROM purchases WHERE status = 'received') AS purchases_amount,
      (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '7 days') AS messages_last_7_days
  `);
  return rows[0];
}
