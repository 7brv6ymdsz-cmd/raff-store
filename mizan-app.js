/* ميزان · the finance book inside the site (#/mizan). It opens only with an active subscription.
   The lock itself is enforced by the database (row-level security on the mizan_* tables);
   this page only shows the right state and never trusts itself to keep data closed. */
(() => {
  'use strict';
  const S = window.RaffShared, D = window.RaffData, R = () => window.raff;
  const { esc, num } = S;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const page = $('#page');
  const cloud = D.mode === 'cloud';

  const TABS = [['dashboard', 'لوحة التحكم'], ['entries', 'المعاملات'], ['invoices', 'الفواتير'], ['clients', 'العملاء'], ['pricing', 'التسعير'], ['settings', 'الإعدادات']];
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const KIND = { income: 'دخل', expense: 'مصروف' };
  const DEFAULTS = {
    business: '', currency: '$', taxRate: 0.1, goal: 0,
    incomeCats: ['مبيعات منتجات', 'خدمات', 'استشارات', 'اشتراكات', 'دخل آخر'],
    expenseCats: ['مواد وتكلفة بضاعة', 'إعلانات وتسويق', 'برامج واشتراكات', 'رواتب ومستقلون', 'إيجار ومكتب', 'شحن وتوصيل', 'رسوم دفع وبنك', 'معدات', 'مصاريف أخرى'],
    methods: ['تحويل', 'بطاقة', 'نقداً', 'PayPal'],
  };
  const PLAN_NAMES = { pro: 'احترافي', business: 'أعمال' };
  const STATUS_WORDS = { on_trial: 'فترة تجربة', active: 'فعّال', past_due: 'بانتظار الدفع', cancelled: 'ملغى', paused: 'موقوف', unpaid: 'غير مدفوع', expired: 'منتهي' };

  let st = null; // { uid, sub, cfg, year, entries, clients, invoices, edit, filter }

  const r2 = (v) => Math.round((+v || 0) * 100) / 100;
  const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const cur = () => (st && st.cfg.currency) || '$';
  const money = (v) => `${num(r2(v))}${esc(cur())}`;
  const day = (d) => { if (!d) return ''; const [y, m, dd] = String(d).slice(0, 10).split('-'); return `${num(+dd)} ${MONTHS[+m - 1]} ${num(+y)}`; };
  const parseNum = (v) => { const x = parseFloat(S.toLatinDigits(String(v ?? '')).replace(/[^\d.-]/g, '')); return Number.isFinite(x) ? x : NaN; };
  const toast = (m) => R().toast(m);
  const locked = (e) => /row-level security|permission denied|42501/i.test(String((e && (e.message || e.code)) || e));

  /* ---------- data ---------- */
  const must = (res) => { if (res.error) { const err = new Error(res.error.message || 'error'); err.code = res.error.code; throw err; } return res.data; };
  async function all(q) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const rows = must(await q().range(from, from + 999));
      out.push(...rows);
      if (rows.length < 1000) return out;
    }
  }
  async function loadYear(y) {
    st.entries = await all(() => D.client.from('mizan_entries').select('*').gte('day', `${y}-01-01`).lte('day', `${y}-12-31`).order('day', { ascending: false }).order('id', { ascending: false }));
    st.year = y;
  }
  async function load(sub) {
    const uid = D.auth.user.id;
    st = { uid, sub, cfg: { ...DEFAULTS }, year: new Date().getFullYear(), entries: [], clients: [], invoices: [], edit: null, filter: { month: '', kind: '', q: '' } };
    const [book, clients, invoices] = await Promise.all([
      D.client.from('mizan_books').select('*').eq('user_id', uid).maybeSingle().then(must),
      all(() => D.client.from('mizan_clients').select('*').order('name')),
      all(() => D.client.from('mizan_invoices').select('*').order('id', { ascending: false })),
    ]);
    if (book && book.settings) st.cfg = { ...DEFAULTS, ...book.settings };
    st.clients = clients; st.invoices = invoices;
    await loadYear(st.year);
  }
  // Runs a database call. On failure it asks the server whether the plan is still active: if not, Mizan locks
  // (data kept); otherwise the error is shown. Returns false on failure, else the result (or true).
  async function guard(fn) {
    try { const v = await fn(); return v ?? true; } catch (e) {
      let active = !locked(e);
      if (active) { try { const sub = must(await D.client.rpc('my_subscription')); active = !!(sub && sub.active); } catch { /* keep */ } }
      if (!active) { st = null; toast('انتهى اشتراكك، فانقفل ميزان. بياناتك محفوظة.'); window.raffRouter.route(); return false; }
      toast(D.friendly ? D.friendly(e) : e.message); return false;
    }
  }

  /* ---------- locked states ---------- */
  const plans = () => {
    const b = (R().CFG && R().CFG.billing) || {};
    return Array.isArray(b.plans) && b.plans.length ? b.plans : [
      { id: 'pro', name: 'احترافي', price: 119, features: ['ميزان كامل', 'مشروع واحد'] },
      { id: 'business', name: 'أعمال', price: 249, features: ['ميزان كامل', 'حتى ٥ مشاريع'] },
    ];
  };
  const checkoutLink = (p) => {
    const url = S.safeUrl(p.checkoutUrl);
    if (!url || !D.auth.user) return '';
    try {
      const u = new URL(url);
      u.searchParams.set('checkout[email]', D.auth.user.email || '');
      u.searchParams.set('checkout[custom][user_id]', D.auth.user.id);
      return u.href;
    } catch { return ''; }
  };
  const planCards = (withButtons) => `<div class="mz-plans">${plans().map((p) => {
    const link = withButtons ? checkoutLink(p) : '';
    return `<article class="mz-plan-card${p.id === 'business' ? ' alt' : ''}">
      <h3>${esc(p.name || PLAN_NAMES[p.id] || p.id)}</h3>
      <p class="mz-price"><b>${num(+p.price || 0)}$</b><span>/ شهرياً</span></p>
      <ul>${(p.features || []).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      ${withButtons ? (link ? `<a class="btn-dark wide" href="${esc(link)}" target="_blank" rel="noopener noreferrer" data-mz-checkout="${esc(p.id)}">اشترك بـ ${esc(p.name || '')}</a>` : '<p class="mz-soon">الاشتراك الإلكتروني بيفتح قريباً. <a href="#/contact">تواصل معنا</a> لتشترك الآن.</p>') : ''}
    </article>`;
  }).join('')}</div>`;
  const lockIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  function lockedView(kind, sub) {
    const head = {
      server: ['ميزان للمشتركين', 'لوحتك المالية بتفتح مع الاشتراك الشهري. الخدمة بتشتغل قريباً.'],
      login: ['ميزان للمشتركين', 'سجّل دخول لتفتح لوحتك المالية، أو اعمل حساب جديد واشترك.'],
      plan: sub && sub.status
        ? ['ميزان مقفول', `اشتراكك ${STATUS_WORDS[sub.status] || ''}${sub.current_period_end ? ` منذ ${day(sub.current_period_end)}` : ''}. بياناتك محفوظة، وبترجع كلها فور التجديد.`]
        : ['ميزان مقفول', 'ميزان بيفتح مع الاشتراك الشهري. اختار باقتك:'],
    }[kind];
    page.innerHTML = `<div class="pg mz-lock">
      <div class="mz-lock-head"><span class="mz-lock-ic">${lockIcon}</span><h1 class="pg-title">${head[0]}</h1><p class="muted">${head[1]}</p></div>
      ${kind === 'login' ? '<div class="mz-lock-actions"><a class="btn-dark" href="#/login?next=mizan">تسجيل الدخول</a><a class="btn-ghost" href="#/signup?next=mizan">حساب جديد</a></div>' : ''}
      ${planCards(kind === 'plan')}
      ${kind === 'plan' ? '<p class="mz-lock-foot muted">دفعت للتو؟ <button type="button" class="link-btn" data-mz-recheck>تحقّق من اشتراكي</button></p>' : ''}
    </div>`;
    const re = $('[data-mz-recheck]', page);
    if (re) re.addEventListener('click', () => { st = null; window.raffRouter.route(); });
  }

  /* ---------- app shell ---------- */
  function shell(tab) {
    const sub = st.sub || {};
    const ends = sub.current_period_end ? `${sub.status === 'cancelled' ? 'ينتهي' : 'يتجدّد'} ${day(sub.current_period_end)}` : 'بدون تاريخ انتهاء';
    const manage = S.safeUrl(sub.manage_url);
    return `<div class="pg mz">
      <header class="mz-head">
        <div><p class="mz-kick">ميزان · لوحتك المالية</p><h1>${esc(st.cfg.business || 'مشروعي')}</h1></div>
        <div class="mz-sub"><span class="mz-badge">${esc(PLAN_NAMES[sub.plan] || sub.plan || '')} · ${esc(STATUS_WORDS[sub.status] || '')}</span><small>${ends}</small>${manage ? `<a href="${esc(manage)}" target="_blank" rel="noopener noreferrer">إدارة الاشتراك</a>` : ''}</div>
      </header>
      <nav class="mz-tabs" aria-label="أقسام ميزان">${TABS.map(([id, t]) => `<a href="#/mizan/${id}" ${id === tab ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
      <section class="mz-body" id="mzBody"></section>
    </div>`;
  }

  /* ---------- dashboard ---------- */
  function totals(rows) {
    const t = { inc: 0, exp: 0, byMonth: Array.from({ length: 12 }, () => ({ inc: 0, exp: 0 })), byCat: new Map() };
    rows.forEach((e) => {
      const m = +String(e.day).slice(5, 7) - 1, a = +e.amount || 0;
      if (e.kind === 'income') { t.inc += a; t.byMonth[m].inc += a; } else { t.exp += a; t.byMonth[m].exp += a; t.byCat.set(e.category || 'أخرى', (t.byCat.get(e.category || 'أخرى') || 0) + a); }
    });
    t.profit = t.inc - t.exp;
    t.margin = t.inc ? t.profit / t.inc : 0;
    t.tax = Math.max(0, t.profit) * (+st.cfg.taxRate || 0);
    const months = t.byMonth.filter((x) => x.inc > 0).length;
    t.avg = months ? t.inc / months : 0;
    return t;
  }
  function bars(byMonth) {
    const max = Math.max(1, ...byMonth.map((x) => Math.max(x.inc, x.exp)));
    const w = 640, h = 180, band = w / 12;
    const cols = byMonth.map((x, i) => {
      const xi = w - (i + 1) * band; // right to left: January on the right
      const hi = (x.inc / max) * (h - 24), he = (x.exp / max) * (h - 24);
      return `<g><rect x="${xi + band * 0.18}" y="${h - hi}" width="${band * 0.3}" height="${hi}" rx="3" class="b-inc"><title>${MONTHS[i]}: دخل ${num(r2(x.inc))}</title></rect>
        <rect x="${xi + band * 0.52}" y="${h - he}" width="${band * 0.3}" height="${he}" rx="3" class="b-exp"><title>${MONTHS[i]}: مصروف ${num(r2(x.exp))}</title></rect>
        <text x="${xi + band / 2}" y="${h + 16}" text-anchor="middle">${num(i + 1)}</text></g>`;
    }).join('');
    return `<svg class="mz-bars" viewBox="0 0 ${w} ${h + 22}" role="img" aria-label="الدخل والمصاريف لكل شهر">${cols}</svg>`;
  }
  function viewDashboard() {
    const t = totals(st.entries);
    const years = [...new Set([new Date().getFullYear(), st.year, new Date().getFullYear() - 1, new Date().getFullYear() - 2])].sort((a, b) => b - a);
    const cats = [...t.byCat.entries()].sort((a, b) => b[1] - a[1]);
    const catMax = cats.length ? cats[0][1] : 1;
    const nowM = new Date().getMonth();
    const goal = +st.cfg.goal || 0, thisMonth = t.byMonth[nowM].inc;
    $('#mzBody').innerHTML = `
      <div class="mz-row-head"><h2>سنة ${num(st.year)}</h2><label class="mz-inline"><span class="sr">السنة</span><select id="mzYear">${years.map((y) => `<option value="${y}" ${y === st.year ? 'selected' : ''}>${y}</option>`).join('')}</select></label></div>
      <div class="mz-kpis">
        <div class="mz-k"><span>الدخل</span><b>${money(t.inc)}</b></div>
        <div class="mz-k"><span>المصاريف</span><b>${money(t.exp)}</b></div>
        <div class="mz-k ${t.profit >= 0 ? 'pos' : 'neg'}"><span>صافي الربح</span><b>${money(t.profit)}</b></div>
        <div class="mz-k"><span>هامش الربح</span><b>${num(Math.round(t.margin * 100))}٪</b></div>
        <div class="mz-k"><span>جنّب للضريبة</span><b>${money(t.tax)}</b></div>
        <div class="mz-k"><span>متوسط الدخل الشهري</span><b>${money(t.avg)}</b></div>
      </div>
      ${goal > 0 && st.year === new Date().getFullYear() ? `<div class="mz-card mz-goal"><div><b>هدف ${MONTHS[nowM]}</b><span>${money(thisMonth)} من ${money(goal)}</span></div><div class="mz-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.round((thisMonth / goal) * 100))}"><i style="width:${Math.min(100, (thisMonth / goal) * 100)}%"></i></div></div>` : ''}
      <div class="mz-grid">
        <div class="mz-card"><h3>الدخل والمصاريف شهرياً</h3>${st.entries.length ? bars(t.byMonth) : '<p class="muted">ما في معاملات هالسنة لسا. <a href="#/mizan/entries">سجّل أول معاملة</a></p>'}<p class="mz-legend"><span class="li">دخل</span><span class="le">مصروف</span></p></div>
        <div class="mz-card"><h3>وين بتروح المصاري</h3>${cats.length ? `<ul class="mz-cats">${cats.slice(0, 8).map(([c, v]) => `<li><span>${esc(c)}</span><em>${money(v)}</em><b style="--w:${(v / catMax) * 100}%"></b></li>`).join('')}</ul>` : '<p class="muted">ما في مصاريف مسجّلة.</p>'}</div>
      </div>`;
    $('#mzYear').addEventListener('change', async (e) => { if (await guard(() => loadYear(+e.target.value)) === false || !st) return; viewDashboard(); });
  }

  /* ---------- entries ---------- */
  const catOptions = (kind, sel) => (kind === 'income' ? st.cfg.incomeCats : st.cfg.expenseCats).map((c) => `<option ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');
  function viewEntries() {
    const e = st.edit || { day: today(), kind: 'income', category: '', description: '', party: '', amount: '', method: st.cfg.methods[0] || '' };
    const f = st.filter;
    const rows = st.entries.filter((x) => (!f.month || +String(x.day).slice(5, 7) === +f.month) && (!f.kind || x.kind === f.kind)
      && (!f.q || S.norm(`${x.description} ${x.party} ${x.category}`).includes(S.norm(f.q))));
    const t = totals(rows);
    $('#mzBody').innerHTML = `
      <form class="mz-card mz-form" id="mzEntry" novalidate>
        <h3>${st.edit ? 'تعديل معاملة' : 'معاملة جديدة'}</h3>
        <div class="mz-fields">
          <label class="field"><span>التاريخ</span><input name="day" type="date" value="${esc(e.day)}" required></label>
          <label class="field"><span>النوع</span><select name="kind"><option value="income" ${e.kind === 'income' ? 'selected' : ''}>دخل</option><option value="expense" ${e.kind === 'expense' ? 'selected' : ''}>مصروف</option></select></label>
          <label class="field"><span>الفئة</span><select name="category">${catOptions(e.kind, e.category)}</select></label>
          <label class="field"><span>المبلغ (${esc(cur())})</span><input name="amount" inputmode="decimal" dir="ltr" value="${esc(e.amount)}" required></label>
          <label class="field wide"><span>الوصف</span><input name="description" maxlength="200" value="${esc(e.description)}"></label>
          <label class="field"><span>العميل / المورّد</span><input name="party" maxlength="120" list="mzClients" value="${esc(e.party)}"></label>
          <label class="field"><span>طريقة الدفع</span><select name="method">${st.cfg.methods.map((m) => `<option ${m === e.method ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
        </div>
        <datalist id="mzClients">${st.clients.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
        <p class="form-err" id="mzEntryErr" hidden></p>
        <div class="mz-actions"><button class="btn-dark" type="submit">${st.edit ? 'حفظ التعديل' : 'إضافة'}</button>${st.edit ? '<button class="btn-ghost" type="button" data-mz-cancel>إلغاء</button>' : ''}</div>
      </form>
      <div class="mz-filters">
        <select id="mzFm" aria-label="الشهر"><option value="">كل الأشهر</option>${MONTHS.map((m, i) => `<option value="${i + 1}" ${+f.month === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <select id="mzFk" aria-label="النوع"><option value="">الكل</option><option value="income" ${f.kind === 'income' ? 'selected' : ''}>دخل</option><option value="expense" ${f.kind === 'expense' ? 'selected' : ''}>مصروف</option></select>
        <input id="mzFq" type="search" placeholder="ابحث…" value="${esc(f.q)}" aria-label="بحث">
        <button class="btn-ghost sm" type="button" data-mz-csv>تصدير CSV</button>
      </div>
      <p class="mz-sum">${num(rows.length)} معاملة · دخل ${money(t.inc)} · مصروف ${money(t.exp)} · الصافي <b>${money(t.profit)}</b></p>
      <div class="mz-table-wrap"><table class="mz-table">
        <thead><tr><th>التاريخ</th><th>النوع</th><th>الفئة</th><th>الوصف</th><th>العميل / المورّد</th><th>المبلغ</th><th><span class="sr">إجراءات</span></th></tr></thead>
        <tbody>${rows.map((x) => `<tr><td>${day(x.day)}</td><td><span class="mz-kind ${x.kind}">${KIND[x.kind]}</span></td><td>${esc(x.category)}</td><td>${esc(x.description)}</td><td>${esc(x.party)}</td><td class="num ${x.kind}">${money(x.amount)}</td>
          <td class="mz-row-act"><button type="button" data-mz-edit="${x.id}">تعديل</button><button type="button" data-mz-del="${x.id}">حذف</button></td></tr>`).join('') || `<tr><td colspan="7" class="muted center">ما في معاملات ${f.month || f.kind || f.q ? 'بهالفلتر' : 'هالسنة'}.</td></tr>`}</tbody>
      </table></div>`;
    const form = $('#mzEntry');
    form.kind.addEventListener('change', () => { form.category.innerHTML = catOptions(form.kind.value, ''); });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const amount = parseNum(form.amount.value), err = $('#mzEntryErr');
      if (!form.day.value) { err.textContent = 'اختار التاريخ.'; err.hidden = false; return; }
      if (!(amount > 0)) { err.textContent = 'اكتب مبلغ أكبر من صفر.'; err.hidden = false; form.amount.focus(); return; }
      const row = { day: form.day.value, kind: form.kind.value, category: form.category.value, description: form.description.value.trim(), party: form.party.value.trim(), amount: r2(amount), method: form.method.value };
      const btn = form.querySelector('[type=submit]'); btn.disabled = true;
      const saved = await guard(() => (st.edit
        ? D.client.from('mizan_entries').update(row).eq('id', st.edit.id).select().single()
        : D.client.from('mizan_entries').insert(row).select().single()).then(must));
      if (saved === false || !st) { btn.disabled = false; return; }
      if (+saved.day.slice(0, 4) === st.year) {
        st.entries = st.entries.filter((x) => x.id !== saved.id).concat(saved).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : b.id - a.id));
      } else st.entries = st.entries.filter((x) => x.id !== saved.id);
      toast(st.edit ? 'انحفظ التعديل' : 'انضافت المعاملة'); st.edit = null; viewEntries();
    });
    const c = $('[data-mz-cancel]'); if (c) c.addEventListener('click', () => { st.edit = null; viewEntries(); });
    const refilter = () => { st.filter = { month: $('#mzFm').value, kind: $('#mzFk').value, q: $('#mzFq').value }; viewEntries(); };
    $('#mzFm').addEventListener('change', refilter); $('#mzFk').addEventListener('change', refilter);
    $('#mzFq').addEventListener('change', refilter);
    $('[data-mz-csv]').addEventListener('click', () => exportCsv(rows));
    $('#mzBody').querySelector('tbody').addEventListener('click', async (ev) => {
      const ed = ev.target.closest('[data-mz-edit]'), del = ev.target.closest('[data-mz-del]');
      if (ed) { st.edit = st.entries.find((x) => x.id === +ed.dataset.mzEdit); viewEntries(); scrollTo({ top: 0, behavior: 'smooth' }); }
      if (del && confirm('تحذف هالمعاملة؟')) {
        if (await guard(() => D.client.from('mizan_entries').delete().eq('id', +del.dataset.mzDel).then(must)) === false || !st) return;
        st.entries = st.entries.filter((x) => x.id !== +del.dataset.mzDel); toast('انحذفت'); viewEntries();
      }
    });
  }
  function exportCsv(rows) {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [['التاريخ', 'النوع', 'الفئة', 'الوصف', 'العميل/المورّد', 'المبلغ', 'طريقة الدفع'].map(q).join(',')]
      .concat(rows.map((x) => [x.day, KIND[x.kind], x.category, x.description, x.party, x.amount, x.method].map(q).join(','))).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `mizan-${st.year}.csv`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- invoices ---------- */
  const invTotal = (inv) => { const sub = (inv.items || []).reduce((s, it) => s + (+it.q || 0) * (+it.p || 0), 0); return { sub: r2(sub), tax: r2(sub * (+inv.tax_rate || 0)), total: r2(sub * (1 + (+inv.tax_rate || 0))) }; };
  const nextNumber = () => {
    const y = new Date().getFullYear();
    const n = st.invoices.map((i) => (new RegExp(`^INV-${y}-(\\d+)$`).exec(i.number) || [])[1]).filter(Boolean).map(Number);
    return `INV-${y}-${String((n.length ? Math.max(...n) : 0) + 1).padStart(3, '0')}`;
  };
  function viewInvoices(editing) {
    if (editing) return invoiceForm(editing);
    $('#mzBody').innerHTML = `
      <div class="mz-row-head"><h2>الفواتير</h2><button class="btn-dark sm" type="button" data-mz-newinv>فاتورة جديدة</button></div>
      <div class="mz-table-wrap"><table class="mz-table">
        <thead><tr><th>الرقم</th><th>العميل</th><th>التاريخ</th><th>الإجمالي</th><th><span class="sr">إجراءات</span></th></tr></thead>
        <tbody>${st.invoices.map((i) => `<tr><td class="mono">${esc(i.number)}</td><td>${esc(i.client)}</td><td>${day(i.issued)}</td><td class="num">${money(invTotal(i).total)}</td>
          <td class="mz-row-act"><button type="button" data-mz-print="${i.id}">طباعة / PDF</button><button type="button" data-mz-income="${i.id}">سجّلها كدخل</button><button type="button" data-mz-delinv="${i.id}">حذف</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted center">ما في فواتير لسا.</td></tr>'}</tbody>
      </table></div>`;
    $('[data-mz-newinv]').addEventListener('click', () => viewInvoices({ number: nextNumber(), client: '', issued: today(), due: '', items: [{ d: '', q: 1, p: '' }], tax_rate: 0, note: 'شكراً لتعاملكم معنا.' }));
    $('#mzBody').querySelector('tbody').addEventListener('click', async (ev) => {
      const pr = ev.target.closest('[data-mz-print]'), inc = ev.target.closest('[data-mz-income]'), del = ev.target.closest('[data-mz-delinv]');
      if (pr) printInvoice(st.invoices.find((x) => x.id === +pr.dataset.mzPrint));
      if (inc) {
        const i = st.invoices.find((x) => x.id === +inc.dataset.mzIncome);
        const row = { day: today(), kind: 'income', category: st.cfg.incomeCats[0] || '', description: `فاتورة ${i.number}`, party: i.client, amount: invTotal(i).total, method: st.cfg.methods[0] || '' };
        const saved = await guard(() => D.client.from('mizan_entries').insert(row).select().single().then(must));
        if (saved === false || !st) return;
        if (+saved.day.slice(0, 4) === st.year) st.entries.unshift(saved);
        toast('انسجّلت الفاتورة كدخل');
      }
      if (del && confirm('تحذف هالفاتورة؟')) {
        if (await guard(() => D.client.from('mizan_invoices').delete().eq('id', +del.dataset.mzDelinv).then(must)) === false || !st) return;
        st.invoices = st.invoices.filter((x) => x.id !== +del.dataset.mzDelinv); toast('انحذفت'); viewInvoices();
      }
    });
    return undefined;
  }
  function invoiceForm(inv) {
    const row = (it, i) => `<div class="mz-item" data-i="${i}"><input class="it-d" placeholder="الوصف" maxlength="120" value="${esc(it.d)}" aria-label="الوصف"><input class="it-q" inputmode="decimal" dir="ltr" value="${esc(it.q)}" aria-label="الكمية"><input class="it-p" inputmode="decimal" dir="ltr" placeholder="السعر" value="${esc(it.p)}" aria-label="السعر"><button type="button" data-it-del="${i}" aria-label="حذف البند">×</button></div>`;
    $('#mzBody').innerHTML = `
      <form class="mz-card mz-form" id="mzInv" novalidate>
        <h3>فاتورة جديدة</h3>
        <div class="mz-fields">
          <label class="field"><span>رقم الفاتورة</span><input name="number" dir="ltr" maxlength="40" value="${esc(inv.number)}" required></label>
          <label class="field"><span>العميل</span><input name="client" list="mzClients2" maxlength="120" value="${esc(inv.client)}" required></label>
          <label class="field"><span>التاريخ</span><input name="issued" type="date" value="${esc(inv.issued)}"></label>
          <label class="field"><span>الاستحقاق</span><input name="due" type="date" value="${esc(inv.due || '')}"></label>
          <label class="field"><span>الضريبة ٪</span><input name="tax" inputmode="decimal" dir="ltr" value="${esc(String(r2((+inv.tax_rate || 0) * 100)))}"></label>
        </div>
        <datalist id="mzClients2">${st.clients.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
        <div class="mz-items-head"><span>البند</span><span>الكمية</span><span>السعر</span></div>
        <div id="mzItems">${inv.items.map(row).join('')}</div>
        <button class="btn-ghost sm" type="button" data-it-add>+ بند</button>
        <label class="field wide"><span>ملاحظة</span><input name="note" maxlength="500" value="${esc(inv.note || '')}"></label>
        <p class="mz-sum" id="mzInvSum"></p>
        <p class="form-err" id="mzInvErr" hidden></p>
        <div class="mz-actions"><button class="btn-dark" type="submit">حفظ الفاتورة</button><button class="btn-ghost" type="button" data-mz-back>رجوع</button></div>
      </form>`;
    const form = $('#mzInv');
    const read = () => ({ number: form.number.value.trim(), client: form.client.value.trim(), issued: form.issued.value || today(), due: form.due.value || null,
      tax_rate: Math.min(1, Math.max(0, (parseNum(form.tax.value) || 0) / 100)), note: form.note.value.trim(),
      items: $$('.mz-item', form).map((r) => ({ d: $('.it-d', r).value.trim(), q: parseNum($('.it-q', r).value) || 0, p: parseNum($('.it-p', r).value) || 0 })).filter((it) => it.d || it.p) });
    const sum = () => { const t = invTotal(read()); $('#mzInvSum').innerHTML = `المجموع ${money(t.sub)} · الضريبة ${money(t.tax)} · <b>الإجمالي ${money(t.total)}</b>`; };
    sum();
    form.addEventListener('input', sum);
    form.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-it-add]')) { $('#mzItems').insertAdjacentHTML('beforeend', row({ d: '', q: 1, p: '' }, $$('.mz-item', form).length)); }
      const d = ev.target.closest('[data-it-del]'); if (d) { d.closest('.mz-item').remove(); sum(); }
      if (ev.target.closest('[data-mz-back]')) viewInvoices();
    });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const v = read(), err = $('#mzInvErr');
      if (!v.number || !v.client) { err.textContent = 'اكتب رقم الفاتورة واسم العميل.'; err.hidden = false; return; }
      if (!v.items.length) { err.textContent = 'ضيف بند واحد على الأقل.'; err.hidden = false; return; }
      const saved = await guard(() => D.client.from('mizan_invoices').insert(v).select().single().then(must));
      if (saved === false || !st) return;
      st.invoices.unshift(saved); toast('انحفظت الفاتورة'); viewInvoices();
    });
  }
  function printInvoice(inv) {
    const t = invTotal(inv), c = st.clients.find((x) => x.name === inv.client) || {};
    let box = $('#mzPrint'); if (!box) { box = document.createElement('div'); box.id = 'mzPrint'; document.body.append(box); }
    box.innerHTML = `<div class="inv-doc" dir="rtl">
      <header><div><h1>فاتورة</h1><p>${esc(st.cfg.business || '')}</p></div><div class="inv-meta"><p>رقم: <b dir="ltr">${esc(inv.number)}</b></p><p>التاريخ: ${day(inv.issued)}</p>${inv.due ? `<p>الاستحقاق: ${day(inv.due)}</p>` : ''}</div></header>
      <section><h2>إلى</h2><p><b>${esc(inv.client)}</b></p>${c.email ? `<p dir="ltr">${esc(c.email)}</p>` : ''}${c.city ? `<p>${esc(c.city)}</p>` : ''}</section>
      <table><thead><tr><th>البند</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
      <tbody>${(inv.items || []).map((it) => `<tr><td>${esc(it.d)}</td><td>${num(+it.q || 0)}</td><td>${money(it.p)}</td><td>${money((+it.q || 0) * (+it.p || 0))}</td></tr>`).join('')}</tbody></table>
      <div class="inv-tot"><p>المجموع <b>${money(t.sub)}</b></p>${t.tax ? `<p>الضريبة <b>${money(t.tax)}</b></p>` : ''}<p class="g">الإجمالي <b>${money(t.total)}</b></p></div>
      ${inv.note ? `<p class="inv-note">${esc(inv.note)}</p>` : ''}</div>`;
    root().classList.add('mz-printing');
    const done = () => { root().classList.remove('mz-printing'); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done);
    window.print();
  }
  const root = () => document.documentElement;

  /* ---------- clients ---------- */
  function viewClients() {
    const paid = new Map();
    st.entries.forEach((e) => { if (e.kind === 'income' && e.party) paid.set(e.party, (paid.get(e.party) || 0) + (+e.amount || 0)); });
    $('#mzBody').innerHTML = `
      <form class="mz-card mz-form" id="mzClient" novalidate>
        <h3>عميل جديد</h3>
        <div class="mz-fields">
          <label class="field"><span>الاسم</span><input name="name" maxlength="120" required></label>
          <label class="field"><span>الإيميل</span><input name="email" type="email" dir="ltr" maxlength="160"></label>
          <label class="field"><span>الهاتف</span><input name="phone" type="tel" dir="ltr" maxlength="40"></label>
          <label class="field"><span>المدينة / البلد</span><input name="city" maxlength="80"></label>
        </div>
        <div class="mz-actions"><button class="btn-dark" type="submit">إضافة</button></div>
      </form>
      <div class="mz-table-wrap"><table class="mz-table">
        <thead><tr><th>العميل</th><th>الإيميل</th><th>الهاتف</th><th>المدينة</th><th>دفع هالسنة</th><th><span class="sr">إجراءات</span></th></tr></thead>
        <tbody>${st.clients.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td dir="ltr">${esc(c.email)}</td><td dir="ltr">${esc(c.phone)}</td><td>${esc(c.city)}</td><td class="num income">${money(paid.get(c.name) || 0)}</td>
          <td class="mz-row-act"><button type="button" data-mz-delc="${c.id}">حذف</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted center">ما في عملاء لسا.</td></tr>'}</tbody>
      </table></div>`;
    $('#mzClient').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = ev.target, v = { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), city: f.city.value.trim() };
      if (!v.name) { f.name.focus(); return; }
      const saved = await guard(() => D.client.from('mizan_clients').insert(v).select().single().then(must));
      if (saved === false || !st) return;
      st.clients = st.clients.concat(saved).sort((a, b) => a.name.localeCompare(b.name, 'ar')); toast('انضاف العميل'); viewClients();
    });
    $('#mzBody').querySelector('tbody').addEventListener('click', async (ev) => {
      const d = ev.target.closest('[data-mz-delc]');
      if (d && confirm('تحذف هالعميل؟ معاملاته بتضل.')) {
        if (await guard(() => D.client.from('mizan_clients').delete().eq('id', +d.dataset.mzDelc).then(must)) === false || !st) return;
        st.clients = st.clients.filter((x) => x.id !== +d.dataset.mzDelc); viewClients();
      }
    });
  }

  /* ---------- pricing (calculator, nothing stored) ---------- */
  function viewPricing() {
    const F = [['mat', 'تكلفة المواد للقطعة', 3.2], ['pack', 'التغليف للقطعة', 0.8], ['mins', 'دقائق العمل للقطعة', 20], ['rate', 'قيمة ساعة عملك', 8],
      ['fixed', 'مصاريف ثابتة شهرية', 300], ['units', 'قطع متوقع بيعها شهرياً', 150], ['fee', 'عمولة الدفع ٪', 5], ['flat', 'رسوم ثابتة لكل عملية', 0.3], ['margin', 'هامش الربح المطلوب ٪', 35]];
    $('#mzBody').innerHTML = `<div class="mz-grid">
      <form class="mz-card mz-form" id="mzPrice"><h3>بيانات المنتج</h3><div class="mz-fields">${F.map(([k, t, v]) => `<label class="field"><span>${t}</span><input name="${k}" inputmode="decimal" dir="ltr" value="${v}"></label>`).join('')}</div></form>
      <div class="mz-card" id="mzPriceOut" aria-live="polite"></div></div>`;
    const calc = () => {
      const f = $('#mzPrice'), g = (k) => parseNum(f[k].value) || 0;
      const time = (g('mins') / 60) * g('rate'), share = g('units') ? g('fixed') / g('units') : 0;
      const full = g('mat') + g('pack') + time + share, fee = g('fee') / 100, m = g('margin') / 100;
      const ok = 1 - fee - m > 0.01;
      const price = ok ? Math.ceil(((full + g('flat')) / (1 - fee - m)) * 10) / 10 : 0;
      const fees = price * fee + g('flat'), net = price - full - fees;
      $('#mzPriceOut').innerHTML = ok ? `<h3>النتيجة</h3><div class="mz-kpis one">
        <div class="mz-k pos"><span>السعر المقترح</span><b>${money(price)}</b></div>
        <div class="mz-k"><span>التكلفة الكاملة للقطعة</span><b>${money(full)}</b></div>
        <div class="mz-k"><span>العمولة على هالسعر</span><b>${money(fees)}</b></div>
        <div class="mz-k"><span>صافي ربحك من القطعة</span><b>${money(net)}</b></div>
        <div class="mz-k"><span>ربحك الشهري المتوقع</span><b>${money(net * g('units'))}</b></div></div>
        <p class="muted small">السعر = (التكلفة الكاملة + الرسوم الثابتة) ÷ (١ − العمولة − الهامش)</p>` : '<p class="form-err">العمولة والهامش مع بعض لازم يكونوا أقل من ١٠٠٪.</p>';
    };
    calc(); $('#mzPrice').addEventListener('input', calc);
  }

  /* ---------- settings ---------- */
  function viewSettings() {
    const c = st.cfg;
    $('#mzBody').innerHTML = `<form class="mz-card mz-form" id="mzSet" novalidate>
      <h3>إعدادات ميزان</h3>
      <div class="mz-fields">
        <label class="field"><span>اسم المشروع</span><input name="business" maxlength="80" value="${esc(c.business)}"></label>
        <label class="field"><span>رمز العملة</span><input name="currency" maxlength="5" value="${esc(c.currency)}"></label>
        <label class="field"><span>نسبة تجنيب الضريبة ٪</span><input name="tax" inputmode="decimal" dir="ltr" value="${esc(String(r2((+c.taxRate || 0) * 100)))}"></label>
        <label class="field"><span>هدف الدخل الشهري</span><input name="goal" inputmode="decimal" dir="ltr" value="${esc(String(c.goal || ''))}"></label>
      </div>
      <div class="mz-fields three">
        <label class="field"><span>فئات الدخل (سطر لكل فئة)</span><textarea name="inc" rows="6">${esc(c.incomeCats.join('\n'))}</textarea></label>
        <label class="field"><span>فئات المصاريف</span><textarea name="exp" rows="6">${esc(c.expenseCats.join('\n'))}</textarea></label>
        <label class="field"><span>طرق الدفع</span><textarea name="methods" rows="6">${esc(c.methods.join('\n'))}</textarea></label>
      </div>
      <div class="mz-actions"><button class="btn-dark" type="submit">حفظ</button></div>
    </form>`;
    $('#mzSet').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = ev.target, list = (v, max) => [...new Set(v.split('\n').map((x) => x.trim().slice(0, 60)).filter(Boolean))].slice(0, max);
      const next = { business: f.business.value.trim().slice(0, 80), currency: f.currency.value.trim().slice(0, 5) || '$',
        taxRate: Math.min(1, Math.max(0, (parseNum(f.tax.value) || 0) / 100)), goal: Math.max(0, parseNum(f.goal.value) || 0),
        incomeCats: list(f.inc.value, 30), expenseCats: list(f.exp.value, 30), methods: list(f.methods.value, 12) };
      ['incomeCats', 'expenseCats', 'methods'].forEach((k) => { if (!next[k].length) next[k] = DEFAULTS[k]; });
      const saved = await guard(() => D.client.from('mizan_books').upsert({ user_id: st.uid, settings: next, updated_at: new Date().toISOString() }).select().single().then(must));
      if (saved === false || !st) return;
      st.cfg = { ...DEFAULTS, ...saved.settings }; toast('انحفظت الإعدادات');
      $('.mz-head h1').textContent = st.cfg.business || 'مشروعي';
    });
  }

  /* ---------- route ---------- */
  const VIEWS = { dashboard: viewDashboard, entries: viewEntries, invoices: () => viewInvoices(), clients: viewClients, pricing: viewPricing, settings: viewSettings };
  async function routeMizan(r) {
    document.title = 'ميزان · لوحتك المالية';
    if (!cloud) { st = null; lockedView('server'); return; }
    if (!D.auth.user) { st = null; lockedView('login'); return; }
    const tab = VIEWS[r.arg] ? r.arg : 'dashboard';
    if (!st || st.uid !== D.auth.user.id) {
      page.innerHTML = '<div class="pg-loading"><span></span><span></span><span></span></div>';
      let sub = null;
      try { sub = must(await D.client.rpc('my_subscription')); } catch (e) { page.innerHTML = `<div class="pg narrow"><div class="pg-card center"><p class="form-err">${esc(D.friendly(e))}</p></div></div>`; return; }
      if (!sub || !sub.active) { st = null; lockedView('plan', sub); return; }
      try { await load(sub); } catch (e) {
        if (locked(e)) { st = null; lockedView('plan', sub); return; }
        page.innerHTML = `<div class="pg narrow"><div class="pg-card center"><p class="form-err">${esc(D.friendly(e))}</p></div></div>`; return;
      }
    }
    page.innerHTML = shell(tab);
    if (tab !== 'entries') st.edit = null;
    VIEWS[tab]();
  }

  // Account page card: the member's plan and a way in.
  async function accountCard(el) {
    if (!el || !cloud || !D.auth.user) return;
    let sub = null;
    try { sub = must(await D.client.rpc('my_subscription')); } catch { return; }
    el.innerHTML = `<div class="pg-card acc-sub ${sub && sub.active ? 'on' : 'off'}">
      <div><h2>ميزان</h2><p class="muted">${sub && sub.active ? `اشتراك ${esc(PLAN_NAMES[sub.plan] || sub.plan)} · ${esc(STATUS_WORDS[sub.status] || '')}${sub.current_period_end ? ` · لحد ${day(sub.current_period_end)}` : ''}` : 'لوحتك المالية بتفتح مع الاشتراك الشهري.'}</p></div>
      <a class="btn-dark" href="#/mizan">${sub && sub.active ? 'افتح ميزان' : 'اشترك وافتح ميزان'}</a></div>`;
  }

  window.raffMizan = { accountCard, reset: () => { st = null; } };
  // loaded before pages.js, so the route exists before the first navigation runs
  (window.raffExtraRoutes = window.raffExtraRoutes || {}).mizan = routeMizan;
  if (D.auth && D.auth.onChange) D.auth.onChange(() => { st = null; });
})();
