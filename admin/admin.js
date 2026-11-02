/* رَفّ — admin. Everything is kept encrypted (AES-GCM, key derived from the PIN with PBKDF2)
   in this browser's localStorage. The public catalog is published as data/store.json. */
(() => {
  'use strict';
  if (window.top !== window.self) { document.documentElement.hidden = true; return; }

  const S = window.RaffShared, D = window.RaffData;
  const CLOUD = D.mode === 'cloud';
  const { esc, num, art, ls } = S;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const KEY = 'raff-admin-v1', ITER = 310000, IDLE_MS = 15 * 60 * 1000;
  const REPO_UPLOAD = 'https://github.com/7brv6ymdsz-cmd/raff-store/upload/main/data';
  const PAYPAL_CODES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  const SWATCHES = ['#efe8dc', '#e6d5bd', '#d9c3a5', '#e8c9bb', '#dfe3dc', '#cfd6c8', '#a9b59a', '#cfcac2', '#b5806a', '#332f2d'];

  const STATUS = {
    new: { t: 'جديد', c: 'st-new' },
    confirmed: { t: 'مؤكد', c: 'st-conf' },
    shipped: { t: 'تم الشحن', c: 'st-ship' },
    delivered: { t: 'تم التسليم', c: 'st-done' },
    cancelled: { t: 'ملغى', c: 'st-cancel' },
  };

  /* ---------- Icons ---------- */
  const I = {
    dashboard: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 4v3h6V4z"/>',
    orders: '<path d="M6 3h12l1 4H5zM5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M9 11h6"/>',
    products: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    customers: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    payments: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    publish: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
    coupons: '<path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a3 3 0 0 0 0 6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a3 3 0 0 0 0-6z"/><path d="M9 9l6 6M9.5 14.5h0M14.5 9.5h0"/>',
    reviews: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    messages: '<path d="M4 19.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8z"/><path d="M8.5 9h7M8.5 12.5h4.5"/>',
    questions: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
    send: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    inventory: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10M7.5 5l9 4"/>',
    team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 11l1.5 1.5L21 10"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    import: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    whatsapp: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-1.5-1-2-2l1-1-1-2z"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    print: '<path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4.4-1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    upload: '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3M12 4v12M7 9l5-5 5 5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    arrow: '<path d="M15 6l-6 6 6 6"/>',
  };
  const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

  /* ---------- State ---------- */
  let key = null, salt = null, state = null, idleTimer = null, fails = 0, lockedUntil = 0;
  const cur = () => (state.settings.currency || '$');
  const money = (n) => S.money(Math.round((+n || 0) * 100) / 100, cur());
  const b64 = (buf) => { let s = ''; new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  const deriveKey = async (pin, saltBytes) => {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: saltBytes, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  };
  let saving = Promise.resolve();
  const save = () => {
    if (CLOUD) { updatePublishDot(); return Promise.resolve(); }
    saving = saving.then(async () => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(state)));
      try { localStorage.setItem(KEY, JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) })); }
      catch { toast('ما قدرنا نحفظ. ممكن المساحة خلصت بسبب الصور، صغّر الصور أو احذف بعضها.'); }
    });
    updatePublishDot();
    return saving;
  };
  const readStored = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

  const publicCoupons = () => (state.coupons || []).filter((c) => c.active && c.h).map(({ code, uses, maxUses, ...c }) => c);
  const publicCatalog = () => ({
    v: 1,
    updated: new Date().toISOString(),
    settings: { ...state.settings, coupons: publicCoupons() },
    categories: state.categories,
    products: state.products.map(({ sold, ...p }) => p),
  });
  const catalogHash = () => {
    const s = JSON.stringify({ a: state.settings, k: publicCoupons(), b: state.categories, c: state.products.map(({ sold, ...p }) => p) });
    let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  };
  const dirty = () => !CLOUD && state && state.publishedHash !== catalogHash();
  const updatePublishDot = () => { if (state) { $('#publishDot').hidden = !dirty(); $('#publishBtn').classList.toggle('has-changes', dirty()); } };

  /* ---------- Lock ---------- */
  const stored = readStored();
  const setup = !stored;
  if (setup && !CLOUD) {
    $('#lockMsg').textContent = 'أهلاً! اختار رمز سري من ٦ أرقام أو أكثر. ما في طريقة لاسترجاعه إذا نسيته.';
    $('#pin2').hidden = false; $('#lockSubmit').textContent = 'إنشاء الرمز والبدء';
    $('#pin').setAttribute('autocomplete', 'new-password');
    $('#forgotBtn').hidden = true;
  }
  if (!window.crypto || !crypto.subtle) {
    $('#lockErr').textContent = 'هالمتصفح ما بيدعم التشفير. افتح الصفحة بمتصفح حديث وعلى رابط https.';
    $('#lockErr').hidden = false; $('#lockSubmit').disabled = true;
  }
  $('#forgotBtn').addEventListener('click', () => { $('#forgotBox').hidden = false; $('#forgotBtn').hidden = true; });
  $('#forgotNo').addEventListener('click', () => { $('#forgotBox').hidden = true; $('#forgotBtn').hidden = false; });
  $('#forgotYes').addEventListener('click', () => { ls.del(KEY); location.reload(); });

  /* ---------- Cloud (Supabase) mode ---------- */
  const sb = D.client;
  const must = D.must;
  const cloudApi = {
    async loadAll() {
      const [st, cats, prods, ords, cps, rvs, convs, qs, notes] = await Promise.all([
        sb.from('settings').select('data').eq('id', 1).maybeSingle(),
        sb.from('categories').select('*').order('sort'),
        sb.from('products').select('*').order('sort').order('id', { ascending: false }),
        sb.from('orders').select('*').order('created_at', { ascending: false }).limit(1000),
        sb.from('coupons').select('*').order('created_at', { ascending: false }),
        sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(500),
        sb.from('conversations').select('id,user_id,name,contact,subject,order_id,product_id,status,unread_admin,last_message,created_at,updated_at').order('updated_at', { ascending: false }).limit(500),
        sb.from('product_questions').select('*').order('created_at', { ascending: false }).limit(500),
        sb.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      const bad = [st, cats, prods, ords, cps, rvs, convs, qs, notes].find((r) => r.error);
      if (bad) throw new Error(D.friendly(bad.error));
      state = {
        settings: (st.data && st.data.data) || {},
        categories: cats.data.map((c) => ({ id: c.id, name: c.name, c: c.color, sort: c.sort })),
        products: prods.data.map(D.fromRow),
        orders: ords.data.map((o) => ({ ...D.orderFromRow(o), stockApplied: o.stock_applied })),
        coupons: cps.data.map(couponFromRow),
        reviews: rvs.data,
        conversations: convs.data,
        questions: qs.data,
        notifications: notes.data,
        role: (state && state.role) || 'owner',
        publishedHash: null,
      };
      migrate();
    },
    async saveProduct(p, isNew) {
      const row = D.toRow(p);
      const r = isNew ? await sb.from('products').insert(row).select().single() : await sb.from('products').update(row).eq('id', p.id).select().single();
      return D.fromRow(must(r));
    },
    async deleteProduct(id) { must(await sb.from('products').delete().eq('id', id)); },
    async saveSettings() { must(await sb.from('settings').update({ data: state.settings }).eq('id', 1)); },
    async saveCategories(removed) {
      if (state.categories.length) must(await sb.from('categories').upsert(state.categories.map((c, i) => ({ id: c.id, name: c.name, color: c.c, sort: i }))));
      if (removed.length) must(await sb.from('categories').delete().in('id', removed));
    },
    async setStatus(id, st) { return D.orderFromRow(must(await sb.rpc('admin_set_status', { p_id: id, p_status: st }))); },
    async patchOrder(id, fields) { must(await sb.from('orders').update(fields).eq('id', id)); },
    async deleteOrder(id) { must(await sb.from('orders').delete().eq('id', id)); },
    async saveCoupon(c, isNew) {
      const row = { code: c.code, kind: c.kind, value: c.value, min_subtotal: c.min || 0, starts_at: c.starts ? new Date(c.starts).toISOString() : null, ends_at: c.ends ? new Date(c.ends).toISOString() : null, max_uses: c.maxUses || null, active: c.active };
      const r = isNew ? await sb.from('coupons').insert(row).select().single() : await sb.from('coupons').update(row).eq('code', c.code).select().single();
      return couponFromRow(must(r));
    },
    async deleteCoupon(code) { must(await sb.from('coupons').delete().eq('code', code)); },
    async setReview(id, status) { must(await sb.from('reviews').update({ status }).eq('id', id)); },
    async deleteReview(id) { must(await sb.from('reviews').delete().eq('id', id)); },
    async upload(blob) {
      const path = `p/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      must(await sb.storage.from('products').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }));
      return sb.storage.from('products').getPublicUrl(path).data.publicUrl;
    },
    async conversation(id) { return must(await sb.rpc('get_conversation', { p_id: id, p_token: '' })); },
    async reply(id, body) { must(await sb.rpc('admin_reply', { p_id: id, p_body: body })); },
    async setConversation(id, fields) { must(await sb.from('conversations').update(fields).eq('id', id)); },
    async deleteConversation(id) { must(await sb.from('conversations').delete().eq('id', id)); },
    async answerQuestion(id, fields) { must(await sb.from('product_questions').update(fields).eq('id', id)); },
    async deleteQuestion(id) { must(await sb.from('product_questions').delete().eq('id', id)); },
    async freshConversations(since) {
      return must(await sb.from('conversations').select('id,user_id,name,contact,subject,order_id,product_id,status,unread_admin,last_message,created_at,updated_at').gt('updated_at', new Date(since).toISOString()).order('updated_at', { ascending: false }));
    },
    async listStaff() { return must(await sb.rpc('list_staff')); },
    async addStaff(email, role) { must(await sb.rpc('add_staff', { p_email: email, p_role: role })); },
    async removeStaff(uid) { must(await sb.rpc('remove_staff', { p_user: uid })); },
    async movements(pid) { return must(await sb.from('stock_movements').select('*').eq('product_id', pid).order('at', { ascending: false }).limit(50)); },
    async adjustStock(pid, delta, reason, note) { return must(await sb.rpc('adjust_stock', { p_product: pid, p_delta: delta, p_reason: reason, p_note: note || '' })); },
    async audit(limit = 200) { return must(await sb.from('audit_log').select('*').order('at', { ascending: false }).limit(limit)); },
    async markNotes(ids) { if (ids.length) must(await sb.from('admin_notifications').update({ read: true }).in('id', ids)); },
    async newOrders(since) {
      return must(await sb.from('orders').select('*').gt('created_at', new Date(since).toISOString()).order('created_at', { ascending: false })).map((o) => ({ ...D.orderFromRow(o), stockApplied: o.stock_applied }));
    },
  };
  function couponFromRow(r) {
    return { code: r.code, kind: r.kind, value: +r.value, min: +r.min_subtotal || 0, starts: r.starts_at ? new Date(r.starts_at).getTime() : null, ends: r.ends_at ? new Date(r.ends_at).getTime() : null, maxUses: r.max_uses || null, uses: r.uses || 0, active: r.active };
  }
  // run a cloud write with a busy button and a friendly error
  async function cloudDo(fn, okMsg) {
    try { const r = await fn(); if (okMsg) toast(okMsg); return r; }
    catch (e) { toast(D.friendly(e)); throw e; }
  }

  let pollTimer = null;
  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      if (!state || document.hidden) return;
      try {
        const latest = state.orders.reduce((m, o) => Math.max(m, o.createdAt), 0) || Date.now() - 864e5;
        const fresh = (await cloudApi.newOrders(latest)).filter((o) => !state.orders.some((x) => x.id === o.id));
        if (fresh.length) {
          state.orders.unshift(...fresh);
          toast(fresh.length === 1 ? `طلب جديد من ${fresh[0].customer.name}` : `وصلك ${num(fresh.length)} طلبات جديدة`);
          if (current === 'orders') renderOrderList(); else if (current === 'dashboard') VIEWS.dashboard();
          refreshBadges();
        }
        const lastNote = (state.notifications || []).reduce((m, x) => Math.max(m, x.id), 0);
        const fresh2 = must(await sb.from('admin_notifications').select('*').gt('id', lastNote).order('id', { ascending: false }));
        if (fresh2.length) { state.notifications.unshift(...fresh2); paintBell(); toast(fresh2[0].title); }
        const lastConv = (state.conversations || []).reduce((m, c) => Math.max(m, new Date(c.updated_at).getTime()), 0) || Date.now() - 864e5;
        const changed = await cloudApi.freshConversations(lastConv);
        if (changed.length) {
          changed.forEach((c) => { const i = state.conversations.findIndex((x) => x.id === c.id); if (i >= 0) state.conversations[i] = c; else state.conversations.unshift(c); });
          state.conversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
          const unread = changed.filter((c) => c.unread_admin);
          if (unread.length) toast(unread.length === 1 ? `رسالة جديدة من ${unread[0].name}` : `وصلك ${num(unread.length)} رسائل جديدة`);
          if (current === 'messages') { renderInbox(); const open = $('#sheetInner').dataset.sheetConv; if (open && changed.some((c) => c.id === open)) openConversation(open, true); }
          refreshNavBadges();
        }
      } catch { /* offline, try again later */ }
    }, 30000);
  }
  function refreshBadges() {
    const newCount = state.orders.filter((o) => o.status === 'new').length;
    const a = $('#sideNav a[href="#orders"]'); if (!a) return;
    let em = a.querySelector('em');
    if (newCount) { if (!em) { em = document.createElement('em'); a.append(em); } em.textContent = num(newCount); } else if (em) em.remove();
  }

  if (CLOUD) cloudLock();
  async function cloudLock() {
    const card = $('#lockForm');
    const exists = await sb.rpc('admin_exists').then((r) => !!r.data, () => true);
    await D.ready;
    const paint = (modeName) => {
      const signup = modeName === 'signup';
      card.innerHTML = `
        <h1 class="lock-mark">رَفّ<span class="dot"></span><span class="sr"> · لوحة الإدارة</span></h1>
        <p class="lock-sub">لوحة الإدارة</p>
        <p class="lock-msg">${signup ? 'أنشئ حساب المدير. أول حساب بيسجّل هون بيصير هو مدير المتجر.' : 'سجّل دخول بحساب المدير.'}</p>
        <input id="cEmail" type="email" autocomplete="email" placeholder="الإيميل" dir="ltr" class="lock-field">
        <input id="cPass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="كلمة السر" dir="ltr" class="lock-field">
        <p class="err" id="lockErr" hidden></p>
        <button class="btn violet wide" type="submit" id="lockSubmit">${signup ? 'إنشاء حساب المدير' : 'دخول'}</button>
        ${!exists ? `<button class="link" type="button" id="swap">${signup ? 'عندي حساب، بدي سجّل دخول' : 'أول مرة؟ أنشئ حساب المدير'}</button>` : ''}
        <p class="lock-note"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>متصل بالسيرفر. البيانات محمية بقواعد أمان على قاعدة البيانات.</p>`;
      const sw = $('#swap'); if (sw) sw.onclick = () => paint(signup ? 'login' : 'signup');
      card.onsubmit = async (e) => {
        e.preventDefault();
        const err = $('#lockErr'), email = $('#cEmail').value.trim(), password = $('#cPass').value;
        err.hidden = true;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < (signup ? 8 : 1)) { err.textContent = signup ? 'اكتب إيميل صحيح وكلمة سر ٨ أحرف أو أكثر' : 'اكتب الإيميل وكلمة السر'; err.hidden = false; return; }
        $('#lockSubmit').disabled = true; $('#lockSubmit').classList.add('busy');
        try {
          if (signup) {
            const r = await D.auth.signUp({ email, password, name: 'المدير', phone: '' });
            if (r.needsConfirm) { err.textContent = 'بعتنالك رابط تفعيل على إيميلك. افتحه، وبعدين ارجع هون وسجّل دخول.'; err.hidden = false; err.classList.add('ok-msg'); return; }
          } else await D.auth.signIn({ email, password });
          await afterCloudLogin();
        } catch (ex) { err.textContent = D.friendly(ex); err.hidden = false; }
        finally { const b = $('#lockSubmit'); if (b) { b.disabled = false; b.classList.remove('busy'); } }
      };
      setTimeout(() => $('#cEmail') && $('#cEmail').focus(), 30);
    };
    if (D.auth.user) { try { await afterCloudLogin(); return; } catch { /* fall through to the form */ } }
    paint(exists ? 'login' : 'signup');
  }
  async function afterCloudLogin() {
    let admin = !!must(await sb.rpc('is_admin'));
    if (!admin) {
      const claimed = !!must(await sb.rpc('claim_admin'));
      admin = claimed;
      if (claimed) toast('صرت مدير المتجر');
    }
    if (!admin) {
      $('#lockForm').innerHTML = `<h1 class="lock-mark">رَفّ<span class="dot"></span><span class="sr"> · لوحة الإدارة</span></h1><p class="lock-msg">هالحساب (${esc(D.auth.user.email)}) مش حساب المدير.</p><button class="btn wide" type="button" id="outBtn">تسجيل خروج</button><a class="link" href="../">رجوع للمتجر</a>`;
      $('#outBtn').onclick = async () => { await D.auth.signOut(); location.reload(); };
      throw new Error('not_admin');
    }
    state = { role: 'owner' };
    const role = must(await sb.rpc('my_role')) || 'owner';
    await cloudApi.loadAll();
    state.role = role;
    // first time on the server: offer to bring the local catalog along
    if (!state.products.length && !state.categories.length) state.offerImport = true;
    enterApp();
  }

  if (!CLOUD) $('#lockForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#lockErr'), pin = S.toLatinDigits($('#pin').value);
    err.hidden = true;
    if (Date.now() < lockedUntil) { err.textContent = `محاولات كتير. استنى ${num(Math.ceil((lockedUntil - Date.now()) / 1000))} ثانية.`; err.hidden = false; return; }
    $('#lockSubmit').disabled = true; $('#lockSubmit').classList.add('busy');
    try {
      if (setup) {
        if (pin.length < 6) throw new Error('الرمز قصير. استعمل ٦ أرقام أو أكثر.');
        if (pin !== S.toLatinDigits($('#pin2').value)) throw new Error('الرمزين مش متطابقين.');
        salt = crypto.getRandomValues(new Uint8Array(16));
        key = await deriveKey(pin, salt);
        state = await freshState();
        await save();
      } else {
        salt = unb64(stored.salt);
        const k = await deriveKey(pin, salt);
        try {
          const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(stored.iv) }, k, unb64(stored.ct));
          state = JSON.parse(new TextDecoder().decode(pt)); key = k; fails = 0;
        } catch {
          fails++;
          if (fails >= 5) { lockedUntil = Date.now() + 30000 * (fails - 4); }
          throw new Error('الرمز غلط.');
        }
      }
      migrate();
      enterApp();
    } catch (ex) {
      err.textContent = ex.message || 'صار خطأ.'; err.hidden = false;
      $('#pin').select();
    } finally { $('#lockSubmit').disabled = false; $('#lockSubmit').classList.remove('busy'); }
  });

  async function freshState() {
    let cat = null;
    try { cat = await S.loadCatalog('../'); } catch { /* start empty */ }
    const base = {
      settings: {
        name: 'متجري', tagline: '', banner: '', bannerSub: '', currency: '$', currencyCode: 'USD',
        shipping: { fee: 0, freeOver: 0 }, whatsapp: '',
        payments: { cod: { on: true }, paypal: { on: false, user: '' }, bank: { on: false, bank: '', holder: '', iban: '' } },
      },
      categories: [], products: [],
    };
    const s = { ...base, ...(cat || {}), orders: [], publishedHash: null, created: Date.now() };
    delete s.isPreview; delete s.v; delete s.updated;
    return s;
  }
  function migrate() {
    state.orders = state.orders || [];
    state.products = state.products || [];
    state.categories = state.categories || [];
    state.settings = state.settings || {};
    state.settings.payments = { cod: { on: true }, paypal: { on: false, user: '' }, bank: { on: false, bank: '', holder: '', iban: '' }, ...(state.settings.payments || {}) };
    state.settings.shipping = { fee: 0, freeOver: 0, ...(state.settings.shipping || {}) };
    state.coupons = state.coupons || [];
    state.reviews = state.reviews || [];
    state.conversations = state.conversations || [];
    state.questions = state.questions || [];
    if (state.publishedHash === undefined) state.publishedHash = null;
    if (state.publishedHash === null && !state.products.some((p) => p._edited)) state.publishedHash = catalogHash();
  }

  const lock = async () => { state = null; key = null; if (CLOUD) { try { await D.auth.signOut(); } catch { /* ignore */ } } location.hash = ''; location.reload(); };
  const bumpIdle = () => { clearTimeout(idleTimer); idleTimer = setTimeout(lock, IDLE_MS); };

  function enterApp() {
    $('#lock').hidden = true; $('#app').hidden = false;
    ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, bumpIdle, { passive: true }));
    bumpIdle();
    if (CLOUD) { startPolling(); } else {
      const n = syncLocalOrders(true);
      if (n) toast(`انضاف ${num(n)} طلب من هالجهاز`);
    }
    $('#publishBtn').hidden = CLOUD;
    $('#cloudBadge').hidden = !CLOUD;
    route();
  }

  /* ---------- Router ---------- */
  const NAV = [
    { id: 'dashboard', t: 'الرئيسية', k: 'نظرة عامة' },
    { id: 'orders', t: 'الطلبات', k: 'المبيعات' },
    { id: 'products', t: 'المنتجات', k: 'الكتالوج' },
    { id: 'inventory', t: 'المخزون', k: 'الكتالوج' },
    { id: 'customers', t: 'العملاء', k: 'المبيعات' },
    { id: 'messages', t: 'الرسائل', k: 'خدمة العملاء' },
    { id: 'questions', t: 'أسئلة المنتجات', k: 'خدمة العملاء' },
    { id: 'payments', t: 'الدفع والشحن', k: 'الإعدادات' },
    { id: 'coupons', t: 'الكوبونات', k: 'التسويق' },
    { id: 'reviews', t: 'التقييمات', k: 'التسويق' },
    { id: 'settings', t: 'الإعدادات', k: 'المتجر' },
    { id: 'team', t: 'الفريق والصلاحيات', k: 'المتجر' },
    { id: 'activity', t: 'سجل النشاط', k: 'المتجر' },
    { id: 'server', t: 'السيرفر والحسابات', k: 'المتجر' },
    { id: 'publish', t: 'النشر', k: 'المتجر' },
  ];
  // what each staff role may open (the database enforces the same rules)
  const ROLE_PAGES = {
    owner: null,
    manager: ['dashboard', 'orders', 'products', 'inventory', 'customers', 'messages', 'questions', 'payments', 'coupons', 'reviews', 'settings', 'activity', 'server'],
    inventory: ['dashboard', 'products', 'inventory'],
    support: ['dashboard', 'orders', 'customers', 'messages', 'questions', 'reviews'],
  };
  const ROLE_NAMES = { owner: 'المالك', manager: 'مدير', inventory: 'مسؤول مخزون', support: 'خدمة عملاء' };
  const LOCAL_HIDDEN = ['team', 'activity'];
  const canOpen = (id) => (CLOUD ? (!ROLE_PAGES[state.role || 'owner'] || ROLE_PAGES[state.role].includes(id)) && (id !== 'team' || (state.role || 'owner') === 'owner') : !LOCAL_HIDDEN.includes(id));
  const can = (...roles) => !CLOUD || (state.role || 'owner') === 'owner' || roles.includes(state.role);
  const VIEWS = {};
  let current = null;
  function route() {
    if (!state) return;
    const [id, arg] = (location.hash.slice(1) || 'dashboard').split('/');
    const nav = NAV.find((n) => n.id === id && canOpen(n.id)) || NAV[0];
    current = nav.id;
    const newCount = state.orders.filter((o) => o.status === 'new').length;
    const pendingRv = state.reviews.filter((r) => r.status === 'pending').length;
    const unreadMsg = (state.conversations || []).filter((c) => c.unread_admin && c.status !== 'closed').length;
    const pendingQ = (state.questions || []).filter((q) => q.status === 'pending').length;
    $('#sideNav').innerHTML = NAV.filter((n) => n.id !== 'publish' && canOpen(n.id)).map((n) => `<a href="#${n.id}" class="${n.id === current ? 'on' : ''}" ${n.id === current ? 'aria-current="page"' : ''}>${ic(n.id)}<span>${n.t}</span>${n.id === 'orders' && newCount ? `<em>${num(newCount)}</em>` : n.id === 'reviews' && pendingRv ? `<em>${num(pendingRv)}</em>` : n.id === 'messages' && unreadMsg ? `<em>${num(unreadMsg)}</em>` : n.id === 'questions' && pendingQ ? `<em>${num(pendingQ)}</em>` : ''}</a>`).join('');
    $('#topTitle').textContent = nav.t;
    $('#topKicker').textContent = nav.k;
    $('#topActions').innerHTML = '';
    $('#publishBtn').classList.toggle('on', current === 'publish');
    paintBell();
    $('#roleBadge').hidden = !CLOUD || (state.role || 'owner') === 'owner';
    $('#roleBadge').textContent = ROLE_NAMES[state.role] || '';
    closeSheet();
    VIEWS[current](arg ? decodeURIComponent(arg) : undefined);
    updatePublishDot();
    $('#view').focus({ preventScroll: true });
    scrollTo(0, 0);
  }
  addEventListener('hashchange', route);

  /* ---------- Shared helpers ---------- */
  let tt;
  function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2600); }
  const fmtDate = (t, withTime = false) => new Intl.DateTimeFormat('ar-EG', withTime ? { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(t));
  const ago = (t) => {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'هلّق';
    if (m < 60) return `من ${num(m)} دقيقة`;
    const h = Math.round(m / 60); if (h < 24) return `من ${num(h)} ساعة`;
    const d = Math.round(h / 24); return d < 30 ? `من ${num(d)} يوم` : fmtDate(t);
  };
  const badge = (o) => `<span class="badge ${STATUS[o.status].c}">${STATUS[o.status].t}</span>`;
  const payBadge = (o) => (o.status === 'cancelled' ? '' : o.paid ? '<span class="badge st-paid">مدفوع</span>' : '<span class="badge st-unpaid">غير مدفوع</span>');
  const live = (o) => o.status !== 'cancelled';
  const optsText = (o) => Object.keys(o || {}).map((k) => `${k}: ${o[k]}`).join('، ');
  const byPid = () => new Map(state.products.map((p) => [p.id, p]));
  const thumb = (p, cls = 'thumb') => `<span class="${cls}" style="--bg:${S.hex(p && p.bg, '#efe8dc')}">${p ? art(p) : ''}</span>`;
  const empty = (title, text, actions = '') => `<div class="empty-state"><div class="empty-ill" aria-hidden="true">${ic('orders')}</div><h3>${title}</h3><p>${text}</p><div class="row-btns center">${actions}</div></div>`;
  const setActions = (html) => { $('#topActions').innerHTML = html; };
  const field = (label, inner, hint = '') => `<label class="f"><span>${label}</span>${inner}${hint ? `<small>${hint}</small>` : ''}</label>`;
  const toggle = (name, on, label) => `<label class="switch"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><i></i><span>${label}</span></label>`;

  /* ---------- Order sync / import ---------- */
  function applyStock(o, dir) {
    const m = byPid();
    o.items.forEach((x) => { const p = m.get(x.id); if (p && Number.isFinite(+p.stock)) p.stock = Math.max(0, (+p.stock) - dir * x.qty); });
  }
  function addOrder(o) {
    if (state.orders.some((x) => x.id === o.id)) return false;
    o.history = o.history || [{ t: o.createdAt, s: 'new' }];
    state.orders.unshift(o);
    state.orders.sort((a, b) => b.createdAt - a.createdAt);
    return true;
  }
  function syncLocalOrders(silent) {
    const mine = ls.get('raff.myorders', []);
    let n = 0;
    mine.forEach((o) => { if (o && o.id && Array.isArray(o.items) && addOrder({ ...o, status: 'new', paid: false })) n++; });
    if (n) save();
    if (!silent && !n) toast('ما في طلبات جديدة على هالجهاز');
    return n;
  }
  function importDialog() {
    openModal(`
      <div class="modal-head"><h2>استيراد طلب</h2><button class="icon-btn" type="button" data-act="close-modal" aria-label="إغلاق">${ic('close')}</button></div>
      <p class="muted">لما الزبون يكمّل طلبه، بيبعتلك رسالة واتساب فيها «رمز الطلب». الصق الرسالة كاملة هون (أو الرمز لحاله). فيك تلصق كذا رسالة مع بعض.</p>
      <textarea class="ta" id="importText" rows="7" placeholder="RAFF1.eyJ..." dir="ltr"></textarea>
      <p class="err" id="importErr" hidden></p>
      <div class="row-btns end"><button class="btn" type="button" data-act="close-modal">إلغاء</button><button class="btn violet" type="button" id="importGo">${ic('import')}استيراد</button></div>`);
    $('#importText').focus();
    $('#importGo').addEventListener('click', () => {
      const text = $('#importText').value;
      const parts = text.split(/(?=RAFF1\.)/).filter((x) => x.includes('RAFF1.'));
      let added = 0, dup = 0;
      parts.forEach((part) => { const o = S.decodeOrder(part); if (o) { if (addOrder(o)) added++; else dup++; } });
      if (!added && !dup) { $('#importErr').textContent = 'ما لقينا رمز طلب صحيح بالنص. تأكد إنك نسخت الرسالة كاملة.'; $('#importErr').hidden = false; return; }
      save(); closeModal();
      toast(added ? `انضاف ${num(added)} طلب${dup ? `، و${num(dup)} كان موجود` : ''}` : 'الطلب موجود من قبل');
      if (current === 'orders' || current === 'dashboard') route();
    });
  }

  /* ---------- Demo data ---------- */
  function seedDemo() {
    const names = ['سارة أحمد', 'محمد الخطيب', 'ليلى حداد', 'عمر يوسف', 'نور الهدى', 'كريم سليمان', 'ريم العلي', 'يوسف منصور', 'هبة ناصر', 'علي حسن', 'جنى خليل', 'طارق زيدان'];
    const cities = ['بيروت', 'عمّان', 'دمشق', 'الرياض', 'دبي', 'القاهرة', 'طرابلس'];
    const live = state.products.filter((p) => !p.hidden);
    if (!live.length) { toast('أضف منتجات أولاً'); return; }
    const statuses = ['delivered', 'delivered', 'delivered', 'shipped', 'confirmed', 'new', 'new', 'cancelled'];
    for (let i = 0; i < 26; i++) {
      const t = Date.now() - Math.floor(Math.random() * 29 * 864e5) - Math.floor(Math.random() * 864e5);
      const ci = Math.floor(Math.random() * names.length);
      const items = [];
      const k = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < k; j++) {
        const p = live[Math.floor(Math.random() * live.length)];
        const ex = items.find((x) => x.id === p.id);
        if (ex) ex.qty++; else items.push({ id: p.id, qty: 1 + (Math.random() < 0.2 ? 1 : 0), price: p.price, name: p.name });
      }
      const sub = items.reduce((s, x) => s + x.qty * x.price, 0);
      const sh = state.settings.shipping;
      const ship = sh.freeOver > 0 && sub >= sh.freeOver ? 0 : +sh.fee || 0;
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      const methods = ['cod', 'cod', 'paypal', 'bank'];
      const method = methods[Math.floor(Math.random() * methods.length)];
      addOrder({
        id: S.newOrderId().slice(0, 6) + i.toString(36).toUpperCase() + 'D', createdAt: t, demo: true,
        customer: { name: names[ci], phone: `+9617${String(1000000 + ci * 7919).slice(0, 7)}`, city: cities[ci % cities.length], address: 'الشارع الرئيسي، بناية ' + num(3 + ci), notes: '' },
        method, items, subtotal: sub, shipping: ship, total: sub + ship,
        status: st, paid: st === 'delivered' || (st !== 'new' && st !== 'cancelled' && method !== 'cod'),
        history: [{ t, s: 'new' }],
      });
    }
    save(); toast('انضافت طلبات تجريبية. فيك تمسحها من الإعدادات.'); route();
  }

  /* ================= Views ================= */

  /* ---------- Dashboard ---------- */
  let period = 30;
  /* ---------- Launch checklist: can this store actually take and fulfil orders? ---------- */
  function launchChecks() {
    const st = state.settings, pay = st.payments || {}, ct = st.contact || {};
    const real = state.products.filter((p) => !p.demo && !p.hidden);
    const wa = String(st.whatsapp || '').replace(/\D/g, '');
    const payOk = (pay.cod && pay.cod.on) || (pay.paypal && pay.paypal.on && pay.paypal.user) || (pay.bank && pay.bank.on && pay.bank.iban);
    return [
      { ok: !state.products.some((p) => p.demo), crit: true, t: 'مسح المنتجات التجريبية', d: 'الأمثلة الحالية بأسماء وتقييمات غير حقيقية.', act: '<button class="btn" type="button" data-act="clear-demo-products">امسحها</button>' },
      { ok: real.length > 0, crit: true, t: 'منتجك الأول', d: real.length ? `${num(real.length)} منتج ظاهر بالمتجر.` : 'أضف منتج واحد على الأقل بصورته وسعره.', act: '<a class="btn" href="#products">أضف منتج</a>' },
      { ok: CLOUD || wa.length >= 8, crit: !CLOUD, t: CLOUD ? 'رقم واتساب (اختياري مع السيرفر)' : 'رقم واتساب لاستلام الطلبات', d: CLOUD ? 'الطلبات بتوصل للوحة. الرقم بيسهّل تواصل الزبائن.' : 'بدون سيرفر، الطلب بيوصلك برسالة واتساب. بدون رقم ما في طريقة يوصلك الطلب.', act: '<a class="btn" href="#payments">أضف الرقم</a>' },
      { ok: !!payOk, crit: true, t: 'طريقة دفع واحدة على الأقل', d: 'الدفع عند الاستلام، أو PayPal باسمك، أو تحويل بنكي برقم حسابك.', act: '<a class="btn" href="#payments">طرق الدفع</a>' },
      { ok: !!(ct.email || ct.phone || wa), crit: false, t: 'معلومات التواصل', d: 'إيميل أو هاتف بصفحة «تواصل معنا»، ليثق فيك الزبون.', act: '<a class="btn" href="#settings">أضف</a>' },
      { ok: !!(st.pages && (st.pages.returns || st.pages.shipping)), crit: false, t: 'سياسة التوصيل والإرجاع بكلامك', d: 'في نص افتراضي جاهز، بس الأفضل تكتب شروطك الحقيقية.', act: '<a class="btn" href="#settings">اكتبها</a>' },
      { ok: CLOUD, crit: false, t: 'ربط السيرفر (مجاني)', d: 'لحسابات الزبائن والطلبات الفورية والتقييمات ونظام الرسائل.', act: '<a class="btn" href="#server">اربط</a>' },
      { ok: !dirty(), crit: true, t: 'نشر آخر التعديلات', d: CLOUD ? 'محفوظ مباشرة على السيرفر.' : 'تعديلاتك محفوظة عندك بس لحد ما تنشرها.', act: '<a class="btn" href="#publish">انشر</a>' },
    ];
  }
  function launchCard() {
    const c = launchChecks();
    const done = c.filter((x) => x.ok).length, critLeft = c.filter((x) => x.crit && !x.ok).length;
    if (done === c.length) return '';
    return `<section class="card launch-card ${critLeft ? 'blocked' : 'ready'}">
      <div class="card-head"><h2>${critLeft ? `قبل ما تبيع: باقي ${num(critLeft)} ${critLeft === 1 ? 'خطوة أساسية' : 'خطوات أساسية'}` : 'متجرك جاهز للبيع ✓'}</h2><span class="muted">${num(done)} من ${num(c.length)}</span></div>
      <div class="launch-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${c.length}" aria-valuenow="${done}"><i style="width:${(done / c.length) * 100}%"></i></div>
      <ul class="launch-list">${c.map((x) => `<li class="${x.ok ? 'ok' : x.crit ? 'crit' : 'opt'}"><span class="lc-ic">${x.ok ? ic('check') : x.crit ? '!' : '·'}</span><div><b>${x.t}${!x.ok && x.crit ? ' <em>أساسي</em>' : ''}</b><small>${x.d}</small></div>${x.ok ? '' : x.act}</li>`).join('')}</ul>
    </section>`;
  }

  VIEWS.dashboard = () => {
    setActions(CLOUD ? `<button class="btn" type="button" data-act="reload">${ic('refresh')}<span>تحديث</span></button>` : `<button class="btn" type="button" data-act="import">${ic('import')}<span>استيراد طلب</span></button>`);
    const now = Date.now(), day = 864e5;
    const from = period ? now - period * day : 0;
    const prevFrom = period ? from - period * day : 0;
    const inP = state.orders.filter((o) => o.createdAt >= from && live(o));
    const inPrev = period ? state.orders.filter((o) => o.createdAt >= prevFrom && o.createdAt < from && live(o)) : [];
    const sum = (l) => l.reduce((s, o) => s + o.total, 0);
    const sales = sum(inP), prevSales = sum(inPrev);
    const avg = inP.length ? sales / inP.length : 0;
    const unpaid = state.orders.filter((o) => live(o) && !o.paid);
    const delta = (a, b) => {
      if (!period || !b) return '';
      const d = Math.round(((a - b) / b) * 100);
      return `<span class="delta ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${num(Math.abs(d))}٪</span>`;
    };
    const low = state.products.filter((p) => !p.hidden && Number.isFinite(+p.stock) && p.stock <= 3).sort((a, b) => a.stock - b.stock);

    // top products
    const tally = new Map();
    inP.forEach((o) => o.items.forEach((x) => { const t = tally.get(x.id) || { qty: 0, rev: 0, name: x.name }; t.qty += x.qty; t.rev += x.qty * x.price; tally.set(x.id, t); }));
    const top = [...tally.entries()].sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);
    const pm = byPid();

    const hasOrders = state.orders.length > 0;
    $('#view').innerHTML = `
      ${dirty() ? `<a class="notice" href="#publish">${ic('publish')}<span><b>عندك تعديلات ما انتشرت لسا.</b> الزبائن بيشوفوا النسخة القديمة لحتى تنشر.</span><em>انشر هلّق</em></a>` : ''}
      ${CLOUD && state.conversations.some((c) => c.unread_admin && c.status !== 'closed') ? `<a class="notice" href="#messages">${ic('messages')}<span><b>عندك ${num(state.conversations.filter((c) => c.unread_admin && c.status !== 'closed').length)} رسالة جديدة من الزبائن.</b> الرد السريع بيفرق.</span><em>فتح الرسائل</em></a>` : ''}
      ${CLOUD && state.questions.some((q) => q.status === 'pending') ? `<a class="notice soft" href="#questions">${ic('questions')}<span><b>${num(state.questions.filter((q) => q.status === 'pending').length)} سؤال عن المنتجات</b> بانتظار جوابك.</span><em>جاوب</em></a>` : ''}
      ${launchCard()}
      ${state.offerImport ? `<a class="notice" href="#server">${ic('server')}<span><b>السيرفر جاهز بس فاضي.</b> انقل منتجاتك وإعداداتك الحالية إليه بكبسة وحدة.</span><em>نقل البيانات</em></a>` : ''}
      <div class="seg" role="group" aria-label="الفترة">
        ${[[7, '٧ أيام'], [30, '٣٠ يوم'], [90, '٣ أشهر'], [0, 'الكل']].map(([v, t]) => `<button type="button" data-period="${v}" aria-pressed="${period === v}">${t}</button>`).join('')}
      </div>
      <div class="kpis">
        <div class="kpi hero"><span>المبيعات</span><b>${money(sales)}</b>${delta(sales, prevSales)}<small>${period ? `مقارنة بالـ${num(period)} يوم يلي قبل` : 'من أول طلب'}</small></div>
        <div class="kpi"><span>الطلبات</span><b>${num(inP.length)}</b>${delta(inP.length, inPrev.length)}</div>
        <div class="kpi"><span>متوسط الطلب</span><b>${money(avg)}</b></div>
        <a class="kpi" href="#orders/unpaid"><span>بانتظار الدفع</span><b>${num(unpaid.length)}</b><small>${money(sum(unpaid))}</small></a>
      </div>
      <div class="dash-grid">
        <section class="card chart-card">
          <div class="card-head"><h2>المبيعات اليومية</h2><span class="muted" id="chartRange"></span></div>
          ${hasOrders ? '<div class="chart" id="chart"></div>' : empty('ما في طلبات لسا', 'أول ما توصلك طلبات من المتجر، رح تشوف المبيعات هون.', CLOUD ? '' : `<button class="btn violet" type="button" data-act="demo">${ic('plus')}جرّب ببيانات تجريبية</button><button class="btn" type="button" data-act="import">${ic('import')}استيراد طلب</button>`)}
        </section>
        <section class="card">
          <div class="card-head"><h2>الأكثر مبيعاً</h2></div>
          ${top.length ? `<ol class="rank">${top.map(([id, t], i) => `<li><span class="rank-n">${num(i + 1)}</span>${thumb(pm.get(id))}<div><b>${esc(t.name)}</b><small>${num(t.qty)} قطعة</small></div><strong>${money(t.rev)}</strong></li>`).join('')}</ol>` : '<p class="muted pad">ما في مبيعات بهالفترة.</p>'}
        </section>
        <section class="card">
          <div class="card-head"><h2>آخر الطلبات</h2><a class="link" href="#orders">الكل</a></div>
          ${state.orders.length ? `<ul class="mini-orders">${state.orders.slice(0, 6).map((o) => `<li><button type="button" data-order="${esc(o.id)}"><div><b>${esc(o.customer.name)}</b><small>${esc(o.id)} · ${ago(o.createdAt)}</small></div><span>${money(o.total)}</span>${badge(o)}</button></li>`).join('')}</ul>` : '<p class="muted pad">لسا ما في طلبات.</p>'}
        </section>
        <section class="card">
          <div class="card-head"><h2>تنبيهات المخزون</h2><a class="link" href="#products">المنتجات</a></div>
          ${low.length ? `<ul class="stock-list">${low.slice(0, 6).map((p) => `<li><button type="button" data-product="${p.id}">${thumb(p)}<b>${esc(p.name)}</b><span class="badge ${p.stock <= 0 ? 'st-cancel' : 'st-new'}">${p.stock <= 0 ? 'نفد' : `باقي ${num(p.stock)}`}</span></button></li>`).join('')}</ul>` : `<p class="muted pad ok">${ic('check')} كل المنتجات متوفرة.</p>`}
        </section>
      </div>`;
    if (hasOrders) drawChart(period || 30);
  };

  function drawChart(days) {
    const el = $('#chart'); if (!el) return;
    const day = 864e5;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: days }, (_, i) => ({ t: start.getTime() - (days - 1 - i) * day, v: 0, n: 0 }));
    state.orders.filter(live).forEach((o) => {
      const i = Math.floor((o.createdAt - buckets[0].t) / day);
      if (i >= 0 && i < days) { buckets[i].v += o.total; buckets[i].n++; }
    });
    const max = Math.max(...buckets.map((b) => b.v), 1);
    const nice = (m) => { const p = 10 ** Math.floor(Math.log10(m)); const f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
    const top = nice(max);
    const W = Math.max(300, Math.round(el.clientWidth) || 640), H = W < 500 ? 200 : 230, padT = 12, padB = 26, padS = 48;
    const iw = W - padS - 8, ih = H - padT - padB;
    const bw = iw / days, gap = Math.min(2 + bw * 0.25, 8);
    const ticks = [0, top / 2, top];
    const x = (i) => W - padS - (i + 1) * bw + gap / 2; // RTL: newest on the left
    const fmtD = (t) => new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(new Date(t));
    const every = days <= 7 ? 1 : Math.ceil(days / Math.max(3, Math.floor(W / 90)));
    $('#chartRange').textContent = `${fmtD(buckets[0].t)} – ${fmtD(buckets[days - 1].t)}`;
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="رسم بياني للمبيعات اليومية">
      ${ticks.map((v) => { const y = padT + ih - (v / top) * ih; return `<line class="grid" x1="8" x2="${W - padS}" y1="${y}" y2="${y}"/><text class="axis" x="${W - padS + 8}" y="${y + 4}" text-anchor="start">${esc(S.money(v, cur()))}</text>`; }).join('')}
      ${buckets.map((b, i) => {
        const h = b.v ? Math.max(3, (b.v / top) * ih) : 0;
        const y = padT + ih - h, w = Math.max(2, bw - gap), r = Math.min(4, w / 2, h);
        const path = h ? `M${x(i)},${padT + ih} V${y + r} q0,-${r} ${r},-${r} H${x(i) + w - r} q${r},0 ${r},${r} V${padT + ih} Z` : '';
        return `<g class="bar${i === days - 1 ? ' today' : ''}" data-i="${i}"><rect class="hit" x="${x(i) - gap / 2}" y="${padT}" width="${bw}" height="${ih}"/>${path ? `<path d="${path}"/>` : ''}</g>`;
      }).join('')}
      ${buckets.map((b, i) => ((days - 1 - i) % every === 0 ? `<text class="axis" x="${x(i) + (bw - gap) / 2}" y="${H - 6}" text-anchor="middle">${fmtD(b.t)}</text>` : '')).join('')}
    </svg><div class="tip" id="chartTip" hidden></div>
    <table class="sr"><caption>المبيعات اليومية</caption><tbody>${buckets.map((b) => `<tr><th>${fmtD(b.t)}</th><td>${money(b.v)}</td><td>${num(b.n)} طلب</td></tr>`).join('')}</tbody></table>`;
    const tip = $('#chartTip');
    el.addEventListener('pointermove', (e) => {
      const g = e.target.closest('.bar');
      $$('.bar.hover', el).forEach((n) => n.classList.remove('hover'));
      if (!g) { tip.hidden = true; return; }
      g.classList.add('hover');
      const b = buckets[+g.dataset.i];
      tip.innerHTML = `<b>${money(b.v)}</b><span>${fmtD(b.t)} · ${num(b.n)} طلب</span>`;
      const r = el.getBoundingClientRect(), gr = g.getBoundingClientRect();
      tip.hidden = false;
      const left = Math.min(Math.max(gr.left - r.left + gr.width / 2, 60), r.width - 60);
      tip.style.left = `${left}px`;
    });
    el.addEventListener('pointerleave', () => { tip.hidden = true; $$('.bar.hover', el).forEach((n) => n.classList.remove('hover')); });
  }

  /* ---------- Orders ---------- */
  let oFilter = 'all', oQuery = '';
  VIEWS.orders = (arg) => {
    if (arg === 'unpaid') oFilter = 'unpaid';
    else if (arg && arg.startsWith('phone:')) { oQuery = arg.slice(6); oFilter = 'all'; }
    const csvBtn = `<button class="btn" type="button" data-act="csv-orders" title="تصدير الطلبات">${ic('download')}<span>تصدير</span></button>`;
    setActions(CLOUD ? `${csvBtn}<button class="btn" type="button" data-act="reload">${ic('refresh')}<span>تحديث</span></button>` : `${csvBtn}<button class="btn" type="button" data-act="sync">${ic('download')}<span>من هالجهاز</span></button><button class="btn violet" type="button" data-act="import">${ic('import')}<span>استيراد طلب</span></button>`);
    const counts = { all: state.orders.length, unpaid: state.orders.filter((o) => live(o) && !o.paid).length };
    Object.keys(STATUS).forEach((k) => { counts[k] = state.orders.filter((o) => o.status === k).length; });
    $('#view').innerHTML = `
      <div class="toolbar">
        <label class="search">${ic('search')}<input type="search" id="oq" placeholder="ابحث بالاسم، الرقم، الهاتف…" value="${esc(oQuery)}"></label>
      </div>
      <div class="chips" role="group" aria-label="فلترة الطلبات">
        ${[['all', 'الكل'], ['new', 'جديد'], ['confirmed', 'مؤكد'], ['shipped', 'تم الشحن'], ['delivered', 'تم التسليم'], ['unpaid', 'غير مدفوع'], ['cancelled', 'ملغى']]
          .map(([k, t]) => `<button type="button" data-ofilter="${k}" aria-pressed="${oFilter === k}">${t}<em>${num(counts[k])}</em></button>`).join('')}
      </div>
      <div id="orderList"></div>`;
    $('#oq').addEventListener('input', (e) => { oQuery = e.target.value; renderOrderList(); });
    renderOrderList();
    if (arg && !['unpaid'].includes(arg) && !arg.startsWith('phone:')) openOrder(arg);
  };
  function renderOrderList() {
    const q = S.norm(oQuery), qd = S.toLatinDigits(oQuery).replace(/\D/g, '');
    const list = state.orders.filter((o) => {
      if (oFilter === 'unpaid' ? !(live(o) && !o.paid) : oFilter !== 'all' && o.status !== oFilter) return false;
      if (!q) return true;
      return S.norm(`${o.id} ${o.customer.name} ${o.customer.city}`).includes(q) || (qd.length >= 3 && o.customer.phone.replace(/\D/g, '').includes(qd));
    });
    const el = $('#orderList');
    if (!state.orders.length) {
      el.innerHTML = CLOUD ? empty('ما في طلبات لسا', 'أول ما زبون يطلب من المتجر، الطلب بيوصل هون لحاله.', '')
        : empty('ما في طلبات لسا', 'الطلبات بتوصلك على واتساب مع «رمز طلب». الصقه هون بكبسة «استيراد طلب»، أو جرّب اللوحة ببيانات تجريبية.',
        `<button class="btn violet" type="button" data-act="import">${ic('import')}استيراد طلب</button><button class="btn" type="button" data-act="demo">${ic('plus')}بيانات تجريبية</button>`);
      return;
    }
    if (!list.length) { el.innerHTML = '<p class="muted pad center">ما في طلبات بهالفلتر.</p>'; return; }
    el.innerHTML = `<div class="table-card"><table class="table">
      <thead><tr><th>الطلب</th><th>العميل</th><th class="hide-sm">التاريخ</th><th class="hide-sm">الدفع</th><th>الحالة</th><th class="num">المبلغ</th></tr></thead>
      <tbody>${list.map((o) => `<tr data-order="${esc(o.id)}" tabindex="0">
        <td><b class="oid">${esc(o.id)}</b>${o.demo ? ' <span class="badge st-demo">تجريبي</span>' : ''}</td>
        <td><b>${esc(o.customer.name)}</b><small>${esc(o.customer.city)}</small></td>
        <td class="hide-sm"><span>${fmtDate(o.createdAt)}</span><small>${ago(o.createdAt)}</small></td>
        <td class="hide-sm">${payBadge(o)}<small>${esc(S.METHODS[o.method] || '')}</small></td>
        <td>${badge(o)}</td>
        <td class="num"><b>${money(o.total)}</b><small>${num(o.items.reduce((s, x) => s + x.qty, 0))} قطعة</small></td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function openOrder(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return;
    const pm = byPid();
    const wa = o.customer.phone.replace(/\D/g, '');
    const msg = {
      new: `مرحبا ${o.customer.name}، استلمنا طلبك ${o.id} بقيمة ${money(o.total)}. منأكد معك التفاصيل؟`,
      confirmed: `مرحبا ${o.customer.name}، طلبك ${o.id} تأكد وعم نجهّزه.`,
      shipped: `مرحبا ${o.customer.name}، طلبك ${o.id} انشحن وبيوصلك قريباً.`,
      delivered: `مرحبا ${o.customer.name}، شكراً لثقتك! نتمنى يكون عجبك طلبك ${o.id}.`,
      cancelled: `مرحبا ${o.customer.name}، بخصوص طلبك ${o.id}…`,
    }[o.status];
    openSheet(`
      <div class="sheet-head">
        <div><p class="muted">${fmtDate(o.createdAt, true)}</p><h2 class="oid">${esc(o.id)}</h2></div>
        <button class="icon-btn" type="button" data-act="close-sheet" aria-label="إغلاق">${ic('close')}</button>
      </div>
      <div class="sheet-body">
        <div class="status-steps" role="group" aria-label="حالة الطلب">
          ${['new', 'confirmed', 'shipped', 'delivered'].map((k) => `<button type="button" data-status="${k}" aria-pressed="${o.status === k}" class="${['new', 'confirmed', 'shipped', 'delivered'].indexOf(k) <= ['new', 'confirmed', 'shipped', 'delivered'].indexOf(o.status) && o.status !== 'cancelled' ? 'past' : ''}"><i></i>${STATUS[k].t}</button>`).join('')}
        </div>
        <div class="paid-row">
          ${toggle('paid', o.paid, o.paid ? 'مدفوع' : 'غير مدفوع')}
          <span class="muted">${esc(S.METHODS[o.method] || '')}</span>
        </div>

        <section class="block">
          <h3>المنتجات</h3>
          <ul class="line-items">${o.items.map((x) => `<li>${thumb(pm.get(x.id))}<div><b>${esc(x.name)}</b><small>${optsText(x.options) ? `${esc(optsText(x.options))} · ` : ''}${money(x.price)} × ${num(x.qty)}</small></div><span>${money(x.price * x.qty)}</span></li>`).join('')}</ul>
          <div class="sums"><div><span>المنتجات</span><b>${money(o.subtotal)}</b></div>${o.discount ? `<div class="disc"><span>الخصم ${esc(o.coupon || '')}</span><b>−${money(o.discount)}</b></div>` : ''}<div><span>التوصيل</span><b>${o.shipping ? money(o.shipping) : 'مجاني'}</b></div><div class="grand"><span>المجموع</span><b>${money(o.total)}</b></div></div>
        </section>

        <section class="block">
          <h3>العميل</h3>
          <p class="cust-name">${esc(o.customer.name)}</p>
          <p class="muted" dir="ltr" style="text-align:right">${esc(o.customer.phone)}</p>
          <p>${esc(o.customer.city)}، ${esc(o.customer.address)}</p>
          ${o.customer.notes ? `<p class="quote">${esc(o.customer.notes)}</p>` : ''}
          <div class="row-btns">
            ${wa ? `<a class="btn" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer">${ic('whatsapp')}واتساب</a>` : ''}
            ${wa ? `<a class="btn" href="tel:+${wa}">${ic('phone')}اتصال</a>` : ''}
          </div>
        </section>

        <section class="block">
          <h3>ملاحظة داخلية</h3>
          <textarea class="ta" id="oNote" rows="2" placeholder="بتنشاف عندك بس">${esc(o.note || '')}</textarea>
        </section>

        ${o.history && o.history.length > 1 ? `<section class="block"><h3>السجل</h3><ul class="history">${o.history.slice().reverse().map((h) => `<li><i></i><span>${STATUS[h.s] ? STATUS[h.s].t : esc(h.s)}</span><small>${fmtDate(h.t, true)}</small></li>`).join('')}</ul></section>` : ''}

        <div class="row-btns sheet-actions">
          <button class="btn" type="button" data-act="print" data-id="${esc(o.id)}">${ic('print')}فاتورة</button>
          ${o.status !== 'cancelled' ? `<button class="btn" type="button" data-status="cancelled">إلغاء الطلب</button>` : `<button class="btn" type="button" data-status="new">إعادة فتح</button>`}
          ${can() ? `<button class="btn danger-ghost" type="button" data-act="delete-order" data-id="${esc(o.id)}">${ic('trash')}حذف</button>` : ''}
        </div>
      </div>`);
    const sheet = $('#sheetInner');
    sheet.dataset.sheetOrder = o.id;
    $('[name=paid]', sheet).addEventListener('change', async (e) => {
      const v = e.target.checked;
      if (CLOUD) { try { await cloudDo(() => cloudApi.patchOrder(o.id, { paid: v })); } catch { e.target.checked = !v; return; } }
      o.paid = v; e.target.nextElementSibling.nextElementSibling.textContent = o.paid ? 'مدفوع' : 'غير مدفوع'; save(); refreshBehind();
    });
    $('#oNote').addEventListener('change', async (e) => {
      const v = e.target.value.slice(0, 1000);
      if (CLOUD) { try { await cloudDo(() => cloudApi.patchOrder(o.id, { note: v }), 'انحفظت الملاحظة'); } catch { return; } }
      o.note = v; save();
    });
  }
  async function setStatus(id, s) {
    const o = state.orders.find((x) => x.id === id); if (!o || o.status === s) return;
    const before = o.status;
    if (CLOUD) {
      let fresh;
      try { fresh = await cloudDo(() => cloudApi.setStatus(id, s)); } catch { return; }
      Object.assign(o, fresh);
      // stock changed on the server
      if (s === 'cancelled' || before === 'cancelled') { try { await cloudApi.loadAll(); } catch { /* ignore */ } }
      toast(`${STATUS[before].t} ← ${STATUS[s].t}`);
      openOrder(id); refreshBehind();
      return;
    }
    // keep stock honest: reserve when an order is confirmed, give it back when cancelled
    if (!o.stockApplied && ['confirmed', 'shipped', 'delivered'].includes(s)) { applyStock(o, 1); o.stockApplied = true; }
    if (o.stockApplied && (s === 'cancelled' || s === 'new')) { applyStock(o, -1); o.stockApplied = false; }
    o.status = s;
    if (s === 'delivered' && o.method === 'cod') o.paid = true;
    (o.history = o.history || []).push({ t: Date.now(), s });
    save();
    toast(`${STATUS[before].t} ← ${STATUS[s].t}`);
    openOrder(id); refreshBehind();
  }
  const refreshBehind = () => {
    if (current === 'orders') renderOrderList();
    else if (current === 'dashboard' || current === 'customers') { const keep = $('#sheetInner').dataset.sheetOrder; VIEWS[current](); if (keep) openOrder(keep); }
    const newCount = state.orders.filter((o) => o.status === 'new').length;
    const em = $('#sideNav a[href="#orders"] em');
    if (em) { if (newCount) em.textContent = num(newCount); else em.remove(); }
  };

  function printInvoice(id) {
    const o = state.orders.find((x) => x.id === id); if (!o) return;
    $('#invoice').innerHTML = `
      <div class="inv-head"><div class="inv-mark">${esc(state.settings.name)}</div><div><h1>فاتورة</h1><p class="oid">${esc(o.id)}</p><p>${fmtDate(o.createdAt)}</p></div></div>
      <div class="inv-to"><h3>إلى</h3><p><b>${esc(o.customer.name)}</b></p><p dir="ltr" style="text-align:right">${esc(o.customer.phone)}</p><p>${esc(o.customer.city)}، ${esc(o.customer.address)}</p></div>
      <table><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
      <tbody>${o.items.map((x) => `<tr><td>${esc(x.name)}${optsText(x.options) ? ` <small>(${esc(optsText(x.options))})</small>` : ''}</td><td>${num(x.qty)}</td><td>${money(x.price)}</td><td>${money(x.price * x.qty)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="3">المنتجات</td><td>${money(o.subtotal)}</td></tr>${o.discount ? `<tr><td colspan="3">الخصم ${esc(o.coupon || '')}</td><td>−${money(o.discount)}</td></tr>` : ''}<tr><td colspan="3">التوصيل</td><td>${money(o.shipping)}</td></tr><tr class="g"><td colspan="3">المجموع</td><td>${money(o.total)}</td></tr></tfoot></table>
      <p class="inv-foot">طريقة الدفع: ${esc(S.METHODS[o.method] || '')} · ${o.paid ? 'مدفوع' : 'غير مدفوع'}</p>`;
    window.print();
  }

  /* ---------- Products ---------- */
  let pQuery = '', pCat = 'all';
  VIEWS.products = (arg) => {
    setActions(`<button class="btn violet" type="button" data-act="new-product">${ic('plus')}<span>منتج جديد</span></button>`);
    $('#view').innerHTML = `
      <div class="toolbar">
        <label class="search">${ic('search')}<input type="search" id="pq" placeholder="ابحث عن منتج…" value="${esc(pQuery)}"></label>
        <select class="select" id="pc" aria-label="التصنيف"><option value="all">كل التصنيفات</option>${state.categories.map((c) => `<option value="${esc(c.id)}" ${pCat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="hidden" ${pCat === 'hidden' ? 'selected' : ''}>المخفية</option><option value="low" ${pCat === 'low' ? 'selected' : ''}>مخزون قليل</option></select>
      </div>
      <div class="pgrid" id="pgrid"></div>`;
    $('#pq').addEventListener('input', (e) => { pQuery = e.target.value; renderProducts(); });
    $('#pc').addEventListener('change', (e) => { pCat = e.target.value; renderProducts(); });
    renderProducts();
    if (arg) editProduct(+arg);
  };
  function renderProducts() {
    const q = S.norm(pQuery);
    const list = state.products.filter((p) => {
      if (pCat === 'hidden' ? !p.hidden : pCat === 'low' ? !(p.stock <= 3) : pCat !== 'all' && p.cat !== pCat) return false;
      return !q || S.norm(`${p.name} ${p.store}`).includes(q);
    });
    const cats = new Map(state.categories.map((c) => [c.id, c.name]));
    $('#pgrid').innerHTML = (list.length ? list.map((p) => `
      <button class="pc${p.hidden ? ' is-hidden' : ''}" type="button" data-product="${p.id}">
        <span class="pc-img" style="--bg:${S.hex(p.bg, '#efe8dc')}">${art(p)}
          ${p.featured ? `<span class="pc-flag" title="مميز">${ic('star')}</span>` : ''}
          ${p.hidden ? '<span class="badge st-cancel pc-hidden">مخفي</span>' : ''}
        </span>
        <span class="pc-meta"><b>${esc(p.name)}</b><small>${esc(cats.get(p.cat) || 'بلا تصنيف')} · ${esc(p.store || '')}</small>
          <span class="pc-row"><strong>${money(p.price)}</strong>${p.stock <= 0 ? '<span class="badge st-cancel">نفد</span>' : p.stock <= 3 ? `<span class="badge st-new">باقي ${num(p.stock)}</span>` : `<span class="muted">${num(p.stock)} بالمخزون</span>`}</span>
        </span>
      </button>`).join('') : '') + `<button class="pc add-card" type="button" data-act="new-product">${ic('plus')}<b>منتج جديد</b></button>`;
  }

  function editProduct(id) {
    const isNew = !id;
    const p0 = isNew ? { id: Math.max(0, ...state.products.map((x) => +x.id || 0)) + 1, name: '', store: state.settings.name, price: 0, compare: 0, stock: 10, cat: (state.categories[0] || {}).id || '', kind: 'tote', bg: '#efe8dc', fg: '#f4efe6', ac: '#8a6a4a', desc: '', featured: false, hidden: false, rating: 0, reviews: 0, images: [], options: [] }
      : state.products.find((x) => x.id === id);
    if (!p0) return;
    const p = { ...p0, images: [...(p0.images && p0.images.length ? p0.images : (p0.img ? [p0.img] : []))], options: JSON.parse(JSON.stringify(p0.options || [])) };
    const kinds = S.KINDS.map((k) => `<button type="button" class="kind${p.kind === k ? ' on' : ''}" data-kind="${k}" title="${S.KIND_NAMES[k]}" aria-label="${S.KIND_NAMES[k]}">${art({ kind: k, fg: '#665a54', ac: '#332f2d' })}</button>`).join('');
    openModal(`
      <form class="editor" id="editor" novalidate>
        <div class="modal-head"><h2>${isNew ? 'منتج جديد' : 'تعديل المنتج'}</h2><button class="icon-btn" type="button" data-act="close-modal" aria-label="إغلاق">${ic('close')}</button></div>
        <div class="editor-grid">
          <div class="editor-preview">
            <div class="prev-card"><span class="prev-img" id="prevImg"></span><b id="prevName"></b><small id="prevStore"></small><strong id="prevPrice"></strong></div>
            <div class="gallery-ed" id="galleryEd"></div>
            <label class="btn wide" id="imgPick">${ic('upload')}<span>ارفع صور</span><input type="file" accept="image/*" id="imgIn" multiple hidden></label>
            <p class="muted tiny" id="imgHint">${CLOUD ? 'الصور بتنرفع على السيرفر. أول صورة هي الأساسية.' : 'أول صورة هي الأساسية. الصور بتكبّر ملف المتجر، فخليها قليلة.'}</p>
            <div class="art-tools" id="artTools">
              <p class="muted">بلا صورة؟ اختار رسمة ولون خلفية:</p>
              <div class="kinds">${kinds}</div>
              <div class="swatches">${SWATCHES.map((c) => `<button type="button" class="sw${p.bg === c ? ' on' : ''}" data-bg="${c}" style="--c:${c}" aria-label="لون ${c}"></button>`).join('')}<label class="sw custom" title="لون آخر"><input type="color" id="bgIn" value="${S.hex(p.bg, '#efe8dc')}"></label></div>
            </div>
          </div>
          <div class="editor-fields">
            ${field('اسم المنتج', `<input name="name" value="${esc(p.name)}" required maxlength="80">`)}
            <div class="two">
              ${field('المتجر / الماركة', `<input name="store" value="${esc(p.store)}" maxlength="60">`)}
              ${field('التصنيف', `<select name="cat"><option value="">بلا تصنيف</option>${state.categories.map((c) => `<option value="${esc(c.id)}" ${p.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`, state.categories.length ? '' : 'أضف تصنيفات من الإعدادات')}
            </div>
            <div class="three">
              ${field(`السعر (${esc(cur())})`, `<input name="price" type="number" min="0" step="0.01" inputmode="decimal" value="${p.price}" required dir="ltr">`)}
              ${field('قبل الخصم', `<input name="compare" type="number" min="0" step="0.01" inputmode="decimal" value="${p.compare || ''}" dir="ltr" placeholder="اختياري">`)}
              ${field('المخزون', `<input name="stock" type="number" min="0" step="1" inputmode="numeric" value="${Number.isFinite(+p.stock) ? p.stock : ''}" dir="ltr" ${CLOUD && !isNew ? 'readonly title="الكمية بتتعدّل من صفحة المخزون ليتسجّل السبب"' : ''}>`, CLOUD && !isNew ? '<a href="#inventory/' + p.id + '">عدّل الكمية من المخزون</a>' : '')}
            </div>
            ${field('الوصف', `<textarea name="desc" rows="4" maxlength="2000">${esc(p.desc)}</textarea>`)}
            <div class="opts-ed">
              <div class="opts-head"><b>المواصفات</b><small class="muted">مثل المقاس أو اللون. الزبون لازم يختار قبل ما يضيف للسلة.</small></div>
              <div id="optRows"></div>
              <button class="btn" type="button" id="optAdd">${ic('plus')}أضف مواصفة</button>
            </div>
            <div class="toggles">
              ${toggle('featured', p.featured, 'منتج مميز (بيطلع بـ«مختارات لك» وبالواجهة الـ3D)')}
              ${toggle('visible', !p.hidden, 'ظاهر بالمتجر')}
            </div>
            <p class="err" id="edErr" hidden></p>
          </div>
        </div>
        <div class="row-btns modal-foot">
          ${isNew ? '' : `<button class="btn danger-ghost" type="button" id="edDel">${ic('trash')}حذف</button><button class="btn" type="button" id="edDup">${ic('copy')}نسخة</button>`}
          <span class="grow"></span>
          <button class="btn" type="button" data-act="close-modal">إلغاء</button>
          <button class="btn violet" type="submit" id="edSave">${isNew ? 'إضافة المنتج' : 'حفظ'}</button>
        </div>
      </form>`, 'wide');

    const f = $('#editor');
    const preview = () => {
      p.img = p.images[0] || '';
      $('#prevImg').style.setProperty('--bg', S.hex(p.bg, '#efe8dc'));
      $('#prevImg').innerHTML = art(p);
      $('#prevName').textContent = f.name.value || 'اسم المنتج';
      $('#prevStore').textContent = f.store.value;
      const pr = +f.price.value || 0, cmp = +f.compare.value || 0;
      $('#prevPrice').innerHTML = `${money(pr)}${cmp > pr ? ` <s>${money(cmp)}</s>` : ''}`;
      $('#galleryEd').innerHTML = p.images.map((src, i) => `<div class="g-item${i === 0 ? ' is-cover' : ''}"><span style="--bg:${S.hex(p.bg, '#efe8dc')}">${art({ img: src })}</span>
        <div class="g-act">${i > 0 ? `<button type="button" data-gmain="${i}" title="اجعلها الأساسية">${ic('star')}</button>` : ''}<button type="button" data-gdel="${i}" title="حذف">${ic('trash')}</button></div></div>`).join('');
      $('#artTools').hidden = p.images.length > 0;
    };
    const optRow = (o, i) => `<div class="opt-row" data-i="${i}"><input class="opt-name" value="${esc(o.name)}" placeholder="الاسم: المقاس" maxlength="30"><input class="opt-vals" value="${esc((o.values || []).join('، '))}" placeholder="القيم: S، M، L، XL" maxlength="300"><button type="button" class="icon-btn sm" data-odel="${i}" aria-label="حذف">${ic('trash')}</button></div>`;
    const paintOpts = () => { $('#optRows').innerHTML = p.options.map(optRow).join(''); };
    const readOpts = () => $$('.opt-row', f).map((r) => ({
      name: $('.opt-name', r).value.trim(),
      values: $('.opt-vals', r).value.split(/[,،\n]/).map((v) => v.trim()).filter(Boolean).slice(0, 30),
    })).filter((o) => o.name && o.values.length);
    preview(); paintOpts();
    f.addEventListener('input', (e) => { if (!e.target.closest('.opt-row')) preview(); });
    $('#optAdd').addEventListener('click', () => { p.options = readOpts().concat([{ name: '', values: [] }]); paintOpts(); $('.opt-row:last-child .opt-name', f).focus(); });
    f.addEventListener('click', (e) => {
      const k = e.target.closest('[data-kind]');
      if (k) { p.kind = k.dataset.kind; $$('.kind', f).forEach((b) => b.classList.toggle('on', b === k)); preview(); }
      const sw = e.target.closest('[data-bg]');
      if (sw) { p.bg = sw.dataset.bg; $$('.sw', f).forEach((b) => b.classList.toggle('on', b === sw)); setFg(); preview(); }
      const gd = e.target.closest('[data-gdel]');
      if (gd) { p.images.splice(+gd.dataset.gdel, 1); preview(); }
      const gm = e.target.closest('[data-gmain]');
      if (gm) { const [x] = p.images.splice(+gm.dataset.gmain, 1); p.images.unshift(x); preview(); }
      const od = e.target.closest('[data-odel]');
      if (od) { p.options = readOpts().filter((_, i) => i !== +od.dataset.odel); $$('.opt-row', f)[+od.dataset.odel]?.remove(); }
    });
    const setFg = () => {
      const c = parseInt(p.bg.slice(1), 16), lum = (0.299 * (c >> 16) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255;
      p.fg = lum < 0.45 ? '#efe8dc' : '#665a54'; p.ac = lum < 0.45 ? '#b5806a' : '#332f2d';
    };
    $('#bgIn').addEventListener('input', (e) => { p.bg = e.target.value; $$('.sw', f).forEach((b) => b.classList.remove('on')); setFg(); preview(); });
    $('#imgIn').addEventListener('change', async (e) => {
      const files = [...e.target.files].slice(0, 8 - p.images.length);
      if (!files.length) { toast('الحد الأقصى ٨ صور'); return; }
      const pick = $('#imgPick'); pick.classList.add('busy');
      $('#imgHint').textContent = `عم نجهّز ${num(files.length)} صورة…`;
      for (const file of files) {
        try {
          const dataUrl = await shrinkImage(file);
          if (CLOUD) {
            const blob = await (await fetch(dataUrl)).blob();
            p.images.push(await cloudApi.upload(blob));
          } else p.images.push(dataUrl);
          preview();
        } catch (ex) { toast(CLOUD ? `ما انرفعت صورة: ${D.friendly(ex)}` : 'ما قدرنا نقرأ الصورة. جرّب JPG أو PNG.'); }
      }
      pick.classList.remove('busy'); e.target.value = '';
      $('#imgHint').textContent = 'أول صورة هي الأساسية.';
    });
    if (!isNew) {
      $('#edDel').addEventListener('click', () => {
        confirmBox(`تحذف «${p0.name}»؟`, CLOUD ? 'المنتج رح ينشال من المتجر فوراً. الطلبات القديمة ما بتتأثر.' : 'المنتج رح يختفي من المتجر بعد النشر. الطلبات القديمة ما بتتأثر.', 'حذف', async () => {
          if (CLOUD) { try { await cloudDo(() => cloudApi.deleteProduct(p0.id)); } catch { return; } }
          state.products = state.products.filter((x) => x.id !== p0.id); save(); closeModal(); toast('انحذف المنتج'); renderProducts();
        });
      });
      $('#edDup').addEventListener('click', async () => {
        let copy = { ...p0, id: Math.max(...state.products.map((x) => +x.id || 0)) + 1, name: `${p0.name} (نسخة)`, featured: false, reviews: 0, rating: 0 };
        if (CLOUD) { try { copy = await cloudDo(() => cloudApi.saveProduct(copy, true)); } catch { return; } }
        state.products.unshift(copy); save(); closeModal(); toast('انعملت نسخة'); renderProducts(); editProduct(copy.id);
      });
    }
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = f.name.value.trim(), price = +f.price.value;
      const err = $('#edErr');
      if (!name) { err.textContent = 'اكتب اسم المنتج.'; err.hidden = false; f.name.focus(); return; }
      if (!(price >= 0) || f.price.value === '') { err.textContent = 'اكتب سعر صحيح.'; err.hidden = false; f.price.focus(); return; }
      Object.assign(p, {
        name, store: f.store.value.trim(), cat: f.cat ? f.cat.value : '', price: Math.round(price * 100) / 100,
        compare: +f.compare.value > price ? Math.round(+f.compare.value * 100) / 100 : 0,
        stock: f.stock.value === '' ? 999 : Math.max(0, Math.floor(+f.stock.value)),
        desc: f.desc.value.trim(), featured: f.featured.checked, hidden: !f.visible.checked,
        options: readOpts(), img: p.images[0] || '',
      });
      let saved = { ...p };
      if (!saved.compare) delete saved.compare;
      if (!saved.img) delete saved.img;
      if (CLOUD) {
        const btn = $('#edSave'); btn.classList.add('busy');
        try { saved = await cloudDo(() => cloudApi.saveProduct(saved, isNew)); } catch { btn.classList.remove('busy'); return; }
      }
      if (isNew) state.products.unshift(saved);
      else { Object.keys(p0).forEach((k) => delete p0[k]); Object.assign(p0, saved); }
      save(); closeModal(); toast(isNew ? 'انضاف المنتج' : 'انحفظت التعديلات'); renderProducts();
    });
    setTimeout(() => f.name.focus(), 50);
  }

  function shrinkImage(file) {
    return new Promise((ok, no) => {
      if (!/^image\//.test(file.type)) { no(); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 900, sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); no(); };
      img.src = url;
    });
  }

  /* ---------- Customers ---------- */
  VIEWS.customers = () => {
    setActions(`<button class="btn" type="button" data-act="csv">${ic('download')}<span>تصدير CSV</span></button>`);
    const map = new Map();
    state.orders.forEach((o) => {
      const k = o.customer.phone.replace(/\D/g, '') || o.customer.name;
      const c = map.get(k) || { name: o.customer.name, phone: o.customer.phone, city: o.customer.city, n: 0, spent: 0, last: 0 };
      c.n++; if (live(o)) c.spent += o.total; c.last = Math.max(c.last, o.createdAt);
      map.set(k, c);
    });
    const list = [...map.values()].sort((a, b) => b.spent - a.spent);
    $('#view').innerHTML = list.length ? `
      <div class="kpis three">
        <div class="kpi"><span>العملاء</span><b>${num(list.length)}</b></div>
        <div class="kpi"><span>رجعوا اشتروا</span><b>${num(list.filter((c) => c.n > 1).length)}</b><small>${num(Math.round(list.filter((c) => c.n > 1).length / list.length * 100))}٪ من العملاء</small></div>
        <div class="kpi"><span>متوسط الإنفاق</span><b>${money(list.reduce((s, c) => s + c.spent, 0) / list.length)}</b></div>
      </div>
      <div class="table-card"><table class="table">
        <thead><tr><th>العميل</th><th class="hide-sm">الهاتف</th><th>الطلبات</th><th class="hide-sm">آخر طلب</th><th class="num">الإنفاق</th></tr></thead>
        <tbody>${list.map((c) => `<tr data-customer="${esc(c.phone)}" tabindex="0">
          <td><span class="avatar-sm">${esc((c.name || '?').trim()[0])}</span><b>${esc(c.name)}</b><small>${esc(c.city)}</small></td>
          <td class="hide-sm" dir="ltr" style="text-align:right">${esc(c.phone)}</td>
          <td>${num(c.n)}</td>
          <td class="hide-sm">${ago(c.last)}</td>
          <td class="num"><b>${money(c.spent)}</b></td></tr>`).join('')}</tbody></table></div>`
      : empty('ما في عملاء لسا', 'العملاء بيطلعوا هون تلقائياً من الطلبات.', '');
    VIEWS.customers.list = list;
  };

  /* ---------- Payments ---------- */
  VIEWS.payments = () => {
    const s = state.settings, pay = s.payments;
    $('#view').innerHTML = `
      <form class="settings" id="payForm" novalidate>
        <section class="card set-card">
          <div class="set-head"><span class="set-ic">${ic('whatsapp')}</span><div><h2>استلام الطلبات</h2><p class="muted">لما الزبون يكمّل طلبه، بيبعتلك رسالة واتساب جاهزة فيها كل التفاصيل ورمز بتلصقه باللوحة.</p></div></div>
          ${field('رقم واتساب المتجر', `<input name="whatsapp" type="tel" dir="ltr" placeholder="+961 70 000 000" value="${esc(s.whatsapp)}">`, 'مع رمز البلد. مثال: ‎+962791234567')}
        </section>

        <section class="card set-card">
          <div class="set-head"><span class="set-ic">${ic('payments')}</span><div><h2>طرق الدفع</h2><p class="muted">الموقع ما بيطلب ولا بيخزّن أرقام بطاقات. الدفع الإلكتروني بيصير على صفحة PayPal نفسها.</p></div></div>
          <div class="method">
            ${toggle('cod', pay.cod.on, '<b>الدفع عند الاستلام</b>')}
          </div>
          <div class="method">
            ${toggle('paypal', pay.paypal.on, '<b>PayPal</b> <small class="muted">الزبون بيدفع بحسابه أو ببطاقته كضيف</small>')}
            <div class="method-fields" ${pay.paypal.on ? '' : 'hidden'}>
              <div class="two">
                ${field('اسم PayPal.Me', `<div class="prefix" dir="ltr"><span>paypal.me/</span><input name="paypalUser" value="${esc(pay.paypal.user)}" placeholder="yourname"></div>`, 'بتعمله من paypal.me إذا ما عندك')}
                ${field('عملة الدفع على PayPal', `<select name="currencyCode">${PAYPAL_CODES.map((c) => `<option ${s.currencyCode === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`, 'لازم تكون نفس عملة أسعارك')}
              </div>
              <button class="link" type="button" id="ppTest">${ic('eye')}جرّب الرابط</button>
            </div>
          </div>
          <div class="method">
            ${toggle('bank', pay.bank.on, '<b>تحويل بنكي</b>')}
            <div class="method-fields" ${pay.bank.on ? '' : 'hidden'}>
              <div class="two">
                ${field('اسم البنك', `<input name="bankName" value="${esc(pay.bank.bank)}">`)}
                ${field('اسم صاحب الحساب', `<input name="bankHolder" value="${esc(pay.bank.holder)}">`)}
              </div>
              ${field('IBAN / رقم الحساب', `<input name="bankIban" dir="ltr" value="${esc(pay.bank.iban)}">`)}
            </div>
          </div>
        </section>

        <section class="card set-card">
          <div class="set-head"><span class="set-ic">${ic('orders')}</span><div><h2>الشحن والعملة</h2></div></div>
          <div class="three">
            ${field(`رسوم التوصيل (${esc(cur())})`, `<input name="fee" type="number" min="0" step="0.01" dir="ltr" value="${s.shipping.fee}">`)}
            ${field('مجاني فوق', `<input name="freeOver" type="number" min="0" step="0.01" dir="ltr" value="${s.shipping.freeOver || ''}" placeholder="بلا">`, 'اتركه فاضي إذا ما في توصيل مجاني')}
            ${field('رمز العملة', `<input name="currency" maxlength="5" value="${esc(s.currency)}">`, 'بيبيّن جنب الأسعار: $ أو د.أ أو ر.س')}
          </div>
        </section>
        <div class="save-bar"><span class="muted" id="paySaved"></span><button class="btn violet" type="submit">حفظ</button></div>
      </form>`;
    const f = $('#payForm');
    ['paypal', 'bank'].forEach((k) => f[k].addEventListener('change', (e) => { e.target.closest('.method').querySelector('.method-fields').hidden = !e.target.checked; }));
    $('#ppTest').addEventListener('click', () => {
      const u = f.paypalUser.value.trim().replace(/^@/, '');
      if (!u) { toast('اكتب اسم PayPal.Me أولاً'); return; }
      window.open(`https://www.paypal.com/paypalme/${encodeURIComponent(u)}/1${f.currencyCode.value}`, '_blank', 'noopener');
    });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const wa = S.toLatinDigits(f.whatsapp.value).replace(/[^\d+]/g, '');
      if (f.paypal.checked && !f.paypalUser.value.trim()) { toast('اكتب اسم PayPal.Me أو طفّي PayPal'); f.paypalUser.focus(); return; }
      if (f.bank.checked && !f.bankIban.value.trim()) { toast('اكتب رقم الحساب أو طفّي التحويل البنكي'); f.bankIban.focus(); return; }
      if (!f.cod.checked && !f.paypal.checked && !f.bank.checked) { toast('لازم تشغّل طريقة دفع وحدة على الأقل'); return; }
      Object.assign(s, {
        whatsapp: wa, currency: f.currency.value.trim() || '$', currencyCode: f.currencyCode.value,
        shipping: { fee: Math.max(0, +f.fee.value || 0), freeOver: Math.max(0, +f.freeOver.value || 0) },
        payments: {
          cod: { on: f.cod.checked },
          paypal: { on: f.paypal.checked, user: f.paypalUser.value.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?paypal\.me\//i, '') },
          bank: { on: f.bank.checked, bank: f.bankName.value.trim(), holder: f.bankHolder.value.trim(), iban: f.bankIban.value.trim() },
        },
      });
      if (CLOUD) { try { await cloudDo(() => cloudApi.saveSettings(), 'انحفظ ووصل للمتجر'); } catch { return; } }
      else { save(); toast('انحفظ. لا تنسى تنشر ليوصل للمتجر.'); }
      $('#paySaved').textContent = 'محفوظ ✓';
    });
  };

  /* ---------- Settings ---------- */
  VIEWS.settings = () => {
    const s = state.settings;
    const ct = s.contact || {}, pg = s.pages || {};
    const demoN = state.orders.filter((o) => o.demo).length;
    $('#view').innerHTML = `
      <form class="settings" id="setForm" novalidate>
        <section class="card set-card">
          <div class="set-head"><span class="set-ic">${ic('settings')}</span><div><h2>معلومات المتجر</h2></div></div>
          <div class="two">
            ${field('اسم المتجر', `<input name="name" maxlength="40" value="${esc(s.name)}" required>`)}
            ${field('الشعار القصير', `<input name="tagline" maxlength="80" value="${esc(s.tagline)}">`)}
          </div>
          <div class="two">
            ${field('شريط الإعلان', `<input name="banner" maxlength="60" value="${esc(s.banner)}" placeholder="مثلاً: توصيل مجاني فوق ٥٠$">`, 'اتركه فاضي لتخفي الشريط')}
            ${field('سطر تحت الإعلان', `<input name="bannerSub" maxlength="60" value="${esc(s.bannerSub)}">`)}
          </div>
        </section>
        <section class="card set-card">
          <div class="set-head"><span class="set-ic">${ic('whatsapp')}</span><div><h2>التواصل والسوشال</h2><p class="muted">بيطلعوا بصفحة «تواصل معنا» وبأسفل المتجر. اتركه فاضي لتخفيه.</p></div></div>
          <div class="three">
            ${field('الإيميل', `<input name="cEmail" type="email" dir="ltr" value="${esc(ct.email)}" maxlength="120">`)}
            ${field('الهاتف', `<input name="cPhone" type="tel" dir="ltr" value="${esc(ct.phone)}" maxlength="40">`)}
            ${field('العنوان / ساعات العمل', `<input name="cAddress" value="${esc(ct.address)}" maxlength="160">`)}
          </div>
          <div class="three">
            ${field('Instagram', `<input name="cInstagram" dir="ltr" placeholder="https://instagram.com/…" value="${esc(ct.instagram)}" maxlength="200">`)}
            ${field('TikTok', `<input name="cTiktok" dir="ltr" placeholder="https://tiktok.com/@…" value="${esc(ct.tiktok)}" maxlength="200">`)}
            ${field('Facebook', `<input name="cFacebook" dir="ltr" placeholder="https://facebook.com/…" value="${esc(ct.facebook)}" maxlength="200">`)}
          </div>
        </section>
        <section class="card set-card">
          <div class="set-head"><span class="set-ic">${ic('orders')}</span><div><h2>صفحات المتجر</h2><p class="muted">نصوص «من نحن» والتوصيل والإرجاع والأسئلة الشائعة. سطر فاضي بيفصل بين الفقرات.</p></div></div>
          ${field('من نحن', `<textarea name="pAbout" rows="4" maxlength="3000">${esc(pg.about)}</textarea>`)}
          <div class="two">
            ${field('سياسة التوصيل', `<textarea name="pShipping" rows="5" maxlength="3000">${esc(pg.shipping)}</textarea>`)}
            ${field('سياسة الإرجاع', `<textarea name="pReturns" rows="5" maxlength="3000">${esc(pg.returns)}</textarea>`)}
          </div>
          ${field('الأسئلة الشائعة', `<textarea name="pFaq" rows="6" maxlength="5000" placeholder="كل سؤال بسطر لحاله، وتحته جوابه، وسطر فاضي بين كل سؤال والتاني">${esc(pg.faq)}</textarea>`, 'مثال: «قديش بياخد التوصيل؟» وتحته «من ٢ لـ ٤ أيام»')}
        </section>
        <section class="card set-card">
          <div class="set-head"><span class="set-ic">${ic('products')}</span><div><h2>التصنيفات</h2><p class="muted">بالترتيب يلي بتطلع فيه بالمتجر.</p></div></div>
          <ul class="cats" id="cats">${state.categories.map((c, i) => catRow(c, i)).join('')}</ul>
          <button class="btn" type="button" id="catAdd">${ic('plus')}تصنيف جديد</button>
        </section>
        <div class="save-bar"><span class="muted" id="setSaved"></span><button class="btn violet" type="submit">حفظ</button></div>
      </form>

      <section class="card set-card">
        <div class="set-head"><span class="set-ic">${ic('import')}</span><div><h2>نسخة احتياطية</h2><p class="muted">${CLOUD ? 'البيانات محفوظة على السيرفر. فيك تنزّل نسخة منها كملف للأرشيف.' : 'بيانات اللوحة محفوظة على هالجهاز بس. خود نسخة كل فترة، وفيك ترجعها على أي جهاز.'}</p></div></div>
        <div class="row-btns">
          <button class="btn" type="button" data-act="backup">${ic('download')}تنزيل نسخة احتياطية</button>
          ${CLOUD ? '' : `<label class="btn">${ic('upload')}استرجاع نسخة<input type="file" accept="application/json,.json" id="restoreIn" hidden></label>`}
        </div>
      </section>

      <section class="card set-card">
        <div class="set-head"><span class="set-ic">${ic('eyeoff')}</span><div><h2>الأمان</h2><p class="muted">اللوحة بتقفل لحالها بعد ١٥ دقيقة بلا حركة.${CLOUD ? ` مسجّل دخول بـ <b dir="ltr">${esc(D.auth.user.email)}</b>.` : ''}</p></div></div>
        ${CLOUD ? `<form class="pin-form" id="cpwForm" novalidate><div class="two">${field('كلمة سر جديدة', '<input name="n1" type="password" autocomplete="new-password" dir="ltr">')}${field('أعد كتابتها', '<input name="n2" type="password" autocomplete="new-password" dir="ltr">')}</div><button class="btn" type="submit">تغيير كلمة السر</button></form>` : ''}
        <form class="pin-form" id="pinForm" novalidate ${CLOUD ? 'hidden' : ''}>
          <div class="three">
            ${field('الرمز الحالي', '<input name="old" type="password" inputmode="numeric" autocomplete="current-password">')}
            ${field('رمز جديد', '<input name="n1" type="password" inputmode="numeric" autocomplete="new-password">')}
            ${field('أعد الرمز الجديد', '<input name="n2" type="password" inputmode="numeric" autocomplete="new-password">')}
          </div>
          <button class="btn" type="submit">تغيير الرمز</button>
        </form>
      </section>

      <section class="card set-card danger-zone">
        <div class="set-head"><span class="set-ic">${ic('alert')}</span><div><h2>منطقة الخطر</h2></div></div>
        <div class="row-btns">
          ${CLOUD ? '' : `<button class="btn" type="button" data-act="demo">${ic('plus')}أضف طلبات تجريبية</button>`}
          ${demoN ? `<button class="btn" type="button" data-act="clear-demo">${ic('trash')}امسح الطلبات التجريبية (${num(demoN)})</button>` : ''}
          ${CLOUD ? '<p class="muted">لحذف بيانات من السيرفر، استعمل صفحات الطلبات والمنتجات، أو لوحة Supabase.</p>' : `<button class="btn danger-ghost" type="button" data-act="wipe">${ic('trash')}امسح كل بيانات اللوحة من هالجهاز</button>`}
        </div>
      </section>`;

    const f = $('#setForm');
    $('#catAdd').addEventListener('click', () => {
      const c = { id: `c${Date.now().toString(36)}`, name: '', c: SWATCHES[state.categories.length % SWATCHES.length] };
      state.categories.push(c);
      $('#cats').insertAdjacentHTML('beforeend', catRow(c, state.categories.length - 1));
      $('#cats li:last-child input[type=text]').focus();
    });
    $('#cats').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat-act]'); if (!b) return;
      const li = b.closest('li'), i = +li.dataset.i, c = state.categories[i];
      if (b.dataset.catAct === 'del') {
        const used = state.products.filter((p) => p.cat === c.id).length;
        if (used) { toast(`فيه ${num(used)} منتج بهالتصنيف. انقلهم لتصنيف تاني أولاً.`); return; }
        state.categories.splice(i, 1); VIEWS.settings();
      } else {
        const j = b.dataset.catAct === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= state.categories.length) return;
        collectCats();
        [state.categories[i], state.categories[j]] = [state.categories[j], state.categories[i]];
        $('#cats').innerHTML = state.categories.map(catRow).join('');
      }
    });
    function collectCats() {
      $$('#cats li').forEach((li) => {
        const c = state.categories[+li.dataset.i];
        c.name = $('input[type=text]', li).value.trim(); c.c = $('input[type=color]', li).value;
      });
    }
    const catsBefore = state.categories.map((c) => c.id);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      collectCats();
      if (state.categories.some((c) => !c.name)) { toast('في تصنيف بلا اسم'); return; }
      if (!f.name.value.trim()) { toast('اكتب اسم المتجر'); f.name.focus(); return; }
      const url = (v) => { v = v.trim(); return /^https:\/\/[^\s"'<>]+$/i.test(v) ? v : ''; };
      const badUrl = ['cInstagram', 'cTiktok', 'cFacebook'].find((k) => f[k].value.trim() && !url(f[k].value));
      if (badUrl) { toast('روابط السوشال لازم تبلّش بـ https://'); f[badUrl].focus(); return; }
      if (f.cEmail.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.cEmail.value.trim())) { toast('الإيميل مش صحيح'); f.cEmail.focus(); return; }
      Object.assign(s, {
        name: f.name.value.trim(), tagline: f.tagline.value.trim(), banner: f.banner.value.trim(), bannerSub: f.bannerSub.value.trim(),
        contact: { email: f.cEmail.value.trim(), phone: S.toLatinDigits(f.cPhone.value).replace(/[^\d+ ]/g, '').trim(), address: f.cAddress.value.trim(), instagram: url(f.cInstagram.value), tiktok: url(f.cTiktok.value), facebook: url(f.cFacebook.value) },
        pages: { about: f.pAbout.value.trim(), shipping: f.pShipping.value.trim(), returns: f.pReturns.value.trim(), faq: f.pFaq.value.trim() },
      });
      if (CLOUD) {
        const removed = catsBefore.filter((id) => !state.categories.some((c) => c.id === id));
        try { await cloudDo(async () => { await cloudApi.saveCategories(removed); await cloudApi.saveSettings(); }, 'انحفظ ووصل للمتجر'); } catch { return; }
        catsBefore.splice(0, catsBefore.length, ...state.categories.map((c) => c.id));
      } else { save(); toast('انحفظ. لا تنسى تنشر ليوصل للمتجر.'); }
      $('#setSaved').textContent = 'محفوظ ✓';
    });
    if (!CLOUD) $('#restoreIn').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const d = JSON.parse(await file.text());
        if (!d || d.kind !== 'raff-backup' || !Array.isArray(d.state.products)) throw new Error();
        confirmBox('تسترجع النسخة؟', `رح تستبدل كل بيانات اللوحة الحالية بنسخة ${fmtDate(d.at, true)}.`, 'استرجاع', () => {
          state = d.state; migrate(); save(); toast('رجعت النسخة'); route();
        });
      } catch { toast('الملف مش نسخة احتياطية صحيحة'); }
    });
    if (CLOUD) $('#cpwForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const n1 = e.target.n1.value;
      if (n1.length < 8) { toast('كلمة السر لازم تكون ٨ أحرف أو أكثر'); return; }
      if (n1 !== e.target.n2.value) { toast('مش متطابقة'); return; }
      try { await cloudDo(() => D.auth.updatePassword(n1), 'تغيّرت كلمة السر'); e.target.reset(); } catch { /* shown */ }
    });
    $('#pinForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pf = e.target, oldPin = S.toLatinDigits(pf.old.value), n1 = S.toLatinDigits(pf.n1.value);
      if (n1.length < 6) { toast('الرمز الجديد لازم يكون ٦ أرقام أو أكثر'); return; }
      if (n1 !== S.toLatinDigits(pf.n2.value)) { toast('الرمزين الجداد مش متطابقين'); return; }
      const st = readStored();
      try { const k = await deriveKey(oldPin, unb64(st.salt)); await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(st.iv) }, k, unb64(st.ct)); }
      catch { toast('الرمز الحالي غلط'); return; }
      salt = crypto.getRandomValues(new Uint8Array(16)); key = await deriveKey(n1, salt); await save();
      pf.reset(); toast('تغيّر الرمز');
    });
  };
  const catRow = (c, i) => `<li data-i="${i}"><input type="color" value="${S.hex(c.c, '#cccccc')}" aria-label="لون التصنيف"><input type="text" value="${esc(c.name)}" placeholder="اسم التصنيف" maxlength="30"><span class="muted">${num(state.products.filter((p) => p.cat === c.id).length)} منتج</span>
    <button type="button" class="icon-btn sm" data-cat-act="up" aria-label="لفوق"><svg class="ic" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button>
    <button type="button" class="icon-btn sm" data-cat-act="down" aria-label="لتحت"><svg class="ic" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
    <button type="button" class="icon-btn sm" data-cat-act="del" aria-label="حذف">${ic('trash')}</button></li>`;

  /* ---------- Messages (answer system) ---------- */
  const CONV_ST = { open: { t: 'بانتظار الرد', c: 'st-new' }, answered: { t: 'تم الرد', c: 'st-done' }, closed: { t: 'مغلقة', c: 'st-unpaid' } };
  const QUICK = [
    'أهلاً فيك! شكراً لتواصلك معنا.',
    'طلبك قيد التجهيز، ورح نبعتلك رسالة أول ما ينشحن.',
    'طلبك انشحن، وبيوصلك خلال ٢ لـ ٥ أيام عمل.',
    'أكيد فيك ترجعه خلال ١٤ يوم. ابعتلنا رقم الطلب ومنرتّب الاستلام.',
    'المنتج رح يرجع للمخزون قريباً، منبعتلك أول ما يتوفّر.',
  ];
  let convFilter = 'open', convQuery = '';
  function refreshNavBadges() {
    const set = (href, n) => {
      const a = $(`#sideNav a[href="${href}"]`); if (!a) return;
      let em = a.querySelector('em');
      if (n) { if (!em) { em = document.createElement('em'); a.append(em); } em.textContent = num(n); } else if (em) em.remove();
    };
    set('#messages', state.conversations.filter((c) => c.unread_admin && c.status !== 'closed').length);
    set('#questions', state.questions.filter((q) => q.status === 'pending').length);
  }
  const serverOnly = (title, text) => `<div class="card">${empty(title, text, `<a class="btn violet" href="#server">${ic('server')}ربط السيرفر</a>`)}</div>`;

  VIEWS.messages = (arg) => {
    if (!CLOUD) {
      const wa = String(state.settings.whatsapp || '').replace(/\D/g, '');
      $('#view').innerHTML = serverOnly('الرسائل بتوصل على واتساب حالياً', `بدون سيرفر، أسئلة الزبائن من زر المساعدة بتنفتح كرسالة واتساب${wa ? ` على +${esc(wa)}` : ' (حط رقمك من «الدفع والشحن»)'}. اربط المتجر بـ Supabase ليصير عندك صندوق رسائل كامل هون مع ردود ومتابعة.`);
      return;
    }
    setActions(`<button class="btn" type="button" data-act="reload">${ic('refresh')}<span>تحديث</span></button>`);
    const counts = { open: 0, answered: 0, closed: 0, all: state.conversations.length };
    state.conversations.forEach((c) => { counts[c.status]++; });
    $('#view').innerHTML = `
      <div class="toolbar"><label class="search">${ic('search')}<input type="search" id="cq" placeholder="ابحث بالاسم، الموضوع، رقم الطلب…" value="${esc(convQuery)}"></label></div>
      <div class="chips" role="group" aria-label="فلترة الرسائل">${[['open', 'بانتظار الرد'], ['answered', 'تم الرد'], ['closed', 'مغلقة'], ['all', 'الكل']].map(([k, t]) => `<button type="button" data-cfilter="${k}" aria-pressed="${convFilter === k}">${t}<em>${num(counts[k])}</em></button>`).join('')}</div>
      <div id="inbox"></div>`;
    $('#cq').addEventListener('input', (e) => { convQuery = e.target.value; renderInbox(); });
    renderInbox();
    if (arg) openConversation(arg);
  };
  function renderInbox() {
    const box = $('#inbox'); if (!box) return;
    const q = S.norm(convQuery);
    const list = state.conversations.filter((c) => (convFilter === 'all' || c.status === convFilter)
      && (!q || S.norm(`${c.name} ${c.subject} ${c.order_id || ''} ${c.contact} ${c.last_message}`).includes(q)));
    if (!state.conversations.length) { box.innerHTML = `<div class="card">${empty('ما في رسائل لسا', 'لما زبون يسأل من زر المساعدة أو صفحة التواصل، الرسالة بتوصل هون وبترد عليها مباشرة.', '')}</div>`; return; }
    if (!list.length) { box.innerHTML = '<p class="muted pad center">ما في رسائل بهالفلتر.</p>'; return; }
    box.innerHTML = `<ul class="inbox">${list.map((c) => `<li><button type="button" data-conv="${esc(c.id)}" class="${c.unread_admin && c.status !== 'closed' ? 'unread' : ''}">
      <span class="avatar-sm">${esc((c.name || '?').trim()[0])}</span>
      <span class="ib-main"><b>${esc(c.name)}</b><span class="ib-sub">${esc(c.subject || 'محادثة')}${c.order_id ? ` · <span class="oid">${esc(c.order_id)}</span>` : ''}</span><small>${esc((c.last_message || '').slice(0, 110))}</small></span>
      <span class="ib-side"><small>${ago(new Date(c.updated_at).getTime())}</small><span class="badge ${CONV_ST[c.status].c}">${CONV_ST[c.status].t}</span></span>
    </button></li>`).join('')}</ul>`;
  }
  async function openConversation(id, keepDraft) {
    const meta = state.conversations.find((c) => c.id === id);
    const draft = keepDraft && $('#convReply') ? $('#convReply').value : '';
    if (!keepDraft) openSheet('<div class="sheet-body"><p class="muted pad center">عم نحمّل المحادثة…</p></div>');
    let c;
    try { c = await cloudApi.conversation(id); } catch (e) { toast(D.friendly(e)); return; }
    if (!c) { toast('المحادثة مش موجودة'); closeSheet(); return; }
    if (meta && meta.unread_admin) {
      meta.unread_admin = false; refreshNavBadges(); renderInbox();
      cloudApi.setConversation(id, { unread_admin: false }).catch(() => {});
    }
    const order = c.order_id ? state.orders.find((o) => o.id === c.order_id) : null;
    const prod = c.product_id ? byPid().get(+c.product_id) : null;
    const contact = meta ? meta.contact : '';
    const wa = /^[+\d\s-]{7,}$/.test(contact || '') ? contact.replace(/\D/g, '') : '';
    openSheet(`
      <div class="sheet-head">
        <div><p class="muted">${esc(meta ? meta.name : c.name)}${contact ? ` · <span dir="ltr">${esc(contact)}</span>` : ''}</p><h2>${esc(c.subject || 'محادثة')}</h2></div>
        <button class="icon-btn" type="button" data-act="close-sheet" aria-label="إغلاق">${ic('close')}</button>
      </div>
      <div class="sheet-body conv">
        ${order || prod || c.order_id ? `<div class="conv-ctx">${order ? `<button type="button" class="ctx-chip" data-order="${esc(order.id)}">${ic('orders')}طلب <span class="oid">${esc(order.id)}</span> · ${money(order.total)} · ${STATUS[order.status].t}</button>` : c.order_id ? `<span class="ctx-chip">${ic('orders')}طلب <span class="oid">${esc(c.order_id)}</span> (مش موجود)</span>` : ''}${prod ? `<button type="button" class="ctx-chip" data-product="${prod.id}">${thumb(prod)}${esc(prod.name)}</button>` : ''}</div>` : ''}
        <ol class="conv-msgs" id="convMsgs">${c.messages.map((m) => `<li class="cm-${esc(m.sender)}"><span>${m.sender === 'customer' ? esc(meta ? meta.name : 'الزبون') : m.sender === 'bot' ? 'جواب تلقائي' : 'أنت'}</span><p>${esc(m.body).replace(/\n/g, '<br>')}</p><time>${fmtDate(new Date(m.created_at).getTime(), true)}</time></li>`).join('')}</ol>
        <div class="quick">${QUICK.map((q, i) => `<button type="button" data-quick="${i}">${esc(q.slice(0, 34))}…</button>`).join('')}</div>
        <form class="conv-reply" id="convForm"><label class="sr" for="convReply">الرد</label><textarea id="convReply" rows="3" maxlength="2000" placeholder="اكتب ردّك… (Enter للإرسال، Shift+Enter لسطر جديد)">${esc(draft)}</textarea><button class="btn violet" type="submit">${ic('send')}إرسال</button></form>
        <div class="row-btns sheet-actions">
          ${c.status !== 'closed' ? `<button class="btn" type="button" data-conv-status="closed">إغلاق المحادثة</button>` : `<button class="btn" type="button" data-conv-status="open">إعادة فتح</button>`}
          ${wa ? `<a class="btn" href="https://wa.me/${wa}" target="_blank" rel="noopener noreferrer">${ic('whatsapp')}واتساب</a>` : ''}
          <button class="btn danger-ghost" type="button" data-act="delete-conv">${ic('trash')}حذف</button>
        </div>
      </div>`);
    const sheetEl = $('#sheetInner'); sheetEl.dataset.sheetConv = id;
    const msgs = $('#convMsgs'); msgs.scrollTop = msgs.scrollHeight;
    const ta = $('#convReply');
    if (!keepDraft) setTimeout(() => ta.focus(), 50);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#convForm').requestSubmit(); } });
    $('#convForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = ta.value.trim(); if (!v) return;
      const b = e.target.querySelector('button'); b.classList.add('busy');
      try {
        await cloudDo(() => cloudApi.reply(id, v), 'انبعت الرد');
        if (meta) Object.assign(meta, { status: 'answered', unread_admin: false, last_message: v.slice(0, 200), updated_at: new Date().toISOString() });
        ta.value = ''; renderInbox(); openConversation(id);
      } catch { b.classList.remove('busy'); }
    });
  }

  /* ---------- Product questions ---------- */
  let qFilter = 'pending';
  VIEWS.questions = () => {
    if (!CLOUD) {
      $('#view').innerHTML = serverOnly('أسئلة المنتجات بتحتاج السيرفر', 'بدون سيرفر، زر «اسأل عن المنتج» بيفتح رسالة واتساب للمتجر. مع السيرفر، الأسئلة بتوصل هون، بتجاوب عليها، وبتنتشر تحت المنتج ليستفيد كل الزبائن.');
      return;
    }
    setActions(`<button class="btn" type="button" data-act="reload">${ic('refresh')}<span>تحديث</span></button>`);
    const pm = byPid();
    const counts = { pending: 0, published: 0, hidden: 0 };
    state.questions.forEach((q) => { counts[q.status]++; });
    const list = state.questions.filter((q) => q.status === qFilter);
    $('#view').innerHTML = `
      <div class="chips" role="group">${[['pending', 'بانتظار الجواب'], ['published', 'منشورة'], ['hidden', 'مخفية']].map(([k, t]) => `<button type="button" data-qfilter="${k}" aria-pressed="${qFilter === k}">${t}<em>${num(counts[k])}</em></button>`).join('')}</div>
      ${list.length ? `<ul class="rv-admin">${list.map((q) => { const p = pm.get(+q.product_id); return `<li class="card">
        <div class="rva-head">${thumb(p)}<div><b>${esc(p ? p.name : 'منتج محذوف')}</b><small>${esc(q.author || 'زائر')} · ${fmtDate(new Date(q.created_at).getTime())}</small></div></div>
        <p class="qa-qtext">${esc(q.question)}</p>
        <form class="qa-answer" data-qa="${q.id}"><label class="sr" for="qa${q.id}">الجواب</label><textarea id="qa${q.id}" rows="2" maxlength="1500" placeholder="اكتب الجواب…">${esc(q.answer || '')}</textarea>
          <div class="row-btns"><button class="btn violet" type="submit">${ic('check')}${q.status === 'published' ? 'تحديث الجواب' : 'جاوب وانشر'}</button>${q.status !== 'hidden' ? `<button class="btn" type="button" data-qa-act="hide">إخفاء</button>` : `<button class="btn" type="button" data-qa-act="unhide">إرجاع</button>`}<button class="btn danger-ghost" type="button" data-qa-act="delete">${ic('trash')}حذف</button></div>
        </form>
      </li>`; }).join('')}</ul>` : `<p class="muted pad center">${qFilter === 'pending' ? 'ما في أسئلة بانتظارك.' : 'ما في شي هون.'}</p>`}`;
    $$('.qa-answer').forEach((f) => f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = +f.dataset.qa, ans = f.querySelector('textarea').value.trim();
      if (ans.length < 2) { toast('اكتب الجواب'); return; }
      try { await cloudDo(() => cloudApi.answerQuestion(id, { answer: ans, status: 'published', answered_at: new Date().toISOString() }), 'انتشر السؤال مع الجواب'); } catch { return; }
      Object.assign(state.questions.find((x) => x.id === id), { answer: ans, status: 'published', answered_at: new Date().toISOString() });
      VIEWS.questions(); refreshNavBadges();
    }));
  };
  async function questionAction(id, act) {
    const q = state.questions.find((x) => x.id === id); if (!q) return;
    try {
      if (act === 'delete') { await cloudDo(() => cloudApi.deleteQuestion(id), 'انحذف السؤال'); state.questions = state.questions.filter((x) => x.id !== id); }
      else { const st = act === 'hide' ? 'hidden' : (q.answer ? 'published' : 'pending'); await cloudDo(() => cloudApi.answerQuestion(id, { status: st })); q.status = st; }
    } catch { return; }
    VIEWS.questions(); refreshNavBadges();
  }

  /* ---------- Inventory ---------- */
  const REASONS = { restock: 'توريد بضاعة', count: 'جرد', damage: 'تالف/مفقود', return: 'مرتجع', manual: 'تعديل يدوي', order: 'طلب', cancel: 'إلغاء طلب', reopen: 'إعادة فتح طلب', initial: 'كمية البداية' };
  let invFilter = 'all', invQuery = '';
  VIEWS.inventory = (arg) => {
    const ps = state.products;
    const th = (p) => (Number.isFinite(+p.threshold) ? +p.threshold : 5);
    const out = ps.filter((p) => p.stock <= 0).length, low = ps.filter((p) => p.stock > 0 && p.stock <= th(p)).length;
    const units = ps.reduce((s2, p) => s2 + Math.max(0, +p.stock || 0), 0);
    const value = ps.reduce((s2, p) => s2 + Math.max(0, +p.stock || 0) * (+p.price || 0), 0);
    $('#view').innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>قطع بالمخزون</span><b>${num(units)}</b><small>${num(ps.length)} منتج</small></div>
        <div class="kpi"><span>قيمة المخزون (بسعر البيع)</span><b>${money(value)}</b></div>
        <button class="kpi" type="button" data-invf="low"><span>قليل</span><b>${num(low)}</b><small>تحت حد التنبيه</small></button>
        <button class="kpi" type="button" data-invf="out"><span>نفد</span><b>${num(out)}</b></button>
      </div>
      <div class="toolbar"><label class="search">${ic('search')}<input type="search" id="iq" placeholder="ابحث عن منتج…" value="${esc(invQuery)}"></label></div>
      <div class="chips" role="group">${[['all', 'الكل'], ['low', 'قليل'], ['out', 'نفد']].map(([k, t]) => `<button type="button" data-invf="${k}" aria-pressed="${invFilter === k}">${t}</button>`).join('')}</div>
      <div id="invList"></div>
      ${CLOUD ? '' : '<p class="muted pad">سجل حركات المخزون والتنبيهات التلقائية بيشتغلوا بعد ربط السيرفر. هون فيك تعدّل الكميات وتنشرها.</p>'}`;
    $('#iq').addEventListener('input', (e) => { invQuery = e.target.value; renderInv(); });
    renderInv();
    if (arg) openStock(+arg);
  };
  function renderInv() {
    const q = S.norm(invQuery), th = (p) => (Number.isFinite(+p.threshold) ? +p.threshold : 5);
    const list = state.products.filter((p) => (invFilter === 'all' || (invFilter === 'out' ? p.stock <= 0 : p.stock > 0 && p.stock <= th(p))) && (!q || S.norm(`${p.name} ${p.store}`).includes(q)))
      .sort((a, b) => (a.stock - th(a)) - (b.stock - th(b)));
    $('#invList').innerHTML = list.length ? `<div class="table-card"><table class="table">
      <thead><tr><th>المنتج</th><th class="num">الكمية</th><th class="hide-sm num">حد التنبيه</th><th>الحالة</th><th class="num">تعديل سريع</th></tr></thead>
      <tbody>${list.map((p) => `<tr data-stock="${p.id}" tabindex="0">
        <td><span class="inv-name">${thumb(p)}<span><b>${esc(p.name)}</b><small>${esc(p.store || '')}</small></span></span></td>
        <td class="num"><b class="inv-qty">${num(p.stock)}</b></td>
        <td class="hide-sm num">${num(th(p))}</td>
        <td>${p.stock <= 0 ? '<span class="badge st-cancel">نفد</span>' : p.stock <= th(p) ? '<span class="badge st-new">قليل</span>' : '<span class="badge st-done">متوفر</span>'}</td>
        <td class="num"><span class="qadj"><button type="button" class="icon-btn sm" data-qadj="-1" aria-label="ناقص واحد">−</button><button type="button" class="icon-btn sm" data-qadj="1" aria-label="زائد واحد">+</button></span></td>
      </tr>`).join('')}</tbody></table></div>` : '<p class="muted pad center">ما في منتجات بهالفلتر.</p>';
  }
  async function adjust(pid, delta, reason, note) {
    const p = state.products.find((x) => x.id === pid); if (!p || !delta) return;
    if (CLOUD) { try { p.stock = await cloudDo(() => cloudApi.adjustStock(pid, delta, reason, note)); } catch { return; } }
    else { p.stock = Math.max(0, (+p.stock || 0) + delta); save(); }
    toast(`${p.name}: ${num(p.stock)} قطعة`);
  }
  async function openStock(pid) {
    const p = state.products.find((x) => x.id === pid); if (!p) return;
    openSheet(`
      <div class="sheet-head"><div><p class="muted">${esc(p.store || '')}</p><h2>${esc(p.name)}</h2></div><button class="icon-btn" type="button" data-act="close-sheet" aria-label="إغلاق">${ic('close')}</button></div>
      <div class="sheet-body">
        <div class="inv-now"><span>الكمية الحالية</span><b>${num(p.stock)}</b></div>
        <form class="inv-form" id="invForm" novalidate>
          <div class="two">
            ${field('العملية', `<select name="reason"><option value="restock">توريد بضاعة (+)</option><option value="count">جرد (تصحيح الكمية)</option><option value="damage">تالف أو مفقود (−)</option><option value="return">مرتجع للمخزون (+)</option></select>`)}
            ${field('الكمية', '<input name="qty" type="number" min="0" step="1" inputmode="numeric" dir="ltr" required>', 'بالجرد: اكتب العدد الفعلي على الرف')}
          </div>
          ${field('ملاحظة', '<input name="note" maxlength="200" placeholder="مثلاً: فاتورة المورد ٢٣٤">')}
          <button class="btn violet" type="submit">${ic('check')}حفظ</button>
        </form>
        <form class="inv-form" id="thForm" novalidate>
          ${field('حد تنبيه النقص', `<input name="th" type="number" min="0" step="1" dir="ltr" value="${Number.isFinite(+p.threshold) ? p.threshold : 5}">`, 'بيوصلك تنبيه لما الكمية تنزل لهالحد')}
          <button class="btn" type="submit">حفظ الحد</button>
        </form>
        <section class="block"><h3>آخر الحركات</h3><div id="movs">${CLOUD ? '<p class="muted">عم نحمّل…</p>' : '<p class="muted">السجل بيشتغل مع السيرفر.</p>'}</div></section>
      </div>`);
    const f = $('#invForm');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const qty = Math.floor(+f.qty.value), reason = f.reason.value;
      if (!(qty >= 0) || f.qty.value === '') { toast('اكتب الكمية'); f.qty.focus(); return; }
      const delta = reason === 'count' ? qty - p.stock : reason === 'damage' ? -qty : qty;
      if (!delta) { toast('ما في تغيير'); return; }
      await adjust(pid, delta, reason, f.note.value.trim());
      if (current === 'inventory') renderInv();
      openStock(pid);
    });
    $('#thForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = Math.max(0, Math.floor(+e.target.th.value || 0));
      let saved = { ...p, threshold: v };
      if (CLOUD) { try { saved = await cloudDo(() => cloudApi.saveProduct(saved, false), 'انحفظ الحد'); } catch { return; } } else toast('انحفظ الحد');
      Object.assign(p, saved); save();
      if (current === 'inventory') VIEWS.inventory();
    });
    setTimeout(() => f.qty.focus(), 50);
    if (CLOUD) {
      try {
        const m = await cloudApi.movements(pid);
        const box = $('#movs'); if (!box) return;
        box.innerHTML = m.length ? `<ul class="movs">${m.map((x) => `<li><span class="mv-delta ${x.delta > 0 ? 'up' : 'down'}">${x.delta > 0 ? '+' : '−'}${num(Math.abs(x.delta))}</span><div><b>${REASONS[x.reason] || esc(x.reason)}</b><small>${x.ref ? `<span class="oid">${esc(x.ref)}</span> · ` : ''}${esc(x.note || '')}${x.note ? ' · ' : ''}${fmtDate(new Date(x.at).getTime(), true)}</small></div><span class="mv-after">${num(x.stock_after)}</span></li>`).join('')}</ul>` : '<p class="muted">ما في حركات لسا.</p>';
      } catch (e2) { $('#movs').innerHTML = `<p class="err">${esc(D.friendly(e2))}</p>`; }
    }
  }

  /* ---------- Team & permissions (owner) ---------- */
  VIEWS.team = async () => {
    $('#view').innerHTML = '<p class="muted pad">عم نحمّل…</p>';
    let staff = [];
    try { staff = await cloudApi.listStaff(); } catch (e) { $('#view').innerHTML = `<p class="err pad">${esc(D.friendly(e))}</p>`; return; }
    const me = D.auth.user && D.auth.user.id;
    $('#view').innerHTML = `
      <section class="card set-card">
        <div class="set-head"><span class="set-ic">${ic('team')}</span><div><h2>أضف شخص للفريق</h2><p class="muted">لازم يكون عامل حساب بالمتجر أولاً (من صفحة «إنشاء حساب»)، وبعدين بتضيفه هون بإيميله.</p></div></div>
        <form class="pin-form" id="staffForm" novalidate>
          <div class="two">${field('الإيميل', '<input name="email" type="email" dir="ltr" required>')}${field('الدور', `<select name="role">${['manager', 'inventory', 'support', 'owner'].map((r) => `<option value="${r}">${ROLE_NAMES[r]}</option>`).join('')}</select>`)}</div>
          <button class="btn violet" type="submit">${ic('plus')}إضافة</button>
        </form>
      </section>
      <div class="table-card"><table class="table"><thead><tr><th>الشخص</th><th>الدور</th><th class="hide-sm">من</th><th></th></tr></thead>
      <tbody>${staff.map((m) => `<tr><td><b>${esc(m.full_name || m.email)}</b><small dir="ltr" style="text-align:right">${esc(m.email)}</small></td>
        <td><select class="select role-sel" data-staff="${esc(m.email)}" aria-label="الدور" ${m.user_id === me ? 'disabled' : ''}>${Object.keys(ROLE_NAMES).map((r) => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${ROLE_NAMES[r]}</option>`).join('')}</select></td>
        <td class="hide-sm">${fmtDate(new Date(m.created_at).getTime())}</td>
        <td class="num">${m.user_id === me ? '<span class="muted">أنت</span>' : `<button class="btn danger-ghost" type="button" data-unstaff="${esc(m.user_id)}">${ic('trash')}إزالة</button>`}</td></tr>`).join('')}</tbody></table></div>
      <section class="card set-card"><div class="set-head"><span class="set-ic">${ic('eyeoff')}</span><div><h2>شو بيقدر يعمل كل دور؟</h2></div></div>
        <ul class="roles-help"><li><b>المالك:</b> كل شي، وإدارة الفريق.</li><li><b>مدير:</b> كل شي ما عدا الفريق وحذف الطلبات.</li><li><b>مسؤول مخزون:</b> المنتجات والكميات والأسعار.</li><li><b>خدمة عملاء:</b> الطلبات وحالاتها، الرسائل، الأسئلة، التقييمات.</li></ul>
        <p class="muted">نفس القواعد مفروضة بقاعدة البيانات، يعني حتى لو حدا تلاعب بالمتصفح ما بيقدر يتخطاها.</p></section>`;
    $('#staffForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = e.target.email.value.trim(), role = e.target.role.value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('الإيميل مش صحيح'); return; }
      try { await cloudDo(() => cloudApi.addStaff(email, role), `انضاف كـ${ROLE_NAMES[role]}`); } catch { return; }
      VIEWS.team();
    });
    $$('.role-sel').forEach((sel) => sel.addEventListener('change', async () => {
      try { await cloudDo(() => cloudApi.addStaff(sel.dataset.staff, sel.value), 'تغيّر الدور'); } catch { VIEWS.team(); }
    }));
  };

  /* ---------- Activity log ---------- */
  const ENT = { products: 'منتج', categories: 'تصنيف', coupons: 'كوبون', settings: 'الإعدادات', orders: 'طلب', admins: 'الفريق', reviews: 'تقييم', product_questions: 'سؤال' };
  const ACT = { insert: 'أضاف', update: 'عدّل', delete: 'حذف' };
  const FIELD = { price: 'السعر', stock: 'الكمية', name: 'الاسم', status: 'الحالة', paid: 'الدفع', hidden: 'الإخفاء', featured: 'مميز', role: 'الدور', active: 'التفعيل', value: 'القيمة', compare_at: 'السعر قبل الخصم', low_stock_threshold: 'حد التنبيه', answer: 'الجواب', note: 'ملاحظة', data: 'الإعدادات' };
  VIEWS.activity = async () => {
    setActions(`<button class="btn" type="button" data-act="nav-activity">${ic('refresh')}<span>تحديث</span></button>`);
    $('#view').innerHTML = '<p class="muted pad">عم نحمّل…</p>';
    let rows = [];
    try { rows = await cloudApi.audit(300); } catch (e) { $('#view').innerHTML = `<p class="err pad">${esc(D.friendly(e))}</p>`; return; }
    const val = (v) => (v === null || v === undefined ? '—' : typeof v === 'boolean' ? (v ? 'نعم' : 'لا') : esc(String(v)).slice(0, 40));
    $('#view').innerHTML = rows.length ? `<ul class="audit">${rows.map((r) => `<li>
      <span class="audit-ic">${ic(r.action === 'delete' ? 'trash' : r.action === 'insert' ? 'plus' : 'settings')}</span>
      <div><p><b>${esc(r.actor_email === 'system' ? 'تعديل مباشر بقاعدة البيانات' : r.actor_email)}</b> ${ACT[r.action] || esc(r.action)} ${ENT[r.entity] || esc(r.entity)} ${r.details && r.details.name ? `«${esc(String(r.details.name))}»` : `<span class="oid">${esc(r.entity_id)}</span>`}</p>
        ${r.action === 'update' ? `<p class="audit-diff">${Object.entries(r.details || {}).slice(0, 6).map(([k, v]) => `<span>${FIELD[k] || esc(k)}: ${val(v && v.from)} ← ${val(v && v.to)}</span>`).join('')}</p>` : ''}
        <small>${fmtDate(new Date(r.at).getTime(), true)}</small></div></li>`).join('')}</ul>` : `<div class="card">${empty('ما في نشاط لسا', 'كل تعديل بيعمله الفريق على المنتجات والطلبات والإعدادات بيتسجّل هون.', '')}</div>`;
  };

  /* ---------- Notifications bell ---------- */
  function paintBell() {
    const n = (state.notifications || []).filter((x) => !x.read).length;
    const b = $('#bellBtn'); if (!b) return;
    b.hidden = !CLOUD;
    $('#bellCount').hidden = !n; $('#bellCount').textContent = num(n);
    b.setAttribute('aria-label', n ? `التنبيهات: ${num(n)} جديدة` : 'التنبيهات');
  }
  function openBell() {
    const list = state.notifications || [];
    openSheet(`<div class="sheet-head"><div><h2>التنبيهات</h2></div><button class="icon-btn" type="button" data-act="close-sheet" aria-label="إغلاق">${ic('close')}</button></div>
      <div class="sheet-body">${list.length ? `<ul class="notes">${list.map((x) => `<li class="${x.read ? '' : 'new'}"><a href="${esc(x.link || '#dashboard')}"><span class="note-ic">${ic(x.kind.includes('stock') ? 'inventory' : 'bell')}</span><span><b>${esc(x.title)}</b><small>${esc(x.body)} · ${ago(new Date(x.created_at).getTime())}</small></span></a></li>`).join('')}</ul>` : '<p class="muted pad center">ما في تنبيهات.</p>'}</div>`);
    const unread = list.filter((x) => !x.read).map((x) => x.id);
    if (unread.length) cloudApi.markNotes(unread).then(() => { list.forEach((x) => { x.read = true; }); paintBell(); }, () => {});
  }

  /* ---------- Coupons ---------- */
  const KIND_T = { percent: 'نسبة مئوية', fixed: 'مبلغ ثابت', shipping: 'توصيل مجاني' };
  const couponValue = (c) => (c.kind === 'percent' ? `${num(c.value)}٪` : c.kind === 'fixed' ? money(c.value) : 'توصيل مجاني');
  const couponState = (c) => {
    const now = Date.now();
    if (!c.active) return ['موقوف', 'st-unpaid'];
    if (c.ends && now > c.ends) return ['منتهي', 'st-cancel'];
    if (c.starts && now < c.starts) return ['مجدول', 'st-conf'];
    if (c.maxUses && c.uses >= c.maxUses) return ['خلص', 'st-cancel'];
    return ['فعّال', 'st-done'];
  };
  VIEWS.coupons = () => {
    setActions(`<button class="btn violet" type="button" data-act="new-coupon">${ic('plus')}<span>كوبون جديد</span></button>`);
    // how often each code was used, from the orders we have
    const used = new Map();
    state.orders.filter(live).forEach((o) => { if (o.coupon) used.set(o.coupon, (used.get(o.coupon) || 0) + 1); });
    const list = state.coupons;
    $('#view').innerHTML = list.length ? `
      <div class="coupon-grid">${list.map((c) => { const [t, cls] = couponState(c); return `
        <button class="coupon-card" type="button" data-coupon="${esc(c.code)}">
          <span class="cc-top"><b class="cc-code" dir="ltr">${esc(c.code)}</b><span class="badge ${cls}">${t}</span></span>
          <strong class="cc-val">${couponValue(c)}</strong>
          <span class="cc-meta">${c.min ? `على طلب فوق ${money(c.min)} · ` : ''}${c.ends ? `لحد ${fmtDate(c.ends)}` : 'بلا تاريخ انتهاء'}</span>
          <span class="cc-uses">استُعمل ${num(CLOUD ? c.uses : (used.get(c.code) || 0))}${c.maxUses ? ` من ${num(c.maxUses)}` : ''} مرة</span>
        </button>`; }).join('')}</div>
      ${!CLOUD ? '<p class="muted pad">بدون سيرفر، الكوبونات بتنحفظ بملف المتجر بشكل مشفّر (hash)، وعدد مرات الاستعمال ما بينضبط. مع السيرفر بيصير الحد الأقصى دقيق.</p>' : ''}`
      : empty('ما في كوبونات لسا', 'اعمل كود خصم تشاركه مع زبائنك على إنستغرام أو واتساب، مثلاً WELCOME10.', `<button class="btn violet" type="button" data-act="new-coupon">${ic('plus')}كوبون جديد</button>`);
  };
  function editCoupon(code) {
    const c0 = code ? state.coupons.find((c) => c.code === code) : null;
    const c = c0 ? { ...c0 } : { code: '', kind: 'percent', value: 10, min: 0, starts: null, ends: null, maxUses: null, active: true, uses: 0 };
    const d = (t) => (t ? new Date(t - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '');
    openModal(`
      <form class="editor" id="cpForm" novalidate>
        <div class="modal-head"><h2>${c0 ? 'تعديل الكوبون' : 'كوبون جديد'}</h2><button class="icon-btn" type="button" data-act="close-modal" aria-label="إغلاق">${ic('close')}</button></div>
        ${field('الكود', `<input name="code" value="${esc(c.code)}" ${c0 ? 'readonly' : ''} maxlength="30" dir="ltr" placeholder="WELCOME10" style="text-transform:uppercase;letter-spacing:.06em">`, c0 ? 'الكود ما بيتغيّر بعد إنشائه' : 'حروف إنجليزية وأرقام بلا فراغات')}
        <div class="two">
          ${field('نوع الخصم', `<select name="kind">${Object.keys(KIND_T).map((k) => `<option value="${k}" ${c.kind === k ? 'selected' : ''}>${KIND_T[k]}</option>`).join('')}</select>`)}
          ${field('القيمة', `<input name="value" type="number" min="0" step="0.01" dir="ltr" value="${c.value}">`, '')}
        </div>
        <div class="two">
          ${field('الحد الأدنى للطلب', `<input name="min" type="number" min="0" step="0.01" dir="ltr" value="${c.min || ''}" placeholder="بلا">`)}
          ${field('أقصى عدد استعمال', `<input name="maxUses" type="number" min="1" step="1" dir="ltr" value="${c.maxUses || ''}" placeholder="بلا حد">`)}
        </div>
        <div class="two">
          ${field('يبدأ من', `<input name="starts" type="date" value="${d(c.starts)}">`)}
          ${field('ينتهي في', `<input name="ends" type="date" value="${d(c.ends)}">`)}
        </div>
        <div class="toggles">${toggle('active', c.active, 'فعّال')}</div>
        <p class="err" id="cpErr" hidden></p>
        <div class="row-btns modal-foot">
          ${c0 ? `<button class="btn danger-ghost" type="button" id="cpDel">${ic('trash')}حذف</button>` : ''}
          <span class="grow"></span>
          <button class="btn" type="button" data-act="close-modal">إلغاء</button>
          <button class="btn violet" type="submit">${c0 ? 'حفظ' : 'إنشاء الكوبون'}</button>
        </div>
      </form>`);
    const f = $('#cpForm');
    const syncKind = () => { f.value.disabled = f.kind.value === 'shipping'; f.value.closest('.f').querySelector('span').textContent = f.kind.value === 'percent' ? 'النسبة (٪)' : f.kind.value === 'fixed' ? `المبلغ (${cur()})` : 'القيمة'; };
    f.kind.addEventListener('change', syncKind); syncKind();
    if (c0) $('#cpDel').addEventListener('click', () => confirmBox(`تحذف ${c0.code}؟`, 'الكود رح يوقف يشتغل فوراً.', 'حذف', async () => {
      if (CLOUD) { try { await cloudDo(() => cloudApi.deleteCoupon(c0.code)); } catch { return; } }
      state.coupons = state.coupons.filter((x) => x.code !== c0.code); save(); toast('انحذف الكوبون'); VIEWS.coupons();
    }));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#cpErr');
      const codeV = f.code.value.trim().toUpperCase();
      const toT = (v, end) => (v ? new Date(`${v}T${end ? '23:59:59' : '00:00:00'}`).getTime() : null);
      const nc = {
        ...c, code: codeV, kind: f.kind.value, value: f.kind.value === 'shipping' ? 0 : Math.max(0, +f.value.value || 0),
        min: Math.max(0, +f.min.value || 0), maxUses: +f.maxUses.value > 0 ? Math.floor(+f.maxUses.value) : null,
        starts: toT(f.starts.value), ends: toT(f.ends.value, true), active: f.active.checked,
      };
      const fail = (m) => { err.textContent = m; err.hidden = false; };
      if (!/^[A-Z0-9_-]{2,30}$/.test(codeV)) return fail('الكود لازم يكون حروف إنجليزية أو أرقام (٢ لـ ٣٠)');
      if (!c0 && state.coupons.some((x) => x.code === codeV)) return fail('في كوبون بهالكود');
      if (nc.kind === 'percent' && (nc.value <= 0 || nc.value > 100)) return fail('النسبة بين ١ و ١٠٠');
      if (nc.kind === 'fixed' && nc.value <= 0) return fail('اكتب المبلغ');
      if (nc.starts && nc.ends && nc.ends < nc.starts) return fail('تاريخ الانتهاء قبل البداية');
      let saved = nc;
      if (CLOUD) { try { saved = await cloudDo(() => cloudApi.saveCoupon(nc, !c0)); } catch { return; } }
      else saved = { ...nc, h: await D.sha(`raff:${codeV}`) };
      if (c0) Object.assign(c0, saved); else state.coupons.unshift(saved);
      save(); closeModal(); toast(c0 ? 'انحفظ الكوبون' : `جاهز! شارك الكود ${codeV}`); VIEWS.coupons();
    });
    setTimeout(() => (c0 ? f.value : f.code).focus(), 50);
  }

  /* ---------- Reviews ---------- */
  let rvFilter = 'pending';
  VIEWS.reviews = () => {
    if (!CLOUD) {
      $('#view').innerHTML = `<div class="card">${empty('التقييمات بتحتاج السيرفر', 'لحتى الزبائن يقيّموا المنتجات يلي اشتروها، لازم يكون عندهم حسابات، وهيدا بيصير بعد ربط المتجر بـ Supabase.', `<a class="btn violet" href="#server">${ic('server')}ربط السيرفر</a>`)}</div>`;
      return;
    }
    setActions(`<button class="btn" type="button" data-act="reload">${ic('refresh')}<span>تحديث</span></button>`);
    const pm = byPid();
    const counts = { pending: 0, approved: 0, rejected: 0 };
    state.reviews.forEach((r) => { counts[r.status]++; });
    const list = state.reviews.filter((r) => r.status === rvFilter);
    $('#view').innerHTML = `
      <div class="chips" role="group">${[['pending', 'بانتظار المراجعة'], ['approved', 'منشورة'], ['rejected', 'مرفوضة']].map(([k, t]) => `<button type="button" data-rvf="${k}" aria-pressed="${rvFilter === k}">${t}<em>${num(counts[k])}</em></button>`).join('')}</div>
      ${list.length ? `<ul class="rv-admin">${list.map((r) => { const p = pm.get(+r.product_id); return `<li class="card">
        <div class="rva-head">${thumb(p)}<div><b>${esc(p ? p.name : 'منتج محذوف')}</b><small>${esc(r.author || 'زبون')} · ${fmtDate(new Date(r.created_at).getTime())}</small></div><span class="rva-stars" aria-label="${num(r.rating)} نجوم">${'★'.repeat(r.rating)}<i>${'★'.repeat(5 - r.rating)}</i></span></div>
        ${r.body ? `<p>${esc(r.body)}</p>` : '<p class="muted">بلا تعليق</p>'}
        <div class="row-btns">${r.status !== 'approved' ? `<button class="btn violet" type="button" data-rv="${r.id}" data-to="approved">${ic('check')}نشر</button>` : ''}${r.status !== 'rejected' ? `<button class="btn" type="button" data-rv="${r.id}" data-to="rejected">رفض</button>` : ''}<button class="btn danger-ghost" type="button" data-rv="${r.id}" data-to="delete">${ic('trash')}حذف</button></div>
      </li>`; }).join('')}</ul>` : `<p class="muted pad center">${rvFilter === 'pending' ? 'ما في تقييمات بانتظارك.' : 'ما في شي هون.'}</p>`}`;
  };
  async function moderate(id, to) {
    try {
      if (to === 'delete') { await cloudDo(() => cloudApi.deleteReview(id), 'انحذف'); state.reviews = state.reviews.filter((r) => r.id !== id); }
      else { await cloudDo(() => cloudApi.setReview(id, to), to === 'approved' ? 'انتشر التقييم' : 'انرفض'); state.reviews.find((r) => r.id === id).status = to; }
    } catch { return; }
    route();
  }

  /* ---------- Server (Supabase) ---------- */
  VIEWS.server = () => {
    const over = ls.get('raff.cloud', null);
    const site = `${location.origin}${location.pathname.replace(/admin\/?(index\.html)?$/, '')}`;
    const status = CLOUD
      ? `<section class="card pub-status clean"><span class="pub-ic">${ic('check')}</span><div><h2>متصل بالسيرفر</h2><p class="muted" dir="ltr" style="text-align:right">${esc(D.cfg.url)}</p>${D.cfg.override ? '<p class="err">هالاتصال مفعّل على هالجهاز بس. اتبع الخطوة ٥ ليشتغل عند كل الزبائن.</p>' : ''}</div></section>`
      : '<section class="card pub-status pending"><span class="pub-ic">' + ic('server') + '</span><div><h2>المتجر شغّال بلا سيرفر</h2><p class="muted">الطلبات بتوصل على واتساب وما في حسابات للزبائن. اربطه بـ Supabase (مجاني) لتشتغل الحسابات والتقييمات والطلبات التلقائية.</p></div></section>';
    $('#view').innerHTML = `
      <div class="publish">
        ${status}
        ${CLOUD && state.offerImport ? `<section class="card"><div class="card-head"><h2>انقل بياناتك للسيرفر</h2></div><p class="muted">السيرفر فاضي. فينا ننقل المنتجات والتصنيفات والإعدادات الحالية من ملف المتجر بكبسة وحدة.</p><div class="row-btns" style="margin-top:12px"><button class="btn violet" type="button" data-act="migrate">${ic('upload')}نقل البيانات</button></div></section>` : ''}
        <ol class="steps">
          <li class="card"><span class="step-n">١</span><div><h3>اعمل مشروع مجاني على Supabase</h3><p class="muted">ادخل على supabase.com، سجّل بحساب GitHub أو إيميل، واكبس <b>New project</b>. اختار اسم وكلمة سر لقاعدة البيانات، والمنطقة الأقرب لزبائنك.</p></div><a class="btn" href="https://supabase.com/dashboard/new" target="_blank" rel="noopener noreferrer">${ic('server')}فتح Supabase</a></li>
          <li class="card"><span class="step-n">٢</span><div><h3>شغّل ملف الإعداد</h3><p class="muted">بالمشروع، روح على <b>SQL Editor</b> ← <b>New query</b>، الصق الملف كامل، واكبس <b>Run</b>. بيعمل الجداول وقواعد الأمان.</p></div><button class="btn" type="button" data-act="copy-sql">${ic('copy')}نسخ ملف الإعداد</button></li>
          <li class="card"><span class="step-n">٣</span><div><h3>اضبط روابط تسجيل الدخول</h3><p class="muted">روح على <b>Authentication</b> ← <b>URL Configuration</b>. حط بـ <b>Site URL</b> وبـ <b>Redirect URLs</b> هالرابط:</p><p class="mono-box" dir="ltr">${esc(site)}</p></div><button class="btn" type="button" data-copy-text="${esc(site)}">${ic('copy')}نسخ الرابط</button></li>
          <li class="card"><span class="step-n">٤</span><div><h3>جرّب الاتصال من هون</h3><p class="muted">من <b>Project Settings</b> ← <b>API</b>، انسخ <b>Project URL</b> و<b>anon public key</b> (هيدا المفتاح معمول ليكون علني، وقواعد الأمان هي يلي بتحمي البيانات).</p>
            <form class="srv-form" id="srvForm" novalidate>
              ${field('Project URL', `<input name="url" dir="ltr" placeholder="https://xxxx.supabase.co" value="${esc((over && over.url) || (D.cfg ? D.cfg.url : ''))}">`)}
              ${field('anon public key', `<input name="key" dir="ltr" placeholder="eyJhbGciOi..." value="${esc((over && over.key) || (D.cfg ? D.cfg.key : ''))}">`)}
              <p class="err" id="srvErr" hidden></p>
              <div class="row-btns"><button class="btn violet" type="submit">${ic('check')}اختبار واستعمال على هالجهاز</button>${over ? `<button class="btn" type="button" data-act="srv-clear">إلغاء التجربة</button>` : ''}</div>
            </form></div></li>
          <li class="card"><span class="step-n">٥</span><div><h3>فعّله لكل الزبائن</h3><p class="muted">نزّل ملف <b dir="ltr">config.js</b> وارفعه على GitHub بالمجلد الرئيسي للمشروع مكان القديم. أو ابعت الرابط والمفتاح لمطوّر الموقع.</p></div><button class="btn" type="button" data-act="dl-config">${ic('download')}تنزيل config.js</button></li>
        </ol>
        <details class="card faq"><summary>شو بيتغيّر بعد الربط؟</summary><p class="muted">الزبائن بيقدروا يعملوا حسابات ويتابعوا طلباتهم ويحفظوا عناوينهم ويقيّموا. الطلبات بتوصل لهون فوراً بلا نسخ رموز. المنتجات والإعدادات بتنحفظ مباشرة بلا رفع ملفات. الأسعار والمخزون والكوبونات بتنحسب على السيرفر، فما حدا بيقدر يغيّر سعر من المتصفح.</p></details>
      </div>`;
    $('#srvForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = e.target.url.value.trim().replace(/\/+$/, ''), keyV = e.target.key.value.trim();
      const err = $('#srvErr'); err.hidden = true;
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) { err.textContent = 'الرابط لازم يكون متل https://xxxx.supabase.co'; err.hidden = false; return; }
      if (keyV.length < 30) { err.textContent = 'المفتاح قصير. انسخ anon public key كامل.'; err.hidden = false; return; }
      try {
        const r = await fetch(`${url}/rest/v1/rpc/admin_exists`, { method: 'POST', headers: { apikey: keyV, Authorization: `Bearer ${keyV}`, 'Content-Type': 'application/json' }, body: '{}' });
        if (r.status === 404) throw new Error('الاتصال نجح بس الجداول مش موجودة. شغّل ملف الإعداد (الخطوة ٢).');
        if (r.status === 401 || r.status === 403) throw new Error('المفتاح غلط.');
        if (!r.ok) throw new Error(`صار خطأ (${r.status}).`);
      } catch (ex) { err.textContent = ex.message === 'Failed to fetch' ? 'ما قدرنا نوصل للرابط. تأكد منه.' : ex.message; err.hidden = false; return; }
      ls.set('raff.cloud', { url, key: keyV });
      toast('الاتصال شغّال! عم نفتح اللوحة على السيرفر…');
      setTimeout(() => { location.hash = '#dashboard'; location.reload(); }, 900);
    });
  };
  async function migrateToCloud() {
    let cat = null;
    try { cat = await S.loadCatalog('../'); } catch { /* ignore */ }
    const src = cat || { settings: state.settings, categories: [], products: [] };
    try {
      await cloudDo(async () => {
        state.settings = { ...src.settings }; delete state.settings.coupons;
        state.categories = (src.categories || []).map((c) => ({ ...c }));
        await cloudApi.saveCategories([]);
        await cloudApi.saveSettings();
        const rows = (src.products || []).filter((p) => !p.demo).map((p) => ({ ...D.toRow({ ...p, images: S.safeImg(p.img) && !String(p.img).startsWith('data:') ? [p.img] : [] }), rating: +p.rating || 0, reviews_count: +p.reviews || 0 }));
        for (let i = 0; i < rows.length; i += 50) must(await sb.from('products').insert(rows.slice(i, i + 50)));
      }, 'انتقلت البيانات للسيرفر');
    } catch { return; }
    await cloudApi.loadAll();
    route();
  }

  /* ---------- Publish ---------- */
  VIEWS.publish = () => {
    const json = JSON.stringify(publicCatalog());
    const kb = Math.round(new Blob([json]).size / 1024);
    const changed = dirty();
    $('#view').innerHTML = `
      <div class="publish">
        <section class="card pub-status ${changed ? 'pending' : 'clean'}">
          <span class="pub-ic">${changed ? ic('publish') : ic('check')}</span>
          <div><h2>${changed ? 'عندك تعديلات جاهزة للنشر' : 'المتجر محدّث'}</h2>
          <p class="muted">${changed ? 'الزبائن لسا بيشوفوا النسخة القديمة. اتبع الخطوات تحت ليوصلهم التحديث.' : state.publishedAt ? `آخر نشر ${ago(state.publishedAt)}.` : 'ما في تعديلات جديدة.'}</p></div>
        </section>
        <ol class="steps">
          <li class="card"><span class="step-n">١</span><div><h3>شوف المعاينة</h3><p class="muted">بتفتح المتجر بتعديلاتك على هالجهاز بس، قبل ما حدا تاني يشوفها.</p></div><button class="btn" type="button" data-act="preview">${ic('eye')}معاينة</button></li>
          <li class="card"><span class="step-n">٢</span><div><h3>نزّل ملف المتجر</h3><p class="muted">ملف <b dir="ltr">store.json</b> فيه كل المنتجات والإعدادات (${num(kb)} كيلوبايت). ما فيه أي طلبات أو بيانات عملاء.</p>${kb > 4000 ? '<p class="err">الملف كبير بسبب الصور. صغّر عدد الصور ليفتح المتجر أسرع.</p>' : ''}</div><button class="btn violet" type="button" data-act="download">${ic('download')}تنزيل store.json</button></li>
          <li class="card"><span class="step-n">٣</span><div><h3>ارفعه على GitHub</h3><p class="muted">بتنفتح صفحة الرفع بمجلد <b dir="ltr">data</b>. اسحب الملف لجوّا، وبعدين اكبس <b>Commit changes</b>. بعد دقيقة أو دقيقتين بيتحدّث المتجر للكل.</p></div><a class="btn" href="${REPO_UPLOAD}" target="_blank" rel="noopener noreferrer">${ic('upload')}فتح GitHub</a></li>
        </ol>
        <details class="card faq"><summary>ليش النشر بخطوات؟</summary><p class="muted">المتجر موقع ثابت على GitHub Pages، يعني مجاني وسريع وما في سيرفر ممكن ينخرق. التعديلات بتنحفظ عندك، ولما تنشر بتحطها بملف واحد على GitHub.</p></details>
      </div>`;
  };

  /* ---------- Modal / sheet / confirm ---------- */
  const modal = $('#modal');
  function openModal(html, size = '') {
    $('#modalInner').innerHTML = html;
    modal.className = `modal ${size}`;
    if (!modal.open) modal.showModal();
  }
  function closeModal() { if (modal.open) modal.close(); }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  function confirmBox(title, text, okText, onOk) {
    openModal(`<div class="confirm"><span class="confirm-ic">${ic('alert')}</span><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
      <div class="row-btns center"><button class="btn" type="button" data-act="close-modal">إلغاء</button><button class="btn danger" type="button" id="confirmOk">${esc(okText)}</button></div></div>`, 'narrow');
    $('#confirmOk').addEventListener('click', () => { closeModal(); onOk(); });
  }
  const sheet = $('#sheet'), scrim = $('#scrim');
  function openSheet(html) {
    $('#sheetInner').innerHTML = html;
    scrim.hidden = false; sheet.classList.add('open'); sheet.inert = false;
  }
  function closeSheet() {
    scrim.hidden = true; sheet.classList.remove('open'); sheet.inert = true;
    $('#sheetInner').dataset.sheetOrder = ''; $('#sheetInner').dataset.sheetConv = '';
  }
  scrim.addEventListener('click', closeSheet);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet.classList.contains('open') && !modal.open) closeSheet(); });

  const download = (name, text, type = 'application/json') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ---------- Global clicks ---------- */
  document.addEventListener('click', (e) => {
    if (!state) return;
    const t = e.target.closest('[data-act],[data-order],[data-product],[data-period],[data-ofilter],[data-status],[data-customer],[data-coupon],[data-rv],[data-rvf],[data-copy-text],[data-conv],[data-cfilter],[data-conv-status],[data-quick],[data-qfilter],[data-qa-act],[data-qadj],[data-stock],[data-invf],[data-unstaff]');
    if (!t) return;
    const d = t.dataset;
    if (d.period !== undefined) { period = +d.period; VIEWS.dashboard(); return; }
    if (d.ofilter) { oFilter = d.ofilter; $$('[data-ofilter]').forEach((b) => b.setAttribute('aria-pressed', b === t)); renderOrderList(); return; }
    if (d.status) { setStatus($('#sheetInner').dataset.sheetOrder, d.status); return; }
    if (d.order) { openOrder(d.order); return; }
    if (d.product) { if (current !== 'products') location.hash = `#products/${d.product}`; else editProduct(+d.product); return; }
    if (d.qadj) { const pid = +t.closest('[data-stock]').dataset.stock; adjust(pid, +d.qadj, d.qadj > 0 ? 'restock' : 'manual').then(renderInv); return; }
    if (d.stock) { openStock(+d.stock); return; }
    if (d.invf) { invFilter = d.invf; if (current !== 'inventory') location.hash = '#inventory'; else VIEWS.inventory(); return; }
    if (d.unstaff) { confirmBox('تزيل هالشخص من الفريق؟', 'رح يرجع زبون عادي وما بيقدر يفتح اللوحة.', 'إزالة', async () => { try { await cloudDo(() => cloudApi.removeStaff(d.unstaff), 'انشال من الفريق'); } catch { return; } VIEWS.team(); }); return; }
    if (d.conv) { openConversation(d.conv); return; }
    if (d.cfilter) { convFilter = d.cfilter; $$('[data-cfilter]').forEach((b) => b.setAttribute('aria-pressed', b === t)); renderInbox(); return; }
    if (d.quick !== undefined) { const ta = $('#convReply'); if (ta) { ta.value = (ta.value ? `${ta.value.trim()}\n` : '') + QUICK[+d.quick]; ta.focus(); } return; }
    if (d.convStatus) {
      const id = $('#sheetInner').dataset.sheetConv, st = d.convStatus;
      cloudDo(() => cloudApi.setConversation(id, { status: st }), st === 'closed' ? 'انغلقت المحادثة' : 'انفتحت المحادثة').then(() => {
        const m = state.conversations.find((c) => c.id === id); if (m) m.status = st;
        renderInbox(); openConversation(id);
      }, () => {});
      return;
    }
    if (d.qfilter) { qFilter = d.qfilter; VIEWS.questions(); return; }
    if (d.qaAct) { questionAction(+t.closest('[data-qa]').dataset.qa, d.qaAct); return; }
    if (d.coupon) { editCoupon(d.coupon); return; }
    if (d.rv) { moderate(+d.rv, d.to); return; }
    if (d.rvf) { rvFilter = d.rvf; VIEWS.reviews(); return; }
    if (d.copyText) { navigator.clipboard?.writeText(d.copyText).then(() => toast('انسخ'), () => toast('ما قدرنا ننسخ')); return; }
    if (d.customer) { location.hash = `#orders/phone:${encodeURIComponent(d.customer)}`; return; }
    switch (d.act) {
      case 'lock': lock(); break;
      case 'import': importDialog(); break;
      case 'reload': cloudApi.loadAll().then(() => { toast('تحدّثت البيانات'); route(); }, (e2) => toast(D.friendly(e2))); break;
      case 'sync': if (syncLocalOrders(false)) route(); break;
      case 'demo': seedDemo(); break;
      case 'close-modal': closeModal(); break;
      case 'close-sheet': closeSheet(); break;
      case 'new-product': editProduct(0); break;
      case 'new-coupon': editCoupon(null); break;
      case 'clear-demo-products': {
        const demo = state.products.filter((p) => p.demo);
        confirmBox(`تمسح ${num(demo.length)} منتج تجريبي؟`, 'بتنمسح الأمثلة بس. منتجاتك (إذا ضفت شي) والتصنيفات والإعدادات بتضل. بعدها اكبس «نشر التغييرات».', 'امسح الأمثلة', async () => {
          if (CLOUD) { try { await cloudDo(async () => { for (const p of demo) await cloudApi.deleteProduct(p.id); }); } catch { return; } }
          state.products = state.products.filter((p) => !p.demo); save();
          toast('انمسحت الأمثلة. أضف منتجك الأول!');
          location.hash = '#products';
        });
        break;
      }
      case 'bell': openBell(); break;
      case 'nav-activity': VIEWS.activity(); break;
      case 'delete-conv': {
        const id = $('#sheetInner').dataset.sheetConv;
        confirmBox('تحذف المحادثة؟', 'رح تنحذف المحادثة وكل رسائلها نهائياً.', 'حذف', async () => {
          try { await cloudDo(() => cloudApi.deleteConversation(id), 'انحذفت المحادثة'); } catch { return; }
          state.conversations = state.conversations.filter((c) => c.id !== id); closeSheet(); renderInbox(); refreshNavBadges();
        });
        break;
      }
      case 'migrate': migrateToCloud(); break;
      case 'srv-clear': ls.del('raff.cloud'); toast('رجعنا للوضع بلا سيرفر'); setTimeout(() => location.reload(), 600); break;
      case 'copy-sql':
        fetch('../supabase/setup.sql', { cache: 'no-cache' }).then((r) => r.text()).then((txt) => navigator.clipboard.writeText(txt)).then(() => toast('انسخ ملف الإعداد. الصقه بـ SQL Editor.'), () => { window.open('../supabase/setup.sql', '_blank', 'noopener'); });
        break;
      case 'dl-config': {
        const over = ls.get('raff.cloud', null) || (D.cfg ? { url: D.cfg.url, key: D.cfg.key } : null);
        if (!over) { toast('جرّب الاتصال أولاً (الخطوة ٤)'); break; }
        download('config.js', `/* رَفّ · connection to Supabase. The anon key is public by design; row level security protects the data. */
window.RAFF_CONFIG = {
  supabaseUrl: ${JSON.stringify(over.url)},
  supabaseAnonKey: ${JSON.stringify(over.key)},
};
`, 'text/javascript');
        break;
      }
      case 'print': printInvoice(d.id); break;
      case 'delete-order':
        confirmBox(`تحذف الطلب ${d.id}؟`, 'ما في تراجع. إذا بدك تخبّيه بس، غيّر حالته لـ«ملغى».', 'حذف', async () => {
          const o = state.orders.find((x) => x.id === d.id);
          if (CLOUD) { try { await cloudDo(() => cloudApi.deleteOrder(d.id)); } catch { return; } }
          else if (o && o.stockApplied) applyStock(o, -1);
          state.orders = state.orders.filter((x) => x.id !== d.id); save(); closeSheet(); toast('انحذف الطلب'); route();
        });
        break;
      case 'csv-orders': {
        const head = ['order', 'date', 'status', 'paid', 'method', 'name', 'phone', 'email', 'city', 'address', 'items', 'subtotal', 'discount', 'coupon', 'shipping', 'total'];
        const rows = state.orders.map((o) => [o.id, new Date(o.createdAt).toISOString().slice(0, 16).replace('T', ' '), STATUS[o.status].t, o.paid ? 'نعم' : 'لا', S.METHODS[o.method] || o.method,
          o.customer.name, o.customer.phone, o.customer.email || '', o.customer.city, o.customer.address,
          o.items.map((x) => `${x.name}${optsText(x.options) ? ` (${optsText(x.options)})` : ''} × ${x.qty}`).join(' | '), o.subtotal, o.discount || 0, o.coupon || '', o.shipping, o.total]);
        const cell = (v) => { const s2 = String(v ?? ''); return /^[=+\-@]/.test(s2) ? `"'${s2.replace(/"/g, '""')}"` : `"${s2.replace(/"/g, '""')}"`; };
        download(`orders-${new Date().toISOString().slice(0, 10)}.csv`, '\ufeff' + [head].concat(rows).map((r) => r.map(cell).join(',')).join('\n'), 'text/csv');
        toast(`انصدّر ${num(rows.length)} طلب`);
        break;
      }
      case 'csv': {
        const rows = [['name', 'phone', 'city', 'orders', 'spent', 'last_order']].concat((VIEWS.customers.list || []).map((c) => [c.name, c.phone, c.city, c.n, c.spent.toFixed(2), new Date(c.last).toISOString().slice(0, 10)]));
        const cell = (v) => { const s = String(v); return /^[=+\-@]/.test(s) ? `"'${s.replace(/"/g, '""')}"` : `"${s.replace(/"/g, '""')}"`; };
        download('customers.csv', '﻿' + rows.map((r) => r.map(cell).join(',')).join('\n'), 'text/csv');
        break;
      }
      case 'backup': download(`raff-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ kind: 'raff-backup', at: Date.now(), state })); toast('انتبه: النسخة الاحتياطية مش مشفّرة، خبّيها بمكان آمن.'); break;
      case 'clear-demo': state.orders = state.orders.filter((o) => !o.demo); save(); toast('انمسحت الطلبات التجريبية'); route(); break;
      case 'wipe': confirmBox('تمسح كل شي؟', 'رح تنمسح الطلبات والتعديلات غير المنشورة من هالجهاز. المتجر المنشور ما بيتأثر. خود نسخة احتياطية قبل.', 'امسح كل شي', () => { ls.del(KEY); location.reload(); }); break;
      case 'preview': ls.set('raff.preview', publicCatalog()) ? window.open('../?preview=1', '_blank', 'noopener') : toast('ما في مساحة كافية للمعاينة'); break;
      case 'download':
        download('store.json', JSON.stringify(publicCatalog(), null, 1));
        state.publishedHash = catalogHash(); state.publishedAt = Date.now(); save();
        toast('نزل الملف. هلّق ارفعه على GitHub.');
        VIEWS.publish();
        break;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const row = e.target.closest('tr[data-order], tr[data-customer], tr[data-stock]');
    if (row) row.click();
  });
})();
