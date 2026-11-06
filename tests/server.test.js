import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../server.js';

async function fixture(t, options = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'alok-api-test-'));
  const server = await createApp({ dataDir, rateLimit: 50, ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => {
    if (server.listening) await stop(server);
    await rm(dataDir, { recursive: true, force: true });
  });
  const post = (data, headers = {}) => fetch(base + '/api/contact', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers },
    body: typeof data === 'string' ? data : JSON.stringify(data)
  });
  return { base, post, dataDir, server };
}
const valid = { name: 'Test Visitor', email: 'visitor@example.com', message: 'This is a local automated test message.', website: '' };
async function stop(server) {
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
}

test('valid contact is saved, survives restart, and returns no personal data', async t => {
  const { post, dataDir, server } = await fixture(t);
  const response = await post(valid);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.email, undefined);
  await stop(server);
  const restarted = await createApp({ dataDir });
  const db = new DatabaseSync(join(dataDir, 'messages.sqlite'), { readOnly: true });
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(body.id);
  assert.equal(row.name, valid.name);
  assert.equal(row.email, valid.email);
  assert.equal(row.message, valid.message);
  db.close();
  restarted.listen(0, '127.0.0.1');
  await once(restarted, 'listening');
  await stop(restarted);
});

test('invalid input, malformed JSON, honeypot, and oversized payloads are rejected', async t => {
  const { post, dataDir } = await fixture(t);
  for (const data of [null, [], '{', {}, { ...valid, name: ' ' }, { ...valid, email: 'invalid' }, { ...valid, message: 'short' }, { ...valid, website: 'spam' }, { ...valid, name: 42 }, { ...valid, message: 'x'.repeat(4001) }]) {
    assert.equal((await post(data)).status, 400);
  }
  assert.equal((await post({ ...valid, message: 'x'.repeat(20000) })).status, 413);
  const db = new DatabaseSync(join(dataDir, 'messages.sqlite'), { readOnly: true });
  assert.equal(db.prepare('SELECT count(*) AS count FROM messages').get().count, 0);
  db.close();
});

test('cross-origin requests, unsupported methods, and non-JSON submissions are rejected', async t => {
  const { post, base } = await fixture(t);
  assert.equal((await post(valid, { Origin: 'https://other.example' })).status, 403);
  assert.equal((await post(valid, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await post(valid, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await fetch(base + '/api/contact')).status, 405);
});

test('rate limiting rejects repeated attempts and returns retry guidance', async t => {
  const { post } = await fixture(t, { rateLimit: 2 });
  assert.equal((await post(valid)).status, 201);
  assert.equal((await post(valid)).status, 201);
  const limited = await post(valid);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '900');
});

test('only public files are served and security headers are present', async t => {
  const { base } = await fixture(t);
  for (const path of ['/.env', '/server.js', '/data/messages.sqlite', '/package.json', '/.freebuff/project-id', '/api/messages', '/%2e%2e/server.js']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  const home = await fetch(base + '/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /alok\.dev/);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const health = await (await fetch(base + '/api/health')).json();
  assert.equal(health.service, 'alok.dev');
});

test('parameter binding treats SQL-like message text as plain data', async t => {
  const { post, dataDir } = await fixture(t);
  const message = "Hello'); DROP TABLE messages; --";
  assert.equal((await post({ ...valid, message })).status, 201);
  const db = new DatabaseSync(join(dataDir, 'messages.sqlite'), { readOnly: true });
  assert.equal(db.prepare('SELECT message FROM messages').get().message, message);
  db.close();
});

test('production requires a configured HTTPS origin', async () => {
  await assert.rejects(createApp({ production: true, appOrigin: '' }), /APP_ORIGIN/);
  await assert.rejects(createApp({ production: true, appOrigin: 'http://example.com' }), /HTTPS/);
});
