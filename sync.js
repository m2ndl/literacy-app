// sync.js - Keeps a learner's progress the same on every device where they sign in with Google.
// Progress is always saved on the device first, so the app works offline. This module copies it to
// the sync server (worker/index.js) in the background and merges in work done on other devices.
// To keep requests low it saves after a pause in activity (not on every answer), checks the server
// only when the app is opened or brought back to the screen, and skips both when nothing changed.
import { SYNC_API_URL, GOOGLE_CLIENT_ID } from './sync-config.js';
import { mergeProgress, withOwnCounters, validateProgress, getDefaultProgress } from './logic.js';

const STATE_KEY = 'literacySync';           // { token, user, version, serverHash, serverHashCore, lastSyncedAt, replaceLocal }
const OWNER_KEY = 'literacyProgressOwner';  // Google account the progress on this device belongs to
const DEVICE_KEY = 'literacyDeviceId';
const PENDING_KEY = 'literacyAuthPending';  // { state, nonce, at } while the learner is on Google's page
const RESULT_KEY = 'literacyAuthResult';    // written by the inline script in index.html on return

const PUSH_DELAY_MS = 8000;                 // save after this long without new changes...
const PUSH_MAX_WAIT_MS = 30 * 1000;         // ...but never later than this after the first unsaved change
const TIME_ONLY_PUSH_GAP_MS = 5 * 60 * 1000; // learning time on its own is saved at most this often
const PULL_GAP_MS = 60 * 1000;              // check the server at most once a minute

let hooks = { getProgress: getDefaultProgress, applyProgress: () => {}, onStatus: () => {} };
let ready = false;
let state = readJson(STATE_KEY, localStorage) || {};
let status = 'off';
let message = '';
let pushTimer = null;
let pendingSince = 0;   // when the oldest unsaved change happened
let lastCoreHash = null; // the last change we scheduled a save for
let pushing = false;
let pushAgain = false;
let lastPushAt = 0;
let lastPullAt = 0;
const deviceId = getDeviceId();

// -------------------- Storage helpers --------------------
function readJson(key, storage) {
  try { return JSON.parse(storage.getItem(key)); } catch { return null; }
}
function writeJson(key, value, storage = localStorage) {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* private mode: sync still works this session */ }
}
function readText(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeText(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
function remove(key, storage = localStorage) {
  try { storage.removeItem(key); } catch { /* ignore */ }
}
function saveState() {
  writeJson(STATE_KEY, state);
}
function randomId() {
  return [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
}
function getDeviceId() {
  let id = readText(DEVICE_KEY);
  if (!id) { id = randomId(); writeText(DEVICE_KEY, id); }
  return id;
}

// -------------------- Change detection --------------------
// Progress is normalized (sorted, with this device's counters) before comparing with the server copy.
// "Core" leaves out learning time, which changes every second but isn't worth a request on its own.
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36) + text.length.toString(36);
}
function normalize(progress) {
  return mergeProgress(progress, progress);
}
function hashes(progress) {
  const { timeSpent, counters, ...core } = progress;
  return { full: hash(JSON.stringify(progress)), core: hash(JSON.stringify({ ...core, points: counters.points })) };
}
function localSnapshot() {
  return normalize(withOwnCounters(hooks.getProgress(), deviceId));
}
function rememberServerCopy(progress) {
  const h = progress ? hashes(progress) : { full: null, core: null };
  state.serverHash = h.full;
  state.serverHashCore = h.core;
}
function changedSinceServer(snapshot = localSnapshot()) {
  const h = hashes(snapshot);
  return { any: h.full !== state.serverHash, core: h.core !== state.serverHashCore };
}

// -------------------- Status --------------------
function setStatus(next, msg) {
  status = next;
  if (msg !== undefined) message = msg;
  hooks.onStatus(getSyncState());
}

export function isSyncConfigured() {
  return Boolean(SYNC_API_URL && GOOGLE_CLIENT_ID);
}

export function getSyncState() {
  return {
    configured: isSyncConfigured(),
    signedIn: Boolean(state.token),
    user: state.user || null,
    status,
    message,
    lastSyncedAt: state.lastSyncedAt || null
  };
}

// True when the page was just opened by Google after sign-in (or a cancelled sign-in)
export function hasAuthReturn() {
  try { return Boolean(sessionStorage.getItem(RESULT_KEY)); } catch { return false; }
}

function handleError(e) {
  if (e && e.status === 401) {
    state = { user: state.user };
    saveState();
    setStatus('signed-out', 'انتهت الجلسة. سجّل الدخول مرة أخرى لمزامنة تقدمك.');
  } else if (navigator.onLine === false || e instanceof TypeError) {
    setStatus('offline');
  } else {
    console.warn('Sync failed:', e);
    setStatus('error');
  }
}

// -------------------- Server calls --------------------
async function api(method, path, body, { keepalive = false } = {}) {
  const res = await fetch(SYNC_API_URL.replace(/\/$/, '') + path, {
    method,
    headers: {
      Authorization: `Bearer ${state.token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body,
    keepalive,
    cache: 'no-store'
  });
  if (res.status === 401) {
    const err = new Error('signed out');
    err.status = 401;
    throw err;
  }
  return res;
}

// Fetch the server copy and merge it in. replaceLocal: the progress on this device belongs to
// another account (a shared computer), so take the server copy instead of merging.
async function pull({ force = false } = {}) {
  if (!state.token) return;
  if (!force && Date.now() - lastPullAt < PULL_GAP_MS) return;
  lastPullAt = Date.now();
  setStatus('syncing');
  try {
    const since = state.replaceLocal ? -1 : (state.version || 0);
    const res = await api('GET', `/api/progress?since=${since}`);
    if (res.status !== 204) {
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      const { data, version } = await res.json();
      const remote = data ? normalize(validateProgress(data)) : null;
      if (state.replaceLocal) {
        hooks.applyProgress(remote || getDefaultProgress());
      } else if (remote) {
        hooks.applyProgress(mergeProgress(withOwnCounters(hooks.getProgress(), deviceId), remote));
      }
      state.version = version;
      state.replaceLocal = false;
      rememberServerCopy(remote);
      if (state.user) writeText(OWNER_KEY, state.user.id);
      saveState();
    }
    if (changedSinceServer().any) await push();
    else markSynced();
  } catch (e) {
    handleError(e);
  }
}

async function push({ keepalive = false } = {}) {
  clearTimeout(pushTimer);
  pushTimer = null;
  pendingSince = 0;
  if (!state.token || state.replaceLocal) return;
  if (pushing) { pushAgain = true; return; }
  pushing = true;
  setStatus('syncing');
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const snapshot = localSnapshot();
      hooks.getProgress().counters = snapshot.counters; // keep this device's share in the local copy
      const res = await api('PUT', '/api/progress', JSON.stringify({ data: snapshot, baseVersion: state.version || 0 }), { keepalive });
      if (res.status === 409) {
        // Another device saved first: merge its copy in and try again
        const { data, version } = await res.json();
        const remote = data ? normalize(validateProgress(data)) : null;
        if (remote) hooks.applyProgress(mergeProgress(snapshot, remote));
        state.version = version;
        rememberServerCopy(remote);
        continue;
      }
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      state.version = (await res.json()).version;
      rememberServerCopy(snapshot);
      lastPushAt = Date.now();
      markSynced();
      break;
    }
  } catch (e) {
    handleError(e);
  } finally {
    pushing = false;
    if (pushAgain || (state.token && changedSinceServer().core)) {
      pushAgain = false;
      schedulePush(PUSH_DELAY_MS);
    }
  }
}

function schedulePush(delay) {
  const now = Date.now();
  if (!pendingSince) pendingSince = now;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => push(), Math.max(0, Math.min(delay, pendingSince + PUSH_MAX_WAIT_MS - now)));
}

function markSynced() {
  state.lastSyncedAt = Date.now();
  saveState();
  setStatus('synced');
}

// Save before the page goes away or into the background
function flush() {
  if (state.token && !state.replaceLocal && changedSinceServer().any) push({ keepalive: true });
}

// -------------------- Public API --------------------
export async function initSync(newHooks) {
  hooks = { ...hooks, ...newHooks };
  if (!isSyncConfigured()) { setStatus('off'); return; }
  ready = true;
  setStatus(state.token ? 'synced' : 'signed-out');

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else pull();
  });
  window.addEventListener('pagehide', flush);
  window.addEventListener('online', () => pull({ force: true }));

  if (hasAuthReturn()) await finishSignIn();
  else if (state.token) await pull({ force: true });
}

// Called after every local save
export function notifyProgressChanged() {
  if (!ready || !state.token || state.replaceLocal || pushing) return;
  const h = hashes(localSnapshot());
  if (h.core !== state.serverHashCore) {
    // Only new progress restarts the wait; the learning-time save every 10 seconds doesn't
    if (h.core !== lastCoreHash || !pushTimer) schedulePush(PUSH_DELAY_MS);
    lastCoreHash = h.core;
  } else if (h.full !== state.serverHash && !pushTimer && Date.now() - lastPushAt > TIME_ONLY_PUSH_GAP_MS) {
    schedulePush(PUSH_DELAY_MS);
  }
}

export function syncNow() {
  return pull({ force: true });
}

// Google sends the learner back to the same page; the app's address must be registered as a
// redirect URI in Google Cloud (worker/README.md).
export function redirectUri() {
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

export function startSignIn() {
  const pending = { state: randomId(), nonce: randomId(), at: Date.now() };
  writeJson(PENDING_KEY, pending);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce: pending.nonce,
    state: pending.state,
    prompt: 'select_account'
  });
  // A full-page redirect (not a popup) also works in the installed app on iPhone and Android
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

async function finishSignIn() {
  let result;
  try { result = new URLSearchParams(sessionStorage.getItem(RESULT_KEY) || ''); } catch { result = new URLSearchParams(); }
  remove(RESULT_KEY, sessionStorage);
  const pending = readJson(PENDING_KEY, localStorage);
  remove(PENDING_KEY);

  if (result.get('error')) {
    setStatus('signed-out', 'لم يكتمل تسجيل الدخول. يمكنك المحاولة مرة أخرى.');
    return;
  }
  const credential = result.get('id_token');
  const fresh = pending && Date.now() - pending.at < 30 * 60 * 1000;
  if (!credential || !fresh || result.get('state') !== pending.state) {
    setStatus('signed-out', 'تعذّر تسجيل الدخول. حاول مرة أخرى.');
    return;
  }

  setStatus('syncing', '');
  try {
    const res = await fetch(SYNC_API_URL.replace(/\/$/, '') + '/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, nonce: pending.nonce })
    });
    if (!res.ok) throw new Error(`Sign-in failed: HTTP ${res.status}`);
    const { token, user } = await res.json();
    const owner = readText(OWNER_KEY);
    state = { token, user, version: 0, replaceLocal: Boolean(owner && owner !== user.id) };
    saveState();
    message = 'تم تسجيل الدخول. سيُحفظ تقدمك تلقائياً على كل أجهزتك.';
    await pull({ force: true });
  } catch (e) {
    if (navigator.onLine === false || e instanceof TypeError) setStatus('signed-out', 'لا يوجد اتصال بالإنترنت. حاول تسجيل الدخول مرة أخرى عند الاتصال.');
    else setStatus('signed-out', 'تعذّر تسجيل الدخول. حاول مرة أخرى.');
  }
}

// clearDevice: also remove the progress from this device (for shared computers)
export async function signOut({ clearDevice = false } = {}) {
  if (!clearDevice && state.token && changedSinceServer().any) await push();
  const token = state.token;
  clearTimeout(pushTimer);
  state = {};
  saveState();
  if (token) {
    fetch(SYNC_API_URL.replace(/\/$/, '') + '/api/session', {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, keepalive: true
    }).catch(() => {});
  }
  if (clearDevice) {
    remove(OWNER_KEY);
    hooks.applyProgress(getDefaultProgress());
  }
  setStatus('signed-out', clearDevice
    ? 'تم تسجيل الخروج وحذف التقدم من هذا الجهاز. تقدمك محفوظ في حسابك.'
    : 'تم تسجيل الخروج. تقدمك ما زال على هذا الجهاز وفي حسابك.');
}

export async function deleteServerData() {
  try {
    const res = await api('DELETE', '/api/account');
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  } catch (e) {
    if (e.status !== 401) {
      setStatus(status, 'تعذّر حذف البيانات. تحقق من الاتصال وحاول مرة أخرى.');
      return false;
    }
  }
  clearTimeout(pushTimer);
  state = {};
  saveState();
  remove(OWNER_KEY);
  setStatus('signed-out', 'تم حذف بياناتك من الخادم. تقدمك ما زال على هذا الجهاز فقط.');
  return true;
}
