/* رَفّ · pages behind the hash router: product, auth, account, orders, addresses, wishlist, tracking. */
(() => {
  'use strict';
  const S = window.RaffShared, D = window.RaffData, R = () => window.raff;
  const { esc, num, compact } = S;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const page = $('#page');
  const cloud = D.mode === 'cloud';

  const STATUS = { new: 'استلمنا طلبك', confirmed: 'تأكد الطلب', shipped: 'بالطريق إليك', delivered: 'وصلك', cancelled: 'ملغى' };
  const STEPS = ['new', 'confirmed', 'shipped', 'delivered'];
  const ic = {
    user: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0"/>',
    box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.3 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    chat: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/>',
  };
  const svg = (n, c = 'pi') => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${ic[n]}</svg>`;
  const fmtDate = (t, time = false) => new Intl.DateTimeFormat('ar-EG', time ? { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(t));
  const stars = (r, size = '') => `<span class="stars-row ${size}" aria-label="${num(r)} من ٥">${[1, 2, 3, 4, 5].map((i) => `<i class="${r >= i - 0.25 ? 'on' : r >= i - 0.75 ? 'half' : ''}">★</i>`).join('')}</span>`;
  const loading = () => { page.innerHTML = '<div class="pg-loading"><span></span><span></span><span></span></div>'; };

  /* ---------- Router ---------- */
  const parse = () => {
    const h = location.hash || '';
    if (!h.startsWith('#/')) return { name: 'home', anchor: h.slice(1) };
    const [path, qs] = h.slice(2).split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'home', arg: parts[1], q: new URLSearchParams(qs || '') };
  };
  const ROUTES = {};
  const defaultDesc = (document.querySelector('meta[name="description"]') || {}).content || '';
  function setMeta(desc, ld) {
    const m = document.querySelector('meta[name="description"]'); if (m) m.content = String(desc).slice(0, 160);
    let tag = document.getElementById('ldjson');
    if (!ld) { if (tag) tag.remove(); return; }
    if (!tag) { tag = document.createElement('script'); tag.type = 'application/ld+json'; tag.id = 'ldjson'; document.head.append(tag); }
    tag.textContent = JSON.stringify(ld).replace(/</g, '\\u003c');
  }
  let lastName = null;
  // Navigations run one at a time and the latest hash always wins, so a slow page can never paint over a newer one.
  let routing = null, again = false;
  function route() {
    if (routing) { again = true; return routing; }
    routing = (async () => { do { again = false; await doRoute(); } while (again); })().finally(() => { routing = null; });
    return routing;
  }
  async function doRoute() {
    if (/access_token=|error_description=/.test(location.hash)) return; // Supabase is finishing a login from an email link
    const r = parse();
    const onPage = r.name !== 'home';
    document.body.classList.toggle('on-page', onPage);
    document.documentElement.classList.toggle('route-page', onPage);
    page.hidden = !onPage;
    $$('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === (onPage ? navFor(r.name) : 'home')));
    if (!onPage) {
      setMeta(defaultDesc, null);
      document.title = `${(R().CFG || {}).name || 'رَفّ'} · ${(R().CFG || {}).tagline || ''}`;
      if (lastName && lastName !== 'home' && !r.anchor) scrollTo(0, 0);
      if (r.anchor) { const el = document.getElementById(r.anchor); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 20); }
      lastName = 'home';
      return;
    }
    if (r.name !== 'p') setMeta(defaultDesc, null);
    const fn = ROUTES[r.name] || (window.raffExtraRoutes || {})[r.name]; // other files (mizan-app.js) register here
    if (!fn) { location.hash = '#/'; return; }
    if (lastName !== r.name || r.name === 'p') scrollTo(0, 0);
    lastName = r.name;
    try { await fn(r); } catch (e) { page.innerHTML = `<div class="pg narrow"><div class="pg-card center"><h1 class="pg-title">صار خطأ</h1><p class="muted">${esc(D.friendly(e))}</p><a class="btn-dark" href="#/">الرئيسية</a></div></div>`; }
    page.focus({ preventScroll: true });
  }
  const navFor = (n) => ({ wishlist: 'wishlist', account: 'account', orders: 'account', addresses: 'account', messages: 'account', login: 'account', signup: 'account' }[n] || '');
  window.raffRouter = { route, routes: ROUTES };
  addEventListener('hashchange', route);

  /* ---------- Header account state ---------- */
  async function isAdmin() {
    if (!cloud || !D.auth.user) return false;
    try { return !!(await D.client.rpc('is_admin')).data; } catch { return false; }
  }
  function renderAccountChip() {
    const u = D.auth.user, p = D.auth.profile;
    const name = (p && p.full_name) || (u && u.email) || '';
    const first = name.trim().split(/\s+/)[0] || '';
    $('#acctPill').href = u ? '#/account' : '#/login';
    $('#acctPillText').textContent = u ? `أهلاً، ${first}` : 'تسجيل الدخول';
    $('#acctPill').classList.toggle('in', !!u);
    const av = $('#railAvatar');
    av.hidden = !u; av.textContent = (name.trim()[0] || '').toUpperCase();
    $('.rail-account').classList.toggle('has-user', !!u);
  }
  D.auth.onChange(() => {
    renderAccountChip();
    const r = parse();
    if (['account', 'orders', 'addresses', 'messages', 'login', 'signup'].includes(r.name)) route();
  });

  /* ================= Product ================= */
  ROUTES.p = async ({ arg }) => {
    const p = R().byId.get(+arg);
    if (!p) { page.innerHTML = '<div class="pg narrow"><div class="pg-card center"><h1 class="pg-title">المنتج مش موجود</h1><p class="muted">ممكن يكون انشال أو الرابط غلط.</p><a class="btn-dark" href="#/">رجوع للمتجر</a></div></div>'; return; }
    const { money, CATS, P } = R();
    const cat = CATS.find((c) => c.id === p.cat);
    const imgs = (p.images && p.images.length ? p.images : (p.img ? [p.img] : [])).filter((x) => S.safeImg(x) || /^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(x));
    const pics = imgs.length ? imgs : [null];
    const save = p.compare > p.price ? Math.round((1 - p.price / p.compare) * 100) : 0;
    const related = P.filter((x) => x.id !== p.id && x.cat === p.cat).concat(P.filter((x) => x.id !== p.id && x.cat !== p.cat && x.store === p.store)).slice(0, 8);
    const sh = (R().CFG.shipping || {});
    const pay = R().CFG.payments || {};
    const dg = S.isDigital(p), buyUrl = dg ? S.safeUrl(p.buyUrl) : '', prevUrl = dg ? S.safeUrl(p.previewUrl) : '';
    const payNames = [!dg && pay.cod && pay.cod.on ? 'عند الاستلام' : '', pay.paypal && pay.paypal.on ? 'PayPal أو بطاقة' : '', pay.bank && pay.bank.on ? 'تحويل بنكي' : ''].filter(Boolean).join(' · ');
    const specs = dg ? [['النوع', S.KIND_NAMES[p.kind] || 'منتج رقمي'], ['الصيغة', p.format], ['الحجم', p.fileSize], ['التسليم', buyUrl ? 'تحميل فوري بعد الدفع' : 'رابط تحميل بعد تأكيد الدفع']].filter((x) => x[1]) : [];
    document.title = `${p.name} · ${R().CFG.name || ''}`;
    setMeta(p.desc || `${p.name} من ${p.store}`, {
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.desc || '', brand: p.store ? { '@type': 'Brand', name: p.store } : undefined,
      image: (p.images && p.images[0]) || undefined, sku: String(p.id),
      offers: { '@type': 'Offer', price: String(p.price), priceCurrency: /^[A-Z]{3}$/.test(R().CFG.currencyCode || '') ? R().CFG.currencyCode : 'USD', availability: `https://schema.org/${R().inStock(p) ? 'InStock' : 'OutOfStock'}`, url: location.href },
      aggregateRating: p.reviews ? { '@type': 'AggregateRating', ratingValue: String(p.rating), reviewCount: String(p.reviews) } : undefined,
    });
    const pic = (src) => (src ? `<img src="${esc(src)}" alt="${esc(p.name)}" decoding="async">` : S.art({ ...p, img: '' }));

    page.innerHTML = `
      <div class="pg">
        <nav class="crumbs" aria-label="مسار التصفح"><a href="#/">الرئيسية</a>${cat ? `<span>›</span><a href="#cat-${esc(cat.id)}">${esc(cat.name)}</a>` : ''}<span>›</span><b>${esc(p.name)}</b></nav>
        <div class="pd">
          <div class="pd-gallery">
            <div class="pd-main" id="pdMain" style="--bg:${S.hex(p.bg, '#efe8dc')}">${pic(pics[0])}${!R().inStock(p) ? '<span class="tag">نفد</span>' : save ? `<span class="tag sale">−${num(save)}٪</span>` : ''}</div>
            ${pics.length > 1 ? `<div class="pd-thumbs">${pics.map((s, i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-pic="${i}" style="--bg:${S.hex(p.bg, '#efe8dc')}" aria-label="صورة ${num(i + 1)}">${pic(s)}</button>`).join('')}</div>` : ''}
          </div>
          <div class="pd-info">
            <p class="pd-brand">${esc(p.store)}</p>
            <h1 class="pd-name">${esc(p.name)}</h1>
            ${p.reviews ? `<a class="pd-rating" href="#reviews" data-scroll-to="reviews">${stars(p.rating)}<span>${num(p.rating)} · ${compact(p.reviews)} تقييم</span></a>` : ''}
            <div class="pd-price"><b>${money(p.price)}</b>${save ? `<s>${money(p.compare)}</s><em>وفّر ${money(Math.round((p.compare - p.price) * 100) / 100)}</em>` : ''}</div>
            ${dg ? `<p class="pd-stock ok digi"><i></i>منتج رقمي${p.format ? ` · ${esc(p.format)}` : ''} · ${buyUrl ? 'تحميل فوري' : 'تحميل بعد الدفع'}</p>`
    : `<p class="pd-stock ${!R().inStock(p) ? 'out' : p.stock <= 5 ? 'low' : 'ok'}"><i></i>${!R().inStock(p) ? 'نفدت الكمية' : p.stock <= 5 ? `باقي ${num(p.stock)} قطع بس` : 'متوفر'}</p>`}
            <form class="pd-buy" id="pdBuy">
              ${R().optionPicker(p, 'pd')}
              <div class="pd-actions">
                ${buyUrl ? `<a class="btn-violet grow" id="pdExt" href="${esc(buyUrl)}" target="_blank" rel="noopener noreferrer">${svg('download')}اشترِ الآن · تحميل فوري</a>` : ''}
                <div class="stepper" role="group" aria-label="الكمية" ${dg ? 'hidden' : ''}><button type="button" data-step="-1" aria-label="أقل">−</button><input id="pdQty" type="number" min="1" max="${p.stock > 0 ? Math.min(p.stock, 50) : 1}" value="1" inputmode="numeric" aria-label="الكمية"><button type="button" data-step="1" aria-label="أكتر">+</button></div>
                <button class="btn-violet grow" type="submit" ${R().inStock(p) ? '' : 'disabled'} ${buyUrl ? 'hidden' : ''}>${R().inStock(p) ? 'أضف إلى السلة' : 'نفد من المخزون'}</button>
                <button class="icon-round" type="button" data-save="${p.id}" aria-pressed="${D.wishlist.has(p.id)}" aria-label="المفضلة">${svg('heart')}</button>
                <button class="icon-round" type="button" id="pdShare" aria-label="مشاركة">${svg('share')}</button>
              </div>
              <button class="btn-dark wide" type="button" id="pdBuyNow" ${R().inStock(p) && !buyUrl ? '' : 'hidden'}>اشترِ الآن</button>
              ${prevUrl ? `<a class="btn-ghost wide pd-preview" href="${esc(prevUrl)}" target="_blank" rel="noopener noreferrer">${svg('eye')}معاينة مجانية</a>` : ''}
            </form>
            ${specs.length ? `<dl class="pd-specs">${specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
            <ul class="pd-trust">
              ${dg ? `<li>${svg('download')}<span><b>${buyUrl ? 'تحميل فوري بعد الدفع' : 'رابط التحميل بعد تأكيد الدفع'}</b><small>${buyUrl ? 'الرابط بيوصلك على إيميلك تلقائياً' : 'منبعتلك الرابط على الإيميل أو واتساب'}</small></span></li>` : `<li>${svg('truck')}<span><b>${sh.freeOver > 0 ? `توصيل مجاني فوق ${money(sh.freeOver)}` : sh.fee ? `التوصيل ${money(sh.fee)}` : 'توصيل مجاني'}</b><small>منأكد معك الموعد قبل الشحن</small></span></li>`}
              <li>${svg('card')}<span><b>${buyUrl ? 'دفع آمن بالبطاقة أو PayPal' : payNames || (dg ? 'تواصل معنا للدفع' : 'الدفع عند الاستلام')}</b><small>ما منطلب أرقام بطاقات على الموقع</small></span></li>
              <li>${svg('undo')}<span><b>${dg ? 'ضمان استرداد' : 'إرجاع خلال ١٤ يوم'}</b><small>${dg ? 'إذا الملف ما اشتغل أو ما طابق الوصف' : 'إذا المنتج ما عجبك أو وصل فيه عيب'}</small></span></li>
            </ul>
            ${p.desc ? `<div class="pd-desc"><h2>عن المنتج</h2><p>${esc(p.desc).replace(/\n/g, '<br>')}</p></div>` : ''}
            ${dg && p.details ? `<div class="pd-desc"><h2>شو بتحصل</h2><ul class="pd-gets">${String(p.details).split('\n').map((x) => x.trim()).filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
          </div>
        </div>

        <section class="pd-reviews" id="reviews">
          <div class="band-head"><h2>التقييمات</h2></div>
          <div class="rv-wrap" id="rvWrap" data-pid="${p.id}"><div class="pg-loading small"><span></span><span></span><span></span></div></div>
        </section>

        <section class="pd-qa" id="qa">
          <div class="band-head"><h2>أسئلة وأجوبة</h2></div>
          <div id="qaWrap" data-pid="${p.id}"><div class="pg-loading small"><span></span><span></span><span></span></div></div>
        </section>

        ${related.length ? `<section class="band"><div class="band-head"><h2>ممكن يعجبك كمان</h2></div><div class="grid">${related.slice(0, 4).map((x) => R().card(x)).join('')}</div></section>` : ''}
      </div>`;

    const form = $('#pdBuy');
    const qty = $('#pdQty');
    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-step]'); if (!b) return;
      qty.value = Math.max(1, Math.min(+qty.max || 50, (+qty.value || 1) + +b.dataset.step));
    });
    const add = () => {
      const o = R().readOptions(form, p);
      if (o === null) { $('.opt-err:not([hidden])', form)?.closest('.opt')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return false; }
      return R().addToCart(p.id, Math.max(1, +qty.value || 1), o);
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); add(); });
    $('#pdBuyNow').addEventListener('click', () => { if ((dg && R().qtyOf(p.id) > 0) || add()) { R().openCart(); setTimeout(() => $('[data-action="checkout"]').click(), 60); } });
    $('#pdShare').addEventListener('click', async () => {
      const url = location.href;
      try { if (navigator.share) await navigator.share({ title: p.name, url }); else { await navigator.clipboard.writeText(url); R().toast('انسخ رابط المنتج'); } } catch { /* cancelled */ }
    });
    pdGallery = { pics, pic };
    const st = page.querySelector('[data-scroll-to]');
    if (st) st.addEventListener('click', (e) => { e.preventDefault(); $('#reviews').scrollIntoView({ behavior: 'smooth' }); });
    renderReviews(p);
    renderQA(p);
  };

  let pdGallery = null;
  page.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pic]'); if (!b || !pdGallery) return;
    $('#pdMain').innerHTML = pdGallery.pic(pdGallery.pics[+b.dataset.pic]);
    $$('.pd-thumbs button').forEach((x) => x.classList.toggle('on', x === b));
  });

  async function renderQA(p) {
    let wrap = $('#qaWrap'); if (!wrap) return;
    if (!cloud) {
      wrap.innerHTML = `<div class="qa-empty"><p>عندك سؤال عن «${esc(p.name)}»؟ منجاوبك مباشرة.</p><button class="btn-dark" type="button" data-ask-product="${p.id}">اسأل عن المنتج</button></div>`;
      return;
    }
    let list = [];
    try { list = await D.qa.list(p.id); } catch { /* offline */ }
    wrap = $('#qaWrap'); if (!wrap || wrap.dataset.pid !== String(p.id)) return;
    const mine = D.auth.user ? list.filter((q) => q.user_id === D.auth.user.id && q.status === 'pending') : [];
    const pub = list.filter((q) => q.status === 'published' && q.answer);
    const u = D.auth.user, pr = D.auth.profile || {};
    wrap.innerHTML = `
      <div class="qa-grid">
        <form class="pg-card qa-form" id="qaForm" novalidate>
          <h3>اسأل عن المنتج</h3>
          <p class="muted">منجاوب وبننشر السؤال والجواب هون ليستفيد الكل.</p>
          ${u ? '' : '<label class="field" data-f="qname"><span>اسمك</span><input name="qname" type="text" autocomplete="name" maxlength="60"><em></em></label>'}
          <label class="field" data-f="q"><span>سؤالك</span><textarea name="q" rows="3" maxlength="500" placeholder="مثلاً: هل المقاس بيطلع كبير؟"></textarea><em></em></label>
          <p class="form-err" hidden></p>
          <button class="btn-dark" type="submit">إرسال السؤال</button>
          ${mine.length ? `<p class="rv-note">عندك ${num(mine.length)} سؤال بانتظار الجواب.</p>` : ''}
        </form>
        <ul class="qa-list">${pub.length ? pub.map((q) => `<li><p class="qa-q"><b>س:</b> ${esc(q.question)}</p><p class="qa-a"><b>ج:</b> ${esc(q.answer)}</p><small>${esc(q.author || 'زبون')} · ${fmtDate(q.answered_at || q.created_at)}</small></li>`).join('') : '<li class="qa-none">لسا ما في أسئلة. كون أول واحد بيسأل.</li>'}</ul>
      </div>`;
    const f = $('#qaForm');
    if (u && pr.full_name) f.dataset.name = pr.full_name;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = f.q.value.trim();
      if (f.qname && f.qname.value.trim().length < 2) return showErr(f, 'qname', 'اكتب اسمك');
      if (q.length < 3) return showErr(f, 'q', 'اكتب سؤالك');
      busy(f, true);
      try { await D.qa.ask(p.id, q, f.qname ? f.qname.value.trim() : ''); R().toast('وصلنا سؤالك. رح يظهر هون مع الجواب.'); f.reset(); showErr(f, null, ''); }
      catch (err) { showErr(f, null, D.friendly(err)); }
      busy(f, false);
    });
  }
  page.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ask-product]'); if (b && window.raffHelp) window.raffHelp.compose({ productId: +b.dataset.askProduct });
    const o = e.target.closest('[data-ask-order]'); if (o && window.raffHelp) window.raffHelp.compose({ orderId: o.dataset.askOrder });
    const t = e.target.closest('[data-open-thread]'); if (t && window.raffHelp) window.raffHelp.thread(t.dataset.openThread);
    if (e.target.closest('[data-open-help]') && window.raffHelp) window.raffHelp.open();
  });

  async function renderReviews(p) {
    let wrap = $('#rvWrap'); if (!wrap) return;
    if (!cloud) {
      wrap.innerHTML = p.reviews ? `<div class="rv-summary"><b>${num(p.rating)}</b>${stars(p.rating, 'lg')}<span class="muted">${compact(p.reviews)} تقييم</span></div>` : '<p class="muted">ما في تقييمات لسا.</p>';
      return;
    }
    let list = [], can = false;
    try { [list, can] = await Promise.all([D.reviews.list(p.id), D.reviews.canReview(p.id)]); } catch { /* ignore */ }
    wrap = $('#rvWrap'); if (!wrap || wrap.dataset.pid !== String(p.id)) return;
    const approved = list.filter((r) => r.status === 'approved');
    const mine = D.auth.user && list.find((r) => r.user_id === D.auth.user.id);
    const avg = approved.length ? approved.reduce((s, r) => s + r.rating, 0) / approved.length : 0;
    const dist = [5, 4, 3, 2, 1].map((n) => approved.filter((r) => r.rating === n).length);
    wrap.innerHTML = `
      <div class="rv-grid">
        <aside class="rv-side">
          ${approved.length ? `<div class="rv-summary"><b>${num(Math.round(avg * 10) / 10)}</b>${stars(avg, 'lg')}<span class="muted">${num(approved.length)} تقييم</span></div>
          <ul class="rv-dist">${dist.map((c, i) => `<li><span>${num(5 - i)}★</span><i><em style="width:${approved.length ? (c / approved.length) * 100 : 0}%"></em></i><small>${num(c)}</small></li>`).join('')}</ul>` : '<p class="muted">ما في تقييمات لسا. كون أول واحد بيقيّم بعد ما يوصلك.</p>'}
          ${mine ? `<p class="rv-note">${mine.status === 'pending' ? 'تقييمك وصلنا وعم نراجعه.' : mine.status === 'approved' ? 'شكراً على تقييمك!' : 'تقييمك ما انقبل.'}</p>`
            : can ? '<button class="btn-dark wide" type="button" id="rvOpen">اكتب تقييمك</button>'
            : D.auth.user ? '<p class="rv-note">بتقدر تقيّم المنتج بعد ما يوصلك.</p>'
            : '<p class="rv-note"><a href="#/login">سجّل دخول</a> لتقيّم المنتجات يلي اشتريتها.</p>'}
          <form class="rv-form" id="rvForm" hidden>
            <div class="rv-pick" role="radiogroup" aria-label="تقييمك">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="rv${n}" value="${n}"><label for="rv${n}" title="${num(n)}">★</label>`).join('')}</div>
            <textarea name="body" rows="4" maxlength="1000" placeholder="شو عجبك؟ شو ممكن يتحسّن؟"></textarea>
            <p class="err" id="rvErr" hidden></p>
            <button class="btn-violet wide" type="submit">إرسال التقييم</button>
          </form>
        </aside>
        <ul class="rv-list">${approved.map((r) => `<li><div class="rv-head"><span class="rv-av">${esc((r.author || 'ز').trim()[0])}</span><div><b>${esc(r.author || 'زبون')}</b><small>${fmtDate(r.created_at)}</small></div>${stars(r.rating)}</div>${r.body ? `<p>${esc(r.body)}</p>` : ''}<span class="rv-verified">${svg('check')}اشترى المنتج</span></li>`).join('')}</ul>
      </div>`;
    const open = $('#rvOpen');
    if (open) open.addEventListener('click', () => { open.hidden = true; $('#rvForm').hidden = false; $('#rvForm textarea').focus(); });
    const f = $('#rvForm');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rating = +((f.rating && f.rating.value) || 0);
      if (!rating) { $('#rvErr').textContent = 'اختار عدد النجوم'; $('#rvErr').hidden = false; return; }
      const b = f.querySelector('[type=submit]'); b.disabled = true;
      try { await D.reviews.add(p.id, rating, f.body.value.trim()); R().toast('وصلنا تقييمك. رح يظهر بعد المراجعة.'); renderReviews(p); }
      catch (err) { $('#rvErr').textContent = D.friendly(err); $('#rvErr').hidden = false; b.disabled = false; }
    });
  }

  /* ================= Auth ================= */
  const authShell = (title, sub, body, foot = '') => `
    <div class="pg auth">
      <div class="auth-card">
        <a class="auth-mark" href="#/">${esc((R().CFG || {}).name || 'رَفّ')}<span class="dot"></span></a>
        <h1>${title}</h1>
        ${sub ? `<p class="muted">${sub}</p>` : ''}
        ${body}
      </div>
      ${foot ? `<p class="auth-foot">${foot}</p>` : ''}
    </div>`;
  const noCloud = () => authShell('حسابي', '', `
    <div class="auth-off">${svg('lock')}<p>تسجيل الحسابات مش مفعّل بالمتجر حالياً. فيك تطلب كضيف وتتابع طلبك برقمه.</p></div>
    <a class="btn-dark wide" href="#/orders">طلباتي على هالجهاز</a>
    <a class="btn-ghost wide" href="#/track">تتبّع طلب برقمه</a>`);
  const pwField = (name, label, auto, extra = '') => `<label class="field" data-f="${name}"><span>${label}</span><div class="pw"><input name="${name}" type="password" autocomplete="${auto}" dir="ltr" required ${extra}><button type="button" class="pw-eye" data-eye aria-label="إظهار كلمة السر">${svg('eye')}</button></div><em></em></label>`;
  const showErr = (form, name, msg) => {
    $$('.field', form).forEach((el) => el.classList.toggle('invalid', el.dataset.f === name));
    const el = name && $(`.field[data-f="${name}"] em`, form);
    if (el) el.textContent = msg;
    const top = $('.form-err', form);
    if (top) { top.textContent = name ? '' : msg; top.hidden = !!name || !msg; }
    if (name && form[name]) form[name].focus();
  };
  page.addEventListener('click', (e) => {
    const b = e.target.closest('[data-eye]'); if (!b) return;
    const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password';
  });
  const busy = (form, on) => { const b = form.querySelector('[type=submit]'); b.disabled = on; b.classList.toggle('busy', on); };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const afterLogin = (q) => { const next = q && q.get('next'); location.hash = next === 'checkout' ? '#/' : next === 'mizan' ? '#/mizan' : '#/account'; if (next === 'checkout') setTimeout(() => { R().openCart(); }, 100); };

  ROUTES.login = async ({ q }) => {
    if (!cloud) { page.innerHTML = noCloud(); return; }
    if (D.auth.user) { afterLogin(q); return; }
    document.title = 'تسجيل الدخول';
    page.innerHTML = authShell('أهلاً فيك من جديد', 'سجّل دخول لتتابع طلباتك ومفضّلتك من أي جهاز.', `
      <form class="auth-form" id="loginForm" novalidate>
        <label class="field" data-f="email"><span>الإيميل</span><input name="email" type="email" autocomplete="email" dir="ltr" required><em></em></label>
        ${pwField('password', 'كلمة السر', 'current-password')}
        <a class="auth-link" href="#/forgot">نسيت كلمة السر؟</a>
        <p class="form-err" hidden></p>
        <button class="btn-violet wide" type="submit">تسجيل الدخول</button>
      </form>`, `ما عندك حساب؟ <a href="#/signup${q && q.get('next') ? `?next=${esc(q.get('next'))}` : ''}">أنشئ حساب جديد</a>`);
    const f = $('#loginForm');
    f.email.focus();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = f.email.value.trim(), password = f.password.value;
      if (!emailOk(email)) return showErr(f, 'email', 'الإيميل مش صحيح');
      if (!password) return showErr(f, 'password', 'اكتب كلمة السر');
      showErr(f, null, ''); busy(f, true);
      try { await D.auth.signIn({ email, password }); R().toast('أهلاً فيك!'); afterLogin(q); }
      catch (err) { showErr(f, null, err.message); busy(f, false); }
    });
  };

  ROUTES.signup = async ({ q }) => {
    if (!cloud) { page.innerHTML = noCloud(); return; }
    if (D.auth.user) { afterLogin(q); return; }
    document.title = 'حساب جديد';
    page.innerHTML = authShell('أنشئ حسابك', 'دقيقة وحدة، وبتتابع كل طلباتك بمكان واحد.', `
      <form class="auth-form" id="signupForm" novalidate>
        <label class="field" data-f="name"><span>الاسم الكامل</span><input name="name" autocomplete="name" required maxlength="80"><em></em></label>
        <label class="field" data-f="email"><span>الإيميل</span><input name="email" type="email" autocomplete="email" dir="ltr" required><em></em></label>
        <label class="field" data-f="phone"><span>رقم الهاتف (اختياري)</span><input name="phone" type="tel" autocomplete="tel" dir="ltr"><em></em></label>
        ${pwField('password', 'كلمة السر', 'new-password', 'minlength="8"')}
        <div class="pw-meter" id="pwMeter"><i></i><i></i><i></i><i></i><span></span></div>
        <label class="check"><input type="checkbox" name="terms"><span>موافق على <a href="#/terms">شروط الاستخدام وسياسة الخصوصية</a></span></label>
        <p class="form-err" hidden></p>
        <button class="btn-violet wide" type="submit">إنشاء الحساب</button>
      </form>`, `عندك حساب؟ <a href="#/login">سجّل دخول</a>`);
    const f = $('#signupForm');
    f.name.focus();
    f.password.addEventListener('input', () => meter(f.password.value));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = f.name.value.trim(), email = f.email.value.trim(), phone = S.toLatinDigits(f.phone.value).replace(/[^\d+]/g, ''), password = f.password.value;
      if (name.length < 2) return showErr(f, 'name', 'اكتب اسمك');
      if (!emailOk(email)) return showErr(f, 'email', 'الإيميل مش صحيح');
      if (phone && phone.replace(/\D/g, '').length < 7) return showErr(f, 'phone', 'رقم الهاتف مش صحيح');
      if (password.length < 8) return showErr(f, 'password', 'كلمة السر لازم تكون ٨ أحرف أو أكثر');
      if (!f.terms.checked) return showErr(f, null, 'لازم توافق على الشروط');
      showErr(f, null, ''); busy(f, true);
      try {
        const r = await D.auth.signUp({ email, password, name, phone });
        if (r.needsConfirm) {
          page.innerHTML = authShell('تأكد من إيميلك', '', `
            <div class="auth-sent">${svg('mail')}<p>بعتنالك رابط تفعيل على <b dir="ltr">${esc(email)}</b>. افتحه لتكمّل.</p><small class="muted">ما وصلك؟ شوف الرسائل غير المرغوبة.</small></div>
            <button class="btn-ghost wide" type="button" id="resend">إعادة إرسال الرابط</button>`, '<a href="#/login">رجوع لتسجيل الدخول</a>');
          $('#resend').addEventListener('click', async (ev) => {
            ev.target.disabled = true;
            try { await D.auth.resend(email); R().toast('انبعت الرابط مرة تانية'); } catch (err) { R().toast(err.message); }
            setTimeout(() => { ev.target.disabled = false; }, 30000);
          });
        } else { R().toast('انعمل حسابك. أهلاً فيك!'); afterLogin(q); }
      } catch (err) { showErr(f, null, err.message); busy(f, false); }
    });
  };
  function meter(v) {
    let s = 0;
    if (v.length >= 8) s++; if (v.length >= 12) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
    const m = $('#pwMeter'); if (!m) return;
    m.dataset.s = v ? Math.max(1, s) : 0;
    $('span', m).textContent = v ? ['ضعيفة', 'ضعيفة', 'مقبولة', 'جيدة', 'قوية'][s] : '';
  }

  ROUTES.forgot = async () => {
    if (!cloud) { page.innerHTML = noCloud(); return; }
    page.innerHTML = authShell('نسيت كلمة السر؟', 'اكتب إيميلك ومنبعتلك رابط لتختار كلمة سر جديدة.', `
      <form class="auth-form" id="forgotForm" novalidate>
        <label class="field" data-f="email"><span>الإيميل</span><input name="email" type="email" autocomplete="email" dir="ltr" required><em></em></label>
        <p class="form-err" hidden></p>
        <button class="btn-violet wide" type="submit">إرسال الرابط</button>
      </form>`, '<a href="#/login">رجوع لتسجيل الدخول</a>');
    const f = $('#forgotForm');
    f.email.focus();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = f.email.value.trim();
      if (!emailOk(email)) return showErr(f, 'email', 'الإيميل مش صحيح');
      busy(f, true);
      try {
        await D.auth.resetPassword(email);
        f.outerHTML = `<div class="auth-sent">${svg('mail')}<p>إذا في حساب بـ<b dir="ltr">${esc(email)}</b>، رح يوصلك رابط خلال دقيقة.</p></div>`;
      } catch (err) { showErr(f, null, err.message); busy(f, false); }
    });
  };

  ROUTES.reset = async () => {
    if (!cloud) { page.innerHTML = noCloud(); return; }
    if (!D.auth.user) {
      page.innerHTML = authShell('الرابط انتهى', 'افتح رابط الإيميل مرة تانية، أو اطلب رابط جديد.', '<a class="btn-dark wide" href="#/forgot">رابط جديد</a>');
      return;
    }
    page.innerHTML = authShell('كلمة سر جديدة', '', `
      <form class="auth-form" id="resetForm" novalidate>
        ${pwField('password', 'كلمة السر الجديدة', 'new-password', 'minlength="8"')}
        <div class="pw-meter" id="pwMeter"><i></i><i></i><i></i><i></i><span></span></div>
        ${pwField('password2', 'أعد كتابتها', 'new-password')}
        <p class="form-err" hidden></p>
        <button class="btn-violet wide" type="submit">حفظ</button>
      </form>`);
    const f = $('#resetForm');
    f.password.focus();
    f.password.addEventListener('input', () => meter(f.password.value));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (f.password.value.length < 8) return showErr(f, 'password', '٨ أحرف أو أكثر');
      if (f.password.value !== f.password2.value) return showErr(f, 'password2', 'مش متطابقة');
      busy(f, true);
      try { await D.auth.updatePassword(f.password.value); R().toast('تغيّرت كلمة السر'); location.hash = '#/account'; }
      catch (err) { showErr(f, null, err.message); busy(f, false); }
    });
  };

  /* ================= Account ================= */
  const accShell = async (active, title, body) => {
    const u = D.auth.user, p = D.auth.profile;
    const admin = await isAdmin();
    const items = [
      ['account', 'حسابي', 'user'], ['orders', 'طلباتي', 'box'], ['addresses', 'العناوين', 'pin'], ['wishlist', 'المفضلة', 'heart'], ['messages', 'رسائلي', 'chat'],
    ];
    return `
      <div class="pg">
        <div class="acc">
          <aside class="acc-side">
            <div class="acc-me"><span class="acc-av">${esc(((p && p.full_name) || (u && u.email) || 'ز').trim()[0].toUpperCase())}</span><div><b>${esc((p && p.full_name) || 'زبون')}</b><small dir="ltr">${esc(u ? u.email : '')}</small></div></div>
            <nav class="acc-nav">${items.map(([k, t, i]) => `<a href="#/${k}" class="${k === active ? 'on' : ''}">${svg(i)}<span>${t}</span></a>`).join('')}
              ${admin ? `<a href="admin/" class="acc-admin">${svg('grid')}<span>لوحة الإدارة</span></a>` : ''}
              <button type="button" data-signout>${svg('out')}<span>تسجيل الخروج</span></button>
            </nav>
          </aside>
          <section class="acc-main"><h1 class="pg-title">${title}</h1>${body}</section>
        </div>
      </div>`;
  };
  page.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-signout]')) return;
    await D.auth.signOut(); R().toast('سجّلت خروج'); location.hash = '#/';
  });
  const needLogin = (name) => { if (cloud && !D.auth.user) { location.hash = `#/login?next=${name}`; return true; } return false; };

  ROUTES.account = async () => {
    if (!cloud) { page.innerHTML = noCloud(); return; }
    if (needLogin('account')) return;
    document.title = 'حسابي';
    loading();
    const u = D.auth.user, p = D.auth.profile || {};
    let orders = [];
    try { orders = await D.myOrders(); } catch { /* ignore */ }
    const active = orders.filter((o) => ['new', 'confirmed', 'shipped'].includes(o.status));
    const { money } = R();
    page.innerHTML = await accShell('account', `أهلاً، ${esc((p.full_name || '').split(' ')[0] || 'فيك')}`, `
      <div class="acc-stats">
        <a href="#/orders"><b>${num(orders.length)}</b><span>طلب</span></a>
        <a href="#/orders"><b>${num(active.length)}</b><span>قيد التوصيل</span></a>
        <a href="#/wishlist"><b>${num(D.wishlist.all().length)}</b><span>بالمفضلة</span></a>
      </div>
      <div id="accSub"></div>
      ${active[0] ? `<a class="acc-track" href="#/orders/${encodeURIComponent(active[0].id)}"><div><small>آخر طلب</small><b class="oid">${esc(active[0].id)}</b><span>${STATUS[active[0].status]}</span></div>${progress(active[0].status)}<em>${money(active[0].total)}</em></a>` : ''}
      <div class="acc-cards">
        <form class="pg-card" id="profForm" novalidate>
          <h2>معلوماتي</h2>
          <label class="field" data-f="name"><span>الاسم</span><input name="name" value="${esc(p.full_name || '')}" maxlength="80"><em></em></label>
          <label class="field" data-f="phone"><span>الهاتف</span><input name="phone" type="tel" dir="ltr" value="${esc(p.phone || '')}"><em></em></label>
          <label class="field"><span>الإيميل</span><input value="${esc(u.email)}" dir="ltr" disabled></label>
          <p class="form-err" hidden></p>
          <button class="btn-dark" type="submit">حفظ</button>
        </form>
        <form class="pg-card" id="pwForm" novalidate>
          <h2>كلمة السر</h2>
          ${pwField('password', 'كلمة سر جديدة', 'new-password', 'minlength="8"')}
          ${pwField('password2', 'أعد كتابتها', 'new-password')}
          <p class="form-err" hidden></p>
          <button class="btn-ghost" type="submit">تغيير كلمة السر</button>
        </form>
      </div>
      <details class="pg-card danger-card"><summary>حذف الحساب</summary>
        <p class="muted">رح ينحذف حسابك وعناوينك ومفضّلتك نهائياً. الطلبات القديمة بتضل عند المتجر للفواتير بس بتنفصل عن حسابك. ما في تراجع.</p>
        <label class="field"><span>للتأكيد اكتب «احذف»</span><input id="delConfirm" autocomplete="off"></label>
        <button class="btn-danger" type="button" id="delBtn" disabled>حذف حسابي نهائياً</button>
      </details>`);
    if (window.raffMizan) window.raffMizan.accountCard($('#accSub'));
    const pf = $('#profForm');
    pf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = pf.name.value.trim(), phone = S.toLatinDigits(pf.phone.value).replace(/[^\d+]/g, '');
      if (name.length < 2) return showErr(pf, 'name', 'اكتب اسمك');
      busy(pf, true);
      try { await D.auth.updateProfile({ full_name: name, phone }); R().toast('انحفظت معلوماتك'); } catch (err) { showErr(pf, null, err.message); }
      busy(pf, false);
    });
    $('#delConfirm').addEventListener('input', (e) => { $('#delBtn').disabled = e.target.value.trim() !== 'احذف'; });
    $('#delBtn').addEventListener('click', async (e) => {
      e.target.disabled = true; e.target.classList.add('busy');
      try { await D.auth.deleteAccount(); R().toast('انحذف حسابك. منتمنّالك الخير.'); location.hash = '#/'; }
      catch (err) { R().toast(D.friendly(err)); e.target.disabled = false; e.target.classList.remove('busy'); }
    });
    const wf = $('#pwForm');
    wf.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (wf.password.value.length < 8) return showErr(wf, 'password', '٨ أحرف أو أكثر');
      if (wf.password.value !== wf.password2.value) return showErr(wf, 'password2', 'مش متطابقة');
      busy(wf, true);
      try { await D.auth.updatePassword(wf.password.value); wf.reset(); R().toast('تغيّرت كلمة السر'); } catch (err) { showErr(wf, null, err.message); }
      busy(wf, false);
    });
  };

  const progress = (s) => (s === 'cancelled' ? '<span class="prog cancelled">ملغى</span>'
    : `<span class="prog">${STEPS.map((k, i) => `<i class="${i <= STEPS.indexOf(s) ? 'on' : ''}"></i>`).join('')}</span>`);

  ROUTES.orders = async ({ arg }) => {
    if (needLogin('orders')) return;
    if (arg) return orderDetail(arg);
    document.title = 'طلباتي';
    loading();
    const list = await D.myOrders();
    const { money } = R();
    const body = list.length ? `<ul class="ord-list">${list.map((o) => `<li><a href="#/orders/${encodeURIComponent(o.id)}">
        <div class="ord-top"><b class="oid">${esc(o.id)}</b><span class="st st-${o.status}">${STATUS[o.status]}</span></div>
        <div class="ord-thumbs">${o.items.slice(0, 4).map((x) => { const p = R().byId.get(+x.id); return `<span style="--bg:${S.hex(p && p.bg, '#efe8dc')}">${p ? R().art(p) : ''}</span>`; }).join('')}${o.items.length > 4 ? `<em>+${num(o.items.length - 4)}</em>` : ''}</div>
        <div class="ord-bot"><small>${fmtDate(o.createdAt)} · ${num(o.items.reduce((s, x) => s + x.qty, 0))} قطعة</small><b>${money(o.total)}</b></div>
        ${progress(o.status)}
      </a></li>`).join('')}</ul>`
      : `<div class="pg-empty">${svg('box', 'big')}<h2>ما في طلبات لسا</h2><p class="muted">لما تطلب شي، بيطلع هون وبتتابعه خطوة بخطوة.</p><a class="btn-dark" href="#/">ابدأ التسوّق</a></div>`;
    page.innerHTML = cloud ? await accShell('orders', 'طلباتي', body)
      : `<div class="pg narrow"><h1 class="pg-title">طلباتي على هالجهاز</h1>${body}<p class="muted center" style="margin-top:20px"><a href="#/track">تتبّع طلب برقمه</a></p></div>`;
  };

  async function orderDetail(id, tracked = null) {
    loading();
    let o = tracked;
    if (!o) { const list = await D.myOrders(); o = list.find((x) => x.id === id); }
    const { money } = R();
    if (!o) { page.innerHTML = '<div class="pg narrow"><div class="pg-card center"><h1 class="pg-title">الطلب مش موجود</h1><a class="btn-dark" href="#/orders">طلباتي</a></div></div>'; return; }
    document.title = `طلب ${o.id}`;
    const when = (s) => { const h = (o.history || []).find((x) => x.s === s); return h ? fmtDate(h.t, true) : ''; };
    const cur = STEPS.indexOf(o.status);
    const body = `
      <div class="od">
        <div class="od-head"><div><small class="muted">${fmtDate(o.createdAt, true)}</small><h2 class="oid">${esc(o.id)}</h2></div><div class="od-head-r"><span class="st st-${o.status}">${STATUS[o.status]}</span><button class="btn-ghost sm" type="button" data-ask-order="${esc(o.id)}">سؤال عن الطلب</button></div></div>
        ${o.status === 'cancelled' ? '<p class="od-cancel">هالطلب انلغى. إذا عندك سؤال تواصل معنا.</p>' : `
        <ol class="timeline">${STEPS.map((k, i) => `<li class="${i < cur ? 'done' : i === cur ? 'now' : ''}"><i>${i <= cur ? svg('check', 'ti') : ''}</i><div><b>${STATUS[k]}</b><small>${when(k)}</small></div></li>`).join('')}</ol>`}
        <div class="od-grid">
          <div class="pg-card">
            <h3>المنتجات</h3>
            <ul class="od-items">${o.items.map((x) => { const p = R().byId.get(+x.id); return `<li>${p ? `<a href="#/p/${p.id}" class="od-th" style="--bg:${S.hex(p.bg, '#efe8dc')}">${R().art(p)}</a>` : '<span class="od-th"></span>'}<div><b>${esc(x.name)}</b><small>${esc(R().optsText(x.options))}${R().optsText(x.options) ? ' · ' : ''}${money(x.price)} × ${num(x.qty)}</small>${o.status === 'delivered' && p && cloud && D.auth.user ? `<a class="od-review" href="#/p/${p.id}">قيّم المنتج</a>` : ''}</div><span>${money(x.price * x.qty)}</span></li>`; }).join('')}</ul>
            <div class="od-sums"><div><span>المنتجات</span><b>${money(o.subtotal)}</b></div>${o.discount ? `<div><span>الخصم ${esc(o.coupon || '')}</span><b>−${money(o.discount)}</b></div>` : ''}<div><span>${o.items.every((x) => x.digital) ? 'التسليم' : 'التوصيل'}</span><b>${o.items.every((x) => x.digital) ? 'رقمي' : o.shipping ? money(o.shipping) : 'مجاني'}</b></div><div class="g"><span>المجموع</span><b>${money(o.total)}</b></div></div>
          </div>
          <div class="pg-card">
            <h3>الدفع</h3><p>${esc(S.METHODS[o.method] || '')}</p><p class="${o.paid ? 'ok' : 'muted'}">${o.paid ? 'مدفوع ✓' : 'لسا ما اندفع'}</p>
            ${o.customer && o.customer.address ? `<h3>التوصيل إلى</h3><p>${esc(o.customer.name || '')}</p><p class="muted">${esc(o.customer.city || '')}، ${esc(o.customer.address || '')}</p>` : o.customer && o.customer.city ? `<h3>المدينة</h3><p>${esc(o.customer.city)}</p>` : ''}
          </div>
        </div>
      </div>`;
    if (tracked) { page.innerHTML = `<div class="pg narrow"><a class="back" href="#/track">→ تتبّع طلب تاني</a>${body}</div>`; return; }
    page.innerHTML = cloud ? await accShell('orders', 'تفاصيل الطلب', `<a class="back" href="#/orders">→ كل الطلبات</a>${body}`) : `<div class="pg narrow"><a class="back" href="#/orders">→ طلباتي</a>${body}</div>`;
  }

  ROUTES.track = async ({ q }) => {
    document.title = 'تتبّع طلبك';
    page.innerHTML = `
      <div class="pg narrow">
        <div class="pg-card track-card">
          <span class="track-ic">${svg('truck', 'big')}</span>
          <h1 class="pg-title">تتبّع طلبك</h1>
          <p class="muted">اكتب رقم الطلب ورقم الهاتف يلي طلبت فيه.</p>
          <form class="track-form" id="trackForm" novalidate>
            <label class="field" data-f="id"><span>رقم الطلب</span><input name="id" dir="ltr" placeholder="R-XXXXXXX" value="${esc(q && q.get('id') || '')}" autocomplete="off"><em></em></label>
            <label class="field" data-f="phone"><span>رقم الهاتف</span><input name="phone" type="tel" dir="ltr" autocomplete="tel"><em></em></label>
            <p class="form-err" hidden></p>
            <button class="btn-violet wide" type="submit">تتبّع</button>
          </form>
        </div>
      </div>`;
    const f = $('#trackForm');
    const saved = S.ls.get('raff.customer', {});
    if (saved.phone) f.phone.value = saved.phone;
    (f.id.value ? f.phone : f.id).focus();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (f.id.value.trim().length < 4) return showErr(f, 'id', 'اكتب رقم الطلب');
      if (S.toLatinDigits(f.phone.value).replace(/\D/g, '').length < 7) return showErr(f, 'phone', 'اكتب رقم الهاتف');
      busy(f, true);
      try {
        const o = await D.trackOrder(f.id.value, f.phone.value);
        if (!o) { showErr(f, null, 'ما لقينا طلب بهالرقم والهاتف. تأكد منهم.'); busy(f, false); return; }
        orderDetail(o.id, o);
      } catch (err) { showErr(f, null, D.friendly(err)); busy(f, false); }
    });
  };

  ROUTES.addresses = async () => {
    if (!cloud) { page.innerHTML = noCloud(); return; }
    if (needLogin('addresses')) return;
    document.title = 'عناويني';
    loading();
    const list = await D.addresses.list();
    page.innerHTML = await accShell('addresses', 'العناوين', `
      <div class="addr-grid">
        ${list.map((a) => `<div class="pg-card addr ${a.is_default ? 'def' : ''}">
          <div class="addr-top"><b>${esc(a.label || a.city)}</b>${a.is_default ? '<span class="st st-confirmed">الأساسي</span>' : ''}</div>
          <p>${esc(a.name)}</p><p class="muted" dir="ltr" style="text-align:right">${esc(a.phone)}</p><p class="muted">${esc(a.city)}، ${esc(a.address)}</p>
          <div class="addr-act"><button type="button" class="link-btn" data-addr-edit="${a.id}">تعديل</button><button type="button" class="link-btn danger" data-addr-del="${a.id}">حذف</button></div>
        </div>`).join('')}
        <button type="button" class="pg-card addr add" data-addr-edit="">${svg('pin', 'big')}<b>عنوان جديد</b></button>
      </div>
      <form class="pg-card addr-form" id="addrForm" hidden novalidate>
        <h2 id="addrTitle">عنوان جديد</h2>
        <input type="hidden" name="id">
        <div class="field-row two">
          <label class="field"><span>اسم العنوان</span><input name="label" placeholder="البيت، الشغل…" maxlength="30"></label>
          <label class="field" data-f="name"><span>اسم المستلم</span><input name="name" maxlength="80"><em></em></label>
        </div>
        <div class="field-row two">
          <label class="field" data-f="phone"><span>الهاتف</span><input name="phone" type="tel" dir="ltr"><em></em></label>
          <label class="field" data-f="city"><span>المدينة</span><input name="city" maxlength="80"><em></em></label>
        </div>
        <label class="field" data-f="address"><span>العنوان بالتفصيل</span><input name="address" maxlength="300"><em></em></label>
        <label class="check"><input type="checkbox" name="is_default"><span>اجعله العنوان الأساسي</span></label>
        <p class="form-err" hidden></p>
        <div class="row-btns"><button class="btn-dark" type="submit">حفظ</button><button class="btn-ghost" type="button" id="addrCancel">إلغاء</button></div>
      </form>`);
    const f = $('#addrForm');
    page.querySelector('.addr-grid').addEventListener('click', async (e) => {
      const ed = e.target.closest('[data-addr-edit]'), del = e.target.closest('[data-addr-del]');
      if (ed) {
        const a = list.find((x) => String(x.id) === ed.dataset.addrEdit) || { name: (D.auth.profile || {}).full_name || '', phone: (D.auth.profile || {}).phone || '', is_default: !list.length };
        ['id', 'label', 'name', 'phone', 'city', 'address'].forEach((k) => { f[k].value = a[k] || ''; });
        f.is_default.checked = !!a.is_default;
        $('#addrTitle').textContent = a.id ? 'تعديل العنوان' : 'عنوان جديد';
        f.hidden = false; f.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.label.focus();
      }
      if (del && confirm('تحذف هالعنوان؟')) { try { await D.addresses.remove(+del.dataset.addrDel); route(); } catch (err) { R().toast(D.friendly(err)); } }
    });
    $('#addrCancel').addEventListener('click', () => { f.hidden = true; });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = (k) => f[k].value.trim();
      if (v('name').length < 2) return showErr(f, 'name', 'اكتب الاسم');
      if (S.toLatinDigits(v('phone')).replace(/\D/g, '').length < 7) return showErr(f, 'phone', 'رقم مش صحيح');
      if (!v('city')) return showErr(f, 'city', 'اكتب المدينة');
      if (v('address').length < 4) return showErr(f, 'address', 'اكتب العنوان');
      busy(f, true);
      try {
        await D.addresses.save({ id: v('id') ? +v('id') : null, label: v('label'), name: v('name'), phone: S.toLatinDigits(v('phone')).replace(/[^\d+]/g, ''), city: v('city'), address: v('address'), is_default: f.is_default.checked });
        R().toast('انحفظ العنوان'); route();
      } catch (err) { showErr(f, null, D.friendly(err)); busy(f, false); }
    });
  };

  ROUTES.messages = async () => {
    if (!cloud) { location.hash = '#/contact'; return; }
    document.title = 'رسائلي';
    loading();
    let list = [];
    try { list = await D.support.list(); } catch (err) { R().toast(D.friendly(err)); }
    const ST = { open: 'بانتظار الرد', answered: 'تم الرد', closed: 'مغلقة' };
    const body = `${list.length ? `<ul class="msg-list">${list.map((c) => `<li><button type="button" data-open-thread="${esc(c.id)}"><span class="msg-ic">${svg('chat')}</span><span class="msg-main"><b>${esc(c.subject || 'محادثة')}</b><small>${esc((c.last_message || '').slice(0, 90))}</small></span><span class="msg-side">${c.unread_customer ? '<i class="help-new">رد جديد</i>' : `<em class="st st-${c.status === 'answered' ? 'delivered' : c.status === 'closed' ? 'cancelled' : 'new'}">${ST[c.status] || ''}</em>`}<small>${fmtDate(c.updatedAt)}</small></span></button></li>`).join('')}</ul>`
      : `<div class="pg-empty">${svg('chat', 'big')}<h2>ما في رسائل لسا</h2><p class="muted">عندك سؤال؟ منرد عليك هون.</p></div>`}
      <button class="btn-violet" type="button" data-open-help style="margin-top:16px">رسالة جديدة</button>`;
    page.innerHTML = D.auth.user ? await accShell('messages', 'رسائلي', body) : `<div class="pg narrow"><h1 class="pg-title">رسائلي</h1>${body}</div>`;
  };

  ROUTES.wishlist = async () => {
    document.title = 'المفضلة';
    const ids = D.wishlist.all().filter((id) => R().byId.has(id));
    const body = ids.length ? `<div class="grid">${ids.map((id) => R().card(R().byId.get(id))).join('')}</div>`
      : `<div class="pg-empty">${svg('heart', 'big')}<h2>المفضلة فاضية</h2><p class="muted">اضغط على القلب بأي منتج ليتحفظ هون.</p><a class="btn-dark" href="#/">تصفّح المنتجات</a></div>`;
    page.innerHTML = cloud && D.auth.user ? await accShell('wishlist', 'المفضلة', body)
      : `<div class="pg"><h1 class="pg-title">المفضلة</h1>${cloud ? '<p class="muted" style="margin:-8px 0 20px"><a href="#/login">سجّل دخول</a> لتلاقي مفضّلتك على أي جهاز.</p>' : ''}${body}</div>`;
  };

  ROUTES.terms = async () => {
    const n = esc((R().CFG || {}).name || 'المتجر');
    page.innerHTML = `<div class="pg narrow prose"><h1 class="pg-title">الشروط والخصوصية</h1>
      <h2>الطلبات والدفع</h2><p>الأسعار معروضة بالعملة الظاهرة جنبها. بيتأكد كل طلب منّا قبل الشحن. الدفع عند الاستلام أو عبر PayPal أو تحويل بنكي، و${n} ما بيطلب ولا بيخزّن أرقام بطاقات.</p>
      <h2>التوصيل والإرجاع</h2><p>منتواصل معك لتأكيد العنوان والموعد. فيك ترجع المنتج خلال ١٤ يوم من الاستلام إذا كان بحالته الأصلية أو وصل فيه عيب.</p>
      <h2>بياناتك</h2><p>منستعمل اسمك ورقمك وعنوانك بس لتوصيل طلبك والتواصل معك بخصوصه. ما منبيع بياناتك ولا منشاركها مع حدا. فيك تطلب حذف حسابك بأي وقت.</p>
      <h2>الحساب</h2><p>انت مسؤول عن سرية كلمة السر. إذا شكّيت إنو حدا دخل على حسابك، غيّر كلمة السر فوراً.</p></div>`;
  };

  /* ================= Info pages ================= */
  const paras = (txt) => String(txt || '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
    .map((b) => `<p>${esc(b).replace(/\n/g, '<br>')}</p>`).join('');
  const SOC = {
    instagram: ['Instagram', '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>'],
    tiktok: ['TikTok', '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.4 4.4 5 4.6"/>'],
    facebook: ['Facebook', '<path d="M14 21v-8h3l.5-3.5H14V7.6c0-1 .3-1.7 1.8-1.7h1.8V2.8A24 24 0 0 0 15 2.6c-2.6 0-4.4 1.6-4.4 4.5v2.4H7.7V13h2.9v8"/>'],
  };
  const socialLinks = (ct) => Object.keys(SOC).filter((k) => ct && /^https:\/\//.test(ct[k] || ''))
    .map((k) => `<a href="${esc(ct[k])}" target="_blank" rel="noopener noreferrer" aria-label="${SOC[k][0]}" title="${SOC[k][0]}"><svg class="pi" viewBox="0 0 24 24" aria-hidden="true">${SOC[k][1]}</svg></a>`).join('');
  const infoShell = (title, inner, sub = '') => `<div class="pg narrow prose info"><h1 class="pg-title">${title}</h1>${sub ? `<p class="lead muted">${sub}</p>` : ''}${inner}
    <div class="info-help"><span>عندك سؤال تاني؟</span><a class="btn-dark" href="#/contact">تواصل معنا</a></div></div>`;
  const cfg = () => R().CFG || {};
  const pagesCfg = () => cfg().pages || {};

  ROUTES.about = async () => {
    const c = cfg();
    document.title = `من نحن · ${c.name || ''}`;
    page.innerHTML = infoShell(`عن ${esc(c.name || 'المتجر')}`, paras(pagesCfg().about) || `<p>${esc(c.name || 'متجرنا')} بيجمعلك منتجات مختارة بعناية، وبيوصلها لعندك بسهولة وأمان.</p><p>منهتم بكل طلب كأنه الوحيد، ومنحب نسمع رأيك.</p>`, esc(c.tagline || ''));
  };
  const digitalStore = () => { const P = R().P || []; return P.length > 0 && P.every((x) => S.isDigital(x)); };
  ROUTES.shipping = async () => {
    const c = cfg(), sh = c.shipping || {}, money = R().money;
    if (digitalStore()) {
      document.title = `التسليم والتحميل · ${c.name || ''}`;
      page.innerHTML = infoShell('التسليم والتحميل', `<ul class="facts"><li><b>رقمي</b><span>ما في شحن</span></li><li><b>فوري</b><span>للمنتجات بدفع إلكتروني</span></li><li><b>مجاني</b><span>رسوم التسليم</span></li></ul>` + (paras(pagesCfg().shipping) || '<p>كل منتجاتنا رقمية، يعني ما في شحن ولا انتظار. إذا اشتريت بالدفع الإلكتروني، بيوصلك رابط التحميل فوراً على إيميلك.</p><p>إذا طلبت عن طريق واتساب، منبعتلك رابط التحميل على إيميلك أو واتساب أول ما يتأكد الدفع، عادةً خلال ساعات.</p><p>ما وصلك الرابط؟ تواصل معنا برقم الطلب ومنحلّها فوراً.</p>'));
      return;
    }
    document.title = `التوصيل · ${c.name || ''}`;
    const facts = `<ul class="facts">
      <li><b>${sh.fee ? money(sh.fee) : 'مجاني'}</b><span>رسوم التوصيل</span></li>
      ${sh.freeOver > 0 ? `<li><b>${money(sh.freeOver)}</b><span>توصيل مجاني فوق</span></li>` : ''}
      <li><b>${['cod', 'paypal', 'bank'].filter((k) => (c.payments || {})[k] && c.payments[k].on).length || 1}</b><span>طرق دفع</span></li></ul>`;
    page.innerHTML = infoShell('التوصيل', facts + (paras(pagesCfg().shipping) || '<p>بعد ما تطلب، منتواصل معك لنأكد العنوان والموعد. التوصيل عادةً بياخد من ٢ لـ ٥ أيام عمل حسب المدينة.</p><p>فيك تتابع حالة طلبك بأي وقت من صفحة «تتبّع طلبك» برقم الطلب ورقم هاتفك.</p>'));
  };
  ROUTES.returns = async () => {
    const c = cfg();
    document.title = `الإرجاع · ${c.name || ''}`;
    if (digitalStore() && !paras(pagesCfg().returns)) { page.innerHTML = infoShell('الاسترداد', '<p>لأنها منتجات رقمية، ما فينا نسترجع الملف بعد تحميله. بس إذا الملف ما اشتغل معك، أو ما طابق الوصف، تواصل معنا خلال ١٤ يوم من الشراء ومنصلّح المشكلة أو منرجّعلك المبلغ كامل.</p><p>ابعتلنا رقم الطلب ووصف المشكلة، ومنرد عليك بأسرع وقت.</p>'); return; }
    page.innerHTML = infoShell('الإرجاع والاستبدال', paras(pagesCfg().returns) || '<p>فيك ترجع أو تبدّل المنتج خلال ١٤ يوم من استلامه، إذا كان بحالته الأصلية، أو إذا وصلك فيه عيب.</p><p>تواصل معنا برقم الطلب ومنرتّب الاستلام. بنرجّعلك المبلغ بنفس طريقة الدفع خلال أيام من وصول المنتج.</p>');
  };
  ROUTES.faq = async () => {
    const c = cfg(), money = R().money, sh = c.shipping || {};
    document.title = `الأسئلة الشائعة · ${c.name || ''}`;
    const raw = pagesCfg().faq;
    const items = raw ? raw.split(/\n\s*\n/).map((b) => b.trim().split('\n')).filter((l) => l[0]).map(([q, ...a]) => [q, a.join('\n')])
      : [
        ['كيف بدفع؟', `${[(c.payments || {}).cod && c.payments.cod.on && !digitalStore() ? 'نقداً عند الاستلام' : '', (c.payments || {}).paypal && c.payments.paypal.on ? 'عبر PayPal أو ببطاقتك على صفحة PayPal' : '', (c.payments || {}).bank && c.payments.bank.on ? 'بتحويل بنكي' : ''].filter(Boolean).join('، ') || (digitalStore() ? 'بالدفع الإلكتروني من صفحة المنتج، أو تواصل معنا على واتساب' : 'نقداً عند الاستلام')}. ما منطلب أرقام بطاقات على موقعنا.`],
        ...(digitalStore() ? [['كيف بستلم المنتج؟', 'كل منتجاتنا رقمية. بعد الدفع بيوصلك رابط التحميل على إيميلك، أو منبعتلك ياه على واتساب إذا طلبت من هناك.'], ['ما وصلني رابط التحميل، شو بعمل؟', 'شيّك مجلد الرسائل غير المرغوبة (Spam)، وإذا ما لقيته تواصل معنا برقم الطلب ومنبعتلك ياه من جديد.']] : [['قديش التوصيل؟', sh.fee ? `${money(sh.fee)}${sh.freeOver > 0 ? `، ومجاني للطلبات فوق ${money(sh.freeOver)}` : ''}.` : 'التوصيل مجاني.']]),
        ['كيف بتابع طلبي؟', 'من صفحة «تتبّع طلبك» برقم الطلب ورقم هاتفك، أو من «طلباتي» إذا عندك حساب.'],
        digitalStore() ? ['فيني أسترد المبلغ؟', 'إذا الملف ما اشتغل أو ما طابق الوصف، خلال ١٤ يوم. التفاصيل بصفحة الاسترداد.'] : ['فيني رجّع المنتج؟', 'أكيد، خلال ١٤ يوم من الاستلام. التفاصيل بصفحة الإرجاع.'],
        ['لازم أعمل حساب لأطلب؟', 'لا، فيك تطلب كضيف. الحساب بيسهّل عليك تتابع طلباتك وتحفظ عناوينك ومفضّلتك.'],
      ];
    page.innerHTML = infoShell('الأسئلة الشائعة', `<div class="faq-list">${items.map(([q, a], i) => `<details ${i === 0 ? 'open' : ''}><summary>${esc(q)}</summary><div>${paras(a) || ''}</div></details>`).join('')}</div>`);
  };
  ROUTES.contact = async () => {
    const c = cfg(), ct = c.contact || {};
    document.title = `تواصل معنا · ${c.name || ''}`;
    const wa = String(c.whatsapp || '').replace(/\D/g, '');
    const ways = [
      wa ? `<a class="way" href="https://wa.me/${wa}" target="_blank" rel="noopener noreferrer">${svg('chat')}<span><b>واتساب</b><small dir="ltr">+${esc(wa)}</small></span></a>` : '',
      ct.phone ? `<a class="way" href="tel:${esc(ct.phone.replace(/\s/g, ''))}">${svg('phone')}<span><b>اتصال</b><small dir="ltr">${esc(ct.phone)}</small></span></a>` : '',
      ct.email ? `<a class="way" href="mailto:${esc(ct.email)}">${svg('mail')}<span><b>إيميل</b><small dir="ltr">${esc(ct.email)}</small></span></a>` : '',
    ].filter(Boolean).join('');
    page.innerHTML = `<div class="pg narrow prose info"><h1 class="pg-title">تواصل معنا</h1><p class="lead muted">منرد عليك بأسرع وقت. إذا سؤالك عن طلب، اذكر رقم الطلب.</p>
      ${ways ? `<div class="ways">${ways}</div>` : ''}
      ${ct.address ? `<p class="addr-line">${svg('pin')}<span>${esc(ct.address)}</span></p>` : ''}
      ${socialLinks(ct) ? `<div class="socials big">${socialLinks(ct)}</div>` : ''}
      <form class="pg-card contact-form" id="contactForm" novalidate>
        <h2>ابعتلنا رسالة</h2>
        <label class="field" data-f="name"><span>الاسم</span><input name="name" autocomplete="name" maxlength="80"><em></em></label>
        <label class="field" data-f="order"><span>رقم الطلب (اختياري)</span><input name="order" dir="ltr" maxlength="20"></label>
        <label class="field" data-f="msg"><span>رسالتك</span><textarea name="msg" rows="4" maxlength="1500"></textarea><em></em></label>
        <p class="form-err" hidden></p>
        ${cloud && !D.auth.user ? '<label class="field" data-f="contact"><span>هاتف أو إيميل لنرد عليك</span><input name="contact" type="text" dir="ltr" autocomplete="tel" maxlength="120"><em></em></label>' : ''}
        <button class="btn-violet wide" type="submit">${cloud ? 'إرسال' : wa ? 'إرسال على واتساب' : ct.email ? 'إرسال بالإيميل' : 'إرسال'}</button>
      </form></div>`;
    const f = $('#contactForm');
    const prof = D.auth.profile; if (prof && prof.full_name) f.name.value = prof.full_name;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (f.name.value.trim().length < 2) return showErr(f, 'name', 'اكتب اسمك');
      if (f.msg.value.trim().length < 5) return showErr(f, 'msg', 'اكتب رسالتك');
      if (cloud) {
        if (f.contact && S.toLatinDigits(f.contact.value).replace(/\s/g, '').length < 6) return showErr(f, 'contact', 'اكتب رقم هاتف أو إيميل');
        busy(f, true);
        try {
          const r = await D.support.start({ name: f.name.value.trim(), contact: f.contact ? S.toLatinDigits(f.contact.value.trim()) : '', subject: 'رسالة من صفحة التواصل', body: f.msg.value.trim(), orderId: f.order.value.trim() });
          f.reset(); showErr(f, null, '');
          R().toast('وصلتنا رسالتك. فيك تتابع الرد هون أو من زر المساعدة.');
          if (window.raffHelp) window.raffHelp.thread(r.id);
        } catch (err) { showErr(f, null, D.friendly(err)); }
        busy(f, false);
        return;
      }
      const text = `مرحبا ${c.name || ''}،\n${f.msg.value.trim()}\n\n${f.name.value.trim()}${f.order.value.trim() ? `\nرقم الطلب: ${f.order.value.trim()}` : ''}`;
      if (wa) window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      else if (ct.email) location.href = `mailto:${ct.email}?subject=${encodeURIComponent(`رسالة من ${f.name.value.trim()}`)}&body=${encodeURIComponent(text)}`;
      else { showErr(f, null, 'المتجر ما حط وسيلة تواصل لسا.'); return; }
      R().toast('فتحنالك الرسالة جاهزة، بس اكبس إرسال');
    });
  };

  function renderFooterExtras() {
    const c = cfg();
    const about = paras(pagesCfg().about);
    if (about) { const first = String(pagesCfg().about).split(/\n\s*\n/)[0].trim(); $('#footAbout').textContent = first.length > 160 ? `${first.slice(0, 157)}…` : first; }
    $('#footSocial').innerHTML = socialLinks(c.contact || {});
  }

  /* ---------- Boot ---------- */
  const start = () => { renderAccountChip(); renderFooterExtras(); route(); };
  if (R().isReady) start(); else R().onReady.push(start);
  D.ready.then(renderAccountChip);
})();
