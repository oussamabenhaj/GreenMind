/**
 * Runs every *.sql file of this folder in alphabetical order (init.sql first).
 * All migrations are idempotent.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';
import { describeDbError } from '../src/config/db-error.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const files = fs.readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => (a === 'init.sql' ? -1 : b === 'init.sql' ? 1 : a.localeCompare(b)));
  try {
    for (const file of files) {
      console.log(`→ ${file}`);
      await pool.query(fs.readFileSync(path.join(dir, file), 'utf-8'));
    }
    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', describeDbError(error));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
