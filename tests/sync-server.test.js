import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFakeD1, createFakeGoogle } from './helpers/fake-d1.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const SITE = 'https://learner.example';

let hasSqlite = true;
try { await import('node:sqlite'); } catch { hasSqlite = false; }

describe('sync server (worker/index.js)', { skip: !hasSqlite && 'needs Node 22.13+ for node:sqlite' }, () => {
  let worker;
  let env;
  let google;
  let realFetch;

  before(async () => {
    google = await createFakeGoogle();
    realFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      if (String(url) === 'https://www.googleapis.com/oauth2/v3/certs') {
        return new Response(JSON.stringify(google.jwks), { headers: { 'Cache-Control': 'public, max-age=3600' } });
      }
      return realFetch(url, init);
    };
    worker = (await import('../worker/index.js')).default;
    env = { DB: await createFakeD1(join(root, 'worker', 'schema.sql')), GOOGLE_CLIENT_ID: CLIENT_ID, ALLOWED_ORIGINS: `${SITE}, http://localhost:8080` };
  });

  after(() => { globalThis.fetch = realFetch; });

  const call = (method, path, { body, token, origin = SITE } = {}) => worker.fetch(new Request(`https://sync.example${path}`, {
    method,
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
  }), env);

  const claims = (overrides = {}) => ({
    iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: 'user-1', email: 'learner@example.com', name: 'Learner',
    nonce: 'n-1', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, ...overrides
  });

  async function signIn(overrides = {}, nonce = 'n-1') {
    const credential = await google.idToken(claims(overrides));
    return call('POST', '/api/auth/google', { body: { credential, nonce } });
  }

  it('signs in with a valid Google ID token', async () => {
    const res = await signIn();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token.length >= 40);
    assert.deepEqual(body.user, { id: 'user-1', email: 'learner@example.com', name: 'Learner' });
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), SITE);
  });

  it('stores only a hash of the session token', async () => {
    const { token } = await (await signIn()).json();
    const rows = env.DB.raw.prepare('SELECT token_hash FROM sessions').all();
    assert.ok(rows.length > 0);
    assert.ok(rows.every(r => r.token_hash !== token && /^[0-9a-f]{64}$/.test(r.token_hash)));
  });

  it('rejects tokens for another app, from another issuer, expired, or with the wrong nonce', async () => {
    assert.equal((await signIn({ aud: 'someone-else' })).status, 401);
    assert.equal((await signIn({ iss: 'https://evil.example' })).status, 401);
    assert.equal((await signIn({ exp: Math.floor(Date.now() / 1000) - 3600 })).status, 401);
    assert.equal((await signIn({}, 'other-nonce')).status, 401);
  });

  it('rejects a token signed with a different key or a tampered payload', async () => {
    const stranger = await createFakeGoogle();
    const forged = await stranger.idToken(claims());
    assert.equal((await call('POST', '/api/auth/google', { body: { credential: forged, nonce: 'n-1' } })).status, 401);

    const real = await google.idToken(claims());
    const [h, , s] = real.split('.');
    const tampered = `${h}.${Buffer.from(JSON.stringify(claims({ sub: 'user-2' }))).toString('base64url')}.${s}`;
    assert.equal((await call('POST', '/api/auth/google', { body: { credential: tampered, nonce: 'n-1' } })).status, 401);
    assert.equal((await call('POST', '/api/auth/google', { body: { credential: 'not-a-jwt', nonce: 'n-1' } })).status, 401);
  });

  it('starts empty, saves, and refuses a save based on an old version', async () => {
    const { token } = await (await signIn({ sub: 'user-cas' })).json();
    let res = await call('GET', '/api/progress', { token });
    assert.deepEqual(await res.json(), { data: null, version: 0 });

    res = await call('PUT', '/api/progress', { token, body: { data: { points: 5 }, baseVersion: 0 } });
    assert.deepEqual(await res.json(), { version: 1 });

    // A second device that still thinks the version is 0 gets the newer copy back
    res = await call('PUT', '/api/progress', { token, body: { data: { points: 9 }, baseVersion: 0 } });
    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { error: 'conflict', data: { points: 5 }, version: 1 });

    res = await call('PUT', '/api/progress', { token, body: { data: { points: 14 }, baseVersion: 1 } });
    assert.deepEqual(await res.json(), { version: 2 });
  });

  it('answers 204 when the device already has the latest version', async () => {
    const { token } = await (await signIn({ sub: 'user-since' })).json();
    await call('PUT', '/api/progress', { token, body: { data: { points: 1 }, baseVersion: 0 } });
    assert.equal((await call('GET', '/api/progress?since=1', { token })).status, 204);
    const res = await call('GET', '/api/progress?since=0', { token });
    assert.deepEqual(await res.json(), { data: { points: 1 }, version: 1 });
  });

  it('keeps each account separate across devices', async () => {
    const a1 = (await (await signIn({ sub: 'user-a' })).json()).token;
    const a2 = (await (await signIn({ sub: 'user-a' })).json()).token;
    const b = (await (await signIn({ sub: 'user-b', email: 'b@example.com' })).json()).token;
    await call('PUT', '/api/progress', { token: a1, body: { data: { points: 7 }, baseVersion: 0 } });
    assert.deepEqual(await (await call('GET', '/api/progress', { token: a2 })).json(), { data: { points: 7 }, version: 1 });
    assert.deepEqual(await (await call('GET', '/api/progress', { token: b })).json(), { data: null, version: 0 });
  });

  it('signing in again keeps the saved progress', async () => {
    const t1 = (await (await signIn({ sub: 'user-again' })).json()).token;
    await call('PUT', '/api/progress', { token: t1, body: { data: { points: 3 }, baseVersion: 0 } });
    const t2 = (await (await signIn({ sub: 'user-again' })).json()).token;
    assert.deepEqual(await (await call('GET', '/api/progress', { token: t2 })).json(), { data: { points: 3 }, version: 1 });
  });

  it('requires a valid session', async () => {
    assert.equal((await call('GET', '/api/progress')).status, 401);
    assert.equal((await call('GET', '/api/progress', { token: 'made-up' })).status, 401);
    assert.equal((await call('PUT', '/api/progress', { token: 'made-up', body: { data: {}, baseVersion: 0 } })).status, 401);
  });

  it('signs one device out without affecting the others', async () => {
    const t1 = (await (await signIn({ sub: 'user-out' })).json()).token;
    const t2 = (await (await signIn({ sub: 'user-out' })).json()).token;
    assert.equal((await call('DELETE', '/api/session', { token: t1 })).status, 204);
    assert.equal((await call('GET', '/api/progress', { token: t1 })).status, 401);
    assert.equal((await call('GET', '/api/progress', { token: t2 })).status, 200);
  });

  it('deletes the account and signs out every device', async () => {
    const t1 = (await (await signIn({ sub: 'user-del' })).json()).token;
    const t2 = (await (await signIn({ sub: 'user-del' })).json()).token;
    await call('PUT', '/api/progress', { token: t1, body: { data: { points: 2 }, baseVersion: 0 } });
    assert.equal((await call('DELETE', '/api/account', { token: t1 })).status, 204);
    assert.equal((await call('GET', '/api/progress', { token: t2 })).status, 401);
    assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM progress WHERE user_id = 'user-del'").get().n, 0);
  });

  it('validates request bodies and limits their size', async () => {
    const { token } = await (await signIn({ sub: 'user-bad' })).json();
    assert.equal((await call('PUT', '/api/progress', { token, body: '{nope' })).status, 400);
    assert.equal((await call('PUT', '/api/progress', { token, body: { data: [], baseVersion: 0 } })).status, 400);
    assert.equal((await call('PUT', '/api/progress', { token, body: { data: {}, baseVersion: -1 } })).status, 400);
    const huge = { data: { blob: 'x'.repeat(70 * 1024) }, baseVersion: 0 };
    assert.equal((await call('PUT', '/api/progress', { token, body: huge })).status, 413);
  });

  it('only lets the configured sites call it from a browser', async () => {
    const preflight = await call('OPTIONS', '/api/progress', { origin: SITE });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /Authorization/);
    assert.equal((await call('OPTIONS', '/api/progress', { origin: 'https://evil.example' })).status, 403);
    const res = await signIn();
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), SITE);
    const other = await call('GET', '/', { origin: 'https://evil.example' });
    assert.equal(other.headers.get('Access-Control-Allow-Origin'), null);
  });

  it('answers unknown paths with 404', async () => {
    assert.equal((await call('GET', '/api/nothing')).status, 404);
    assert.deepEqual(await (await call('GET', '/')).json(), { ok: true, service: 'literacy-sync' });
  });
});
