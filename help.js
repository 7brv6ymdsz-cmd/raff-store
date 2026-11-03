/* رَفّ · answer system: instant answers from the store's own knowledge, then a conversation with the team. */
(() => {
  'use strict';
  const S = window.RaffShared, D = window.RaffData, R = () => window.raff;
  const { esc, num, norm } = S;
  const $ = (s, r = document) => r.querySelector(s);
  const cloud = D.mode === 'cloud';

  /* ---------- Knowledge base ---------- */
  const STOP = new Set(['في', 'من', 'على', 'عن', 'الى', 'الي', 'ال', 'هل', 'شو', 'ايش', 'كيف', 'وين', 'متى', 'ليش', 'لماذا', 'ماذا', 'ما', 'لا', 'انا', 'انت', 'بدي', 'ابغى', 'اريد', 'عندي', 'عندكم', 'فيه', 'في', 'و', 'او', 'يا', 'مع', 'هاد', 'هذا', 'هذه', 'هاي', 'بس', 'كم', 'قديش', 'لو', 'اذا', 'ان', 'انه', 'شي', 'اي', 'كل', 'the', 'a', 'is', 'to', 'i', 'my', 'how', 'do']);
  const tokens = (t) => norm(t).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).map((w) => w.replace(/^(وال|بال|لل|ال|و|ب)(?=\p{L}{3,})/u, '')).filter((w) => w.length > 1 && !STOP.has(w));
  const money = (n) => (R() ? R().money(n) : S.money(n));

  function knowledge() {
    const c = (R() && R().CFG) || {}, sh = c.shipping || {}, pay = c.payments || {}, pg = c.pages || {}, ct = c.contact || {};
    const methods = [pay.cod && pay.cod.on ? 'نقداً عند الاستلام' : '', pay.paypal && pay.paypal.on ? 'PayPal أو بطاقة على صفحة PayPal الآمنة' : '', pay.bank && pay.bank.on ? 'تحويل بنكي' : ''].filter(Boolean);
    const first = (txt) => String(txt || '').split(/\n\s*\n/)[0].trim();
    const P = (R() && R().P) || [];
    const digi = P.length > 0 && P.every(S.isDigital), anyDigi = P.some(S.isDigital);
    if (digi) methods.splice(0, methods.length, ...methods.filter((m) => !m.startsWith('نقداً')));
    const kb = [
      ...(anyDigi ? [{ id: 'download', q: 'كيف بستلم المنتج الرقمي وبحمّله؟', k: 'تحميل حمل نزل تنزيل download رابط لينك ملف pdf كتاب دوره كورس قالب استلم وصلني ما وصل ايميل بريد سبام spam رقمي الكتروني',
        a: 'المنتجات الرقمية ما إلها شحن. إذا المنتج فيه زر «اشترِ الآن · تحميل فوري»، بتدفع على صفحة الدفع الآمنة وبيوصلك رابط التحميل فوراً على إيميلك. غير هيك، منبعتلك الرابط على الإيميل أو واتساب أول ما يتأكد الدفع. ما لقيت الرابط؟ شيّك مجلد Spam، أو راسلنا برقم الطلب.', link: ['#/shipping', 'التسليم والتحميل'] }] : []),
      { id: 'shipping', q: 'قديش التوصيل وكم بياخد وقت؟', k: 'توصيل شحن يوصل توصل وصول مده وقت ايام يوم رسوم اجور delivery shipping مجاني',
        a: `${sh.fee ? `رسوم التوصيل ${money(sh.fee)}` : 'التوصيل مجاني'}${sh.freeOver > 0 ? `، ومجاني لكل طلب فوق ${money(sh.freeOver)}` : ''}. ${first(pg.shipping) || 'التوصيل عادةً بياخد من ٢ لـ ٥ أيام عمل حسب المدينة، ومنتواصل معك قبل لنأكد الموعد.'}`, link: ['#/shipping', 'تفاصيل التوصيل'] },
      { id: 'payment', q: 'كيف فيني ادفع؟', k: 'دفع ادفع بطاقه فيزا ماستر كارد visa paypal باي بال كاش نقد نقدي استلام تحويل بنك بنكي حساب iban',
        a: `فيك تدفع ${methods.join('، أو ') || (digi ? 'من صفحة المنتج بالبطاقة أو PayPal، أو بالتواصل معنا على واتساب' : 'نقداً عند الاستلام')}. ما منطلب ولا منخزّن أرقام بطاقات على موقعنا.` },
      { id: 'returns', q: 'فيني رجّع أو بدّل المنتج؟', k: 'ارجاع رجع ارجع استرجاع استبدال بدل ابدل مرتجع رد مبلغ فلوس عيب خربان مكسور غلط return refund',
        a: first(pg.returns) || 'أكيد، خلال ١٤ يوم من الاستلام إذا المنتج بحالته الأصلية أو وصلك فيه عيب. راسلنا برقم الطلب ومنرتّب الاستلام.', link: ['#/returns', 'سياسة الإرجاع'] },
      { id: 'track', q: 'وين صار طلبي؟', k: 'طلبي طلب تتبع تتبيع تابع حاله وصل وين متاخر تاخر order track tracking رقم',
        a: 'فيك تتابع طلبك خطوة بخطوة برقم الطلب ورقم هاتفك.' + (cloud ? ' وإذا عندك حساب، بتلاقيه بـ«طلباتي».' : ''), link: ['#/track', 'تتبّع طلبك'] },
      { id: 'coupon', q: 'كيف بستعمل كود الخصم؟', k: 'كود كوبون خصم عرض تخفيض promo coupon code',
        a: 'عند إتمام الطلب في خانة «كود خصم». اكتب الكود واكبس «تطبيق»، وبيبيّن الخصم بالمجموع قبل ما تأكد.' },
      { id: 'account', q: 'لازم أعمل حساب؟ نسيت كلمة السر', k: 'حساب تسجيل سجل دخول كلمه سر باسورد نسيت password login account ايميل',
        a: cloud ? 'مش لازم، فيك تطلب كضيف. الحساب بيخليك تتابع طلباتك وعناوينك ومفضّلتك من أي جهاز. إذا نسيت كلمة السر، من صفحة الدخول اكبس «نسيت كلمة السر؟».' : 'ما في داعي لحساب، فيك تطلب كضيف وتتابع طلبك برقمه.', link: cloud ? ['#/login', 'تسجيل الدخول'] : null },
      { id: 'sizes', q: 'كيف بختار المقاس أو اللون؟', k: 'مقاس مقاسات قياس قياسات حجم لون الوان size color',
        a: 'من صفحة المنتج، تحت السعر بتختار المقاس أو اللون قبل ما تضيف للسلة. إذا محتار بين مقاسين، ابعتلنا ومنساعدك.' },
      { id: 'contact', q: 'كيف بتواصل معكم؟', k: 'تواصل رقم هاتف تلفون واتس واتساب whatsapp ايميل بريد عنوان مكان فرع دوام ساعات',
        a: [c.whatsapp ? `واتساب: +${String(c.whatsapp).replace(/\D/g, '')}` : '', ct.phone ? `هاتف: ${ct.phone}` : '', ct.email ? `إيميل: ${ct.email}` : '', ct.address ? ct.address : ''].filter(Boolean).join(' · ') || 'من هون مباشرة: اكبس «راسلنا» تحت ومنرد عليك.', link: ['#/contact', 'تواصل معنا'] },
    ];
    // the owner's own FAQ wins when it covers the same thing
    String(pg.faq || '').split(/\n\s*\n/).map((b) => b.trim().split('\n')).filter((l) => l[0] && l[1]).forEach(([q, ...a], i) => {
      kb.unshift({ id: `faq${i}`, q: q.trim(), k: q, a: a.join(' ').trim(), own: true });
    });
    if (digi) {
      // no shipping, nothing physical to send back
      const ret = kb.find((x) => x.id === 'returns');
      if (ret && !pg.returns) { ret.q = 'فيني أسترد المبلغ؟'; ret.a = 'إذا الملف ما اشتغل معك أو ما طابق الوصف، راسلنا خلال ١٤ يوم برقم الطلب ومنصلّح المشكلة أو منرجّعلك المبلغ.'; ret.link = ['#/returns', 'سياسة الاسترداد']; }
      return kb.filter((x) => x.id !== 'shipping' && x.id !== 'sizes');
    }
    return kb;
  }

  function productHits(qt) {
    if (!R() || !R().P) return [];
    return R().P.map((p) => {
      const pt = tokens(`${p.name} ${p.store}`);
      const score = qt.reduce((s, w) => s + (pt.some((x) => x === w || (w.length >= 3 && (x.startsWith(w) || w.startsWith(x)))) ? 1 : 0), 0);
      return { p, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 2).map(({ p }) => ({
      id: `p${p.id}`, q: p.name, product: p,
      a: `${p.name} من ${p.store}: ${money(p.price)}${p.compare > p.price ? ` بدل ${money(p.compare)}` : ''}. ${S.isDigital(p) ? `منتج رقمي${p.format ? ` (${p.format})` : ''}، ${S.safeUrl(p.buyUrl) ? 'بتحمّله فوراً بعد الدفع' : 'بيوصلك رابطه بعد الدفع'}.` : p.stock <= 0 ? 'حالياً نفد.' : p.stock <= 5 ? `باقي ${num(p.stock)} قطع بس.` : 'متوفر.'}`,
      link: [`#/p/${p.id}`, 'صفحة المنتج'],
    }));
  }

  function answer(query) {
    const qt = tokens(query);
    if (!qt.length) return [];
    const scored = knowledge().map((e) => {
      const kt = tokens(`${e.k} ${e.q}`);
      let score = 0;
      qt.forEach((w) => { if (kt.includes(w)) score += 2; else if (w.length >= 3 && kt.some((x) => x.length >= 3 && (x.startsWith(w) || w.startsWith(x)))) score += 1; });
      if (e.own && score) score += 0.5;
      return { ...e, score };
    }).filter((e) => e.score >= 1).sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).concat(productHits(qt)).slice(0, 4);
  }
  window.RaffAnswers = { answer, knowledge, tokens };

  /* ---------- Widget ---------- */
  const root = document.createElement('div');
  root.className = 'help';
  root.innerHTML = `
    <button class="help-fab" type="button" aria-expanded="false" aria-controls="helpPanel" aria-label="مساعدة: اسأل أو راسلنا">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8z"/><path d="M8.5 9h7M8.5 12.5h4.5"/></svg>
      <span class="help-dot" hidden></span>
    </button>
    <section class="help-panel" id="helpPanel" role="dialog" aria-modal="false" aria-labelledby="helpTitle" inert>
      <header class="help-head">
        <button class="help-back" type="button" aria-label="رجوع" hidden><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
        <div><h2 id="helpTitle">كيف فينا نساعدك؟</h2><p class="help-sub" id="helpSub">جواب فوري، أو منرد عليك بأسرع وقت</p></div>
        <button class="help-x" type="button" aria-label="إغلاق"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      </header>
      <div class="help-body" id="helpBody"></div>
    </section>`;
  document.body.append(root);
  const fab = $('.help-fab', root), panel = $('.help-panel', root), body = $('#helpBody'), back = $('.help-back', root);
  let stack = [], pollTimer = null, current = null;

  const setHead = (title, sub) => { $('#helpTitle').textContent = title; $('#helpSub').textContent = sub || ''; };
  const show = (fn, ...args) => { stack.push([fn, args]); back.hidden = stack.length < 2; fn(...args); };
  const goBack = () => { stack.pop(); const [fn, args] = stack[stack.length - 1] || [home, []]; back.hidden = stack.length < 2; fn(...args); };

  function open(start) {
    panel.inert = false; root.classList.add('open'); fab.setAttribute('aria-expanded', 'true');
    stack = [];
    if (start) start(); else show(home);
  }
  function close() {
    root.classList.remove('open'); panel.inert = true; fab.setAttribute('aria-expanded', 'false');
    clearInterval(pollTimer); current = null; fab.focus();
  }
  fab.addEventListener('click', () => (root.classList.contains('open') ? close() : open()));
  $('.help-x', root).addEventListener('click', close);
  back.addEventListener('click', goBack);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('open')) close(); });
  panel.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#/"]'); if (a && innerWidth < 720) close(); });

  const chips = [['track', 'وين طلبي؟'], ['shipping', 'التوصيل'], ['returns', 'الإرجاع'], ['payment', 'طرق الدفع']];
  async function home() {
    clearInterval(pollTimer); current = null;
    setHead('كيف فينا نساعدك؟', 'جواب فوري، أو منرد عليك بأسرع وقت');
    body.innerHTML = `
      <form class="help-search" role="search"><label class="sr" for="helpQ">اكتب سؤالك</label>
        <input id="helpQ" type="search" placeholder="اكتب سؤالك… مثلاً: قديش التوصيل؟" autocomplete="off" maxlength="300">
      </form>
      <div class="help-results" id="helpResults" aria-live="polite"></div>
      <div class="help-chips" id="helpChips">${chips.map(([id, t]) => `<button type="button" data-kb="${id}">${t}</button>`).join('')}</div>
      <div class="help-threads" id="helpThreads"></div>
      <button class="help-cta" type="button" data-compose>${cloud ? 'راسل فريق المتجر' : 'راسلنا على واتساب'}<small>${cloud ? 'بنرد هون، وبتلاقي الرد بأي وقت' : 'الرسالة بتنفتح جاهزة'}</small></button>`;
    const q = $('#helpQ');
    let t;
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => renderResults(q.value), 120); });
    $('.help-search', body).addEventListener('submit', (e) => { e.preventDefault(); renderResults(q.value, true); });
    setTimeout(() => q.focus(), 60);
    if (cloud) loadThreads();
  }
  function renderResults(query, submitted) {
    const box = $('#helpResults'); if (!box) return;
    const hits = answer(query);
    $('#helpChips').hidden = !!query.trim();
    if (!query.trim()) { box.innerHTML = ''; return; }
    box.innerHTML = hits.length ? hits.map((h, i) => answerCard(h, i === 0)).join('') + `<p class="help-more">ما جاوبك؟ <button type="button" class="linkish" data-compose-q>اسأل الفريق</button></p>`
      : `<div class="help-none"><p>${submitted ? 'ما لقينا جواب جاهز لهالسؤال.' : 'عم ندوّر…'}</p>${submitted ? '<button type="button" class="help-cta small" data-compose-q>ابعت سؤالك للفريق</button>' : ''}</div>`;
    box.dataset.q = query;
  }
  const answerCard = (h, openIt) => `<details class="help-ans" ${openIt ? 'open' : ''}><summary>${esc(h.q)}</summary><p>${esc(h.a)}</p>${h.link ? `<a href="${esc(h.link[0])}">${esc(h.link[1])} ←</a>` : ''}</details>`;

  body.addEventListener('click', (e) => {
    const kb = e.target.closest('[data-kb]');
    if (kb) { const h = knowledge().find((x) => x.id === kb.dataset.kb); if (h) { $('#helpChips').hidden = true; $('#helpResults').innerHTML = answerCard(h, true) + `<p class="help-more">ما جاوبك؟ <button type="button" class="linkish" data-compose-q>اسأل الفريق</button></p>`; $('#helpResults').dataset.q = h.q; } return; }
    if (e.target.closest('[data-compose-q]')) { const q = ($('#helpResults') || {}).dataset ? $('#helpResults').dataset.q : ''; show(compose, { body: q || '' }); return; }
    if (e.target.closest('[data-compose]')) { show(compose, {}); return; }
    const th = e.target.closest('[data-thread]');
    if (th) { show(thread, th.dataset.thread); }
  });

  async function loadThreads() {
    const box = $('#helpThreads'); if (!box) return;
    try {
      const list = await D.support.list();
      if (!list.length) return;
      box.innerHTML = `<h3>محادثاتك</h3>${list.slice(0, 4).map((c) => `<button type="button" class="help-thread" data-thread="${esc(c.id)}"><span><b>${esc(c.subject || 'محادثة')}</b><small>${esc((c.last_message || '').slice(0, 60))}</small></span>${c.unread_customer ? '<i class="help-new">رد جديد</i>' : `<em class="st-${esc(c.status)}">${{ open: 'بانتظار الرد', answered: 'تم الرد', closed: 'مغلقة' }[c.status] || ''}</em>`}</button>`).join('')}`;
    } catch { /* offline */ }
  }

  function compose(ctx = {}) {
    clearInterval(pollTimer);
    const c = (R() && R().CFG) || {}, ct = c.contact || {};
    const wa = String(c.whatsapp || '').replace(/\D/g, '');
    const u = D.auth.user, pr = D.auth.profile || {};
    const saved = S.ls.get('raff.customer', {});
    const product = ctx.productId && R() ? R().byId.get(+ctx.productId) : null;
    setHead(product ? `سؤال عن ${product.name}` : 'راسل الفريق', cloud ? 'منرد عادةً خلال ساعات' : 'الرسالة بتنفتح على واتساب جاهزة');
    body.innerHTML = `
      <form class="help-form" id="helpForm" novalidate>
        ${!u ? `<label class="hf"><span>اسمك</span><input name="name" autocomplete="name" maxlength="80" value="${esc(pr.full_name || saved.name || '')}"></label>
        ${cloud ? `<label class="hf"><span>هاتف أو إيميل لنرد عليك</span><input name="contact" dir="ltr" autocomplete="tel" maxlength="120" value="${esc(saved.phone || saved.email || '')}"></label>` : ''}` : `<p class="help-as">باسم <b>${esc(pr.full_name || u.email)}</b></p>`}
        <label class="hf"><span>الموضوع</span><select name="subject"><option>${product ? 'سؤال عن منتج' : 'سؤال عام'}</option><option>طلب موجود</option><option>إرجاع أو استبدال</option><option>الدفع</option><option>اقتراح أو شكوى</option></select></label>
        <label class="hf order-f" hidden><span>رقم الطلب</span><input name="order" dir="ltr" placeholder="R-XXXXXXX" maxlength="20" value="${esc(ctx.orderId || '')}"></label>
        <label class="hf"><span>رسالتك</span><textarea name="body" rows="4" maxlength="2000">${esc(ctx.body || '')}</textarea></label>
        <p class="help-err" hidden></p>
        <button class="help-send" type="submit">${cloud ? 'إرسال' : wa ? 'فتح واتساب' : ct.email ? 'فتح الإيميل' : 'إرسال'}</button>
      </form>`;
    const f = $('#helpForm');
    const sync = () => { $('.order-f', f).hidden = !/طلب|إرجاع|الدفع/.test(f.subject.value) && !f.order.value; };
    f.subject.addEventListener('change', sync); sync();
    if (ctx.orderId) { f.subject.value = 'طلب موجود'; sync(); }
    setTimeout(() => (f.name && !f.name.value ? f.name : f.body).focus(), 60);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('.help-err', f), fail = (m) => { err.textContent = m; err.hidden = false; };
      err.hidden = true;
      const name = f.name ? f.name.value.trim() : '', contact = f.contact ? S.toLatinDigits(f.contact.value.trim()) : '', text = f.body.value.trim();
      if (f.name && name.length < 2) { fail('اكتب اسمك'); f.name.focus(); return; }
      if (f.contact && contact.replace(/\s/g, '').length < 6) { fail('اكتب رقم هاتف أو إيميل لنرد عليك'); f.contact.focus(); return; }
      if (text.length < 2) { fail('اكتب رسالتك'); f.body.focus(); return; }
      const subject = product ? `${f.subject.value}: ${product.name}` : f.subject.value;
      if (!cloud) {
        const msg = `مرحبا ${c.name || ''}،\n${subject}${f.order.value.trim() ? ` (طلب ${f.order.value.trim()})` : ''}\n${text}\n\n${name}`;
        if (wa) window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
        else if (ct.email) location.href = `mailto:${ct.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
        else { fail('المتجر ما حط وسيلة تواصل لسا.'); return; }
        R() && R().toast('فتحنالك الرسالة جاهزة، بس اكبس إرسال');
        return;
      }
      const btn = $('.help-send', f); btn.disabled = true; btn.classList.add('busy');
      try {
        const bot = answer(text).slice(0, 1).map((h) => `جواب سريع: ${h.a}`);
        if (name || contact) S.ls.set('raff.customer', { ...saved, name: name || saved.name, phone: /@/.test(contact) ? saved.phone : contact || saved.phone, email: /@/.test(contact) ? contact : saved.email });
        const r = await D.support.start({ name, contact, subject, body: text, orderId: f.order.value.trim(), productId: product ? product.id : null, bot });
        stack = [[home, []]];
        show(thread, r.id, true);
      } catch (ex) { fail(D.friendly(ex)); btn.disabled = false; btn.classList.remove('busy'); }
    });
  }

  const fmt = (t) => new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(t));
  async function thread(id, fresh) {
    current = id; body.dataset.status = '';
    setHead('المحادثة', fresh ? 'وصلتنا رسالتك' : '');
    body.innerHTML = '<div class="help-loading"><span></span><span></span><span></span></div>';
    const paint = async () => {
      let c;
      try { c = await D.support.get(id); } catch (ex) { body.innerHTML = `<p class="help-none">${esc(D.friendly(ex))}</p>`; return; }
      if (current !== id) return;
      if (!c) { body.innerHTML = '<p class="help-none">ما فينا نفتح هالمحادثة من هالجهاز.</p>'; return; }
      D.support.markSeen(id);
      setHead(c.subject || 'المحادثة', { open: 'وصلتنا، ومنرد عليك بأقرب وقت', answered: 'ردّينا عليك', closed: 'المحادثة مغلقة' }[c.status]);
      const old = $('.help-msgs', body);
      const wasAtEnd = !old || old.scrollHeight - old.scrollTop - old.clientHeight < 40;
      const items = c.messages.map((m) => `<li class="m-${esc(m.sender)}"><span class="m-who">${m.sender === 'admin' ? esc((R() && R().CFG.name) || 'المتجر') : m.sender === 'bot' ? 'جواب تلقائي' : 'أنت'}</span><p>${esc(m.body).replace(/\n/g, '<br>')}</p><time>${fmt(m.created_at)}</time></li>`).join('');
      if (old && body.dataset.status === c.status) {
        // only the messages changed: keep the reply box (and whatever is being typed) untouched
        if (old.dataset.count !== String(c.messages.length)) { old.innerHTML = items; old.dataset.count = c.messages.length; if (wasAtEnd) old.scrollTop = old.scrollHeight; }
        refreshDot();
        return;
      }
      body.dataset.status = c.status;
      body.innerHTML = `
        <ol class="help-msgs" data-count="${c.messages.length}">${items}</ol>
        ${c.status === 'closed' ? '<p class="help-closed">انغلقت المحادثة. إذا بدك شي تاني، ابعت رسالة جديدة.</p>' : `
        <form class="help-reply" id="helpReplyForm"><label class="sr" for="helpReply">ردّك</label><textarea id="helpReply" rows="2" maxlength="2000" placeholder="اكتب ردّك…"></textarea><button type="submit" aria-label="إرسال"><svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button></form>`}`;
      const list = $('.help-msgs', body);
      if (wasAtEnd) list.scrollTop = list.scrollHeight;
      const rf = $('#helpReplyForm');
      if (rf) {
        const ta = $('#helpReply');
        ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); rf.requestSubmit(); } });
        rf.addEventListener('submit', async (e) => {
          e.preventDefault();
          const v = ta.value.trim(); if (!v) return;
          ta.disabled = true;
          try { await D.support.reply(id, v); ta.value = ''; ta.disabled = false; body.dataset.status = ''; await paint(); $('#helpReply') && $('#helpReply').focus(); } catch (ex) { R() && R().toast(D.friendly(ex)); ta.disabled = false; }
        });
      }
      refreshDot();
    };
    await paint();
    clearInterval(pollTimer);
    pollTimer = setInterval(() => { if (!document.hidden && current === id) paint(); }, 12000);
  }

  /* ---------- Unread indicator ---------- */
  async function refreshDot() {
    if (!cloud) return;
    try {
      const list = await D.support.list();
      const n = list.filter((c) => c.unread_customer).length;
      $('.help-dot', root).hidden = n === 0;
      fab.setAttribute('aria-label', n ? `مساعدة: عندك ${num(n)} رد جديد` : 'مساعدة: اسأل أو راسلنا');
    } catch { /* offline */ }
  }

  window.raffHelp = {
    open: () => open(),
    compose: (ctx) => open(() => { stack = [[home, []]]; show(compose, ctx || {}); }),
    thread: (id) => open(() => { stack = [[home, []]]; show(thread, id); }),
    refresh: refreshDot,
  };
  const start = () => { refreshDot(); setInterval(() => { if (!document.hidden && !root.classList.contains('open')) refreshDot(); }, 60000); };
  D.ready.then(() => { if (R() && R().isReady) start(); else if (R()) R().onReady.push(start); });
  D.auth.onChange(() => refreshDot());
})();
