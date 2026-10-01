// worker/index.js - Sync server for لغتي الثانية, running on Cloudflare Workers with a D1 database.
// Learners sign in with Google; each account's progress is stored as one JSON document.
// The app merges progress itself (logic.js mergeProgress), so the server only stores documents and
// refuses a save that would overwrite a newer one (409), sending back the newer copy to merge.
//
// Setup: worker/README.md. Needs a D1 binding named DB and two variables:
//   GOOGLE_CLIENT_ID  the OAuth client ID the app signs in with
//   ALLOWED_ORIGINS   comma-separated sites allowed to call this server, e.g. https://example.github.io
//
// Endpoints (all JSON):
//   POST   /api/auth/google  { credential, nonce } -> { token, user }   sign in with a Google ID token
//   GET    /api/progress?since=<version>           -> { data, version }  or 204 if still at that version
//   PUT    /api/progress     { data, baseVersion } -> { version }        or 409 { data, version }
//   DELETE /api/session                                                  sign this device out
//   DELETE /api/account                                                  delete the learner's data

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const MAX_BODY_BYTES = 64 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_IDLE_DAYS = 180; // a device that hasn't synced for this long has to sign in again

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    }
    let response;
    try {
      response = await route(request, env);
    } catch (e) {
      if (e instanceof HttpError) {
        response = json({ error: e.code }, e.status);
      } else {
        console.error(e);
        response = json({ error: 'server_error' }, 500);
      }
    }
    if (cors) Object.entries(cors).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }
};

function route(request, env) {
  const url = new URL(request.url);
  const key = `${request.method} ${url.pathname}`;
  switch (key) {
    case 'GET /': return json({ ok: true, service: 'literacy-sync' });
    case 'POST /api/auth/google': return signIn(request, env);
    case 'GET /api/progress': return getProgress(request, env, url.searchParams);
    case 'PUT /api/progress': return putProgress(request, env);
    case 'DELETE /api/session': return signOut(request, env);
    case 'DELETE /api/account': return deleteAccount(request, env);
    default: throw new HttpError(404, 'not_found');
  }
}

// Only the app's own site may call the server from a browser
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean);
  if (!allowed.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

// -------------------- Endpoints --------------------
async function signIn(request, env) {
  if (!env.GOOGLE_CLIENT_ID) throw new HttpError(500, 'not_configured');
  const { credential, nonce } = await readBody(request);
  if (typeof credential !== 'string' || typeof nonce !== 'string' || !nonce) throw new HttpError(400, 'bad_request');
  const claims = await verifyGoogleIdToken(credential, env.GOOGLE_CLIENT_ID, nonce);

  const now = Date.now();
  const token = randomToken();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO progress (user_id, email, data, version, updated_at) VALUES (?1, ?2, NULL, 0, ?3)
       ON CONFLICT(user_id) DO UPDATE SET email = excluded.email`
    ).bind(claims.sub, claims.email || null, now),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, last_used_at) VALUES (?1, ?2, ?3, ?3)')
      .bind(await sha256(token), claims.sub, now),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1 AND last_used_at < ?2')
      .bind(claims.sub, now - SESSION_IDLE_DAYS * DAY_MS)
  ]);
  return json({ token, user: { id: claims.sub, email: claims.email || '', name: claims.name || claims.given_name || '' } });
}

async function getProgress(request, env, params) {
  const { userId } = await requireSession(request, env);
  const row = await env.DB.prepare('SELECT data, version FROM progress WHERE user_id = ?1').bind(userId).first();
  if (!row) throw new HttpError(401, 'signed_out');
  // The device already has this version: answer without sending the document again
  if (params.has('since') && Number(params.get('since')) === row.version) return new Response(null, { status: 204 });
  return json({ data: row.data ? JSON.parse(row.data) : null, version: row.version });
}

async function putProgress(request, env) {
  const { userId } = await requireSession(request, env);
  const { data, baseVersion } = await readBody(request);
  if (typeof data !== 'object' || data === null || Array.isArray(data) || !Number.isInteger(baseVersion) || baseVersion < 0) {
    throw new HttpError(400, 'bad_request');
  }
  const result = await env.DB.prepare(
    'UPDATE progress SET data = ?1, version = version + 1, updated_at = ?2 WHERE user_id = ?3 AND version = ?4'
  ).bind(JSON.stringify(data), Date.now(), userId, baseVersion).run();
  if (result.meta.changes === 1) return json({ version: baseVersion + 1 });

  // Another device saved first: send back the newer copy so the app can merge and try again
  const row = await env.DB.prepare('SELECT data, version FROM progress WHERE user_id = ?1').bind(userId).first();
  if (!row) throw new HttpError(401, 'signed_out');
  return json({ error: 'conflict', data: row.data ? JSON.parse(row.data) : null, version: row.version }, 409);
}

async function signOut(request, env) {
  const token = bearerToken(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256(token)).run();
  return new Response(null, { status: 204 });
}

async function deleteAccount(request, env) {
  const { userId } = await requireSession(request, env);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM progress WHERE user_id = ?1').bind(userId),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(userId)
  ]);
  return new Response(null, { status: 204 });
}

// -------------------- Sessions --------------------
// A device holds a random token; the server stores only its SHA-256 hash.
function bearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

async function requireSession(request, env) {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, 'signed_out');
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare('SELECT user_id, last_used_at FROM sessions WHERE token_hash = ?1').bind(tokenHash).first();
  const now = Date.now();
  if (!row || row.last_used_at < now - SESSION_IDLE_DAYS * DAY_MS) throw new HttpError(401, 'signed_out');
  // Record use at most once a day to keep database writes low
  if (now - row.last_used_at > DAY_MS) {
    await env.DB.prepare('UPDATE sessions SET last_used_at = ?1 WHERE token_hash = ?2').bind(now, tokenHash).run();
  }
  return { userId: row.user_id };
}

// -------------------- Google ID tokens --------------------
let keyCache = { keys: [], expires: 0 };

async function googleKeys(refresh = false) {
  if (!refresh && Date.now() < keyCache.expires) return keyCache.keys;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new HttpError(503, 'google_unavailable');
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('Cache-Control') || '')?.[1]) || 3600;
  keyCache = { keys: (await res.json()).keys || [], expires: Date.now() + maxAge * 1000 };
  return keyCache.keys;
}

async function verifyGoogleIdToken(token, clientId, nonce) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'bad_token');
  let header;
  let claims;
  try {
    header = JSON.parse(base64UrlToText(parts[0]));
    claims = JSON.parse(base64UrlToText(parts[1]));
  } catch {
    throw new HttpError(401, 'bad_token');
  }
  if (header.alg !== 'RS256') throw new HttpError(401, 'bad_token');

  let jwk = (await googleKeys()).find(k => k.kid === header.kid);
  if (!jwk) jwk = (await googleKeys(true)).find(k => k.kid === header.kid); // Google rotated its keys
  if (!jwk) throw new HttpError(401, 'bad_token');

  const key = await crypto.subtle.importKey(
    'jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key, base64UrlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  const now = Date.now() / 1000;
  if (!valid ||
      !GOOGLE_ISSUERS.includes(claims.iss) ||
      claims.aud !== clientId ||
      typeof claims.exp !== 'number' || claims.exp < now - 60 ||
      claims.nonce !== nonce ||
      typeof claims.sub !== 'string' || !claims.sub) {
    throw new HttpError(401, 'bad_token');
  }
  return claims;
}

// -------------------- Helpers --------------------
async function readBody(request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new HttpError(413, 'too_large');
  try {
    return JSON.parse(text) || {};
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function base64UrlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function base64UrlToText(s) {
  return new TextDecoder().decode(base64UrlToBytes(s));
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
