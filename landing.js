/* Single-product homepage. When settings.landing.on is set, the home route shows one product as a full
   product page (Arabic or English) instead of the catalog. Every other route (product page, checkout,
   account, help, admin) keeps working as before. */
(() => {
  'use strict';
  const S = window.RaffShared;
  const esc = S.esc;
  const root = document.documentElement;
  const KEY = 'raff.landing';

  const T = {
    ar: {
      dir: 'rtl', other: 'English', otherCode: 'en',
      nav: [['#l-features', 'المزايا'], ['#l-how', 'كيف يعمل'], ['#l-faq', 'الأسئلة']],
      get: 'احصل عليه', kicker: 'لوحة مالية لمشروعك الصغير',
      h1: ['اعرف ربحك الحقيقي.', 'بدقيقة.'],
      lead: 'ملف واحد على Excel وGoogle Sheets يجمع دخلك ومصاريفك وفواتيرك وتسعيرك وعملاءك، ويحسب لك كل شيء تلقائياً.',
      buy: 'احصل على ميزان', preview: 'شاهد دليل البدء مجاناً',
      trust: ['Excel · Google Sheets · Numbers', 'نسخة عربية + English', 'دفعة واحدة، بلا اشتراك', 'تحميل فوري'],
      pains: { h: 'المشروع ماشي، بس وين راحت المصاري؟', items: [
        ['دفتر وملاحظات وتطبيقات', 'الأرقام متفرّقة بين الموبايل والورق والبنك، وما في صورة وحدة واضحة.'],
        ['ما بتعرف ربحك الصافي', 'المبيعات بتبيّن منيحة، بس بعد الإعلانات والعمولات والمواد؟'],
        ['التسعير بالتخمين', 'سعر المنافس أو رقم «حاسّه مناسب»، بدون ما تحسب وقتك ومصاريفك.'],
      ] },
      feats: { h: 'كل اللي بيحتاجه مشروعك، بملف واحد', items: [
        ['لوحة التحكم', 'الدخل والمصاريف وصافي الربح والهامش، شهراً بشهر، برسوم بيانية واضحة.'],
        ['سجل المعاملات', 'سطر لكل حركة، بقوائم منسدلة للنوع والفئة وطريقة الدفع والعميل.'],
        ['فواتير جاهزة', 'اختار العميل، اكتب البنود، واطبعها أو احفظها PDF باسم مشروعك.'],
        ['حاسبة التسعير', 'سعر مقترح يحفظ هامش ربحك بعد وقتك ومصاريفك الثابتة وعمولة الدفع.'],
        ['العملاء', 'إجمالي ما دفعه كل عميل وعدد معاملاته وآخر تعامل، محسوبة لحالها.'],
        ['الأهداف والضريبة', 'هدف شهري بشريط تقدّم، ومبلغ تجنّبه للضريبة كل شهر.'],
      ] },
      how: { h: 'ثلاث خطوات وبتشوف الصورة كاملة', steps: [
        ['حمّل الملف', 'بيوصلك رابط التحميل فوراً بعد الدفع. افتحه على Excel أو ارفعه لـ Google Sheets.'],
        ['اكتب أرقامك', 'اسم مشروعك وعملتك، وبعدها سجّل كل دخل ومصروف بثواني.'],
        ['شوف ربحك', 'لوحة التحكم بتتحدّث لحالها: وين بتربح، ووين المصاري بتروح.'],
      ] },
      inside: 'شو بالملف', insideList: ['ميزان بالعربي (Excel)', 'Mizan in English (Excel)', '٧ أوراق مترابطة بمعادلات جاهزة', 'بيانات مثال لتشوف كيف بيشتغل', 'دليل بدء سريع PDF بالعربي والإنجليزي', 'يشتغل على Excel وGoogle Sheets وNumbers وLibreOffice'],
      priceH: 'سعر واحد. ملف إلك للأبد.', priceNote: 'دفعة واحدة · بدون اشتراك · تحديثات مجانية', guarantee: 'إذا الملف ما اشتغل معك، منرجّعلك المبلغ كامل خلال ١٤ يوم.',
      faq: { h: 'أسئلة شائعة', items: [
        ['لازم أكون خبير بالـ Excel؟', 'أبداً. بتكتب بالخلايا الصفراء بس، والباقي معادلات جاهزة. ومعه دليل بدء من ٧ صفحات.'],
        ['بيشتغل على Google Sheets؟', 'إيه. ارفع الملف على Google Drive واحفظه كـ Google Sheets، وبيشتغل على الكمبيوتر والموبايل.'],
        ['في اشتراك شهري؟', 'لا. بتدفع مرة وحدة والملف إلك.'],
        ['بياناتي آمنة؟', 'الملف عندك على جهازك أو بحسابك على Google. نحنا ما منشوف أي شي.'],
        ['بيناسب أي عملة؟', 'إيه، اكتب رمز عملتك بورقة «ابدأ هنا».'],
        ['كيف بستلم الملف؟', 'رابط تحميل فوري بعد الدفع، وبيوصلك على إيميلك كمان.'],
      ] },
      final: ['خلّي الأرقام تشتغل إلك.', 'ابدأ اليوم، وشوف ربحك الحقيقي قبل آخر الشهر.'],
      foot: [['#/terms', 'الشروط'], ['#/returns', 'الاسترداد'], ['#/contact', 'تواصل معنا']],
      mock: { tabs: ['ابدأ هنا', 'لوحة التحكم', 'المعاملات', 'فاتورة', 'التسعير', 'العملاء', 'الأهداف'], k: ['الدخل', 'المصاريف', 'صافي الربح', 'الهامش'], chart: 'الدخل والمصاريف شهرياً', inc: 'دخل', exp: 'مصروف', months: ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١', '١٢'], cats: 'وين بتروح المصاري', catNames: ['برامج', 'رسوم دفع', 'إعلانات', 'شحن', 'رواتب'] },
      title: 'ميزان · اعرف ربحك الحقيقي', desc: 'لوحة مالية لمشروعك الصغير على Excel وGoogle Sheets: الدخل والمصاريف والفواتير والتسعير والعملاء. عربي وإنجليزي، دفعة واحدة.',
      added: 'تم',
    },
    en: {
      dir: 'ltr', other: 'العربية', otherCode: 'ar',
      nav: [['#l-features', 'Features'], ['#l-how', 'How it works'], ['#l-faq', 'FAQ']],
      get: 'Get it', kicker: 'The finance dashboard for small businesses',
      h1: ['Know your real profit.', 'In a minute.'],
      lead: 'One file for Excel and Google Sheets that brings your income, expenses, invoices, pricing and clients together — and does the math for you.',
      buy: 'Get Mizan', preview: 'Read the quick-start guide free',
      trust: ['Excel · Google Sheets · Numbers', 'English + Arabic editions', 'One payment, no subscription', 'Instant download'],
      pains: { h: 'Business is moving. So where did the money go?', items: [
        ['Notes, apps and receipts', 'Your numbers live in your phone, on paper and in the bank — never in one clear picture.'],
        ['No idea of your net profit', 'Sales look good. But after ads, fees and materials?'],
        ['Pricing by guesswork', 'A competitor’s price or a number that “feels right”, without counting your time and costs.'],
      ] },
      feats: { h: 'Everything your business needs, in one file', items: [
        ['Dashboard', 'Income, expenses, net profit and margin, month by month, with clear charts.'],
        ['Transaction log', 'One row per movement, with dropdowns for type, category, method and client.'],
        ['Ready invoices', 'Pick a client, add your lines, print or save as PDF with your business name.'],
        ['Pricing calculator', 'A suggested price that protects your margin after your time, fixed costs and fees.'],
        ['Clients', 'What each client has paid, how often, and when — calculated for you.'],
        ['Goals and tax', 'A monthly goal with a progress bar, and how much to set aside for tax.'],
      ] },
      how: { h: 'Three steps to the full picture', steps: [
        ['Download', 'Your link arrives right after payment. Open it in Excel or upload it to Google Sheets.'],
        ['Add your numbers', 'Your business name and currency, then log each sale and expense in seconds.'],
        ['See your profit', 'The dashboard updates itself: where you earn, and where the money goes.'],
      ] },
      inside: 'What’s inside', insideList: ['Mizan in English (Excel)', 'ميزان in Arabic (Excel)', '7 connected sheets with ready formulas', 'Sample data so you can see it working', 'Quick-start guide (PDF) in English and Arabic', 'Works in Excel, Google Sheets, Numbers and LibreOffice'],
      priceH: 'One price. Yours forever.', priceNote: 'One payment · No subscription · Free updates', guarantee: 'If the file doesn’t work for you, we refund you in full within 14 days.',
      faq: { h: 'Questions', items: [
        ['Do I need to be good at Excel?', 'Not at all. You type in the yellow cells; everything else is ready formulas. A 7-page quick-start guide is included.'],
        ['Does it work in Google Sheets?', 'Yes. Upload it to Google Drive and save it as a Google Sheet. It works on desktop and mobile.'],
        ['Is there a monthly fee?', 'No. You pay once and the file is yours.'],
        ['Is my data private?', 'The file lives on your device or your own Google account. We never see it.'],
        ['Does it work with my currency?', 'Yes — type your currency symbol in “Start here”.'],
        ['How do I get the file?', 'An instant download link after payment, also sent to your email.'],
      ] },
      final: ['Make your numbers work for you.', 'Start today and see your real profit before the month ends.'],
      foot: [['#/terms', 'Terms'], ['#/returns', 'Refunds'], ['#/contact', 'Contact']],
      mock: { tabs: ['Start here', 'Dashboard', 'Transactions', 'Invoice', 'Pricing', 'Clients', 'Goals'], k: ['Income', 'Expenses', 'Net profit', 'Margin'], chart: 'Income vs expenses', inc: 'Income', exp: 'Expense', months: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], cats: 'Where the money goes', catNames: ['Software', 'Payment fees', 'Ads', 'Shipping', 'Payroll'] },
      title: 'Mizan · Know your real profit', desc: 'The finance dashboard for small businesses in Excel and Google Sheets: income, expenses, invoices, pricing and clients. English and Arabic, one payment.',
      added: 'Done',
    },
  };

  // Figures from the sample data that ships in the file, so the preview shows the real product.
  const SAMPLE = {
    inc: [4433, 4371, 5430, 4879, 5513, 4601, 8626, 6818, 8981, 11046, 0, 0],
    exp: [3392, 5189, 4625, 4675, 5341, 4962, 4738, 4679, 2760, 5282, 0, 0],
    k: [64698, 45643, 19055, 0.29],
    cats: [10494, 9945, 9152, 6935, 5111],
  };

  const ICON = {
    dash: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="8" cy="8" r="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5L15.5 10"/>',
  };
  const ic = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
  const FEAT_IC = ['dash', 'list', 'doc', 'tag', 'users', 'target'];

  const getLang = () => {
    let l = null; try { l = localStorage.getItem('raff.lang'); } catch { /* private mode */ }
    if (l === 'ar' || l === 'en') return l;
    return /^ar\b/i.test(navigator.language || '') ? 'ar' : 'en';
  };
  const setFlag = (on) => { try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* ignore */ } };

  const latin = (n) => Math.round(n).toLocaleString('en-US');
  const price = (R, p, lang) => {
    const cur = (R.CFG && R.CFG.currency) || '$';
    return lang === 'ar' ? R.money(p.price) : `${cur}${p.price}`;
  };

  function mock(t, lang) {
    const n = (v) => (lang === 'ar' ? S.num(v) : latin(v));
    const max = Math.max(...SAMPLE.inc, ...SAMPLE.exp);
    const bars = SAMPLE.inc.map((v, i) => {
      const h1 = (v / max) * 100, h2 = (SAMPLE.exp[i] / max) * 100;
      return `<div class="m-col"><div class="m-pair"><i class="b-inc" style="height:${h1}%"></i><i class="b-exp" style="height:${h2}%"></i></div><span>${t.mock.months[i]}</span></div>`;
    }).join('');
    const catMax = SAMPLE.cats[0];
    const cats = SAMPLE.cats.map((v, i) => `<li><span>${esc(t.mock.catNames[i])}</span><b style="--w:${(v / catMax) * 100}%"></b><em>${n(v)}</em></li>`).join('');
    const ks = SAMPLE.k.map((v, i) => `<div class="m-k${i === 2 ? ' pos' : ''}"><span>${esc(t.mock.k[i])}</span><b>${i === 3 ? (lang === 'ar' ? `${S.num(Math.round(v * 100))}٪` : `${Math.round(v * 100)}%`) : n(v)}</b></div>`).join('');
    return `
      <div class="m-win" role="img" aria-label="${esc(t.mock.tabs[1])}">
        <div class="m-bar"><i></i><i></i><i></i><span>${lang === 'ar' ? 'ميزان-عربي.xlsx' : 'Mizan-English.xlsx'}</span></div>
        <div class="m-body">
          <div class="m-kpis">${ks}</div>
          <div class="m-grid">
            <div class="m-card"><p>${esc(t.mock.chart)}</p><div class="m-chart">${bars}</div><div class="m-legend"><span class="li">${esc(t.mock.inc)}</span><span class="le">${esc(t.mock.exp)}</span></div></div>
            <div class="m-card"><p>${esc(t.mock.cats)}</p><ul class="m-cats">${cats}</ul></div>
          </div>
        </div>
        <div class="m-tabs">${t.mock.tabs.map((x, i) => `<span class="${i === 1 ? 'on' : ''}">${esc(x)}</span>`).join('')}</div>
      </div>`;
  }

  function buyBtn(p, t, cls, label) {
    const url = S.safeUrl(p.buyUrl);
    return url
      ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-l-buy>${label} ${ic('arrow')}</a>`
      : `<button class="${cls}" type="button" data-l-buy>${label} ${ic('arrow')}</button>`;
  }

  function html(R, p, lang) {
    const t = T[lang], pr = price(R, p, lang);
    const prev = `previews/mizan-guide-${lang}.pdf`;
    return `
    <div class="l-wrap" lang="${lang}" dir="${t.dir}">
      <header class="l-nav">
        <a class="l-logo" href="#/" aria-label="Mizan">${lang === 'ar' ? 'ميزان' : 'Mizan'}<i></i></a>
        <nav aria-label="${lang === 'ar' ? 'أقسام الصفحة' : 'Sections'}">${t.nav.map(([h, x]) => `<a href="${h}">${esc(x)}</a>`).join('')}</nav>
        <div class="l-nav-end">
          <button type="button" class="l-lang" data-l-lang="${t.otherCode}" lang="${t.otherCode}">${t.other}</button>
          ${buyBtn(p, t, 'l-btn sm', `${t.get} · ${pr}`)}
        </div>
      </header>

      <section class="l-hero" id="l-hero" tabindex="-1">
        <div class="l-copy">
          <p class="l-kick"><span></span>${esc(t.kicker)}</p>
          <h1>${esc(t.h1[0])}<br><em>${esc(t.h1[1])}</em></h1>
          <p class="l-lead">${esc(t.lead)}</p>
          <div class="l-cta">${buyBtn(p, t, 'l-btn', `${t.buy} · ${pr}`)}<a class="l-link" href="${prev}" target="_blank" rel="noopener">${esc(t.preview)}</a></div>
          <ul class="l-trust">${t.trust.map((x) => `<li>${ic('check')}${esc(x)}</li>`).join('')}</ul>
        </div>
        <div class="l-shot" id="lShot">${mock(t, lang)}</div>
      </section>

      <section class="l-sec l-pains">
        <h2>${esc(t.pains.h)}</h2>
        <div class="l-three">${t.pains.items.map(([h, d], i) => `<article><span class="l-num">0${i + 1}</span><h3>${esc(h)}</h3><p>${esc(d)}</p></article>`).join('')}</div>
      </section>

      <section class="l-sec" id="l-features">
        <h2>${esc(t.feats.h)}</h2>
        <div class="l-feats">${t.feats.items.map(([h, d], i) => `<article><span class="l-ic">${ic(FEAT_IC[i])}</span><h3>${esc(h)}</h3><p>${esc(d)}</p></article>`).join('')}</div>
      </section>

      <section class="l-sec" id="l-how">
        <h2>${esc(t.how.h)}</h2>
        <ol class="l-steps">${t.how.steps.map(([h, d]) => `<li><h3>${esc(h)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>
      </section>

      <section class="l-sec l-price" id="l-buy">
        <div class="l-price-card">
          <div>
            <h2>${esc(t.priceH)}</h2>
            <p class="l-amount">${pr}</p>
            <p class="l-muted">${esc(t.priceNote)}</p>
            ${buyBtn(p, t, 'l-btn wide', t.buy)}
            <p class="l-guar">${ic('shield')}${esc(t.guarantee)}</p>
          </div>
          <div>
            <h3>${esc(t.inside)}</h3>
            <ul class="l-incl">${t.insideList.map((x) => `<li>${ic('check')}${esc(x)}</li>`).join('')}</ul>
          </div>
        </div>
      </section>

      <section class="l-sec" id="l-faq">
        <h2>${esc(t.faq.h)}</h2>
        <div class="l-faq">${t.faq.items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
      </section>

      <section class="l-final">
        <h2>${esc(t.final[0])}</h2>
        <p>${esc(t.final[1])}</p>
        ${buyBtn(p, t, 'l-btn light', `${t.buy} · ${pr}`)}
      </section>

      <footer class="l-foot">
        <span>© ${new Date().getFullYear()} ${lang === 'ar' ? 'ميزان' : 'Mizan'}</span>
        <nav>${t.foot.map(([h, x]) => `<a href="${h}">${esc(x)}</a>`).join('')}</nav>
      </footer>
    </div>`;
  }

  let el = null, current = null;
  function render(lang) {
    const R = window.raff, L = (R.CFG || {}).landing || {};
    const p = L.on ? R.byId.get(+L.pid) : null;
    root.classList.toggle('landing', !!p);
    root.classList.toggle('landing-en', !!p && lang === 'en');
    setFlag(!!p);
    const skip = document.querySelector('.skip');
    if (!p) { if (el) el.remove(); el = null; if (skip) skip.setAttribute('href', '#main'); ld(null); return; }
    if (skip) skip.setAttribute('href', '#l-hero');
    current = { p, lang };
    if (!el) {
      el = document.createElement('div'); el.id = 'landing';
      document.querySelector('.page').prepend(el);
      el.addEventListener('click', onClick);
    }
    el.innerHTML = html(R, p, lang);
    homeMeta();
    tilt();
  }

  // Title, description and Product structured data for the single-product home (search engines show the price).
  function homeMeta() {
    if (!current || root.classList.contains('route-page')) return;
    const t = T[current.lang], p = current.p, R = window.raff;
    document.title = t.title;
    const m = document.querySelector('meta[name="description"]'); if (m) m.content = t.desc;
    const code = /^[A-Z]{3}$/.test((R.CFG || {}).currencyCode || '') ? R.CFG.currencyCode : 'USD';
    ld({
      '@context': 'https://schema.org', '@type': 'Product', name: current.lang === 'ar' ? 'ميزان' : 'Mizan', description: t.desc,
      brand: { '@type': 'Brand', name: 'Mizan' }, sku: String(p.id),
      image: new URL(p.img || 'og.png', location.href).href,
      offers: { '@type': 'Offer', price: String(p.price), priceCurrency: code, availability: 'https://schema.org/InStock', url: location.href.split('#')[0] },
    });
  }
  function ld(data) {
    let tag = document.getElementById('ldlanding');
    if (!data) { if (tag) tag.remove(); return; }
    if (!tag) { tag = document.createElement('script'); tag.type = 'application/ld+json'; tag.id = 'ldlanding'; document.head.append(tag); }
    tag.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }

  function onClick(e) {
    const lg = e.target.closest('[data-l-lang]');
    if (lg) { try { localStorage.setItem('raff.lang', lg.dataset.lLang); } catch { /* ignore */ } render(lg.dataset.lLang); return; }
    const b = e.target.closest('button[data-l-buy]');
    if (b && current) {
      const R = window.raff;
      if (!R.qtyOf(current.p.id)) R.addToCart(current.p.id);
      R.openCart();
      setTimeout(() => { const c = document.querySelector('[data-action="checkout"]'); if (c) c.click(); }, 60);
    }
  }

  // A gentle 3D tilt that follows the pointer (off for reduced motion and touch).
  function tilt() {
    const shot = document.getElementById('lShot');
    if (!shot || matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover)').matches) return;
    shot.addEventListener('pointermove', (e) => {
      const r = shot.getBoundingClientRect();
      shot.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -6}deg`);
      shot.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
    });
    shot.addEventListener('pointerleave', () => { shot.style.removeProperty('--rx'); shot.style.removeProperty('--ry'); });
  }

  const start = () => render(getLang());
  const R = window.raff;
  if (R && R.isReady) start(); else if (R) R.onReady.push(start);
  addEventListener('hashchange', () => { if (current) { if (root.classList.contains('route-page')) ld(null); else homeMeta(); } });
  window.raffLanding = { render, T };
})();
