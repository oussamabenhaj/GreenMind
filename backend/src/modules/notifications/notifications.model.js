import { query } from '../../config/db.js';

/** Inserts one notification per user id (single statement). */
export async function createMany(userIds, { type, title, message, data = {}, link = null }, db = { query }) {
  if (!userIds.length) return [];
  const { rows } = await db.query(`
    INSERT INTO notifications (user_id, type, title, message, data, link)
    SELECT uid, $2::varchar, $3::varchar, $4::text, $5::jsonb, $6::varchar FROM unnest($1::uuid[]) AS uid
    RETURNING *
  `, [userIds, type, title, message, JSON.stringify(data), link]);
  return rows;
}

export async function list(userId, { unreadOnly, type, limit, offset }) {
  const { rows } = await query(`
    SELECT *, COUNT(*) OVER() AS total_count
    FROM notifications
    WHERE user_id = $1
      AND ($2::boolean IS NOT TRUE OR is_read = false)
      AND ($3::varchar IS NULL OR type = $3)
    ORDER BY created_at DESC
    LIMIT $4 OFFSET $5
  `, [userId, unreadOnly ?? null, type ?? null, limit, offset]);
  return rows;
}

export async function countUnread(userId) {
  const { rows } = await query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false', [userId]);
  return rows[0].count;
}

export async function markRead(userId, id) {
  const { rows } = await query(`
    UPDATE notifications SET is_read = true, read_at = COALESCE(read_at, NOW())
    WHERE id = $1 AND user_id = $2 RETURNING *
  `, [id, userId]);
  return rows[0];
}

export async function markAllRead(userId) {
  const { rowCount } = await query(
    'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
    [userId],
  );
  return rowCount;
}

export async function remove(userId, id) {
  const { rowCount } = await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

export async function removeAllRead(userId) {
  const { rowCount } = await query('DELETE FROM notifications WHERE user_id = $1 AND is_read = true', [userId]);
  return rowCount;
}
