/* رَفّ · data layer. Talks to Supabase when it is configured, otherwise runs on data/store.json + this device. */
(() => {
  'use strict';
  const S = window.RaffShared;
  const { ls } = S;

  /* ---------- Which backend? ---------- */
  const URL_RE = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;
  const cfg = (() => {
    const base = window.RAFF_CONFIG || {};
    const over = ls.get('raff.cloud', null); // set from the admin "server" page to try a project before publishing config.js
    const pick = over && over.url ? over : { url: base.supabaseUrl, key: base.supabaseAnonKey };
    const url = String(pick.url || '').trim().replace(/\/+$/, '');
    const key = String(pick.key || '').trim();
    return URL_RE.test(url) && key.length > 20 ? { url, key, override: !!(over && over.url) } : null;
  })();
  const client = cfg && window.supabase ? window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: 'raff-auth' },
  }) : null;
  const mode = client ? 'cloud' : 'local';

  /* ---------- Errors in Arabic ---------- */
  const ERR = {
    name_required: 'اكتب الاسم الكامل',
    phone_required: 'رقم الهاتف مش صحيح',
    address_required: 'اكتب المدينة والعنوان بالتفصيل',
    items_invalid: 'السلة فاضية',
    method_unavailable: 'طريقة الدفع هاي مش متاحة حالياً',
    last_admin: 'هيدا حساب المدير الوحيد. ما فيك تحذفه من هون.',
    contact_required: 'اكتب رقم هاتف أو إيميل لنرد عليك',
    message_length: 'الرسالة لازم تكون بين حرفين و٢٠٠٠ حرف',
    too_many_messages: 'رسائل كتير ورا بعض. استنى شوي وجرّب مرة تانية.',
    question_length: 'السؤال لازم يكون ٣ أحرف أو أكثر',
    not_found: 'المحادثة مش موجودة أو الرابط انتهى',
    not_signed_in: 'لازم تسجّل دخول أولاً',
    'Invalid login credentials': 'الإيميل أو كلمة السر غلط',
    'Email not confirmed': 'لازم تأكد إيميلك أولاً. شوف بريدك (وكمان الرسائل غير المرغوبة).',
    'User already registered': 'في حساب بهالإيميل. جرّب تسجّل دخول.',
    'Password should be at least 6 characters': 'كلمة السر لازم تكون ٦ أحرف أو أكثر',
    'Unable to validate email address: invalid format': 'الإيميل مش صحيح',
    'Email rate limit exceeded': 'طلبات كتير. جرّب بعد شوي.',
    'For security purposes, you can only request this after': 'لأسباب أمنية، استنى شوي وجرّب مرة تانية.',
    'New password should be different from the old password.': 'كلمة السر الجديدة لازم تكون مختلفة عن القديمة',
    'Failed to fetch': 'في مشكلة بالاتصال. تأكد من الإنترنت.',
  };
  const friendly = (e) => {
    const m = String((e && (e.message || e.error_description || e.msg)) || e || '');
    if (m.startsWith('out_of_stock:')) return `الكمية المطلوبة من «${m.split(':')[1]}» مش متوفرة`;
    if (m.startsWith('product_unavailable')) return 'في منتج بالسلة ما عاد متوفر';
    if (m.startsWith('coupon_invalid:')) return m.split(':').slice(1).join(':');
    if (m.includes('halal_blocked')) { const cats = (m.split('halal_blocked:')[1] || '').split(/[,\s]/).filter(Boolean); return window.RaffHalal ? window.RaffHalal.message(cats) : 'هالمحتوى مخالف لسياسة الاستخدام الحلال.'; }
    const k = Object.keys(ERR).find((x) => m.includes(x));
    return k ? ERR[k] : (m || 'صار خطأ، جرّب مرة تانية');
  };
  const must = ({ data, error }) => { if (error) throw new Error(friendly(error)); return data; };

  /* ---------- Shapes ---------- */
  const fromRow = (r) => ({
    id: +r.id, name: r.name, store: r.brand || '', cat: r.category_id || '', price: +r.price || 0, compare: +r.compare_at || 0,
    stock: r.stock, desc: r.description || '', images: r.images || [], img: (r.images || [])[0] || '',
    kind: (r.art || {}).kind || 'tote', bg: (r.art || {}).bg || '#efe8dc', fg: (r.art || {}).fg, ac: (r.art || {}).ac,
    options: Array.isArray(r.options) ? r.options : [], featured: !!r.featured, hidden: !!r.hidden,
    rating: +r.rating || 0, reviews: r.reviews_count || 0, sort: r.sort || 0, threshold: r.low_stock_threshold ?? 5,
    ...(r.product_type === 'digital' ? { type: 'digital', ...(r.digital || {}) } : {}),
  });
  const toRow = (p) => ({
    name: p.name, brand: p.store || '', category_id: p.cat || null, price: +p.price || 0, compare_at: +p.compare > +p.price ? +p.compare : null,
    stock: Math.max(0, Math.floor(+p.stock || 0)), description: p.desc || '', images: (p.images && p.images.length ? p.images : (p.img ? [p.img] : [])),
    art: { kind: p.kind || 'tote', bg: p.bg || '#efe8dc', fg: p.fg || null, ac: p.ac || null },
    options: Array.isArray(p.options) ? p.options : [], featured: !!p.featured, hidden: !!p.hidden, sort: +p.sort || 0, low_stock_threshold: Number.isFinite(+p.threshold) ? Math.max(0, Math.floor(+p.threshold)) : 5,
    product_type: S.isDigital(p) ? 'digital' : 'physical',
    digital: S.isDigital(p) ? { format: p.format || '', fileSize: p.fileSize || '', details: p.details || '', buyUrl: S.safeUrl(p.buyUrl), previewUrl: S.safeUrl(p.previewUrl) } : {},
  });
  const orderFromRow = (o) => ({
    id: o.id, createdAt: new Date(o.created_at).getTime(), customer: o.customer || {}, items: o.items || [],
    subtotal: +o.subtotal, discount: +o.discount || 0, shipping: +o.shipping, total: +o.total, coupon: o.coupon || '',
    method: o.method, status: o.status, paid: !!o.paid, note: o.note || '', history: (o.history || []).map((h) => ({ s: h.s, t: typeof h.t === 'number' ? h.t : new Date(h.t).getTime() })),
    userId: o.user_id || null,
  });

  /* ---------- Catalog ---------- */
  let catalogCache = null;
  async function catalog(force = false) {
    if (catalogCache && !force) return catalogCache;
    if (mode === 'cloud') {
      const [st, cats, prods] = await Promise.all([
        client.from('settings').select('data').eq('id', 1).maybeSingle(),
        client.from('categories').select('*').order('sort').order('name'),
        client.from('products').select('*').order('sort').order('id', { ascending: false }),
      ]);
      if (st.error || cats.error || prods.error) throw new Error(friendly(st.error || cats.error || prods.error));
      catalogCache = {
        settings: (st.data && st.data.data) || {},
        categories: (cats.data || []).map((c) => ({ id: c.id, name: c.name, c: c.color, sort: c.sort })),
        products: (prods.data || []).map(fromRow),
      };
    } else {
      const d = await S.loadCatalog('');
      catalogCache = { settings: d.settings || {}, categories: d.categories || [], products: d.products || [], isPreview: d.isPreview };
    }
    return catalogCache;
  }

  /* ---------- Auth ---------- */
  let user = null, profile = null;
  const listeners = new Set();
  const emit = () => listeners.forEach((f) => { try { f(user, profile); } catch { /* ignore */ } });
  async function loadProfile() {
    if (!user) { profile = null; return; }
    const { data } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
    profile = data || { id: user.id, full_name: (user.user_metadata || {}).full_name || '', phone: (user.user_metadata || {}).phone || '' };
  }
  let recovery = false;
  const ready = (async () => {
    if (mode !== 'cloud') return;
    const { data } = await client.auth.getSession();
    user = data.session ? data.session.user : null;
    await loadProfile();
    client.auth.onAuthStateChange(async (ev, session) => {
      if (ev === 'PASSWORD_RECOVERY') recovery = true;
      const was = user && user.id;
      user = session ? session.user : null;
      if ((user && user.id) !== was || ev === 'USER_UPDATED') { await loadProfile(); if (user) mergeLocalWishlist(); }
      emit();
      if (ev === 'PASSWORD_RECOVERY') location.hash = '#/reset';
    });
  })();

  const redirect = (h) => `${location.origin}${location.pathname}${h}`;
  const auth = {
    get user() { return user; },
    get profile() { return profile; },
    get recovery() { return recovery; },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    async signUp({ email, password, name, phone }) {
      const data = must(await client.auth.signUp({ email, password, options: { data: { full_name: name, phone }, emailRedirectTo: redirect('#/account') } }));
      // Supabase hides "already registered" behind an empty identities list
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error(ERR['User already registered']);
      return { needsConfirm: !data.session };
    },
    async signIn({ email, password }) { must(await client.auth.signInWithPassword({ email, password })); },
    async signOut() { await client.auth.signOut(); user = null; profile = null; emit(); },
    async resetPassword(email) { must(await client.auth.resetPasswordForEmail(email, { redirectTo: redirect('#/reset') })); },
    async updatePassword(password) { must(await client.auth.updateUser({ password })); recovery = false; },
    async updateProfile({ full_name, phone }) {
      must(await client.from('profiles').update({ full_name, phone }).eq('id', user.id));
      profile = { ...profile, full_name, phone }; emit();
    },
    async deleteAccount() { must(await client.rpc('delete_my_account')); await client.auth.signOut(); user = null; profile = null; emit(); },
    async resend(email) { must(await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirect('#/account') } })); },
  };

  /* ---------- Coupons ---------- */
  const sha = async (s) => {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  };
  function localCoupon(c, sub, ship) {
    const now = Date.now();
    if (!c || c.active === false) return { ok: false, message: 'الكود غير صالح' };
    if (c.starts && now < c.starts) return { ok: false, message: 'الكود لسا ما بلّش' };
    if (c.ends && now > c.ends) return { ok: false, message: 'الكود منتهي' };
    if (sub < (c.min || 0)) return { ok: false, message: `الحد الأدنى للطلب ${S.num(c.min)}`, min: c.min };
    const d = c.kind === 'percent' ? Math.round(sub * Math.min(c.value, 100)) / 100 : c.kind === 'fixed' ? Math.min(c.value, sub) : ship;
    return { ok: true, kind: c.kind, value: c.value, discount: Math.round(d * 100) / 100 };
  }
  async function checkCoupon(code, sub, ship) {
    code = String(code || '').trim().toUpperCase();
    if (!code) return { ok: false, message: 'اكتب الكود' };
    if (mode === 'cloud') {
      const r = must(await client.rpc('check_coupon', { p_code: code, p_subtotal: sub }));
      return { ...r, discount: +r.discount || 0, code };
    }
    const h = await sha(`raff:${code}`);
    const c = ((await catalog()).settings.coupons || []).find((x) => x.h === h);
    return { ...localCoupon(c, sub, ship), code };
  }

  /* ---------- Orders ---------- */
  async function placeOrder({ lines, customer, method, coupon, totals }) {
    if (mode === 'cloud') {
      await ready;
      const o = must(await client.rpc('place_order', { p: {
        customer, method, coupon: coupon || '',
        items: lines.map((l) => ({ id: l.p.id, qty: l.qty, options: l.options || {} })),
      } }));
      catalogCache = null; // stock changed
      return orderFromRow(o);
    }
    const o = {
      id: S.newOrderId(), createdAt: Date.now(), customer, method, coupon: coupon || '',
      items: lines.map((l) => ({ id: l.p.id, qty: l.qty, price: l.p.price, name: l.p.name, options: l.options || {}, ...(S.isDigital(l.p) ? { digital: true } : {}) })),
      subtotal: totals.sub, discount: totals.discount, shipping: totals.ship, total: totals.total, status: 'new', paid: false,
      history: [{ s: 'new', t: Date.now() }],
    };
    const mine = ls.get('raff.myorders', []); mine.unshift(o); ls.set('raff.myorders', mine.slice(0, 50));
    return o;
  }
  async function myOrders() {
    if (mode === 'cloud') {
      await ready;
      if (!user) return [];
      return must(await client.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)).map(orderFromRow);
    }
    return ls.get('raff.myorders', []);
  }
  async function trackOrder(id, phone) {
    id = String(id || '').trim().toUpperCase();
    if (mode === 'cloud') {
      const r = must(await client.rpc('track_order', { p_id: id, p_phone: S.toLatinDigits(phone) }));
      return r ? orderFromRow({ ...r, customer: { city: r.city } }) : null;
    }
    const d = S.toLatinDigits(phone).replace(/\D/g, '').slice(-7);
    return ls.get('raff.myorders', []).find((o) => o.id === id && String(o.customer.phone).replace(/\D/g, '').slice(-7) === d) || null;
  }

  /* ---------- Wishlist ---------- */
  const localSaved = () => new Set(ls.get('raff.saved', []));
  let cloudSaved = null;
  const wishlist = {
    async load() {
      if (mode === 'cloud' && user) {
        cloudSaved = new Set(must(await client.from('wishlist').select('product_id')).map((r) => +r.product_id));
        return cloudSaved;
      }
      return localSaved();
    },
    has(id) { return (mode === 'cloud' && user && cloudSaved ? cloudSaved : localSaved()).has(id); },
    async toggle(id) {
      if (mode === 'cloud' && user) {
        if (!cloudSaved) await wishlist.load();
        if (cloudSaved.has(id)) { cloudSaved.delete(id); must(await client.from('wishlist').delete().eq('product_id', id)); }
        else { cloudSaved.add(id); must(await client.from('wishlist').insert({ product_id: id })); }
        return cloudSaved.has(id);
      }
      const s = localSaved(); s.has(id) ? s.delete(id) : s.add(id); ls.set('raff.saved', [...s]); return s.has(id);
    },
    all() { return [...(mode === 'cloud' && user && cloudSaved ? cloudSaved : localSaved())]; },
  };
  async function mergeLocalWishlist() {
    try {
      const local = [...localSaved()];
      if (local.length) {
        await client.from('wishlist').upsert(local.map((product_id) => ({ product_id })), { onConflict: 'user_id,product_id', ignoreDuplicates: true });
        ls.set('raff.saved', []);
      }
      await wishlist.load();
    } catch { /* not fatal */ }
  }

  /* ---------- Addresses ---------- */
  const addresses = {
    async list() {
      if (mode === 'cloud' && user) return must(await client.from('addresses').select('*').order('is_default', { ascending: false }).order('id'));
      return ls.get('raff.addresses', []);
    },
    async save(a) {
      const row = { label: a.label || '', name: a.name, phone: a.phone, city: a.city, address: a.address, is_default: !!a.is_default };
      if (mode === 'cloud' && user) {
        if (row.is_default) await client.from('addresses').update({ is_default: false }).eq('user_id', user.id);
        if (a.id) must(await client.from('addresses').update(row).eq('id', a.id)); else must(await client.from('addresses').insert(row));
        return;
      }
      let l = ls.get('raff.addresses', []);
      if (row.is_default) l = l.map((x) => ({ ...x, is_default: false }));
      if (a.id) l = l.map((x) => (x.id === a.id ? { ...x, ...row } : x)); else l.push({ ...row, id: Date.now() });
      ls.set('raff.addresses', l);
    },
    async remove(id) {
      if (mode === 'cloud' && user) { must(await client.from('addresses').delete().eq('id', id)); return; }
      ls.set('raff.addresses', ls.get('raff.addresses', []).filter((x) => x.id !== id));
    },
  };

  /* ---------- Reviews ---------- */
  const reviews = {
    async list(pid) {
      if (mode !== 'cloud') return [];
      return must(await client.from('reviews').select('id,rating,body,author,created_at,status,user_id').eq('product_id', pid).order('created_at', { ascending: false }).limit(50));
    },
    async canReview(pid) {
      if (mode !== 'cloud' || !user) return false;
      return !!must(await client.rpc('can_review', { p_product: pid }));
    },
    async add(pid, rating, body) { must(await client.from('reviews').insert({ product_id: pid, rating, body })); },
  };

  /* ---------- Answer system: conversations + product Q&A ---------- */
  const threadsKey = 'raff.threads';
  const support = {
    saved() { return ls.get(threadsKey, []); },
    remember(t) { const l = support.saved().filter((x) => x.id !== t.id); l.unshift(t); ls.set(threadsKey, l.slice(0, 20)); },
    tokenOf(id) { const t = support.saved().find((x) => x.id === id); return t ? t.token : ''; },
    async start(p) {
      const r = must(await client.rpc('start_conversation', { p: {
        name: p.name || '', contact: p.contact || '', subject: p.subject || '', body: p.body,
        order_id: p.orderId || '', product_id: p.productId ? String(p.productId) : '', bot: (p.bot || []).slice(0, 5),
      } }));
      support.remember({ id: r.id, token: r.token, subject: p.subject || '', at: Date.now() });
      return r;
    },
    async get(id) { return must(await client.rpc('get_conversation', { p_id: id, p_token: support.tokenOf(id) })); },
    async reply(id, body) { must(await client.rpc('reply_conversation', { p_id: id, p_token: support.tokenOf(id), p_body: body })); },
    async list() {
      const out = new Map();
      if (user) {
        const rows = must(await client.from('conversations').select('id,subject,status,unread_customer,last_message,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(50));
        rows.forEach((r) => out.set(r.id, { ...r, updatedAt: new Date(r.updated_at).getTime() }));
      }
      // guest threads remembered on this device
      await Promise.all(support.saved().slice(0, 10).filter((t) => !out.has(t.id)).map(async (t) => {
        try {
          const c = await support.get(t.id);
          if (c) {
            const last = c.messages[c.messages.length - 1] || {};
            out.set(c.id, { id: c.id, subject: c.subject, status: c.status, unread_customer: last.sender === 'admin' && (t.seen || 0) < new Date(last.created_at).getTime(), last_message: last.body || '', updatedAt: new Date(c.updated_at).getTime() });
          }
        } catch { /* expired or offline */ }
      }));
      return [...out.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    },
    markSeen(id) { const l = support.saved().map((x) => (x.id === id ? { ...x, seen: Date.now() } : x)); ls.set(threadsKey, l); },
  };
  const qa = {
    async list(pid) {
      if (mode !== 'cloud') return [];
      return must(await client.from('product_questions').select('id,question,answer,author,status,created_at,answered_at,user_id').eq('product_id', pid).order('created_at', { ascending: false }).limit(50));
    },
    async ask(pid, question, name) { must(await client.rpc('ask_question', { p_product: pid, p_question: question, p_name: name || '' })); },
  };

  window.RaffData = {
    mode, cfg, client, ready, friendly, must, fromRow, toRow, orderFromRow,
    support, qa, catalog, auth, checkCoupon, localCoupon, sha, placeOrder, myOrders, trackOrder, wishlist, addresses, reviews,
  };
})();
