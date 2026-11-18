import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';

export const PUBLIC_COLUMNS = `u.id, u.role, u.name, u.company_name, u.phone, u.bio, u.avatar_url,
  u.gouvernorat, u.address, u.lat, u.lng, u.category_ids, u.is_verified, u.created_at`;
export const PRIVATE_COLUMNS = `${PUBLIC_COLUMNS}, u.email, u.is_active, u.last_login_at, u.updated_at`;

const UPDATABLE = ['name', 'company_name', 'phone', 'bio', 'avatar_url', 'gouvernorat', 'address', 'lat', 'lng', 'category_ids'];

export async function findAuthById(id) {
  const { rows } = await query('SELECT id, role, name, is_active, is_verified FROM users WHERE id = $1', [id]);
  return rows[0];
}

export async function findByEmailWithHash(email) {
  const { rows } = await query(`SELECT ${PRIVATE_COLUMNS}, u.password_hash FROM users u WHERE lower(u.email) = lower($1)`, [email]);
  return rows[0];
}

export async function findPasswordHash(id) {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [id]);
  return rows[0]?.password_hash;
}

export async function findPrivateById(id) {
  const { rows } = await query(`SELECT ${PRIVATE_COLUMNS} FROM users u WHERE u.id = $1`, [id]);
  return rows[0];
}

export async function findPublicById(id) {
  const { rows } = await query(`
    SELECT ${PUBLIC_COLUMNS},
      (SELECT COUNT(*) FROM products p WHERE p.seller_id = u.id AND p.is_active) AS products_count,
      (SELECT COUNT(*) FROM buy_requests r WHERE r.buyer_id = u.id AND r.status = 'open') AS open_requests_count,
      (SELECT COUNT(*) FROM collection_points cp WHERE cp.manager_id = u.id AND cp.is_active) AS collection_points_count
    FROM users u WHERE u.id = $1 AND u.is_active AND u.role <> 'admin'
  `, [id]);
  return rows[0];
}

export async function create(data) {
  const { rows } = await query(`
    INSERT INTO users (email, password_hash, role, name, company_name, phone, gouvernorat, address, lat, lng, category_ids)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `, [data.email.toLowerCase(), data.password_hash, data.role, data.name, data.company_name ?? null,
    data.phone ?? null, data.gouvernorat ?? null, data.address ?? null, data.lat ?? null, data.lng ?? null,
    data.category_ids ?? []]);
  return findPrivateById(rows[0].id);
}

export async function update(id, data) {
  const qb = new QueryBuilder();
  const sets = UPDATABLE.filter((key) => data[key] !== undefined).map((key) => `${key} = ${qb.param(data[key])}`);
  if (sets.length) await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ${qb.param(id)}`, qb.params);
  return findPrivateById(id);
}

export const updatePassword = (id, hash) => query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
export const touchLogin = (id) => query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);

/** Directory of sellers or buyers with filters (US-B04, US-S09, US-G02, US-G03). */
export async function listByRole(role, f, page) {
  const qb = new QueryBuilder();
  qb.where(`u.role = ${qb.param(role)}`).where('u.is_active');
  qb.whereIf(f.gouvernorat, (p) => `u.gouvernorat = ${p}`);
  qb.whereIf(f.category_id, (p) => `${p}::int = ANY(u.category_ids)`);
  qb.whereIf(f.verified, (p) => `u.is_verified = ${p}`);
  if (f.q) {
    const p = qb.param(`%${f.q}%`);
    qb.where(`(u.name ILIKE ${p} OR u.company_name ILIKE ${p} OR u.bio ILIKE ${p})`);
  }
  const distance = qb.near('u', f);
  const stats = role === 'seller'
    ? `(SELECT COUNT(*) FROM products p WHERE p.seller_id = u.id AND p.is_active) AS products_count,
       EXISTS (SELECT 1 FROM discounts d WHERE d.seller_id = u.id AND d.is_active AND NOW() BETWEEN d.starts_at AND d.ends_at) AS has_active_discount`
    : `(SELECT COUNT(*) FROM buy_requests r WHERE r.buyer_id = u.id AND r.status = 'open') AS open_requests_count`;
  const order = f.sort === 'distance' && f.lat !== undefined ? 'distance_km ASC NULLS LAST' : f.sort === 'name' ? 'u.name ASC' : 'u.created_at DESC';
  const { rows } = await query(`
    SELECT ${PUBLIC_COLUMNS}, ${stats}, ${distance} AS distance_km, COUNT(*) OVER() AS total_count
    FROM users u ${qb.whereSql()}
    ORDER BY ${order}
    ${qb.limitOffset(page)}
  `, qb.params);
  return rows;
}

/** Active users of the given roles interested in a category (for notifications). */
export async function idsInterestedIn(categoryId, roles, excludeId = null) {
  if (!categoryId) return [];
  const { rows } = await query(`
    SELECT id FROM users
    WHERE is_active AND role = ANY($1::varchar[]) AND $2::int = ANY(category_ids) AND id IS DISTINCT FROM $3::uuid
  `, [roles, categoryId, excludeId]);
  return rows.map((r) => r.id);
}

export async function idsByRole(roles) {
  const { rows } = await query('SELECT id FROM users WHERE is_active AND role = ANY($1::varchar[])', [roles]);
  return rows.map((r) => r.id);
}
