import { query } from '../../config/db.js';

export const directKey = (a, b) => [a, b].sort().join(':');

/** Returns the conversation id between two users, creating it if needed. */
export async function getOrCreateDirect(userA, userB, db) {
  const key = directKey(userA, userB);
  const inserted = await db.query(
    'INSERT INTO conversations (direct_key) VALUES ($1) ON CONFLICT (direct_key) DO NOTHING RETURNING id',
    [key],
  );
  if (inserted.rowCount) {
    const id = inserted.rows[0].id;
    await db.query('INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)', [id, userA, userB]);
    return { id, created: true };
  }
  const { rows } = await db.query('SELECT id FROM conversations WHERE direct_key = $1', [key]);
  return { id: rows[0].id, created: false };
}

const CONVERSATION_SELECT = `
  SELECT c.id, c.created_at, c.last_message_at, me.last_read_at,
    json_build_object('id', o.id, 'name', o.name, 'company_name', o.company_name, 'role', o.role,
                      'avatar_url', o.avatar_url, 'is_verified', o.is_verified) AS participant,
    lm.last_message,
    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> me.user_id
       AND (me.last_read_at IS NULL OR m.created_at > me.last_read_at)) AS unread_count
  FROM conversations c
  JOIN conversation_participants me ON me.conversation_id = c.id AND me.user_id = $1
  JOIN conversation_participants op ON op.conversation_id = c.id AND op.user_id <> $1
  JOIN users o ON o.id = op.user_id
  LEFT JOIN LATERAL (
    SELECT json_build_object('id', m.id, 'body', m.body, 'sender_id', m.sender_id, 'created_at', m.created_at) AS last_message
    FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1
  ) lm ON true`;

export async function listForUser(userId, { q, unreadOnly, limit, offset }) {
  const { rows } = await query(`
    SELECT x.*, COUNT(*) OVER() AS total_count FROM (${CONVERSATION_SELECT}
      WHERE ($2::text IS NULL OR o.name ILIKE $2 OR o.company_name ILIKE $2)) x
    WHERE ($3::boolean IS NOT TRUE OR x.unread_count > 0)
    ORDER BY COALESCE(x.last_message_at, x.created_at) DESC
    LIMIT $4 OFFSET $5
  `, [userId, q ? `%${q}%` : null, unreadOnly ?? null, limit, offset]);
  return rows;
}

export async function findForUser(conversationId, userId) {
  const { rows } = await query(`${CONVERSATION_SELECT} WHERE c.id = $2`, [userId, conversationId]);
  return rows[0];
}

export async function participantIds(conversationId) {
  const { rows } = await query('SELECT user_id FROM conversation_participants WHERE conversation_id = $1', [conversationId]);
  return rows.map((r) => r.user_id);
}

/** Everyone who shares a conversation with the user (presence broadcast). */
export async function partnerIdsOf(userId) {
  const { rows } = await query(`
    SELECT DISTINCT op.user_id FROM conversation_participants me
    JOIN conversation_participants op ON op.conversation_id = me.conversation_id AND op.user_id <> me.user_id
    WHERE me.user_id = $1
  `, [userId]);
  return rows.map((r) => r.user_id);
}

export async function listMessages(conversationId, { before, limit }) {
  const { rows } = await query(`
    SELECT m.*, u.name AS sender_name FROM messages m
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1 AND ($2::timestamptz IS NULL OR m.created_at < $2)
    ORDER BY m.created_at DESC LIMIT $3
  `, [conversationId, before ?? null, limit]);
  return rows.reverse(); // chronological order for display
}

export async function insertMessage(conversationId, senderId, d, db = { query }) {
  const { rows } = await db.query(`
    INSERT INTO messages (conversation_id, sender_id, body, attachments, context_type, context_id)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, [conversationId, senderId, d.body, d.attachments ?? [], d.context_type ?? null, d.context_id ?? null]);
  await db.query('UPDATE conversations SET last_message_at = $2 WHERE id = $1', [conversationId, rows[0].created_at]);
  // The sender has obviously read everything up to its own message.
  await db.query('UPDATE conversation_participants SET last_read_at = $3 WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, senderId, rows[0].created_at]);
  return rows[0];
}

export async function markRead(conversationId, userId) {
  const { rows } = await query(`
    UPDATE conversation_participants SET last_read_at = NOW()
    WHERE conversation_id = $1 AND user_id = $2 RETURNING last_read_at
  `, [conversationId, userId]);
  return rows[0];
}

export async function countUnreadMessages(userId) {
  const { rows } = await query(`
    SELECT COUNT(*) AS count FROM messages m
    JOIN conversation_participants me ON me.conversation_id = m.conversation_id AND me.user_id = $1
    WHERE m.sender_id <> $1 AND (me.last_read_at IS NULL OR m.created_at > me.last_read_at)
  `, [userId]);
  return rows[0].count;
}
