import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { platformInfo, detectInApp } from '../platform.js';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 336.0.3.18.99',
  iphoneApp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  androidFacebook: 'Mozilla/5.0 (Linux; Android 13; SM-A515F Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.43.108;]',
  androidTikTok: 'Mozilla/5.0 (Linux; Android 12; M2101K6G; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 trill_340005 musical_ly_34.0.5 BytedanceWebview/d8a21c6',
  androidWebView: 'Mozilla/5.0 (Linux; Android 13; SM-G991B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
};
const nav = (ua, extra = {}) => ({ userAgent: ua, platform: '', maxTouchPoints: 0, ...extra });
const win = (standalone = false) => ({ matchMedia: () => ({ matches: standalone }) });

describe('platformInfo', () => {
  it('recognises iPhone Safari, not installed', () => {
    assert.deepEqual(platformInfo(nav(UA.iphoneSafari), win()), { ios: true, android: false, standalone: false, inApp: null, safari: true });
  });

  it('recognises the installed Home Screen app (no Safari token, not an in-app browser)', () => {
    const r = platformInfo(nav(UA.iphoneApp, { standalone: true }), win(true));
    assert.equal(r.standalone, true);
    assert.equal(r.inApp, null);
  });

  it('treats Chrome on iPhone as iOS but not Safari', () => {
    const r = platformInfo(nav(UA.iphoneChrome), win());
    assert.equal(r.ios, true);
    assert.equal(r.safari, false);
    assert.equal(r.inApp, null);
  });

  it('recognises an iPad that reports a Mac', () => {
    assert.equal(platformInfo(nav(UA.ipadDesktop, { platform: 'MacIntel', maxTouchPoints: 5 }), win()).ios, true);
    assert.equal(platformInfo(nav(UA.ipadDesktop, { platform: 'MacIntel', maxTouchPoints: 0 }), win()).ios, false);
  });

  it('recognises Android Chrome and desktop', () => {
    assert.deepEqual(platformInfo(nav(UA.androidChrome), win()), { ios: false, android: true, standalone: false, inApp: null, safari: false });
    assert.equal(platformInfo(nav(UA.desktop), win()).inApp, null);
  });
});

describe('detectInApp', () => {
  it('names common in-app browsers', () => {
    assert.equal(detectInApp(UA.iphoneInstagram, { ios: true }), 'Instagram');
    assert.equal(detectInApp(UA.androidFacebook), 'Facebook');
    assert.equal(detectInApp(UA.androidTikTok), 'TikTok');
    assert.equal(detectInApp(UA.androidWebView), 'webview');
    assert.equal(detectInApp(UA.iphoneApp, { ios: true }), 'webview');
    assert.equal(detectInApp(UA.iphoneApp, { ios: true, standalone: true }), null);
    assert.equal(detectInApp(UA.androidChrome), null);
  });
});
