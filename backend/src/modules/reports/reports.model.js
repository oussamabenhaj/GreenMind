import { query } from '../../config/db.js';

const one = async (sql, params) => (await query(sql, params)).rows[0];
const many = async (sql, params) => (await query(sql, params)).rows;

/* $1 = user id, $2 = from, $3 = to (period filters) */
const PERIOD = (col) => `${col} BETWEEN $2 AND $3`;

export async function sellerOverview(userId, from, to) {
  const p = [userId, from, to];
  const [products, requests, sales, discounts, topProducts, byCategory] = await Promise.all([
    one(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active,
           COALESCE(SUM(views_count), 0) AS total_views, COALESCE(SUM(quantity_available) FILTER (WHERE unit = 'kg'), 0) AS stock_kg
         FROM products WHERE seller_id = $1`, [userId]),
    one(`SELECT COUNT(*) AS responses_sent,
           COUNT(*) FILTER (WHERE status = 'accepted') AS responses_accepted,
           COUNT(*) FILTER (WHERE status = 'rejected') AS responses_rejected,
           COUNT(*) FILTER (WHERE status = 'pending') AS responses_pending
         FROM request_responses WHERE responder_id = $1 AND ${PERIOD('created_at')}`, p),
    one(`SELECT COUNT(*) AS purchases_total,
           COUNT(*) FILTER (WHERE status = 'received') AS purchases_received,
           COALESCE(SUM(quantity_kg) FILTER (WHERE status = 'received'), 0) AS sold_kg,
           COALESCE(SUM(total_amount) FILTER (WHERE status = 'received'), 0) AS revenue
         FROM purchases WHERE seller_id = $1 AND ${PERIOD('created_at')}`, p),
    one(`SELECT COUNT(*) FILTER (WHERE is_active AND NOW() BETWEEN starts_at AND ends_at) AS active,
           COUNT(*) AS total FROM discounts WHERE seller_id = $1`, [userId]),
    many(`SELECT id, title, views_count, quantity_available, unit FROM products
          WHERE seller_id = $1 ORDER BY views_count DESC LIMIT 5`, [userId]),
    many(`SELECT c.id AS category_id, c.name AS category_name, COUNT(pu.id) AS purchases,
            COALESCE(SUM(pu.quantity_kg), 0) AS sold_kg, COALESCE(SUM(pu.total_amount), 0) AS revenue
          FROM purchases pu LEFT JOIN categories c ON c.id = pu.category_id
          WHERE pu.seller_id = $1 AND pu.status = 'received' AND ${PERIOD('pu.created_at')}
          GROUP BY c.id, c.name ORDER BY revenue DESC`, p),
  ]);
  const acceptance = requests.responses_sent ? Math.round((requests.responses_accepted / requests.responses_sent) * 1000) / 10 : null;
  return { products, requests: { ...requests, acceptance_rate_percent: acceptance }, sales, discounts, top_products: topProducts, sales_by_category: byCategory };
}

export async function collectorOverview(userId, from, to) {
  const p = [userId, from, to];
  const [storage, purchases, offers, requests] = await Promise.all([
    one(`SELECT COUNT(cp.id) AS points, COALESCE(SUM(cp.storage_capacity_kg), 0) AS capacity_kg,
           (SELECT COALESCE(SUM(si.quantity_kg), 0) FROM stock_items si JOIN collection_points c2 ON c2.id = si.collection_point_id
            WHERE c2.manager_id = $1) AS used_kg
         FROM collection_points cp WHERE cp.manager_id = $1`, [userId]),
    one(`SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE pu.status = 'pending') AS pending,
           COUNT(*) FILTER (WHERE pu.status = 'confirmed') AS confirmed,
           COUNT(*) FILTER (WHERE pu.status = 'received') AS received,
           COUNT(*) FILTER (WHERE pu.status = 'cancelled') AS cancelled,
           COALESCE(SUM(pu.quantity_kg) FILTER (WHERE pu.status = 'received'), 0) AS received_kg,
           COALESCE(SUM(pu.total_amount) FILTER (WHERE pu.status = 'received'), 0) AS spent
         FROM purchases pu JOIN collection_points cp ON cp.id = pu.collection_point_id
         WHERE cp.manager_id = $1 AND ${PERIOD('pu.created_at')}`, p),
    one(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'published') AS published,
           COUNT(*) FILTER (WHERE status = 'draft') AS drafts
         FROM offers WHERE publisher_id = $1 AND ${PERIOD('created_at')}`, p),
    one(`SELECT COUNT(*) AS responses_sent, COUNT(*) FILTER (WHERE status = 'accepted') AS responses_accepted
         FROM request_responses WHERE responder_id = $1 AND ${PERIOD('created_at')}`, p),
  ]);
  storage.usage_percent = storage.capacity_kg > 0 ? Math.round((storage.used_kg / storage.capacity_kg) * 1000) / 10 : null;
  return { storage, purchases, offers, requests };
}

export async function buyerOverview(userId, from, to) {
  const p = [userId, from, to];
  const [requests, responses] = await Promise.all([
    one(`SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'open') AS open,
           COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
           COUNT(*) FILTER (WHERE status = 'fulfilled') AS fulfilled,
           COUNT(*) FILTER (WHERE status IN ('closed', 'cancelled')) AS closed
         FROM buy_requests WHERE buyer_id = $1 AND ${PERIOD('created_at')}`, p),
    one(`SELECT COUNT(rr.*) AS received, COUNT(rr.*) FILTER (WHERE rr.status = 'accepted') AS accepted
         FROM request_responses rr JOIN buy_requests r ON r.id = rr.request_id
         WHERE r.buyer_id = $1 AND ${PERIOD('rr.created_at')}`, p),
  ]);
  return { requests, responses };
}

/**
 * Monthly series for charts (last `months` months, empty months = 0).
 * seller / collector: { month, count, quantity_kg, amount } of received purchases
 * buyer:              { month, count, quantity_kg, amount } of requests created (amount = 0)
 */
export async function timeline(user, months) {
  const series = {
    seller: `SELECT date_trunc('month', pu.created_at) AS m, COUNT(*) AS count,
               SUM(pu.quantity_kg) AS quantity_kg, SUM(pu.total_amount) AS amount
             FROM purchases pu WHERE pu.seller_id = $1 AND pu.status = 'received' GROUP BY 1`,
    collector: `SELECT date_trunc('month', pu.created_at) AS m, COUNT(*) AS count,
               SUM(pu.quantity_kg) AS quantity_kg, SUM(pu.total_amount) AS amount
             FROM purchases pu JOIN collection_points cp ON cp.id = pu.collection_point_id
             WHERE cp.manager_id = $1 AND pu.status = 'received' GROUP BY 1`,
    buyer: `SELECT date_trunc('month', r.created_at) AS m, COUNT(*) AS count,
              SUM(r.quantity) FILTER (WHERE r.unit = 'kg') AS quantity_kg, 0 AS amount
            FROM buy_requests r WHERE r.buyer_id = $1 GROUP BY 1`,
  }[user.role];
  if (!series) return [];
  return many(`
    WITH months AS (
      SELECT generate_series(date_trunc('month', NOW()) - ($2::int - 1) * INTERVAL '1 month',
                             date_trunc('month', NOW()), INTERVAL '1 month') AS m
    ), data AS (${series})
    SELECT to_char(months.m, 'YYYY-MM') AS month, COALESCE(data.count, 0) AS count,
      COALESCE(data.quantity_kg, 0) AS quantity_kg, COALESCE(data.amount, 0) AS amount
    FROM months LEFT JOIN data ON data.m = months.m
    ORDER BY months.m
  `, [user.id, months]);
}
