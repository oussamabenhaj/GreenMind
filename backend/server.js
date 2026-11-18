/**
 * Tunisia Circular API — HTTP + Socket.IO entry point.
 */
import http from 'http';
import { env, assertProductionConfig } from './src/config/env.js';
import app from './src/app.js';
import { initSocket } from './src/socket/index.js';
import pool from './src/config/db.js';

assertProductionConfig();

const server = http.createServer(app);
initSocket(server);

server.listen(env.port, () => {
  console.log(`🌿 API ready on http://localhost:${env.port}  (${env.nodeEnv})`);
  console.log(`   REST   → http://localhost:${env.port}/api`);
  console.log(`   Socket → ws://localhost:${env.port}  (Socket.IO, auth: { token })`);
});

function shutdown(signal) {
  console.log(`${signal} received, closing...`);
  server.close(() => pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
