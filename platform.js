/* Rawaj platform homepage (settings.landing.mode = 'platform'): one monthly subscription that opens Mizan now,
   with the ads manager shown honestly as coming. Drawn by landing.js, which owns the language switch and routing. */
(() => {
  'use strict';
  const S = window.RaffShared;
  const esc = S.esc;

  const P = {
    ar: {
      dir: 'rtl', other: 'English', otherCode: 'en', name: 'رواج',
      nav: [['#l-what', 'المنصة'], ['#l-halal', 'حلال'], ['#l-plans', 'الأسعار'], ['#l-faq', 'الأسئلة']],
      start: 'ابدأ الآن', sound: 'الأصوات',
      kicker: 'منصة حلال لنمو المشاريع الصغيرة',
      h1: ['خلّي شغلك', 'يروج.'],
      lead: 'رواج بيجمعلك أدوات النمو بمكان واحد وباشتراك شهري واحد: «ميزان» لحساباتك متاح الآن، ومدير الإعلانات الممولة على فيسبوك وإنستغرام وتيك توك قيد الإطلاق.',
      primary: 'اشترك وافتح ميزان', secondary: 'شوف الباقات',
      trust: ['ميزان متاح الآن', 'إدارة الإعلانات قريباً', 'عربي + English', 'منصة حلال'],
      soonCard: ['مدير الإعلانات', 'فيسبوك · إنستغرام · تيك توك', 'قريباً'],
      what: 'أداتين بيشتغلوا مع بعض',
      products: [
        { name: 'ميزان', badge: 'متاح الآن', on: true, desc: 'دخلك ومصاريفك وفواتيرك وتسعيرك وعملاءك بلوحة وحدة، وبيحسبلك صافي الربح والضريبة لحاله.', points: ['لوحة تحكم شهرية برسوم بيانية', 'فواتير جاهزة للطباعة', 'حاسبة تسعير تحفظ هامشك', 'بياناتك إلك وحدك'] },
        { name: 'مدير الإعلانات', badge: 'قريباً', on: false, desc: 'بتجاوب على كم سؤال، وهو بيبني حملتك على فيسبوك وإنستغرام وتيك توك، بيوقف الإعلان الخاسر ويكبّر الرابح كل يوم، بسقف صرف ما بيتعداه.', points: ['ربط حساباتك بكبسة', 'حملات جاهزة بالعربي', 'إدارة يومية تلقائية', 'تقرير ربحك الحقيقي'] },
      ],
      halalH: 'منصة حلال، بالفعل مش بالكلام',
      halalP: 'ما منقبل إعلانات أو منتجات للخمور أو القمار أو الربا أو المحتوى الخادش أو أي شي محرّم. كل نص بيمرّ على فحص تلقائي قبل الحفظ والنشر، والحساب المخالف بينوقف.',
      halalList: ['لا خمور ولا قمار', 'لا ربا ولا فوائد', 'لا محتوى خادش', 'بلا موسيقى'],
      halalLink: 'اقرأ سياسة الاستخدام الحلال',
      plansH: 'سعر واضح، بدون مفاجآت', plansNote: 'دفع شهري · إلغاء بأي وقت · ضمان استرداد ١٤ يوم', perMonth: '/ شهرياً', subscribe: 'اشترك',
      howH: 'كيف بتبلّش',
      steps: [['اشترك', 'افتح حساب واختار باقتك. الدفع آمن بالبطاقة أو PayPal.'], ['افتح ميزان', 'سجّل دخلك ومصاريفك وشوف ربحك الحقيقي من أول يوم.'], ['اربط إعلاناتك (قريباً)', 'لما يطلق مدير الإعلانات بيوصلك إشعار، وبتربط حساباتك بكبسة.']],
      faqH: 'أسئلة شائعة',
      faq: [
        ['شو بيصير لما ينتهي اشتراكي؟', 'ميزان بينقفل، وبياناتك بتضل محفوظة. أول ما تجدد بيرجع كل شي متل ما هو.'],
        ['فيني ألغي بأي وقت؟', 'إيه. بيضل حسابك شغّال لآخر الفترة المدفوعة، وما في أي رسوم إلغاء.'],
        ['إيمتى بيطلق مدير الإعلانات؟', 'عم نجهّزه هلّق، وبيحتاج موافقة فيسبوك وتيك توك. المشتركين أول ناس بيعرفوا وبيستعملوه بنفس الاشتراك.'],
        ['شو يعني منصة حلال؟', 'ما منقبل أي نشاط محرّم، ومنفحص المحتوى تلقائياً، ومنوقف الحساب المخالف. التفاصيل بسياسة الاستخدام الحلال.'],
        ['بياناتي آمنة؟', 'كل حساب معزول بقاعدة البيانات، وما حدا غيرك بيشوف أرقامك. ما منبيع ولا منشارك بياناتك.'],
        ['بيشتغل على الموبايل؟', 'إيه، المنصة كلها بتشتغل على الموبايل والكمبيوتر، بالعربي والإنجليزي.'],
      ],
      final: ['خلّي شغلك يروج.', 'ابدأ اليوم بميزان، وكون من أول اللي بيستعملوا مدير الإعلانات.'],
      foot: [['#/terms', 'الشروط'], ['#/halal', 'الاستخدام الحلال'], ['#/privacy', 'الخصوصية'], ['#/data-deletion', 'حذف البيانات'], ['#/contact', 'تواصل معنا'], ['brand/', 'الهوية']],
      title: 'رواج · خلّي شغلك يروج',
      desc: 'رواج منصة حلال لنمو المشاريع الصغيرة: ميزان لحساباتك متاح الآن، ومدير إعلانات فيسبوك وإنستغرام وتيك توك قريباً. اشتراك شهري واحد.',
    },
    en: {
      dir: 'ltr', other: 'العربية', otherCode: 'ar', name: 'Rawaj',
      nav: [['#l-what', 'Platform'], ['#l-halal', 'Halal'], ['#l-plans', 'Pricing'], ['#l-faq', 'FAQ']],
      start: 'Get started', sound: 'Sounds',
      kicker: 'The halal growth platform for small businesses',
      h1: ['Make your business', 'thrive.'],
      lead: 'Rawaj brings your growth tools together under one monthly plan: Mizan for your finances is live now, and the ads manager for Facebook, Instagram and TikTok is on its way.',
      primary: 'Subscribe and open Mizan', secondary: 'See pricing',
      trust: ['Mizan is live', 'Ads manager coming soon', 'English + Arabic', 'Halal platform'],
      soonCard: ['Ads manager', 'Facebook · Instagram · TikTok', 'Coming soon'],
      what: 'Two tools that work together',
      products: [
        { name: 'Mizan', badge: 'Live now', on: true, desc: 'Income, expenses, invoices, pricing and clients on one dashboard, with your net profit and tax set-aside worked out for you.', points: ['Monthly dashboard with charts', 'Print-ready invoices', 'A pricing calculator that protects your margin', 'Your data stays yours'] },
        { name: 'Ads manager', badge: 'Coming soon', on: false, desc: 'Answer a few questions and it builds your campaign on Facebook, Instagram and TikTok, pauses what loses, grows what wins, every day, within a spending cap it never crosses.', points: ['Connect your accounts in one click', 'Ready campaigns in Arabic', 'Automatic daily management', 'A report of your real profit'] },
      ],
      halalH: 'A halal platform, in practice',
      halalP: 'We accept no ads or products for alcohol, gambling, interest (riba), indecent content or anything haram. Every text is screened automatically before it is saved or published, and accounts that break the rules are suspended.',
      halalList: ['No alcohol or gambling', 'No riba or interest', 'No indecent content', 'No music'],
      halalLink: 'Read the halal use policy',
      plansH: 'Clear pricing, no surprises', plansNote: 'Monthly billing · Cancel anytime · 14-day refund', perMonth: '/ month', subscribe: 'Subscribe',
      howH: 'How to start',
      steps: [['Subscribe', 'Create an account and pick a plan. Pay securely by card or PayPal.'], ['Open Mizan', 'Log your income and expenses and see your real profit from day one.'], ['Connect your ads (soon)', 'When the ads manager launches you will be told first, and connect your accounts in one click.']],
      faqH: 'Questions',
      faq: [
        ['What happens when my plan ends?', 'Mizan locks and your data is kept. Renew and everything is back as it was.'],
        ['Can I cancel anytime?', 'Yes. Your account keeps working until the end of the period you paid for, with no cancellation fee.'],
        ['When does the ads manager launch?', 'We are building it now, and it needs Facebook and TikTok approval. Members hear first and use it on the same plan.'],
        ['What does halal platform mean?', 'We accept nothing haram, screen content automatically and suspend accounts that break the rules. Details are in the halal use policy.'],
        ['Is my data safe?', 'Every account is isolated in the database and nobody else can see your numbers. We never sell or share your data.'],
        ['Does it work on mobile?', 'Yes, the whole platform works on phone and desktop, in English and Arabic.'],
      ],
      final: ['Make your business thrive.', 'Start today with Mizan, and be among the first to use the ads manager.'],
      foot: [['#/terms', 'Terms'], ['#/halal', 'Halal use'], ['#/privacy', 'Privacy'], ['#/data-deletion', 'Data deletion'], ['#/contact', 'Contact'], ['brand/', 'Brand']],
      title: 'Rawaj · Make your business thrive',
      desc: 'Rawaj is a halal growth platform for small businesses: Mizan for your finances is live, and the Facebook, Instagram and TikTok ads manager is coming. One monthly plan.',
    },
  };

  const DEFAULT_PLANS = [
    { id: 'pro', name: 'احترافي', price: 119, features: ['ميزان كامل', 'مشروع واحد', 'مدير الإعلانات عند إطلاقه'] },
    { id: 'business', name: 'أعمال', price: 249, features: ['ميزان كامل', 'حتى ٥ مشاريع', 'مدير الإعلانات عند إطلاقه'] },
  ];
  const plans = (R) => { const b = (R.CFG && R.CFG.billing) || {}; return Array.isArray(b.plans) && b.plans.length ? b.plans : DEFAULT_PLANS; };
  const check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const speaker = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="wave" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const logo = (name) => `<span class="rw-logo"><svg class="rw-mark" viewBox="0 0 512 512" aria-hidden="true"><rect class="lg-tile" width="512" height="512" rx="120"/>
    <path class="lg-curve" d="M120 352 C 200 360 236 328 266 276 C 296 224 318 176 360 150" pathLength="1"/><circle class="lg-dot" cx="386" cy="138" r="42"/></svg><b>${name}</b></span>`;

  function html(R, lang, mockHtml) {
    const t = P[lang];
    const D = window.RaffData;
    const startHref = D && D.auth && D.auth.user ? '#/mizan' : '#/signup?next=mizan';
    const num = (v) => (lang === 'ar' ? S.num(v) : String(v));
    const soundOn = window.RaffSound && window.RaffSound.on;
    return `
    <div class="l-wrap rw" lang="${lang}" dir="${t.dir}">
      <header class="l-nav">
        <a class="l-logo" href="#/" aria-label="${t.name}">${logo(t.name)}</a>
        <nav aria-label="${lang === 'ar' ? 'أقسام الصفحة' : 'Sections'}">${t.nav.map(([h, x]) => `<a href="${h}">${esc(x)}</a>`).join('')}</nav>
        <div class="l-nav-end">
          <button type="button" class="l-icon" data-sound-toggle aria-pressed="${soundOn ? 'true' : 'false'}" aria-label="${t.sound}" title="${t.sound}">${speaker}</button>
          <button type="button" class="l-lang" data-l-lang="${t.otherCode}" lang="${t.otherCode}">${t.other}</button>
          <a class="l-btn sm" href="${startHref}" data-sfx="tap">${esc(t.start)}</a>
        </div>
      </header>

      <section class="l-hero" id="l-hero" tabindex="-1">
        <div class="l-copy">
          <p class="l-kick"><span></span>${esc(t.kicker)}</p>
          <h1>${esc(t.h1[0])}<br><em>${esc(t.h1[1])}</em></h1>
          <p class="l-lead">${esc(t.lead)}</p>
          <div class="l-cta"><a class="l-btn" href="${startHref}" data-sfx="tap">${esc(t.primary)} ${arrow}</a><a class="l-link" href="#l-plans">${esc(t.secondary)}</a></div>
          <ul class="l-trust">${t.trust.map((x, i) => `<li class="${i === 1 ? 'soon' : ''}">${check}${esc(x)}</li>`).join('')}</ul>
        </div>
        <div class="l-shot rw-shot" id="lShot">${mockHtml}
          <div class="rw-soon" aria-label="${esc(t.soonCard.join(' · '))}"><b>${esc(t.soonCard[0])}</b><span>${esc(t.soonCard[1])}</span><em>${esc(t.soonCard[2])}</em></div>
        </div>
      </section>

      <section class="l-sec" id="l-what">
        <h2>${esc(t.what)}</h2>
        <div class="rw-products">${t.products.map((p) => `<article class="${p.on ? 'on' : 'soon'}"><header><h3>${esc(p.name)}</h3><span class="rw-badge">${esc(p.badge)}</span></header>
          <p>${esc(p.desc)}</p><ul>${p.points.map((x) => `<li>${check}${esc(x)}</li>`).join('')}</ul></article>`).join('')}</div>
      </section>

      <section class="l-sec rw-halal" id="l-halal">
        <div><h2>${esc(t.halalH)}</h2><p>${esc(t.halalP)}</p><a class="l-link" href="#/halal">${esc(t.halalLink)}</a></div>
        <ul>${t.halalList.map((x) => `<li>${check}${esc(x)}</li>`).join('')}</ul>
      </section>

      <section class="l-sec" id="l-plans">
        <h2>${esc(t.plansH)}</h2>
        <div class="rw-plans">${plans(R).map((p, i) => `<article class="${i === 1 ? 'alt' : ''}"><h3>${esc(p.name)}</h3>
          <p class="rw-price"><b>${p.price > 0 ? `${num(+p.price)}$` : ''}</b><span>${esc(t.perMonth)}</span></p>
          <ul>${(p.features || []).map((f) => `<li>${check}${esc(f)}</li>`).join('')}</ul>
          <a class="l-btn wide${i === 1 ? ' light' : ''}" href="${startHref}" data-sfx="tap">${esc(t.subscribe)}</a></article>`).join('')}</div>
        <p class="rw-note">${esc(t.plansNote)}</p>
      </section>

      <section class="l-sec" id="l-how">
        <h2>${esc(t.howH)}</h2>
        <ol class="l-steps">${t.steps.map(([h, d]) => `<li><h3>${esc(h)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>
      </section>

      <section class="l-sec" id="l-faq">
        <h2>${esc(t.faqH)}</h2>
        <div class="l-faq">${t.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
      </section>

      <section class="l-final">
        <h2>${esc(t.final[0])}</h2>
        <p>${esc(t.final[1])}</p>
        <a class="l-btn light" href="${startHref}" data-sfx="tap">${esc(t.primary)} ${arrow}</a>
      </section>

      <footer class="l-foot">
        <span>© ${new Date().getFullYear()} ${t.name}</span>
        <nav>${t.foot.map(([h, x]) => `<a href="${h}">${esc(x)}</a>`).join('')}</nav>
      </footer>
    </div>`;
  }

  function meta(lang, R) {
    const t = P[lang];
    return {
      title: t.title, desc: t.desc,
      ld: {
        '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Rawaj', alternateName: 'رواج', applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web', description: t.desc,
        offers: plans(R).map((p) => ({ '@type': 'Offer', name: p.name, price: String(p.price), priceCurrency: 'USD' })),
      },
    };
  }

  window.RaffPlatform = { P, html, meta };
})();
