// dom.js - Small DOM helpers shared by the interface (textContent only: no HTML injection).
import { segment, isVowel } from './phonics.js';

let lookupWord = () => ({});

/** Tell wordNode how to find a word's syllable split (from the question bank). */
export function configureWords(wordInfo) {
  lookupWord = wordInfo;
}

export const toArabicDigits = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  });
  children.flat().forEach(c => {
    if (c === null || c === undefined || c === false) return;
    node.append(c.nodeType ? c : String(c));
  });
  return node;
}

export function svgIcon(path, cls) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  p.setAttribute('stroke-width', '2');
  p.setAttribute('d', path);
  svg.append(p);
  return svg;
}

/** English text inside Arabic: isolated, left-to-right, reading font. */
export function en(text, cls = '') {
  return el('bdi', { lang: 'en', dir: 'ltr', class: `english-content ${cls}`.trim(), text });
}

/** Arabic text that may contain English words: wrap the English runs so they display correctly. */
export function richArabic(text) {
  return String(text).split(/([A-Za-z][A-Za-z'/|]*(?:[ ,–\-|/≠]+[A-Za-z][A-Za-z'/|]*)*)/).filter(Boolean)
    .map(part => (/^[A-Za-z]/.test(part) ? en(part) : part));
}

/** An English word with its vowels highlighted (helps learners notice vowel letters). */
export function wordNode(word, { syllables = false, cls = '', split = null } = {}) {
  const info = lookupWord(word.toLowerCase()) || {};
  const parts = (split || info.split) ? (split || info.split).split('|') : [word.toLowerCase()];
  const out = el('bdi', { lang: 'en', dir: 'ltr', class: `english-content word ${cls}`.trim() });
  let pos = 0;
  parts.forEach((p, i) => {
    (segment(p) || p.split('')).forEach(g => {
      out.append(el('span', { class: isVowel(g) ? 'vowel' : null, text: word.slice(pos, pos + g.length) }));
      pos += g.length;
    });
    if (syllables && i < parts.length - 1) out.append(el('span', { class: 'syllable-dot', 'aria-hidden': 'true', text: '·' }));
  });
  if (pos < word.length) out.append(word.slice(pos)); // punctuation or suffix
  return out;
}

export function section(title, ...content) {
  return el('section', { class: 'lesson-section' }, el('h3', { class: 'section-title', text: title }), ...content);
}
