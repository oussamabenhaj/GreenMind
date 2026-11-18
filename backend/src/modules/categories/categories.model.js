import { query } from '../../config/db.js';

export async function list() {
  const { rows } = await query(`
    SELECT c.*,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active) AS products_count
    FROM categories c ORDER BY c.name
  `);
  return rows;
}

export async function findById(id) {
  const { rows } = await query('SELECT * FROM categories WHERE id = $1', [id]);
  return rows[0];
}

export async function create({ slug, name, description, keywords = [] }) {
  const { rows } = await query(
    'INSERT INTO categories (slug, name, description, keywords) VALUES ($1, $2, $3, $4) RETURNING *',
    [slug, name, description ?? null, keywords],
  );
  return rows[0];
}

export async function update(id, data) {
  const { rows } = await query(`
    UPDATE categories SET
      slug = COALESCE($2, slug), name = COALESCE($3, name),
      description = COALESCE($4, description), keywords = COALESCE($5, keywords)
    WHERE id = $1 RETURNING *
  `, [id, data.slug ?? null, data.name ?? null, data.description ?? null, data.keywords ?? null]);
  return rows[0];
}

export async function remove(id) {
  const { rowCount } = await query('DELETE FROM categories WHERE id = $1', [id]);
  return rowCount > 0;
}
