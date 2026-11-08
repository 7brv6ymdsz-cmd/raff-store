/* رَفّ · storefront core: catalog, cards, cart, checkout. Pages (product, account…) live in pages.js. */
(() => {
  'use strict';
  const S = window.RaffShared, D = window.RaffData;
  const { art, esc, num, compact, norm, ls } = S;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  let CFG = {}, CATS = [], P = [], byId = new Map();
  let money = (n) => S.money(n, '$');
  const heartSVG = '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.3 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>';
  const plusSVG = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
  const chev = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';

  /* ---------- Cart: lines keyed by product + chosen options ---------- */
  const optKey = (o) => Object.keys(o || {}).sort().map((k) => `${k}:${o[k]}`).join('|');
  let cart = (() => {
    const raw = ls.get('raff.cart', {});
    if (Array.isArray(raw)) return raw;
    return Object.keys(raw).map((id) => ({ id: +id, qty: +raw[id], options: {} })); // old {id: qty} format
  })();
  const persistCart = () => ls.set('raff.cart', cart);
  let appliedCoupon = null;

  /* ---------- Components ---------- */
  const isDigital = S.isDigital;
  const inStock = (p) => isDigital(p) || !(p.stock <= 0);
  const digiTag = (p) => (isDigital(p) ? `<span class="tag digi">${esc(p.format || 'رقمي')}</span>` : '');
  const hasOpts = (p) => Array.isArray(p.options) && p.options.some((o) => o && o.values && o.values.length);
  const priceHTML = (p) => `<span class="price">${money(p.price)}${p.compare > p.price ? ` <s>${money(p.compare)}</s>` : ''}</span>`;
  const href = (p) => `#/p/${p.id}`;
  const card = (p, mini = false) => `
    <article class="pcard${mini ? ' mini' : ''}${inStock(p) ? '' : ' soldout'}">
      <a class="pcard-img" href="${href(p)}" style="--bg:${S.hex(p.bg, '#efe8dc')}" aria-label="${esc(p.name)}">${art(p)}${digiTag(p)}${inStock(p) ? '' : '<span class="tag">نفد</span>'}${p.compare > p.price && inStock(p) ? `<span class="tag sale">−${num(Math.round((1 - p.price / p.compare) * 100))}٪</span>` : ''}</a>
      ${mini ? '' : `<button class="heart" type="button" data-save="${p.id}" aria-pressed="${D.wishlist.has(p.id)}" aria-label="أضف ${esc(p.name)} للمفضلة">${heartSVG}</button>
      <button class="add" type="button" data-add="${p.id}" ${inStock(p) ? '' : 'disabled'} aria-label="${hasOpts(p) || S.safeUrl(p.buyUrl) ? `اشترِ ${esc(p.name)}` : `أضف ${esc(p.name)} إلى السلة`}">${plusSVG}</button>`}
      <a class="pcard-meta" href="${href(p)}">
        <h3>${esc(p.name)}</h3>
        <p class="store">${esc(p.store)}</p>
        <div class="row">${priceHTML(p)}
          ${p.reviews ? `<span class="rate"><span class="stars">★</span> ${num(p.rating)} (${compact(p.reviews)})</span>` : ''}
        </div>
      </a>
    </article>`;
  const tile = (p) => `
    <a class="tile" href="${href(p)}" style="--bg:${S.hex(p.bg, '#efe8dc')}" aria-label="${esc(p.name)}">
      ${art(p)}
      <span class="tile-label"><b>${esc(p.name)}</b><small>${esc(p.store)} · ${money(p.price)}</small></span>
    </a>`;
  const head = (id, title) => `<div class="band-head"><h2><a href="#${id}">${esc(title)} ${chev}</a></h2></div>`;

  /* ---------- Home ---------- */
  function renderHome() {
    document.title = `${CFG.name || 'رَفّ'} · ${CFG.tagline || ''}`;
    $$('[data-brand], [data-brand-sm]').forEach((el) => { el.firstChild.nodeValue = CFG.name || 'رَفّ'; });
    const rl = $('.rail-logo');
    if (rl && rl.firstChild && rl.firstChild.nodeType === 3) { rl.firstChild.nodeValue = (CFG.name || 'ر').trim().charAt(0); rl.setAttribute('aria-label', `${CFG.name || 'رَفّ'}، الرئيسية`); }
    $('#tagline').textContent = CFG.tagline || '';
    $('#bannerTitle').textContent = CFG.banner || '';
    $('#bannerSub').textContent = CFG.bannerSub || '';
    $('.banner').hidden = !CFG.banner;
    if (P.length && P.every(isDigital)) {
      $$('a[href="#/shipping"]').forEach((a) => { if (a.textContent.trim() === 'التوصيل') a.textContent = 'التسليم والتحميل'; });
      $$('a[href="#/returns"]').forEach((a) => { if (a.textContent.trim() === 'الإرجاع') a.textContent = 'الاسترداد'; });
      $('.banner').setAttribute('aria-label', 'تفاصيل التسليم');
    }

    const heroList = P.filter((p) => p.featured).concat(P.filter((p) => !p.featured)).slice(0, 5);
    const SLOTS = [
      { x: '2%', y: '78px', w: '150px', d: '0s', mx: '0', my: '0', mw: '0' },
      { x: '19%', y: '8px', w: '168px', d: '-2s', mx: '4%', my: '28px', mw: '34%' },
      { x: '40.5%', y: '36px', w: '190px', d: '-4s', mx: '33%', my: '0px', mw: '36%' },
      { x: '63%', y: '0px', w: '164px', d: '-1s', mx: '62%', my: '34px', mw: '34%' },
      { x: '82%', y: '70px', w: '148px', d: '-3s', mx: '0', my: '0', mw: '0' },
    ];
    const m = matchMedia('(max-width: 720px)').matches;
    $('#constellation').querySelectorAll('.float').forEach((n) => n.remove());
    // fill the centre first so a store with one or two products still has a hero on phones
    const ORDER = [2, 1, 3, 0, 4];
    $('#constellation').insertAdjacentHTML('afterbegin', heroList.map((p, i) => {
      const s = SLOTS[ORDER[i]];
      return `<div class="float" data-slot="${ORDER[i] + 1}" style="--x:${m ? s.mx : s.x};--y:${m ? s.my : s.y};--w:${m ? s.mw : s.w};--d:${s.d}">${card(p, true)}</div>`;
    }).join(''));

    $('#pills').innerHTML = CATS.filter((c) => P.some((p) => p.cat === c.id)).map((c) =>
      `<button class="pill" type="button" data-cat="${esc(c.id)}" aria-pressed="false"><i style="--c:${S.hex(c.c, '#cccccc')}"></i>${esc(c.name)}</button>`).join('');

    const picks = (P.some((p) => p.featured) ? P.filter((p) => p.featured) : [...P].sort((a, b) => b.rating - a.rating)).slice(0, 12);
    $('#picksRow').innerHTML = picks.map((p) => card(p)).join('');
    $('#picks').hidden = picks.length === 0;

    const out = [];
    const storesHTML = renderStores();
    CATS.forEach((c, ci) => {
      const list = P.filter((p) => p.cat === c.id);
      if (!list.length) return;
      const id = `cat-${c.id}`;
      if (list.length >= 5 && !out.some((x) => x.includes('class="mosaic"'))) {
        const [f, ...rest] = [...list].sort((a, b) => (b.featured - a.featured) || (b.reviews - a.reviews));
        out.push(`<section class="band" id="${esc(id)}">${head(id, c.name)}<div class="mosaic">
          <a class="feature" href="${href(f)}" style="--bg:${S.hex(f.bg, '#332f2d')}" aria-label="${esc(f.name)}">
            <span class="feature-copy"><strong>${esc(f.store)}</strong><span>${f.reviews ? `★ ${num(f.rating)} · ${compact(f.reviews)} تقييم` : esc(f.name)}</span><em>${esc(f.name)} · ${money(f.price)}</em></span>
            ${art(f)}
          </a>${rest.slice(0, 4).map(tile).join('')}</div>
          ${rest.length > 4 ? `<div class="grid more">${rest.slice(4).map((p) => card(p)).join('')}</div>` : ''}</section>`);
      } else if (list.length >= 4 && ci % 2 === 0) {
        out.push(`<section class="band" id="${esc(id)}">${head(id, c.name)}<div class="tiles">${list.slice(0, 4).map(tile).join('')}</div>
          ${list.length > 4 ? `<div class="grid more">${list.slice(4).map((p) => card(p)).join('')}</div>` : ''}</section>`);
      } else {
        out.push(`<section class="band" id="${esc(id)}">${head(id, c.name)}<div class="grid">${list.map((p) => card(p)).join('')}</div></section>`);
      }
      if (out.length === 1 && storesHTML) out.push(storesHTML);
    });
    const orphans = P.filter((p) => !CATS.some((c) => c.id === p.cat));
    if (orphans.length) out.push(`<section class="band" id="cat-more">${head('cat-more', 'منتجات أخرى')}<div class="grid">${orphans.map((p) => card(p)).join('')}</div></section>`);
    if (out.length === 0 && storesHTML) out.push(storesHTML);
    $('#sections').innerHTML = out.join('') || '<p class="empty" style="text-align:center">ما في منتجات لسا.</p>';

    $('#footShop').innerHTML = '<h2>تسوّق</h2>' + CATS.filter((c) => P.some((p) => p.cat === c.id)).slice(0, 5)
      .map((c) => `<a href="#cat-${esc(c.id)}">${esc(c.name)}</a>`).join('');
    $('#footYear').textContent = `© ${new Date().getFullYear()} ${CFG.name || ''}`;
    observeBands();
    $$('.scroller').forEach(updateArrows);
  }

  function renderStores() {
    const groups = new Map();
    P.forEach((p) => { if (p.store) groups.set(p.store, [...(groups.get(p.store) || []), p]); });
    const top = [...groups.entries()].filter(([, l]) => l.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 4);
    if (top.length < 2) return '';
    const followed = new Set(ls.get('raff.follow', []));
    return `<section class="band" id="stores">${head('stores', 'متاجر تستحق المتابعة')}<div class="stores">${top.map(([name, list]) => {
      const h = list[0];
      const rated = list.filter((p) => p.rating);
      const avg = rated.length ? rated.reduce((s, p) => s + p.rating, 0) / rated.length : 0;
      const letter = name.replace(/^ال/, '').trim()[0] || name[0];
      return `<article class="spot">
        <a class="spot-hero" href="${href(h)}" style="--bg:${S.hex(h.bg, '#efe8dc')}" aria-label="${esc(h.name)}">${art(h)}</a>
        <div class="spot-info">
          <span class="spot-logo" aria-hidden="true">${esc(letter)}</span>
          <div><h3>${esc(name)}</h3><p>${avg ? `★ ${num(Math.round(avg * 10) / 10)} · ` : ''}${num(list.length)} منتجات</p></div>
          <button class="follow" type="button" data-follow="${esc(name)}" aria-pressed="${followed.has(name)}">${followed.has(name) ? 'متابَع' : 'تابِع'}</button>
        </div>
        <div class="thumbs">${list.slice(0, 3).map((p) => `<a href="${href(p)}" style="--bg:${S.hex(p.bg, '#efe8dc')}" aria-label="${esc(p.name)}">${art(p)}</a>`).join('')}</div>
      </article>`;
    }).join('')}</div></section>`;
  }

  /* ---------- Search & filter ---------- */
  const results = $('#results');
  let activeCat = null;
  const runSearch = (scroll) => {
    const q = norm($('#q').value);
    if (!q && !activeCat) { results.hidden = true; return; }
    if (window.raffRouter && location.hash.startsWith('#/') && location.hash !== '#/') location.hash = '#/';
    const words = q.split(/\s+/).filter(Boolean);
    const list = P.filter((p) => {
      if (activeCat && p.cat !== activeCat) return false;
      const cat = CATS.find((c) => c.id === p.cat);
      return words.every((w) => norm(`${p.name} ${p.store} ${cat ? cat.name : ''} ${p.desc || ''}`).includes(w));
    });
    const sort = $('#sortSel').value;
    const sorters = { 'price-asc': (x, y) => x.price - y.price, 'price-desc': (x, y) => y.price - x.price, rating: (x, y) => (y.rating || 0) - (x.rating || 0) || (y.reviews || 0) - (x.reviews || 0), new: (x, y) => y.id - x.id };
    if (sorters[sort]) list.sort(sorters[sort]);
    const catName = activeCat ? (CATS.find((c) => c.id === activeCat) || {}).name : '';
    const raw = $('#q').value.trim();
    $('#resultsTitle').textContent = raw && catName ? `«${raw}» في ${catName}` : raw ? `نتائج «${raw}»` : catName;
    $('#resultsGrid').innerHTML = list.map((p) => card(p)).join('');
    $('#resultsEmpty').textContent = 'ما لقينا شي بهالاسم. جرّب كلمة ثانية.';
    $('#resultsEmpty').hidden = list.length > 0;
    results.hidden = false;
    if (scroll) results.scrollIntoView({ block: 'start' });
  };
  $('#sortSel').addEventListener('change', () => runSearch(false));
  $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); runSearch(true); $('#q').blur(); });
  let t;
  $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => runSearch(false), 160); });
  const syncPills = () => $$('.pill').forEach((b) => b.setAttribute('aria-pressed', b.dataset.cat === activeCat));

  /* ---------- Cart ---------- */
  const bump = (el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
  const setBadge = (el, n) => { el.hidden = n === 0; el.textContent = num(n); };
  const cartLines = () => cart.filter((l) => byId.has(l.id)).map((l) => ({ ...l, p: byId.get(l.id), key: `${l.id}#${optKey(l.options)}` }));
  const qtyOf = (id) => cart.filter((l) => l.id === id).reduce((s, l) => s + l.qty, 0);
  const totals = () => {
    const sub = Math.round(cartLines().reduce((s, l) => s + l.p.price * l.qty, 0) * 100) / 100;
    const sh = CFG.shipping || {};
    const physSub = cartLines().filter((l) => !isDigital(l.p)).reduce((s, l) => s + l.p.price * l.qty, 0);
    const ship = physSub === 0 ? 0 : (sh.freeOver > 0 && sub >= sh.freeOver ? 0 : +sh.fee || 0);
    let discount = 0;
    if (appliedCoupon && appliedCoupon.ok) {
      discount = appliedCoupon.kind === 'percent' ? Math.round(sub * Math.min(appliedCoupon.value, 100)) / 100
        : appliedCoupon.kind === 'fixed' ? Math.min(appliedCoupon.value, sub) : ship;
      if (appliedCoupon.min && sub < appliedCoupon.min) discount = 0;
    }
    return { sub, ship, discount, total: Math.max(0, Math.round((sub - discount + ship) * 100) / 100) };
  };
  const optsText = (o) => Object.keys(o || {}).map((k) => `${k}: ${o[k]}`).join(' · ');

  const renderCart = () => {
    const lines = cartLines();
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const { sub, ship, total } = totals();
    setBadge($('#cartBadge'), count);
    $('#cartList').innerHTML = lines.map((l) => `<li class="cart-item">
        <a class="cart-thumb" href="${href(l.p)}" style="--bg:${S.hex(l.p.bg, '#efe8dc')}">${art(l.p)}</a>
        <div class="cart-info"><b>${esc(l.p.name)}</b><small>${esc(optsText(l.options) || l.p.store)}</small>
          ${isDigital(l.p) ? `<div class="qty digi"><span>${esc(l.p.format || 'رقمي')} · تحميل</span><button type="button" data-dec="${esc(l.key)}" aria-label="إزالة">×</button></div>` : `<div class="qty"><button type="button" data-dec="${esc(l.key)}" aria-label="إنقاص">−</button><span>${num(l.qty)}</span><button type="button" data-inc="${esc(l.key)}" aria-label="زيادة">+</button></div>`}
        </div>
        <span class="cart-price">${money(l.p.price * l.qty)}</span>
      </li>`).join('');
    $('#cartEmpty').hidden = count > 0;
    $('#cartFoot').hidden = count === 0;
    $('#cartSub').textContent = money(sub);
    const dOnly = allDigital();
    $('#cartShip').previousElementSibling.textContent = dOnly ? 'التسليم' : 'التوصيل';
    $('#cartShip').textContent = dOnly ? 'رقمي · فوري' : ship ? money(ship) : 'مجاني';
    $('#cartTotal').textContent = money(sub + ship);
    const fo = (CFG.shipping || {}).freeOver;
    $('#freeHint').hidden = dOnly || !(fo > 0 && sub > 0 && sub < fo);
    $('#freeHint').textContent = `أضف ${money(Math.round((fo - sub) * 100) / 100)} وبيصير التوصيل مجاني`;
    if (!$('[data-view="checkout"]').hidden) renderSummary();
    void total;
  };
  const addToCart = (id, qty = 1, options = {}) => {
    const p = byId.get(id);
    if (!p || !inStock(p)) return false;
    if (hasOpts(p) && p.options.some((o) => o.values && o.values.length && !options[o.name])) { location.hash = href(p); return false; }
    if (isDigital(p) && qtyOf(id) > 0) { toast('المنتج الرقمي موجود بالسلة، نسخة وحدة بتكفي'); return false; }
    if (isDigital(p)) qty = 1;
    else if (p.stock > 0 && qtyOf(id) + qty > p.stock) { toast(`المتوفر ${num(p.stock)} بس`); return false; }
    const k = optKey(options);
    const line = cart.find((l) => l.id === id && optKey(l.options) === k);
    if (line) line.qty += qty; else cart.push({ id, qty, options });
    persistCart(); renderCart(); bump($('#cartBadge'));
    toast(`انضاف «${p.name}» إلى السلة`);
    if (window.RaffSound) window.RaffSound.play('pop');
    return true;
  };
  const changeQty = (key, d) => {
    const l = cart.find((x) => `${x.id}#${optKey(x.options)}` === key); if (!l) return;
    const p = byId.get(l.id);
    if (d > 0 && p && isDigital(p)) { toast('نسخة وحدة بتكفي من المنتج الرقمي'); return; }
    if (d > 0 && p && p.stock > 0 && qtyOf(l.id) >= p.stock) { toast('هاي كل الكمية المتوفرة'); return; }
    l.qty += d; if (l.qty <= 0) cart = cart.filter((x) => x !== l);
    persistCart(); renderCart();
  };

  /* ---------- Drawer & checkout ---------- */
  const cartEl = $('#cart'), scrim = $('#scrim');
  let lastFocus = null;
  const view = (name) => {
    $$('[data-view]', cartEl).forEach((v) => { v.hidden = v.dataset.view !== name; });
    $('#drawerTitle').textContent = { cart: 'السلة', checkout: 'إتمام الطلب', done: 'تم استلام طلبك' }[name];
    $('#drawerBack').hidden = name !== 'checkout';
  };
  const openCart = () => {
    lastFocus = document.activeElement;
    view('cart');
    scrim.hidden = false; cartEl.classList.add('open'); cartEl.inert = false;
    cartEl.querySelector('[data-action="close-cart"]').focus();
  };
  const closeCart = () => {
    scrim.hidden = true; cartEl.classList.remove('open'); cartEl.inert = true;
    lastFocus?.focus?.();
  };

  const enabledMethods = () => Object.keys(S.METHODS).filter((k) => {
    const m = (CFG.payments || {})[k];
    if (!m || !m.on) return false;
    if (k === 'paypal') return !!m.user;
    if (k === 'bank') return !!m.iban;
    return true;
  });

  function renderSummary() {
    const { sub, ship, discount, total } = totals();
    $('#coSummary').innerHTML = `<div><span>المنتجات</span><b>${money(sub)}</b></div>
      ${discount ? `<div class="disc"><span>خصم ${esc(appliedCoupon.code)}</span><b>−${money(discount)}</b></div>` : ''}
      <div><span>${allDigital() ? 'التسليم' : 'التوصيل'}</span><b>${allDigital() ? 'رقمي · فوري' : ship ? money(ship) : 'مجاني'}</b></div><div class="grand"><span>المجموع</span><b>${money(total)}</b></div>`;
  }

  const allDigital = () => { const ls_ = cartLines(); return ls_.length > 0 && ls_.every((l) => isDigital(l.p)); };
  async function startCheckout() {
    const digital = allDigital();
    const methods = enabledMethods().filter((k) => !(digital && k === 'cod'));
    const list = methods.length ? methods : [digital ? 'manual' : 'cod'];
    const desc = {
      cod: 'بتدفع نقداً لما يوصلك الطلب.',
      paypal: 'ادفع بحساب PayPal أو بالبطاقة كضيف، على صفحة PayPal الآمنة.',
      bank: digital ? 'منبعتلك بيانات الحساب، وبعد وصول التحويل منبعتلك رابط التحميل.' : 'منبعتلك بيانات الحساب بعد الطلب، وبنشحن بعد وصول التحويل.',
      manual: 'منتواصل معك على واتساب لنتفق على طريقة الدفع، وبعدها منبعتلك رابط التحميل.',
    };
    const f0 = $('#checkoutForm');
    f0.dataset.digital = digital ? '1' : '';
    ['city', 'address'].forEach((k) => { const el = f0.querySelector(`[data-f="${k}"]`); el.hidden = digital; f0[k].required = !digital; });
    f0.querySelector('legend').textContent = digital ? 'معلومات التسليم' : 'معلومات التوصيل';
    f0.querySelector('[data-f="email"] span').textContent = digital ? 'الإيميل (لنبعتلك رابط التحميل)' : 'الإيميل (اختياري، لنبعتلك تحديثات الطلب)';
    $('#payMethods').innerHTML = list.map((k, i) => `
      <label class="pay-opt"><input type="radio" name="method" value="${k}" ${i === 0 ? 'checked' : ''}>
        <span class="pay-ico pay-${k}" aria-hidden="true"></span>
        <span><b>${S.METHODS[k] || 'تواصل للدفع'}</b><small>${desc[k]}</small></span></label>`).join('');
    const f = $('#checkoutForm');
    const u = D.auth.user, pr = D.auth.profile;
    $('#coAuth').innerHTML = D.mode === 'cloud' ? (u
      ? `<p class="co-user">طالب باسم <b>${esc(pr && pr.full_name ? pr.full_name : u.email)}</b>. الطلب رح ينحفظ بحسابك.</p>`
      : `<p class="co-user">عندك حساب؟ <a href="#/login?next=checkout" data-action="close-cart">سجّل دخول</a> لتتابع طلبك بسهولة. أو كمّل كضيف.</p>`) : '';
    const saved = ls.get('raff.customer', {});
    const fill = (k, v) => { if (v && !f[k].value) f[k].value = v; };
    fill('name', (pr && pr.full_name) || saved.name); fill('phone', (pr && pr.phone) || saved.phone);
    fill('email', (u && u.email) || saved.email); fill('city', saved.city); fill('address', saved.address);
    // saved addresses
    const pick = $('#addrPick');
    pick.hidden = true;
    try {
      const addrs = await D.addresses.list();
      if (addrs.length) {
        pick.innerHTML = '<span>عناويني:</span>' + addrs.map((a, i) => `<button type="button" class="chip-btn" data-addr="${i}">${esc(a.label || a.city)}</button>`).join('');
        pick.hidden = false;
        pick.onclick = (e) => {
          const b = e.target.closest('[data-addr]'); if (!b) return;
          const a = addrs[+b.dataset.addr];
          ['name', 'phone', 'city', 'address'].forEach((k) => { if (a[k]) f[k].value = a[k]; });
          $$('.chip-btn', pick).forEach((x) => x.classList.toggle('on', x === b));
        };
        const def = addrs.find((a) => a.is_default);
        if (def && !saved.address) ['name', 'phone', 'city', 'address'].forEach((k) => { if (def[k]) f[k].value = def[k]; });
      }
    } catch { /* ignore */ }
    $('#coErr').hidden = true;
    renderSummary();
    view('checkout');
    (f.name.value ? (digital ? f.email : f.address) : f.name).focus();
  }

  async function applyCoupon() {
    const f = $('#checkoutForm'), msg = $('#couponMsg');
    const code = f.coupon.value.trim();
    if (!code) { appliedCoupon = null; msg.hidden = true; renderSummary(); return; }
    const btn = $('[data-action="apply-coupon"]'); btn.disabled = true;
    try {
      const { sub, ship } = totals();
      const r = await D.checkCoupon(code, sub, ship);
      appliedCoupon = r.ok ? { ...r, code: code.toUpperCase() } : null;
      msg.textContent = r.ok ? `تم! وفّرت ${money(r.discount)}` : r.message;
      msg.className = `coupon-msg ${r.ok ? 'ok' : 'bad'}`; msg.hidden = false;
    } catch (e) { msg.textContent = D.friendly(e); msg.className = 'coupon-msg bad'; msg.hidden = false; }
    btn.disabled = false; renderSummary();
  }

  $('#checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const val = (k) => f[k].value.trim();
    const phone = S.toLatinDigits(val('phone')).replace(/[^\d+]/g, '');
    let bad = null;
    if (val('name').length < 2) bad = 'name';
    else if (phone.replace(/\D/g, '').length < 7) bad = 'phone';
    else if (!f.dataset.digital && !val('city')) bad = 'city';
    else if (!f.dataset.digital && val('address').length < 4) bad = 'address';
    else if (val('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) bad = 'email';
    $$('.field', f).forEach((el) => el.classList.toggle('invalid', el.dataset.f === bad));
    if (bad) { f[bad].focus(); return; }
    const lines = cartLines();
    if (!lines.length) { view('cart'); return; }
    if (val('coupon') && (!appliedCoupon || appliedCoupon.code !== val('coupon').toUpperCase())) await applyCoupon();
    const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.classList.add('busy');
    $('#coErr').hidden = true;
    try {
      const dg = !!f.dataset.digital;
      const customer = { name: val('name'), phone, email: val('email'), city: dg ? '' : val('city'), address: dg ? '' : val('address'), notes: val('notes') };
      const order = await D.placeOrder({ lines, customer, method: f.method.value, coupon: appliedCoupon ? appliedCoupon.code : '', totals: totals() });
      ls.set('raff.customer', { ...ls.get('raff.customer', {}), name: customer.name, phone, email: customer.email, ...(dg ? {} : { city: customer.city, address: customer.address }) });
      cart = []; appliedCoupon = null; f.coupon.value = ''; $('#couponMsg').hidden = true;
      persistCart(); renderCart();
      if (D.mode === 'cloud') refreshCatalog();
      showDone(order);
    } catch (err) {
      $('#coErr').textContent = D.friendly(err); $('#coErr').hidden = false;
    } finally { btn.disabled = false; btn.classList.remove('busy'); }
  });

  const waText = (o) => [
    `طلب جديد من ${CFG.name}`,
    `رقم الطلب: ${o.id}`,
    ...o.items.map((x) => `• ${x.name}${optsText(x.options) ? ` (${optsText(x.options)})` : ''} × ${x.qty} = ${money(x.price * x.qty)}`),
    o.discount ? `الخصم (${o.coupon}): −${money(o.discount)}` : '',
    o.items.every((x) => x.digital) ? 'التسليم: رقمي (رابط تحميل)' : `التوصيل: ${o.shipping ? money(o.shipping) : 'مجاني'}`,
    `المجموع: ${money(o.total)}`,
    `الدفع: ${S.METHODS[o.method] || 'تواصل للدفع'}`,
    `الاسم: ${o.customer.name}`, `الهاتف: ${o.customer.phone}`,
    o.customer.email ? `الإيميل: ${o.customer.email}` : '',
    o.customer.address ? `العنوان: ${o.customer.city}، ${o.customer.address}` : '',
    o.customer.notes ? `ملاحظات: ${o.customer.notes}` : '',
    D.mode === 'local' ? `\nرمز الطلب (لا تعدّله): ${S.encodeOrder(o)}` : '',
  ].filter((l) => l !== '').join('\n');

  function showDone(o) {
    const pay = CFG.payments || {};
    const wa = String(CFG.whatsapp || '').replace(/\D/g, '');
    const steps = [];
    if (o.method === 'paypal' && pay.paypal && pay.paypal.user) {
      const user = encodeURIComponent(String(pay.paypal.user).replace(/^@/, ''));
      const code = /^[A-Z]{3}$/.test(CFG.currencyCode || '') ? CFG.currencyCode : 'USD';
      steps.push(`<a class="btn-violet wide" href="https://www.paypal.com/paypalme/${user}/${o.total}${code}" target="_blank" rel="noopener noreferrer">ادفع ${money(o.total)} عبر PayPal</a>
        <p class="note">اكتب رقم الطلب <b>${esc(o.id)}</b> بخانة الملاحظة على PayPal.</p>`);
    }
    if (o.method === 'bank' && pay.bank) {
      steps.push(`<div class="bank">
        <div><span>البنك</span><b>${esc(pay.bank.bank)}</b></div>
        <div><span>اسم الحساب</span><b>${esc(pay.bank.holder)}</b></div>
        <div><span>IBAN</span><b class="mono">${esc(pay.bank.iban)}</b><button type="button" class="copy" data-copy="${esc(pay.bank.iban)}">نسخ</button></div>
        <div><span>المبلغ</span><b>${money(o.total)}</b></div>
        <p class="note">اكتب رقم الطلب <b>${esc(o.id)}</b> بوصف التحويل.</p></div>`);
    }
    if (o.items.every((x) => x.digital)) steps.push(`<p class="note">منتج رقمي: بعد ما يتأكد الدفع منبعتلك رابط التحميل على ${o.customer.email ? `<b>${esc(o.customer.email)}</b>` : 'واتساب'}.</p>`);
    if (o.method === 'cod') steps.push('<p class="note">بتدفع نقداً عند الاستلام. منتواصل معك لنأكد العنوان والموعد.</p>');
    if (D.mode === 'cloud') {
      steps.push(`<a class="btn-dark wide" href="${D.auth.user ? `#/orders/${encodeURIComponent(o.id)}` : `#/track?id=${encodeURIComponent(o.id)}`}" data-action="close-cart">تابع حالة طلبك</a>`);
      if (wa) steps.push(`<a class="btn-ghost wide" href="https://wa.me/${wa}?text=${encodeURIComponent(waText(o))}" target="_blank" rel="noopener noreferrer">راسلنا على واتساب</a>`);
    } else if (wa) {
      steps.unshift(`<a class="btn-violet wide" href="https://wa.me/${wa}?text=${encodeURIComponent(waText(o))}" target="_blank" rel="noopener noreferrer">أرسل الطلب على واتساب لنأكده</a>`);
    } else {
      steps.push(`<div class="code-box"><p class="note">ابعت هالرمز للمتجر ليأكد طلبك:</p><textarea readonly rows="3">${esc(S.encodeOrder(o))}</textarea><button type="button" class="copy" data-copy="${esc(waText(o))}">نسخ الطلب كاملاً</button></div>`);
    }
    $('#doneBody').innerHTML = `
      <div class="done-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <p class="done-id">رقم الطلب <b>${esc(o.id)}</b></p>
      <p class="done-total">${money(o.total)} · ${esc(S.METHODS[o.method] || 'تواصل للدفع')}</p>
      ${D.mode === 'cloud' ? '<p class="note center">وصلنا طلبك. احتفظ برقم الطلب لتتابعه.</p>' : ''}
      <div class="done-steps">${steps.join('')}</div>`;
    view('done');
  }

  /* ---------- Wishlist ---------- */
  const renderSaved = () => setBadge($('#savedBadge'), D.wishlist.all().filter((id) => byId.has(id)).length);
  async function toggleSave(id) {
    try {
      const on = await D.wishlist.toggle(id);
      $$(`[data-save="${id}"]`).forEach((b) => b.setAttribute('aria-pressed', on));
      renderSaved();
      if (on) { bump($('#savedBadge')); toast(D.mode === 'cloud' && !D.auth.user ? 'انحفظ. سجّل دخول لتلاقيه على أي جهاز.' : 'انضاف للمفضلة'); }
    } catch (e) { toast(D.friendly(e)); }
  }

  /* ---------- Quick view (kept for the 3D hero) ---------- */
  const qv = $('#qv');
  let qvId = null;
  const openQV = (id) => {
    const p = byId.get(id); if (!p) return; qvId = id;
    $('#qvImg').style.setProperty('--bg', S.hex(p.bg, '#efe8dc'));
    $('#qvImg').innerHTML = art(p);
    $('#qvStore').textContent = p.store;
    $('#qvName').textContent = p.name;
    $('#qvRate').textContent = p.reviews ? `★ ${num(p.rating)} · ${compact(p.reviews)} تقييم` : '';
    $('#qvDesc').textContent = p.desc || '';
    $('#qvPrice').innerHTML = priceHTML(p);
    $('#qvStock').textContent = isDigital(p) ? `منتج رقمي${p.format ? ` · ${p.format}` : ''} · تحميل بعد الدفع` : !inStock(p) ? 'نفدت الكمية' : p.stock > 0 && p.stock <= 5 ? `باقي ${num(p.stock)} بس` : '';
    $('#qvOpts').innerHTML = optionPicker(p, 'qv');
    $('#qvMore').href = href(p);
    $('#qvAdd').disabled = !inStock(p);
    $('#qvAdd').textContent = S.safeUrl(p.buyUrl) ? 'اشترِ الآن' : inStock(p) ? 'أضف إلى السلة' : 'نفد من المخزون';
    if (typeof qv.showModal === 'function') qv.showModal(); else qv.setAttribute('open', '');
  };
  const closeQV = () => (qv.close ? qv.close() : qv.removeAttribute('open'));
  qv.addEventListener('click', (e) => { if (e.target === qv) closeQV(); });
  $('#qvMore').addEventListener('click', closeQV);
  $('#qvAdd').addEventListener('click', () => {
    const qp = byId.get(qvId);
    if (qp && S.safeUrl(qp.buyUrl)) { closeQV(); location.hash = href(qp); return; }
    const o = readOptions(qv, qp);
    if (o === null) return;
    if (addToCart(qvId, 1, o)) closeQV();
  });

  function optionPicker(p, scope) {
    if (!hasOpts(p)) return '';
    return p.options.filter((o) => o.values && o.values.length).map((o, i) => `
      <fieldset class="opt" data-opt="${esc(o.name)}"><legend>${esc(o.name)} <em class="opt-err" hidden>اختار ${esc(o.name)}</em></legend>
        <div class="opt-values">${o.values.map((v, j) => `<label class="opt-v"><input type="radio" name="${scope}-o${i}" value="${esc(v)}" ${o.values.length === 1 && j === 0 ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>
      </fieldset>`).join('');
  }
  function readOptions(root, p) {
    const out = {};
    let ok = true;
    $$('.opt', root).forEach((fs) => {
      const c = fs.querySelector('input:checked');
      fs.querySelector('.opt-err').hidden = !!c;
      if (c) out[fs.dataset.opt] = c.value; else ok = false;
    });
    return ok || !hasOpts(p) ? out : null;
  }

  /* ---------- Toast ---------- */
  let tt;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ---------- Scroller arrows (RTL aware) ---------- */
  function updateArrows(sc) {
    const max = sc.scrollWidth - sc.clientWidth;
    const pos = Math.abs(sc.scrollLeft);
    $$(`[data-scroll="${sc.id}"]`).forEach((b) => { b.disabled = b.dataset.dir === '1' ? pos >= max - 2 : pos <= 2; });
  }
  $$('.scroller').forEach((sc) => sc.addEventListener('scroll', () => updateArrows(sc), { passive: true }));
  addEventListener('resize', () => $$('.scroller').forEach(updateArrows));

  /* ---------- Events ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, [data-action]');
    if (!el) return;
    const d = el.dataset;
    if (d.add) { const p = byId.get(+d.add); if (p && (hasOpts(p) || S.safeUrl(p.buyUrl))) location.hash = href(p); else addToCart(+d.add); return; }
    if (d.open) { openQV(+d.open); return; }
    if (d.save) { toggleSave(+d.save); return; }
    if (d.inc) { changeQty(d.inc, 1); return; }
    if (d.dec) { changeQty(d.dec, -1); return; }
    if (d.copy) { navigator.clipboard?.writeText(d.copy).then(() => toast('انسخ'), () => toast('ما قدرنا ننسخ، حدده وانسخه يدوي')); return; }
    if (d.cat) { activeCat = activeCat === d.cat ? null : d.cat; syncPills(); runSearch(true); return; }
    if (d.follow) {
      const f = new Set(ls.get('raff.follow', []));
      f.has(d.follow) ? f.delete(d.follow) : f.add(d.follow);
      ls.set('raff.follow', [...f]);
      $$(`[data-follow="${CSS.escape(d.follow)}"]`).forEach((b) => { b.setAttribute('aria-pressed', f.has(d.follow)); b.textContent = f.has(d.follow) ? 'متابَع' : 'تابِع'; });
      if (f.has(d.follow)) toast(`صرت تتابع «${d.follow}»`);
      return;
    }
    if (d.scroll) {
      const sc = document.getElementById(d.scroll);
      const rtl = getComputedStyle(sc).direction === 'rtl';
      sc.scrollBy({ left: (rtl ? -1 : 1) * +d.dir * sc.clientWidth * 0.8, behavior: 'smooth' });
      return;
    }
    switch (d.action) {
      case 'focus-search':
        if (location.hash.startsWith('#/') && location.hash !== '#/') location.hash = '#/';
        setTimeout(() => { $('#q').focus({ preventScroll: true }); $('#searchForm').scrollIntoView({ block: 'center' }); }, 30);
        break;
      case 'open-cart': openCart(); break;
      case 'close-cart': closeCart(); break;
      case 'close-qv': closeQV(); break;
      case 'checkout': startCheckout(); break;
      case 'apply-coupon': applyCoupon(); break;
      case 'back-to-cart': view('cart'); break;
      case 'clear': $('#q').value = ''; $('#sortSel').value = ''; activeCat = null; syncPills(); results.hidden = true; break;
    }
  });
  scrim.addEventListener('click', closeCart);
  addEventListener('hashchange', () => { if (cartEl.classList.contains('open')) { lastFocus = null; closeCart(); } if (qv.open) closeQV(); });
  $('#checkoutForm').coupon.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartEl.classList.contains('open')) closeCart();
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !qv.open) { e.preventDefault(); $('#q').focus(); }
  });

  /* ---------- 3D: card tilt ---------- */
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (matchMedia('(pointer: fine)').matches && !reduceMotion) {
    let tilted = null;
    const reset = (el) => { el.style.transform = ''; el.classList.remove('tilting'); };
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest('.pcard:not(.mini), .spot, .tile, .feature');
      if (tilted && tilted !== el) reset(tilted);
      tilted = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      const k = el.classList.contains('feature') ? 5 : 9;
      el.classList.add('tilting');
      el.style.transform = `perspective(900px) rotateX(${(-py * k).toFixed(2)}deg) rotateY(${(px * k).toFixed(2)}deg) translateZ(0) translateY(-4px)`;
      el.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
    }, { passive: true });
    document.addEventListener('pointerleave', () => tilted && reset(tilted));
  }

  let io = null;
  function observeBands() {
    if (!('IntersectionObserver' in window) || reduceMotion) return;
    io = io || new IntersectionObserver((ens) => ens.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    $$('.band:not(#results):not(.in)').forEach((b) => { b.classList.add('rise'); io.observe(b); });
  }

  /* ---------- Boot ---------- */
  function applyCatalog(data) {
    CFG = data.settings || {};
    money = (n) => S.money(n, CFG.currency || '$');
    CATS = Array.isArray(data.categories) ? data.categories : [];
    P = (data.products || []).filter((p) => p && !p.hidden && Number.isFinite(+p.id)).map((p) => ({ ...p, id: +p.id, price: +p.price || 0 }));
    byId = new Map(P.map((p) => [p.id, p]));
    Object.assign(api, { CFG, CATS, P, byId, money });
  }
  async function refreshCatalog() {
    try { applyCatalog(await D.catalog(true)); renderHome(); renderCart(); } catch { /* keep old */ }
  }

  const api = window.raff = {
    CFG, CATS, P, byId, money, card, tile, art, href, priceHTML, inStock, hasOpts, isDigital, qtyOf, optionPicker, readOptions, optsText,
    addToCart, openCart, closeCart, toast, renderSaved, refreshCatalog, open: openQV,
    onReady: [],
  };

  const load = (src) => new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.body.append(s);
  });

  Promise.all([D.catalog(), D.ready]).then(async ([data]) => {
    applyCatalog(data);
    if (data.isPreview) document.body.insertAdjacentHTML('afterbegin', '<div class="preview-bar">وضع المعاينة: هيدا شكل المتجر بعد ما تنشر التغييرات. <a href="./">عرض النسخة المنشورة</a></div>');
    try { await D.wishlist.load(); } catch { /* ignore */ }
    renderHome();
    renderCart();
    renderSaved();
    document.body.classList.add('ready');
    api.onReady.forEach((f) => f());
    api.isReady = true;
    D.auth.onChange(() => { D.wishlist.load().then(renderSaved).catch(() => {}); });

    // 3D is a bonus: load it on the visitor's first interaction or when the browser is idle, never on slow/data-saver connections
    const conn = navigator.connection || {};
    const skip3d = matchMedia('(prefers-reduced-motion: reduce)').matches || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
    let booted = false;
    const boot = () => {
      if (booted || skip3d || document.documentElement.classList.contains('landing') || document.documentElement.classList.contains('route-page') && location.hash.length > 2) return;
      booted = true;
      ['pointerdown', 'pointermove', 'scroll', 'keydown', 'touchstart'].forEach((ev) => removeEventListener(ev, boot));
      load('vendor/three.min.js').then(() => load('store3d.js?v=7')).catch(() => { /* keep flat hero */ });
    };
    ['pointerdown', 'pointermove', 'scroll', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, boot, { once: true, passive: true }));
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1));
    addEventListener('load', () => setTimeout(() => idle(boot, { timeout: 3000 }), 3500), { once: true });
    if (window.raffRouter) addEventListener('hashchange', () => { if (!location.hash.startsWith('#/') || location.hash === '#/') boot(); });
  }).catch((e) => {
    document.documentElement.classList.remove('landing'); // show the error on the normal home, never a blank page
    $('#sections').innerHTML = `<p class="empty" style="text-align:center">ما قدرنا نحمّل المنتجات. حدّث الصفحة بعد شوي.<br><small>${esc(D.friendly(e))}</small></p>`;
  });
})();
