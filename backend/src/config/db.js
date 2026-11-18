import pg from 'pg';
import { env } from './env.js';

// NUMERIC (oid 1700) and BIGINT/COUNT (oid 20) → JS numbers.
pg.types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));
pg.types.setTypeParser(20, (value) => (value === null ? null : Number(value)));
// DATE (oid 1082) stays a plain 'YYYY-MM-DD' string (no timezone shift).
pg.types.setTypeParser(1082, (value) => value);

const pool = new pg.Pool(env.db.connectionString
  ? { connectionString: env.db.connectionString, max: 20 }
  : {
      host: env.db.host,
      port: env.db.port,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

export const query = (text, params) => pool.query(text, params);

/**
 * Runs `fn(client)` inside BEGIN/COMMIT. Model functions accept an optional
 * `db` argument so they can run on the transaction client.
 */
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
