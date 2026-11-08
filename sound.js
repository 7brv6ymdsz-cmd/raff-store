/* Rawaj interface sounds: short, quiet, original (no music, no instruments). Off until the visitor turns them on. */
(() => {
  'use strict';
  const KEY = 'raff.sound';
  const NAMES = ['tap', 'pop', 'success', 'notify', 'error', 'whoosh', 'reveal'];
  const base = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : ''; })();
  const cache = new Map();
  let on = false;
  try { on = localStorage.getItem(KEY) === '1'; } catch { /* private mode */ }
  function play(name) {
    if (!on || !NAMES.includes(name)) return;
    let a = cache.get(name);
    if (!a) { a = new Audio(`${base}brand/sounds/${name}.mp3`); a.preload = 'auto'; a.volume = 0.6; cache.set(name, a); }
    try { a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch { /* ignore */ }
  }
  function set(v) {
    on = !!v;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ }
    document.querySelectorAll('[data-sound-toggle]').forEach((b) => { b.setAttribute('aria-pressed', String(on)); });
    if (on) play('tap');
  }
  // any element can ask for a sound on click: <button data-sfx="tap">
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-sound-toggle]');
    if (t) { set(!on); return; }
    const s = e.target.closest('[data-sfx]');
    if (s) play(s.dataset.sfx);
  });
  window.RaffSound = { play, set, get on() { return on; } };
})();
