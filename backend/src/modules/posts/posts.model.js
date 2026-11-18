import { query } from '../../config/db.js';
import { QueryBuilder } from '../../utils/queryBuilder.js';

const SELECT = `
  SELECT po.id, po.author_id, po.product_id, po.content, po.images, po.created_at, po.updated_at,
    json_build_object('id', u.id, 'name', u.name, 'company_name', u.company_name, 'role', u.role,
                      'avatar_url', u.avatar_url, 'gouvernorat', u.gouvernorat, 'is_verified', u.is_verified) AS author,
    CASE WHEN pr.id IS NULL THEN NULL ELSE json_build_object('id', pr.id, 'title', pr.title,
      'price_per_unit', pr.price_per_unit, 'unit', pr.unit, 'images', pr.images) END AS product
  FROM posts po
  JOIN users u ON u.id = po.author_id
  LEFT JOIN products pr ON pr.id = po.product_id`;

export async function list(f, page) {
  const qb = new QueryBuilder();
  qb.where('u.is_active');
  qb.whereIf(f.author_id, (p) => `po.author_id = ${p}`);
  qb.whereIf(f.product_id, (p) => `po.product_id = ${p}`);
  qb.whereIf(f.category_id, (p) => `pr.category_id = ${p}`);
  qb.whereIf(f.gouvernorat, (p) => `u.gouvernorat = ${p}`);
  qb.whereIf(f.q && `%${f.q}%`, (p) => `po.content ILIKE ${p}`);
  const { rows } = await query(`
    ${SELECT.replace('SELECT', 'SELECT COUNT(*) OVER() AS total_count,')}
    ${qb.whereSql()}
    ORDER BY po.created_at DESC
    ${qb.limitOffset(page)}
  `, qb.params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${SELECT} WHERE po.id = $1`, [id]);
  return rows[0];
}

export async function create(authorId, { content, images = [], product_id: productId = null }) {
  const { rows } = await query(
    'INSERT INTO posts (author_id, content, images, product_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [authorId, content, images, productId],
  );
  return rows[0].id;
}

export async function update(id, data) {
  await query(`
    UPDATE posts SET content = COALESCE($2, content), images = COALESCE($3, images),
      product_id = CASE WHEN $5 THEN $4::uuid ELSE product_id END
    WHERE id = $1
  `, [id, data.content ?? null, data.images ?? null, data.product_id ?? null, data.product_id !== undefined]);
}

export const remove = (id) => query('DELETE FROM posts WHERE id = $1', [id]);
