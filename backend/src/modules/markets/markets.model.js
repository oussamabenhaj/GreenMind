import { query } from '../../config/db.js';

export async function list() {
  const { rows } = await query(`
    SELECT m.*,
      (SELECT COUNT(*) FROM products p WHERE p.market_id = m.id AND p.is_active) AS products_count,
      (SELECT COUNT(*) FROM offers o WHERE o.market_id = m.id AND o.status = 'published') AS offers_count
    FROM markets m ORDER BY m.name
  `);
  return rows;
}

export async function findById(id) {
  const { rows } = await query('SELECT * FROM markets WHERE id = $1', [id]);
  return rows[0];
}

export async function create({ slug, name, description, gouvernorat }) {
  const { rows } = await query(
    'INSERT INTO markets (slug, name, description, gouvernorat) VALUES ($1, $2, $3, $4) RETURNING *',
    [slug, name, description ?? null, gouvernorat ?? null],
  );
  return rows[0];
}

export async function update(id, data) {
  const { rows } = await query(`
    UPDATE markets SET
      slug = COALESCE($2, slug), name = COALESCE($3, name),
      description = COALESCE($4, description), gouvernorat = COALESCE($5, gouvernorat)
    WHERE id = $1 RETURNING *
  `, [id, data.slug ?? null, data.name ?? null, data.description ?? null, data.gouvernorat ?? null]);
  return rows[0];
}

export async function remove(id) {
  const { rowCount } = await query('DELETE FROM markets WHERE id = $1', [id]);
  return rowCount > 0;
}
