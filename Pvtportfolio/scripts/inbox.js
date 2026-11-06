import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = resolve(process.env.DATA_DIR || resolve(root, 'data'), 'messages.sqlite');
try {
  const db = new DatabaseSync(path, { readOnly: true });
  const messages = db.prepare('SELECT id, name, email, message, created_at FROM messages ORDER BY created_at DESC LIMIT 100').all();
  // JSON escaping prevents submitted text from injecting terminal control sequences.
  console.log(JSON.stringify(messages, null, 2));
  db.close();
} catch {
  console.error('Inbox unavailable. Start the server first and check DATA_DIR.');
  process.exitCode = 1;
}

