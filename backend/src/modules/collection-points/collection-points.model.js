import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';

const TZ = `'Africa/Tunis'`;
export const OPEN_NOW_SQL = `EXISTS (
  SELECT 1 FROM collection_point_schedules sc
  WHERE sc.collection_point_id = cp.id AND NOT sc.is_closed
    AND sc.day_of_week = EXTRACT(DOW FROM NOW() AT TIME ZONE ${TZ})
    AND (NOW() AT TIME ZONE ${TZ})::time BETWEEN sc.opens_at AND sc.closes_at)`;

const FIELDS = `cp.id, cp.manager_id, cp.name, cp.description, cp.address, cp.gouvernorat, cp.lat, cp.lng,
  cp.phone, cp.email, cp.storage_capacity_kg, cp.category_ids, cp.is_active, cp.is_verified, cp.created_at, cp.updated_at`;

const select = (distance = 'NULL::numeric') => `
  SELECT ${FIELDS},
    json_build_object('id', u.id, 'name', u.name, 'company_name', u.company_name, 'phone', u.phone) AS manager,
    COALESCE(st.used_kg, 0) AS storage_used_kg,
    ${OPEN_NOW_SQL} AS is_open_now,
    ${distance} AS distance_km
  FROM collection_points cp
  JOIN users u ON u.id = cp.manager_id
  LEFT JOIN LATERAL (SELECT SUM(quantity_kg) AS used_kg FROM stock_items WHERE collection_point_id = cp.id) st ON true`;

const WRITABLE = ['name', 'description', 'address', 'gouvernorat', 'lat', 'lng', 'phone', 'email', 'storage_capacity_kg', 'category_ids', 'is_active'];

export async function list(f, page, { managerId = null } = {}) {
  const qb = new QueryBuilder();
  if (managerId) qb.where(`cp.manager_id = ${qb.param(managerId)}`);
  else qb.where('cp.is_active AND cp.is_verified AND u.is_active');
  qb.whereIf(f.gouvernorat, (p) => `cp.gouvernorat = ${p}`);
  qb.whereIf(f.category_id, (p) => `${p}::int = ANY(cp.category_ids)`);
  qb.whereIf(f.q && `%${f.q}%`, (p) => `(cp.name ILIKE ${p} OR cp.address ILIKE ${p} OR cp.description ILIKE ${p})`);
  if (f.open_now) qb.where(OPEN_NOW_SQL);
  const distance = qb.near('cp', f);
  const order = f.lat !== undefined ? 'distance_km ASC' : 'cp.name ASC';
  const { rows } = await query(`
    ${select(distance).replace('SELECT', 'SELECT COUNT(*) OVER() AS total_count,')}
    ${qb.whereSql()}
    ORDER BY ${order}
    ${qb.limitOffset(page)}
  `, qb.params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`
    SELECT x.*, COALESCE((
      SELECT json_agg(json_build_object('day_of_week', s.day_of_week, 'opens_at', s.opens_at,
        'closes_at', s.closes_at, 'is_closed', s.is_closed) ORDER BY s.day_of_week)
      FROM collection_point_schedules s WHERE s.collection_point_id = x.id
    ), '[]') AS schedule
    FROM (${select()} WHERE cp.id = $1) x
  `, [id]);
  return rows[0];
}

export async function findOwner(id) {
  const { rows } = await query('SELECT id, manager_id, name, storage_capacity_kg, is_active, is_verified FROM collection_points WHERE id = $1', [id]);
  return rows[0];
}

export async function create(managerId, data) {
  const keys = WRITABLE.filter((k) => data[k] !== undefined);
  const qb = new QueryBuilder();
  const values = keys.map((k) => qb.param(data[k]));
  const { rows } = await query(
    `INSERT INTO collection_points (manager_id, ${keys.join(', ')}) VALUES (${qb.param(managerId)}, ${values.join(', ')}) RETURNING id`,
    qb.params,
  );
  return rows[0].id;
}

export async function update(id, data, db = { query }) {
  const qb = new QueryBuilder();
  const sets = [...WRITABLE, 'is_verified'].filter((k) => data[k] !== undefined).map((k) => `${k} = ${qb.param(data[k])}`);
  if (sets.length) await db.query(`UPDATE collection_points SET ${sets.join(', ')} WHERE id = ${qb.param(id)}`, qb.params);
}

export const remove = (id) => query('DELETE FROM collection_points WHERE id = $1', [id]);

export async function getSchedule(id) {
  const { rows } = await query(
    'SELECT day_of_week, opens_at, closes_at, is_closed FROM collection_point_schedules WHERE collection_point_id = $1 ORDER BY day_of_week',
    [id],
  );
  return rows;
}

/** Replaces the whole weekly schedule (days not sent are removed). */
export async function replaceSchedule(id, days, db) {
  await db.query('DELETE FROM collection_point_schedules WHERE collection_point_id = $1', [id]);
  for (const d of days) {
    await db.query(`
      INSERT INTO collection_point_schedules (collection_point_id, day_of_week, opens_at, closes_at, is_closed)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, d.day_of_week, d.is_closed ? null : d.opens_at, d.is_closed ? null : d.closes_at, d.is_closed ?? false]);
  }
}
