import { query } from '../../config/db.js';

/** Global quick search across entities (ILIKE + trigram similarity, accent-insensitive). */
export async function quickSearch(term, types, limit, viewerRole) {
  const like = `%${term}%`;
  const blocks = {
    products: `SELECT 'product' AS type, p.id, p.title AS label, COALESCE(s.company_name, s.name) AS subtitle,
        p.gouvernorat, similarity(unaccent(p.title), unaccent($1)) AS score
      FROM products p JOIN users s ON s.id = p.seller_id
      WHERE p.is_active AND s.is_active AND (unaccent(p.title) ILIKE unaccent($2) OR unaccent(COALESCE(p.description, '')) ILIKE unaccent($2)
        OR similarity(unaccent(p.title), unaccent($1)) > 0.25)`,
    sellers: `SELECT 'seller' AS type, u.id, COALESCE(u.company_name, u.name) AS label, u.name AS subtitle,
        u.gouvernorat, GREATEST(similarity(unaccent(u.name), unaccent($1)), similarity(unaccent(COALESCE(u.company_name, '')), unaccent($1))) AS score
      FROM users u WHERE u.role = 'seller' AND u.is_active
        AND (unaccent(u.name) ILIKE unaccent($2) OR unaccent(COALESCE(u.company_name, '')) ILIKE unaccent($2) OR similarity(unaccent(u.name), unaccent($1)) > 0.3)`,
    buyers: `SELECT 'buyer' AS type, u.id, COALESCE(u.company_name, u.name) AS label, u.name AS subtitle,
        u.gouvernorat, similarity(unaccent(u.name), unaccent($1)) AS score
      FROM users u WHERE u.role = 'buyer' AND u.is_active
        AND (unaccent(u.name) ILIKE unaccent($2) OR unaccent(COALESCE(u.company_name, '')) ILIKE unaccent($2))`,
    offers: `SELECT 'offer' AS type, o.id, o.title AS label, cp.name AS subtitle, o.gouvernorat,
        similarity(unaccent(o.title), unaccent($1)) AS score
      FROM offers o LEFT JOIN collection_points cp ON cp.id = o.collection_point_id
      WHERE o.status = 'published' AND (o.ends_at IS NULL OR o.ends_at > NOW())
        AND (unaccent(o.title) ILIKE unaccent($2) OR unaccent(COALESCE(o.description, '')) ILIKE unaccent($2))`,
    collection_points: `SELECT 'collection_point' AS type, cp.id, cp.name AS label, cp.address AS subtitle, cp.gouvernorat,
        similarity(unaccent(cp.name), unaccent($1)) AS score
      FROM collection_points cp WHERE cp.is_active AND cp.is_verified
        AND (unaccent(cp.name) ILIKE unaccent($2) OR unaccent(COALESCE(cp.address, '')) ILIKE unaccent($2))`,
    requests: `SELECT 'request' AS type, r.id, r.title AS label, b.name AS subtitle, r.gouvernorat,
        similarity(unaccent(r.title), unaccent($1)) AS score
      FROM buy_requests r JOIN users b ON b.id = r.buyer_id
      WHERE r.status = 'open' AND r.target_user_id IS NULL
        AND (unaccent(r.title) ILIKE unaccent($2) OR unaccent(COALESCE(r.description, '')) ILIKE unaccent($2))`,
  };
  if (viewerRole === 'buyer') delete blocks.buyers;
  const selected = types.filter((t) => blocks[t]);
  const results = await Promise.all(selected.map((t) =>
    query(`SELECT * FROM (${blocks[t]}) x ORDER BY score DESC, label LIMIT $3`, [term, like, limit])));
  return Object.fromEntries(selected.map((t, i) => [t, results[i].rows]));
}

export async function categoriesWithKeywords() {
  const { rows } = await query('SELECT id, slug, name, keywords FROM categories');
  return rows;
}
