import { createServer } from 'node:http';
import { readFile, mkdir, chmod } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
// Explicit public files: never expose source, SQLite files, .env, or metadata.
import { publicFiles } from './scripts/public-files.js';
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
const json = (res, status, body, extra = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(body));
};
const failure = (status, message) => Object.assign(new Error(message), { status });

function readJson(req) {
  const maxBytes = 16 * 1024;
  if (Number(req.headers['content-length']) > maxBytes) {
    req.resume();
    return Promise.reject(failure(413, 'Message is too large.'));
  }
  return new Promise((resolveBody, reject) => {
    let bytes = 0;
    let chunks = [];
    let rejected = false;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        chunks = [];
        if (!rejected) { rejected = true; reject(failure(413, 'Message is too large.')); }
        return;
      }
      if (!rejected) chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) return;
      try { resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(failure(400, 'Please send valid JSON.')); }
    });
    req.on('error', () => reject(failure(400, 'Request interrupted.')));
  });
}

export async function createApp({ dataDir = process.env.DATA_DIR || join(root, 'data'), appOrigin = process.env.APP_ORIGIN, production = process.env.NODE_ENV === 'production', rateLimit = 5, globalLimit = 100 } = {}) {
  if (production && !appOrigin) throw new Error('Set APP_ORIGIN to your public HTTPS origin in production.');
  if (appOrigin) {
    const parsed = new URL(appOrigin);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== appOrigin || (production && parsed.protocol !== 'https:')) throw new Error('APP_ORIGIN must be an origin without a trailing slash; use HTTPS in production.');
  }
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const dbPath = join(dataDir, 'messages.sqlite');
  const db = new DatabaseSync(dbPath);
  await chmod(dbPath, 0o600);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA secure_delete=ON;");
  db.exec(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
    message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);
  const insert = db.prepare('INSERT INTO messages (id, name, email, message) VALUES (?, ?, ?, ?)');
  const prune = () => db.exec("DELETE FROM messages WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days')");
  prune();
  const retentionTimer = setInterval(prune, 24 * 60 * 60 * 1000);
  retentionTimer.unref();
  // Single-process limits. Do not trust client-supplied forwarded headers.
  const clients = new Map();
  let globalWindow = { start: Date.now(), count: 0 };
  const windowMs = 15 * 60 * 1000;
  const consumeRate = req => {
    const now = Date.now();
    for (const [key, value] of clients) if (now - value.start >= windowMs) clients.delete(key);
    if (now - globalWindow.start >= windowMs) globalWindow = { start: now, count: 0 };
    const key = req.socket.remoteAddress || 'unknown';
    const client = clients.get(key) || { start: now, count: 0 };
    if (client.count >= rateLimit || globalWindow.count >= globalLimit || clients.size >= 10000) return false;
    client.count++;
    globalWindow.count++;
    clients.set(key, client);
    return true;
  };

  const server = createServer(async (req, res) => {
    for (const [key, value] of Object.entries(securityHeaders)) res.setHeader(key, value);
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, service: 'alok.dev' });
      if (path === '/api/contact') {
        if (req.method !== 'POST') return json(res, 405, { error: 'Use POST to send a message.' }, { Allow: 'POST' });
        const expectedOrigin = appOrigin || 'http://' + req.headers.host;
        if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && req.headers.origin !== expectedOrigin)) return json(res, 403, { error: 'Send messages from this website.' });
        if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') return json(res, 415, { error: 'Use application/json.' });
        if (!consumeRate(req)) return json(res, 429, { error: 'Too many attempts. Please try again in 15 minutes.' }, { 'Retry-After': '900' });
        const data = await readJson(req);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw failure(400, 'Invalid message.');
        if (typeof data.website === 'string' && data.website.trim()) throw failure(400, 'Message could not be accepted.');
        if (['name', 'email', 'message'].some(key => typeof data[key] !== 'string')) throw failure(400, 'Name, email, and message are required.');
        const name = data.name.trim(), email = data.email.trim(), message = data.message.trim();
        if (name.length < 2 || name.length > 80) throw failure(400, 'Name must be 2–80 characters.');
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw failure(400, 'Enter a valid email address.');
        if (message.length < 10 || message.length > 4000) throw failure(400, 'Message must be 10–4000 characters.');
        if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(name + email + message)) throw failure(400, 'Unsupported characters in message.');
        const id = randomUUID();
        insert.run(id, name, email, message);
        return json(res, 201, { ok: true, id });
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, HEAD' });
      const file = publicFiles.get(path);
      if (!file) return json(res, 404, { error: 'Not found.' });
      const content = await readFile(join(root, file[0]));
      res.writeHead(200, { 'Content-Type': file[1], 'Content-Length': content.length, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      // Do not log submitted names, emails, messages, or request bodies.
      if (!error.status) console.error('Request failed:', error.code || 'internal error');
      if (!res.headersSent) json(res, error.status || 500, { error: error.status ? error.message : 'Could not save your message. Please try again later.' });
      else res.end();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  let closed = false;
  server.on('close', () => {
    if (closed) return;
    closed = true;
    clearInterval(retentionTimer);
    db.close();
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = await createApp();
  const port = Number(process.env.PORT || 3000);
  server.listen(port, process.env.HOST || '127.0.0.1', () => console.log('Local: http://' + (process.env.HOST || '127.0.0.1') + ':' + port));
  const shutdown = () => { server.close(); server.closeIdleConnections(); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

