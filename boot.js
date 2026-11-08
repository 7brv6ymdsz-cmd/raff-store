/* Runs in <head> before first paint: inner pages (#/…) skip painting the home hero, so nothing jumps. */
(function () {
  var h = location.hash;
  if (h.indexOf('#/') === 0 && h.length > 2) document.documentElement.classList.add('route-page');
  // single-product homepage: remembered from the last visit so the catalog home never flashes first
  // (the page also declares it, so a first-time visitor never sees the catalog home flash before it)
  var m = document.querySelector('meta[name="raff-home"]');
  var on = m && m.getAttribute('content') === 'landing';
  try { on = on || localStorage.getItem('raff.landing') === '1'; } catch (e) { /* private mode */ }
  if (on) document.documentElement.classList.add('landing');
})();
