import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';
import { OPEN_NOW_SQL } from '../collection-points/collection-points.model.js';

function common(qb, alias, f) {
  if (f.bounds) {
    const [minLng, minLat, maxLng, maxLat] = f.bounds;
    qb.where(`${alias}.location && ST_MakeEnvelope(${qb.param(minLng)}, ${qb.param(minLat)}, ${qb.param(maxLng)}, ${qb.param(maxLat)}, 4326)`);
  }
  qb.where(`${alias}.location IS NOT NULL`);
  qb.whereIf(f.gouvernorat, (p) => `${alias}.gouvernorat = ${p}`);
}

async function run(qb, select, from, f) {
  const distance = qb.near(from.alias, f);
  const order = f.lat !== undefined ? 'distance_km ASC' : 'name ASC';
  const { rows } = await query(`
    SELECT ${select}, ${distance} AS distance_km
    FROM ${from.sql}
    ${qb.whereSql()}
    ORDER BY ${order}
    LIMIT ${qb.param(f.limit)}
  `, qb.params);
  return rows;
}

/** Users (sellers or buyers) placed on the map. */
export function users(role, f) {
  const qb = new QueryBuilder();
  qb.where(`u.role = ${qb.param(role)}`).where('u.is_active');
  common(qb, 'u', f);
  if (f.category_id) {
    const p = qb.param(f.category_id);
    qb.where(`(${p}::int = ANY(u.category_ids) OR EXISTS (SELECT 1 FROM products pr WHERE pr.seller_id = u.id AND pr.is_active AND pr.category_id = ${p}))`);
  }
  qb.whereIf(f.q && `%${f.q}%`, (p) => `(u.name ILIKE ${p} OR u.company_name ILIKE ${p})`);
  return run(qb, `'${role}' AS type, u.id, COALESCE(u.company_name, u.name) AS name, u.lat, u.lng, u.gouvernorat, u.address,
    u.avatar_url, u.phone, u.is_verified, u.category_ids,
    (SELECT COUNT(*) FROM products pr WHERE pr.seller_id = u.id AND pr.is_active) AS products_count`,
  { sql: 'users u', alias: 'u' }, f);
}

export function collectionPoints(f) {
  const qb = new QueryBuilder();
  qb.where('cp.is_active AND cp.is_verified');
  common(qb, 'cp', f);
  qb.whereIf(f.category_id, (p) => `${p}::int = ANY(cp.category_ids)`);
  qb.whereIf(f.q && `%${f.q}%`, (p) => `(cp.name ILIKE ${p} OR cp.address ILIKE ${p})`);
  if (f.open_now) qb.where(OPEN_NOW_SQL);
  return run(qb, `'collection_point' AS type, cp.id, cp.name, cp.lat, cp.lng, cp.gouvernorat, cp.address, cp.phone,
    cp.is_verified, cp.category_ids, cp.manager_id, ${OPEN_NOW_SQL} AS is_open_now`,
  { sql: 'collection_points cp', alias: 'cp' }, f);
}
