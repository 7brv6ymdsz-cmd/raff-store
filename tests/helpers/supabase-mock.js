// In-memory stand-in for the Supabase REST/Auth/Storage APIs, used through Playwright request interception.
// It mirrors the behaviour of supabase/setup.sql closely enough to test the site end to end;
// the SQL itself (security rules, functions) is tested on a real PostgreSQL by tests/db/run.sh.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const STORE_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/store.json');
export const MOCK_URL = 'https://test-raff.supabase.co';
export const MOCK_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.anon-key-for-tests';

export function makeMock() {
  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = (p) => `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u(p)}.sig`;
  const decode = (t) => { try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()); } catch { return {}; } };
  const cat = JSON.parse(fs.readFileSync(STORE_JSON, 'utf8'));
  const db = {
    settings: [{ id: 1, data: { ...cat.settings, whatsapp: '' } }],
    categories: cat.categories.map((c, i) => ({ id: c.id, name: c.name, color: c.c, sort: i })),
    products: cat.products.map((p) => ({ id: p.id, name: p.name, brand: p.store, category_id: p.cat, price: p.price, compare_at: null, stock: p.stock, description: p.desc, images: [], art: { kind: p.kind, bg: p.bg, fg: p.fg, ac: p.ac }, options: p.options || [], featured: p.featured, hidden: false, rating: p.rating, reviews_count: p.reviews, sort: 0, created_at: new Date().toISOString() })),
    admins: [], profiles: [], addresses: [], wishlist: [], orders: [], reviews: [], conversations: [], conversation_messages: [], product_questions: [], stock_movements: [], admin_notifications: [], audit_log: [],
    subscriptions: [], blocked_users: [], mizan_books: [], mizan_entries: [], mizan_clients: [], mizan_invoices: [],
    coupons: [{ code: 'WELCOME10', kind: 'percent', value: 10, min_subtotal: 0, starts_at: null, ends_at: null, max_uses: null, uses: 0, active: true, created_at: new Date().toISOString() }],
  };
  db.settings[0].data.payments = { cod: { on: true }, paypal: { on: true, user: 'raffshop' }, bank: { on: false } };
  const users = []; let seq = 1000;
  const log = [];
  const uidOf = (req) => decode((req.headers()['authorization'] || '').replace('Bearer ', '')).sub || null;
  const isAdmin = (u) => !!u && db.admins.some((a) => a.user_id === u);
  const roleOf = (u) => (db.admins.find((a) => a.user_id === u) || {}).role;
  const hasRole = (u, ...roles) => !!u && (roleOf(u) === 'owner' || roles.includes(roleOf(u)));
  // mirrors public.subscription_active() in setup.sql
  const subOpen = (s) => !!s && ((['on_trial', 'active'].includes(s.status) && (!s.current_period_end || new Date(s.current_period_end) > new Date()))
    || (['past_due', 'cancelled'].includes(s.status) && !!s.current_period_end && new Date(s.current_period_end) > new Date()));
  const isBlocked = (u) => db.blocked_users.some((b) => b.user_id === u);
  const subActive = (u) => !!u && !isBlocked(u) && subOpen(db.subscriptions.find((s) => s.user_id === u));
  const HARAM = { alcohol: ['نبيذ', 'خمور', 'خمر', 'بيره', 'wine', 'beer'], gambling: ['كازينو', 'قمار', 'casino'] };
  const haram = (t) => { const s = ` ${String(t || '').toLowerCase().replace(/[^0-9a-z\u0621-\u064A]+/g, ' ').replace(/ة/g, 'ه')} `; return Object.keys(HARAM).filter((k) => HARAM[k].some((w) => ['', 'ال', 'و', 'وال', 'ب', 'بال'].some((p) => s.includes(` ${p}${w} `)))); };
  const MIZAN = ['mizan_books', 'mizan_entries', 'mizan_clients', 'mizan_invoices'];
  const setStock = (pr, next, reason, ref = '', note = '', actor = null) => {
    const before = pr.stock; pr.stock = Math.max(0, next);
    if (pr.stock === before) return;
    db.stock_movements.push({ id: seq++, product_id: pr.id, delta: pr.stock - before, stock_after: pr.stock, reason, ref, note, actor, at: new Date().toISOString() });
    const th = pr.low_stock_threshold ?? 5;
    if (pr.stock <= th && before > th) db.admin_notifications.push({ id: seq++, kind: pr.stock === 0 ? 'out_of_stock' : 'low_stock', title: (pr.stock === 0 ? 'نفد من المخزون: ' : 'المخزون قليل: ') + pr.name, body: `الكمية الحالية ${pr.stock}`, link: `#inventory/${pr.id}`, read: false, created_at: new Date().toISOString() });
  };
  const audit = (u, action, entity, id, details) => { if (isAdmin(u)) db.audit_log.push({ id: seq++, at: new Date().toISOString(), actor: u, actor_email: (users.find((x) => x.id === u) || {}).email || 'system', action, entity, entity_id: String(id), details }); };
  const session = (u) => ({ access_token: jwt({ sub: u.id, email: u.email, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' }), refresh_token: 'r-' + u.id, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: u });
  const visible = (table, rows, u) => {
    if (table === 'products') return rows.filter((r) => !r.hidden || isAdmin(u));
    if (table === 'orders') return rows.filter((r) => r.user_id === u || isAdmin(u));
    if (['addresses', 'wishlist'].includes(table)) return rows.filter((r) => r.user_id === u);
    if (table === 'profiles') return rows.filter((r) => r.id === u || isAdmin(u));
    if (table === 'coupons') return isAdmin(u) ? rows : [];
    if (table === 'reviews') return rows.filter((r) => r.status === 'approved' || r.user_id === u || isAdmin(u));
    if (table === 'admins') return rows.filter((r) => r.user_id === u || hasRole(u));
    if (table === 'audit_log') return hasRole(u, 'manager') ? rows : [];
    if (table === 'stock_movements') return hasRole(u, 'manager', 'inventory') ? rows : [];
    if (table === 'admin_notifications') return isAdmin(u) ? rows : [];
    if (table === 'conversations') return rows.filter((r) => (u && r.user_id === u) || isAdmin(u));
    if (table === 'conversation_messages') return rows.filter((r) => isAdmin(u) || db.conversations.some((c) => c.id === r.conversation_id && u && c.user_id === u));
    if (table === 'product_questions') return rows.filter((r) => r.status === 'published' || (u && r.user_id === u) || isAdmin(u));
    if (table === 'subscriptions') return rows.filter((r) => r.user_id === u || hasRole(u, 'manager'));
    if (MIZAN.includes(table)) return subActive(u) ? rows.filter((r) => r.user_id === u) : [];
    return rows;
  };
  const parseVal = (v) => (v === 'true' ? true : v === 'false' ? false : v === 'null' ? null : /^-?\d+(\.\d+)?$/.test(v) ? +v : v);
  const filt = (rows, params) => {
    for (const [k, v] of params) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
      const m = /^(eq|gte|lte|gt|in|neq)\.(.*)$/.exec(v); if (!m) continue;
      const [, op, raw] = m;
      if (op === 'eq') rows = rows.filter((r) => String(r[k]) === String(parseVal(raw)));
      if (op === 'neq') rows = rows.filter((r) => String(r[k]) !== String(parseVal(raw)));
      if (op === 'gt') rows = rows.filter((r) => r[k] > raw);
      if (op === 'gte') rows = rows.filter((r) => String(r[k]) >= raw);
      if (op === 'lte') rows = rows.filter((r) => String(r[k]) <= raw);
      if (op === 'in') { const set = raw.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, '')); rows = rows.filter((r) => set.includes(String(r[k]))); }
    }
    return rows;
  };
  const sortRows = (rows, order) => {
    if (!order) return rows;
    const keys = order.split(',').map((o) => { const [c, dir] = o.split('.'); return [c, dir === 'desc' ? -1 : 1]; });
    return [...rows].sort((a, b) => { for (const [c, d] of keys) { if (a[c] < b[c]) return -d; if (a[c] > b[c]) return d; } return 0; });
  };
  const ship = (sub) => { const s = db.settings[0].data.shipping || {}; return s.freeOver > 0 && sub >= s.freeOver ? 0 : +s.fee || 0; };
  const couponDisc = (code, sub) => {
    const c = db.coupons.find((x) => x.code === String(code).toUpperCase().trim());
    if (!c || !c.active) return { ok: false, message: 'الكود غير صالح' };
    if (sub < c.min_subtotal) return { ok: false, message: 'الحد الأدنى للطلب ' + c.min_subtotal };
    const d = c.kind === 'percent' ? Math.round(sub * c.value) / 100 : c.kind === 'fixed' ? Math.min(c.value, sub) : ship(sub);
    return { ok: true, code: c.code, kind: c.kind, value: c.value, discount: d };
  };
  const RPC = {
    is_admin: (b, u) => isAdmin(u),
    admin_exists: () => db.admins.length > 0,
    claim_admin: (b, u) => { if (!u) return false; if (db.admins.length) return isAdmin(u); db.admins.push({ user_id: u, role: 'owner' }); return true; },
    my_role: (b, u) => roleOf(u) || null,
    list_staff: (b, u) => (hasRole(u) ? db.admins.map((a) => { const x = users.find((y) => y.id === a.user_id) || {}; return { user_id: a.user_id, email: x.email, full_name: (db.profiles.find((p) => p.id === a.user_id) || {}).full_name || '', role: a.role, created_at: new Date().toISOString() }; }) : []),
    add_staff: (b, u) => {
      if (!hasRole(u)) throw new Error('not_allowed');
      const x = users.find((y) => y.email.toLowerCase() === String(b.p_email).trim().toLowerCase()); if (!x) throw new Error('user_not_found');
      const a = db.admins.find((y) => y.user_id === x.id); if (a) a.role = b.p_role; else db.admins.push({ user_id: x.id, role: b.p_role });
      audit(u, 'insert', 'admins', x.id, { name: x.email }); return null;
    },
    remove_staff: (b, u) => { if (!hasRole(u)) throw new Error('not_allowed'); if (roleOf(b.p_user) === 'owner' && db.admins.filter((a) => a.role === 'owner').length === 1) throw new Error('last_owner'); db.admins = db.admins.filter((a) => a.user_id !== b.p_user); return null; },
    adjust_stock: (b, u) => {
      if (!hasRole(u, 'manager', 'inventory')) throw new Error('not_allowed');
      const pr = db.products.find((x) => x.id === +b.p_product); if (!pr) throw new Error('not_found');
      setStock(pr, pr.stock + b.p_delta, b.p_reason, '', b.p_note, u); return pr.stock;
    },
    check_coupon: (b) => couponDisc(b.p_code, +b.p_subtotal),
    can_review: (b, u) => db.orders.some((o) => o.user_id === u && o.status === 'delivered' && o.items.some((i) => +i.id === +b.p_product)),
    place_order: (b, u) => {
      const p = b.p; let sub = 0; const items = [];
      for (const it of p.items) {
        const pr = db.products.find((x) => x.id === +it.id && !x.hidden);
        if (!pr) throw new Error('product_unavailable:' + it.id);
        if (pr.stock < it.qty) throw new Error('out_of_stock:' + pr.name);
        setStock(pr, pr.stock - it.qty, 'order'); sub += pr.price * it.qty;
        items.push({ id: pr.id, name: pr.name, price: pr.price, qty: it.qty, options: it.options || {}, image: '' });
      }
      let disc = 0; if (p.coupon) { const c = couponDisc(p.coupon, sub); if (!c.ok) throw new Error('coupon_invalid:' + c.message); disc = c.discount; db.coupons.find((x) => x.code === c.code).uses++; }
      const sh = ship(sub);
      const o = { id: 'R-' + (seq++).toString(36).toUpperCase() + 'TEST', user_id: u, customer: p.customer, items, subtotal: sub, discount: disc, shipping: sh, total: sub - disc + sh, coupon: p.coupon || null, method: p.method, status: 'new', paid: false, note: '', history: [{ s: 'new', t: new Date().toISOString() }], stock_applied: true, created_at: new Date().toISOString() };
      db.orders.push(o); log.push('order ' + o.id); return o;
    },
    track_order: (b) => { const o = db.orders.find((x) => x.id === String(b.p_id).toUpperCase()); if (!o) return null; const d = (s) => String(s).replace(/\D/g, '').slice(-7); return d(o.customer.phone) === d(b.p_phone) ? { ...o, city: o.customer.city } : null; },
    start_conversation: (b, u) => {
      const p = b.p; let name = (p.name || '').trim(), contact = (p.contact || '').trim();
      const prof = db.profiles.find((x) => x.id === u); const usr = users.find((x) => x.id === u);
      if (u && !name && prof) name = prof.full_name; if (u && !contact && usr) contact = usr.email;
      if (name.length < 2) throw new Error('name_required');
      if (!u && contact.replace(/\s/g, '').length < 6) throw new Error('contact_required');
      if (!p.body || p.body.trim().length < 2) throw new Error('message_length');
      const c = { id: randomUUID(), user_id: u, token: randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''), name, contact, subject: p.subject || '', order_id: p.order_id ? p.order_id.toUpperCase() : null, product_id: p.product_id ? +p.product_id : null, status: 'open', unread_admin: true, unread_customer: false, last_message: p.body.slice(0, 200), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.conversations.push(c);
      (p.bot || []).forEach((t) => db.conversation_messages.push({ id: seq++, conversation_id: c.id, sender: 'bot', body: t, created_at: new Date().toISOString() }));
      db.conversation_messages.push({ id: seq++, conversation_id: c.id, sender: 'customer', body: p.body.trim(), created_at: new Date().toISOString() });
      return { id: c.id, token: c.token };
    },
    get_conversation: (b, u) => {
      const c = db.conversations.find((x) => x.id === b.p_id);
      if (!c || !((u && c.user_id === u) || (b.p_token && c.token === b.p_token) || isAdmin(u))) return null;
      if (!isAdmin(u)) c.unread_customer = false;
      return { id: c.id, name: c.name, subject: c.subject, order_id: c.order_id, product_id: c.product_id, status: c.status, created_at: c.created_at, updated_at: c.updated_at, messages: db.conversation_messages.filter((m) => m.conversation_id === c.id).sort((x, y) => x.id - y.id) };
    },
    reply_conversation: (b, u) => {
      const c = db.conversations.find((x) => x.id === b.p_id);
      if (!c || !((u && c.user_id === u) || (b.p_token && c.token === b.p_token) || isAdmin(u))) throw new Error('not_found');
      db.conversation_messages.push({ id: seq++, conversation_id: c.id, sender: 'customer', body: b.p_body.trim(), created_at: new Date().toISOString() });
      Object.assign(c, { status: 'open', unread_admin: true, last_message: b.p_body.slice(0, 200), updated_at: new Date().toISOString() }); return null;
    },
    admin_reply: (b, u) => {
      if (!hasRole(u, 'manager', 'support')) throw new Error('not_allowed');
      const c = db.conversations.find((x) => x.id === b.p_id); if (!c) throw new Error('not_found');
      db.conversation_messages.push({ id: seq++, conversation_id: c.id, sender: 'admin', body: b.p_body.trim(), created_at: new Date().toISOString() });
      Object.assign(c, { status: 'answered', unread_admin: false, unread_customer: true, last_message: b.p_body.slice(0, 200), updated_at: new Date().toISOString() }); return null;
    },
    ask_question: (b, u) => {
      if (!b.p_question || b.p_question.trim().length < 3) throw new Error('question_length');
      const prof = db.profiles.find((x) => x.id === u);
      db.product_questions.push({ id: seq++, product_id: +b.p_product, user_id: u, author: (b.p_name || (prof && prof.full_name) || 'زائر'), question: b.p_question.trim(), answer: '', status: 'pending', created_at: new Date().toISOString(), answered_at: null });
      return null;
    },
    delete_my_account: (b, u) => { if (!u) throw new Error('not_signed_in'); if (isAdmin(u) && db.admins.length === 1) throw new Error('last_admin'); const i = users.findIndex((x) => x.id === u); users.splice(i, 1); db.profiles = db.profiles.filter((x) => x.id !== u); db.addresses = db.addresses.filter((x) => x.user_id !== u); db.wishlist = db.wishlist.filter((x) => x.user_id !== u); db.orders.forEach((o) => { if (o.user_id === u) o.user_id = null; }); return null; },
    subscription_active: (b, u) => subActive(u),
    my_subscription: (b, u) => { const s = db.subscriptions.find((x) => x.user_id === u); const bl = db.blocked_users.find((x) => x.user_id === u); if (bl) return { blocked: true, reason: bl.reason, active: false, plan: s && s.plan, status: s && s.status }; return s ? { blocked: false, plan: s.plan, status: s.status, current_period_end: s.current_period_end, provider: s.provider, manage_url: s.manage_url || '', active: subActive(u) } : null; },
    admin_grant_subscription: (b, u) => {
      if (!hasRole(u, 'manager')) throw new Error('not_allowed');
      if (!['pro', 'business'].includes(b.p_plan)) throw new Error('bad_plan');
      const who = users.find((x) => x.email.toLowerCase() === String(b.p_email || '').trim().toLowerCase()); if (!who) throw new Error('user_not_found');
      const row = { user_id: who.id, plan: b.p_plan, status: 'active', current_period_end: b.p_days == null ? null : new Date(Date.now() + b.p_days * 864e5).toISOString(), provider: 'manual', manage_url: '', updated_at: new Date().toISOString() };
      const i = db.subscriptions.findIndex((x) => x.user_id === who.id); if (i >= 0) db.subscriptions[i] = { ...db.subscriptions[i], ...row }; else db.subscriptions.push(row);
      return row;
    },
    admin_end_subscription: (b, u) => { if (!hasRole(u, 'manager')) throw new Error('not_allowed'); const x = db.subscriptions.find((y) => y.user_id === b.p_user); if (!x) throw new Error('not_found'); Object.assign(x, { status: 'expired', current_period_end: new Date().toISOString() }); return null; },
    admin_list_subscriptions: (b, u) => (hasRole(u, 'manager') ? db.subscriptions.map((x) => { const who = users.find((y) => y.id === x.user_id) || {}; const bl = db.blocked_users.find((y) => y.user_id === x.user_id); return { user_id: x.user_id, email: who.email, full_name: (db.profiles.find((pr) => pr.id === x.user_id) || {}).full_name || '', plan: x.plan, status: x.status, current_period_end: x.current_period_end, provider: x.provider, active: !bl && subOpen(x), blocked: !!bl, block_reason: bl ? bl.reason : '', updated_at: x.updated_at }; }) : []),
    admin_block_member: (b, u) => { if (!hasRole(u, 'manager')) throw new Error('not_allowed'); if (isAdmin(b.p_user)) throw new Error('staff_member'); db.blocked_users = db.blocked_users.filter((x) => x.user_id !== b.p_user).concat({ user_id: b.p_user, reason: String(b.p_reason || '').slice(0, 300), blocked_at: new Date().toISOString() }); return null; },
    admin_unblock_member: (b, u) => { if (!hasRole(u, 'manager')) throw new Error('not_allowed'); db.blocked_users = db.blocked_users.filter((x) => x.user_id !== b.p_user); return null; },
    admin_set_status: (b, u) => { if (!hasRole(u, 'manager', 'support')) throw new Error('not_allowed'); const o = db.orders.find((x) => x.id === b.p_id); o.status = b.p_status; o.history.push({ s: b.p_status, t: new Date().toISOString() }); if (b.p_status === 'delivered' && o.method === 'cod') o.paid = true; return o; },
  };
  const json = (route, status, body, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*', ...headers }, body: body === undefined ? '' : JSON.stringify(body) });
  async function handle(route) {
    const req = route.request();
    if (req.method() === 'OPTIONS') return json(route, 200, {});
    const url = new URL(req.url()); const path = url.pathname; const u = uidOf(req);
    let body = null; try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch { body = req.postData(); }
    try {
      if (path.startsWith('/auth/v1/')) {
        const ep = path.slice(9);
        if (ep === 'signup') {
          if (users.some((x) => x.email === body.email)) return json(route, 200, { id: 'x', email: body.email, identities: [] });
          const user = { id: '00000000-0000-0000-0000-' + String(seq++).padStart(12, '0'), aud: 'authenticated', role: 'authenticated', email: body.email, user_metadata: body.data || {}, identities: [{ id: 'i' }], created_at: new Date().toISOString(), app_metadata: {} };
          users.push({ ...user, password: body.password }); db.profiles.push({ id: user.id, full_name: (body.data || {}).full_name || '', phone: (body.data || {}).phone || '' });
          return json(route, 200, session(user));
        }
        if (ep === 'token') {
          const gt = url.searchParams.get('grant_type');
          if (gt === 'password') { const x = users.find((y) => y.email === body.email && y.password === body.password); if (!x) return json(route, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' }); const { password, ...user } = x; return json(route, 200, session(user)); }
          if (gt === 'refresh_token') { const x = users.find((y) => 'r-' + y.id === body.refresh_token); const { password, ...user } = x; return json(route, 200, session(user)); }
        }
        if (ep === 'user') { const x = users.find((y) => y.id === u); if (!x) return json(route, 401, { msg: 'no user' }); if (req.method() === 'PUT' && body.password) x.password = body.password; const { password, ...user } = x; return json(route, 200, user); }
        if (ep === 'logout') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' });
        if (ep === 'recover') return json(route, 200, {});
        return json(route, 404, { msg: 'auth ' + ep });
      }
      if (path.startsWith('/storage/v1/object/')) return json(route, 200, { Key: path.replace('/storage/v1/object/', '') });
      if (path.startsWith('/rest/v1/rpc/')) {
        const fn = path.slice(13);
        if (!RPC[fn]) return json(route, 404, { message: 'no fn' });
        if ((fn === 'claim_admin' || fn === 'admin_set_status' || fn === 'delete_my_account' || fn === 'admin_reply') && !u) return json(route, 401, { message: 'permission denied' });
        return json(route, 200, RPC[fn](body || {}, u));
      }
      if (path.startsWith('/rest/v1/')) {
        const table = path.slice(9); const rows = db[table]; if (!rows) return json(route, 404, { message: 'no table ' + table });
        const accept = req.headers()['accept'] || ''; const single = accept.includes('vnd.pgrst.object');
        const prefer = req.headers()['prefer'] || '';
        const m = req.method();
        const adminTables = ['products', 'categories', 'coupons', 'settings'];
        if (m === 'GET') {
          let r = sortRows(filt(visible(table, rows, u), url.searchParams), url.searchParams.get('order'));
          if (url.searchParams.get('offset')) r = r.slice(+url.searchParams.get('offset'));
          if (url.searchParams.get('limit')) r = r.slice(0, +url.searchParams.get('limit'));
          return json(route, 200, single ? r[0] || null : r);
        }
        if (m === 'POST') {
          const list = Array.isArray(body) ? body : [body];
          if ((adminTables.includes(table) || ['orders', 'conversations', 'conversation_messages', 'product_questions'].includes(table)) && !isAdmin(u)) return json(route, 403, { message: 'new row violates row-level security policy' });
          if (table === 'reviews' && !RPC.can_review({ p_product: list[0].product_id }, u)) return json(route, 403, { message: 'new row violates row-level security policy for table "reviews"' });
          if (table === 'products') { const h = haram(list.map((x) => `${x.name || ''} ${x.brand || ''} ${x.description || ''}`).join(' ')); if (h.length) return json(route, 400, { code: 'P0001', message: `halal_blocked:${h.join(',')}` }); }
          if (table === 'subscriptions' || (MIZAN.includes(table) && !subActive(u))) return json(route, 403, { code: '42501', message: `new row violates row-level security policy for table "${table}"` });
          const out = list.map((r) => {
            const row = { ...r };
            if (['addresses', 'wishlist', 'reviews'].concat(MIZAN).includes(table)) row.user_id = u;
            if (MIZAN.includes(table) && table !== 'mizan_books' && !row.id) { row.id = seq++; row.created_at = new Date().toISOString(); }
            if (table === 'reviews') { row.status = 'pending'; row.author = (db.profiles.find((p) => p.id === u) || {}).full_name || ''; row.created_at = new Date().toISOString(); }
            if (['products', 'addresses', 'reviews'].includes(table) && !row.id) row.id = seq++;
            if (table === 'products') Object.assign(row, { created_at: new Date().toISOString(), rating: row.rating || 0, reviews_count: row.reviews_count || 0 });
            const keyCol = table === 'categories' ? 'id' : table === 'coupons' ? 'code' : table === 'wishlist' ? null : table === 'mizan_books' ? 'user_id' : 'id';
            const existing = keyCol ? rows.find((x) => x[keyCol] === row[keyCol]) : rows.find((x) => x.user_id === row.user_id && x.product_id === row.product_id);
            if (existing) { if (!prefer.includes('ignore-duplicates')) Object.assign(existing, row); return existing; }
            rows.push(row); return row;
          });
          return json(route, 201, prefer.includes('return=representation') ? (single ? out[0] : out) : undefined);
        }
        if (m === 'PATCH') {
          if (adminTables.concat(['orders', 'conversations', 'product_questions']).includes(table) && !isAdmin(u)) return json(route, 200, single ? null : []);
          if (table === 'products' && !hasRole(u, 'manager', 'inventory')) return json(route, 200, single ? null : []);
          if (['settings', 'coupons', 'categories'].includes(table) && !hasRole(u, 'manager')) return json(route, 200, single ? null : []);
          const r = filt(visible(table, rows, u), url.searchParams);
          if (MIZAN.includes(table) && single && r.length !== 1) return json(route, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
          r.forEach((x) => { const diff = {}; Object.keys(body).forEach((k) => { if (JSON.stringify(x[k]) !== JSON.stringify(body[k]) && !['images', 'description', 'data'].includes(k)) diff[k] = { from: x[k], to: body[k] }; }); if (table !== 'admin_notifications' && Object.keys(diff).length) audit(u, 'update', table, x.id || x.code, diff); Object.assign(x, body); });
          if (table === 'reviews') { const pid = r[0] && r[0].product_id; const ap = rows.filter((x) => x.product_id === pid && x.status === 'approved'); const p = db.products.find((x) => x.id === pid); if (p) { p.reviews_count = ap.length; p.rating = ap.length ? ap.reduce((s, x) => s + x.rating, 0) / ap.length : 0; } }
          return json(route, 200, prefer.includes('return=representation') ? (single ? r[0] : r) : undefined);
        }
        if (m === 'DELETE') {
          const r = filt(visible(table, rows, u), url.searchParams);
          db[table] = rows.filter((x) => !r.includes(x));
          return json(route, 204, undefined);
        }
      }
      return json(route, 404, { message: 'unhandled ' + path });
    } catch (e) { return json(route, 400, { message: e.message, code: 'P0001' }); }
  }
  return { handle, db, users, log };
}

export async function attachMock(context, mock) {
  await context.route(`${MOCK_URL}/**`, (r) => mock.handle(r));
  await context.addInitScript(([url, key]) => localStorage.setItem('raff.cloud', JSON.stringify({ url, key })), [MOCK_URL, MOCK_KEY]);
}

