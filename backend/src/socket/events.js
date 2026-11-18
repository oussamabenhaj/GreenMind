/** Every Socket.IO event name used by the API (documented in API_ROUTES.md). */
export const SocketEvents = Object.freeze({
  // server → client
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_UNREAD_COUNT: 'notification:unread_count',
  MESSAGE_NEW: 'message:new',
  CHAT_UNREAD_COUNT: 'chat:unread_count',
  PRESENCE_UPDATE: 'presence:update',
  REQUEST_NEW: 'request:new',
  OFFER_PUBLISHED: 'offer:published',
  PRODUCT_PUBLISHED: 'product:published',
  EXCHANGE_PUBLISHED: 'exchange:published',
  STOCK_UPDATED: 'stock:updated',
  PURCHASE_UPDATED: 'purchase:updated',
  // both directions
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  CONVERSATION_READ: 'conversation:read',
  // client → server (with ack)
  PRESENCE_GET: 'presence:get',
});
