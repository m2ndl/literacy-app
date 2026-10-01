// A stand-in for Cloudflare D1 backed by Node's built-in SQLite, for testing worker/index.js.
// Implements the parts of the D1 API the worker uses: prepare().bind().first()/run()/all(), batch().
import { readFileSync } from 'node:fs';

export async function createFakeD1(schemaPath) {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(schemaPath, 'utf8'));

  const statement = (sql, params = []) => ({
    bind: (...values) => statement(sql, values),
    async first(column) {
      const row = db.prepare(sql).get(...params);
      if (row === undefined) return null;
      return column ? row[column] : { ...row };
    },
    async all() {
      return { results: db.prepare(sql).all(...params).map(row => ({ ...row })), success: true };
    },
    async run() {
      const info = db.prepare(sql).run(...params);
      return { success: true, meta: { changes: Number(info.changes) } };
    }
  });

  return {
    raw: db,
    prepare: sql => statement(sql),
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        db.exec('COMMIT');
        return results;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    }
  };
}

// A fake Google: an RSA key pair, its public JWKS, and ID tokens signed with it
export async function createFakeGoogle({ kid = 'test-key' } = {}) {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']
  );
  const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid, use: 'sig', alg: 'RS256' };
  const b64url = bytes => Buffer.from(bytes).toString('base64url');

  async function idToken(claims, { signWith = privateKey, header = {} } = {}) {
    const h = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid, ...header }));
    const p = b64url(JSON.stringify(claims));
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signWith, new TextEncoder().encode(`${h}.${p}`));
    return `${h}.${p}.${b64url(new Uint8Array(sig))}`;
  }

  return { jwks: { keys: [jwk] }, idToken, privateKey };
}
