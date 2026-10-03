// platform.js - Which browser is this, and how to install the app on it.
// - iPhone/iPad: Safari deletes a site's data after 7 days without a visit unless the site was added to
//   the Home Screen, so learners are shown how to add it (Share -> Add to Home Screen).
// - In-app browsers (Instagram, Facebook, TikTok...): storage is separate and often cleared, and the app
//   can't be installed; learners are asked to open the link in Safari or Chrome.
import { el, en } from './dom.js';

const IN_APP = [
  [/FBAN|FBAV|FB_IAB|FBIOS/, 'Facebook'],
  [/Instagram/, 'Instagram'],
  [/musical_ly|Bytedance|TikTok/i, 'TikTok'],
  [/Snapchat/, 'Snapchat'],
  [/\bLine\//, 'LINE'],
  [/WhatsApp/i, 'WhatsApp'],
  [/Twitter/i, 'X']
];

/** Name of the in-app browser, 'webview' for an unknown app, or null for a real browser. */
export function detectInApp(ua, { ios = false, standalone = false } = {}) {
  for (const [re, name] of IN_APP) if (re.test(ua)) return name;
  if (/Android/.test(ua) && /; wv\)/.test(ua)) return 'webview';
  // iOS apps embed WebKit without the "Safari/" token (Chrome and Firefox for iOS keep it).
  if (ios && !standalone && !/Safari\//.test(ua)) return 'webview';
  return null;
}

export function platformInfo(nav = typeof navigator !== 'undefined' ? navigator : {}, win = typeof window !== 'undefined' ? window : {}) {
  const ua = nav.userAgent || '';
  const ios = /iP(hone|ad|od)/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  let standalone = nav.standalone === true;
  try { standalone = standalone || !!win.matchMedia?.('(display-mode: standalone)').matches; } catch (e) { /* ignore */ }
  const inApp = detectInApp(ua, { ios, standalone });
  const safari = ios && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return { ios, android, standalone, inApp, safari };
}

// Simple line icons for the steps (SF-Symbols-like "share" and "add" shapes).
function icon(kind) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'guide-icon');
  svg.setAttribute('aria-hidden', 'true');
  const paths = {
    share: ['M12 15V3', 'M8 7l4-4 4 4', 'M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1'],
    add: ['M4 4h16v16H4z', 'M12 8v8', 'M8 12h8'],
    menu: ['M12 5h.01', 'M12 12h.01', 'M12 19h.01']
  }[kind];
  paths.forEach(d => {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', kind === 'menu' ? '3' : '1.8');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    svg.append(p);
  });
  return svg;
}

const step = (n, ...content) => el('li', { class: 'guide-step' }, el('span', { class: 'guide-num', text: n }), el('span', {}, ...content));

/** opts: { canPrompt(), onInstall() -> Promise<boolean>, onDone() } */
export function renderInstallGuide(root, info, { canPrompt = () => false, onInstall = async () => false, onDone = () => {} } = {}) {
  const why = el('p', { class: 'section-help', text: 'لماذا؟ يُحفظ تقدّمك بأمان، ويعمل البرنامج دون إنترنت، ويُفتح بملء الشاشة مثل أي تطبيق.' });
  let body;
  if (info.standalone) {
    body = [el('p', { class: 'text-lg font-bold', text: 'البرنامج مثبّت على جهازك ✓' })];
  } else if (info.ios) {
    body = [
      el('p', { class: 'text-lg font-bold', text: 'أضف البرنامج إلى الشاشة الرئيسية' }),
      el('p', { class: 'section-help', text: 'مهم في iPhone: إذا لم تفتح الموقع ٧ أيام، قد يحذف Safari بياناته — ومنها تقدّمك. بعد الإضافة إلى الشاشة الرئيسية يبقى تقدّمك محفوظًا.' }),
      info.safari ? null : el('p', { class: 'hint', text: 'افتح هذا الرابط في Safari أولًا، ثم اتبع الخطوات.' }),
      el('ol', { class: 'guide-steps' },
        step('١', 'اضغط زر المشاركة ', icon('share'), ' في أسفل الشاشة (في iPad: في أعلاها).'),
        step('٢', 'مرّر إلى الأسفل واختر «إضافة إلى الشاشة الرئيسية» ', icon('add'), '.'),
        step('٣', 'اضغط «إضافة» في الأعلى.'),
        step('٤', 'افتح البرنامج من أيقونته على الشاشة الرئيسية، وليس من Safari.')),
      why
    ];
  } else if (info.android) {
    const btn = canPrompt() ? el('button', { class: 'today-btn' }, '📲 ثبّت الآن') : null;
    btn?.addEventListener('click', async () => { if (await onInstall()) onDone(); });
    body = [
      el('p', { class: 'text-lg font-bold', text: 'ثبّت البرنامج على هاتفك' }),
      btn,
      el('ol', { class: 'guide-steps' },
        step('١', 'في Chrome اضغط زر القائمة ', icon('menu'), ' في أعلى الشاشة.'),
        step('٢', 'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'),
        step('٣', 'افتح البرنامج من أيقونته.')),
      why
    ];
  } else {
    const btn = canPrompt() ? el('button', { class: 'today-btn' }, '💻 ثبّت الآن') : null;
    btn?.addEventListener('click', async () => { if (await onInstall()) onDone(); });
    body = [
      el('p', { class: 'text-lg font-bold', text: 'ثبّت البرنامج على جهازك' }),
      btn,
      el('p', { class: 'section-help', text: 'في Chrome أو Edge: اضغط أيقونة التثبيت في شريط العنوان، أو من القائمة اختر «تثبيت».' }),
      why
    ];
  }
  root.replaceChildren(el('div', { class: 'bg-white p-6 rounded-lg shadow-sm space-y-4 leading-8' },
    ...body, el('button', { class: 'next-btn', onclick: onDone }, 'متابعة')));
}

/** A banner for in-app browsers, or null. */
export function inAppBanner(info) {
  if (!info.inApp) return null;
  const where = info.ios ? 'Safari' : 'Chrome';
  const name = info.inApp === 'webview' ? 'تطبيق آخر' : info.inApp;
  const copied = el('span', { class: 'text-sm', 'aria-live': 'polite' });
  const banner = el('div', { class: 'inapp-banner', role: 'alert' },
    el('p', { class: 'font-bold' }, 'يبدو أنك فتحت الرابط من داخل ', en(name), '.'),
    el('p', {}, `لتشغيل الأصوات وحفظ تقدّمك، افتح الرابط في ${where}: اضغط على `, en('⋯'), ' أو ', en('⋮'), ' ثم «فتح في المتصفح».'),
    el('div', { class: 'flex flex-wrap gap-2 mt-2' },
      el('button', {
        class: 'small-btn', onclick: async () => {
          try { await navigator.clipboard.writeText(location.href); copied.textContent = '✅ نُسخ الرابط'; } catch (e) { copied.textContent = location.href; }
        }
      }, '📋 نسخ الرابط'),
      el('button', { class: 'small-btn', onclick: () => banner.remove() }, 'متابعة على أي حال'),
      copied));
  return banner;
}
