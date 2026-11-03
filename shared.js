/* رَفّ — shared by the storefront and the admin: product art, formatting, order codes. */
(() => {
  'use strict';

  /* ---------- Product art: flat shapes on warm earth tones ---------- */
  const ART = {
    mug: (f, a) => `<rect x="30" y="36" width="34" height="38" rx="7" fill="${f}"/><path d="M64 46h5a8 8 0 0 1 0 16h-5" fill="none" stroke="${f}" stroke-width="5"/><rect x="30" y="36" width="34" height="7" rx="3.5" fill="${a}"/>`,
    sneaker: (f, a) => `<path d="M16 64c0-9 6-16 14-16 4 0 7-3 10-6 3-3 8-3 11 1l7 9c9 2 20 4 25 9 2 2 2 5 1 7H16z" fill="${f}"/><rect x="15" y="66" width="70" height="7" rx="3.5" fill="${a}"/><path d="M42 50l5 5M47 46l5 5M52 43l4 5" stroke="${a}" stroke-width="2" stroke-linecap="round"/>`,
    tote: (f, a) => `<path d="M38 42v-6a12 12 0 0 1 24 0v6" fill="none" stroke="${a}" stroke-width="4" stroke-linecap="round"/><path d="M27 42h46l-3 38H30z" fill="${f}"/><rect x="40" y="56" width="20" height="12" rx="2" fill="${a}" opacity=".35"/>`,
    lamp: (f, a) => `<path d="M36 26h28l9 24H27z" fill="${f}"/><rect x="48" y="50" width="4" height="24" fill="${a}"/><ellipse cx="50" cy="76" rx="15" ry="4" fill="${a}"/>`,
    plant: (f, a) => `<ellipse cx="42" cy="40" rx="7" ry="16" transform="rotate(-28 42 40)" fill="${f}"/><ellipse cx="58" cy="38" rx="7" ry="17" transform="rotate(26 58 38)" fill="${f}"/><ellipse cx="50" cy="34" rx="6" ry="18" fill="${f}" opacity=".85"/><path d="M36 56h28l-4 24H40z" fill="${a}"/>`,
    headphones: (f, a) => `<path d="M29 60V50a21 21 0 0 1 42 0v10" fill="none" stroke="${f}" stroke-width="6" stroke-linecap="round"/><rect x="22" y="54" width="15" height="24" rx="7" fill="${f}"/><rect x="63" y="54" width="15" height="24" rx="7" fill="${f}"/><rect x="26" y="58" width="7" height="16" rx="3.5" fill="${a}"/><rect x="67" y="58" width="7" height="16" rx="3.5" fill="${a}"/>`,
    serum: (f, a) => `<rect x="46" y="16" width="8" height="16" rx="4" fill="${a}"/><rect x="43" y="30" width="14" height="9" rx="2" fill="${a}"/><rect x="37" y="38" width="26" height="42" rx="6" fill="${f}"/><rect x="42" y="52" width="16" height="14" rx="2" fill="${a}" opacity=".4"/>`,
    chair: (f, a) => `<rect x="34" y="20" width="32" height="30" rx="6" fill="${f}"/><rect x="30" y="50" width="40" height="8" rx="3" fill="${f}"/><path d="M34 58l-3 22M66 58l3 22" stroke="${a}" stroke-width="4" stroke-linecap="round"/>`,
    watch: (f, a) => `<rect x="42" y="14" width="16" height="72" rx="6" fill="${a}"/><circle cx="50" cy="50" r="17" fill="${a}"/><circle cx="50" cy="50" r="13" fill="${f}"/><path d="M50 50V41M50 50l6 4" stroke="${a}" stroke-width="2" stroke-linecap="round"/>`,
    candle: (f, a) => `<path d="M50 24c4 5 5 9 0 13-5-4-4-8 0-13z" fill="#e2a85a"/><rect x="48.8" y="36" width="2.4" height="6" fill="${a}"/><rect x="33" y="42" width="34" height="38" rx="7" fill="${f}"/><rect x="33" y="56" width="34" height="12" fill="${a}" opacity=".35"/>`,
    vase: (f, a) => `<path d="M44 20h12v8c0 4 12 10 12 26 0 14-8 26-18 26S32 68 32 54c0-16 12-22 12-26z" fill="${f}"/><path d="M34 50h32" stroke="${a}" stroke-width="3"/>`,
    glasses: (f, a) => `<circle cx="35" cy="52" r="13" fill="${f}"/><circle cx="65" cy="52" r="13" fill="${f}"/><path d="M47 50q3-4 6 0" fill="none" stroke="${f}" stroke-width="3"/><path d="M22 48l-6-6M78 48l6-6" stroke="${f}" stroke-width="3" stroke-linecap="round"/><circle cx="31" cy="48" r="3" fill="${a}" opacity=".6"/><circle cx="61" cy="48" r="3" fill="${a}" opacity=".6"/>`,
    cap: (f, a) => `<path d="M24 62a26 26 0 0 1 52 0z" fill="${f}"/><path d="M58 62h24a4 4 0 0 1 0 7H50z" fill="${a}"/><circle cx="50" cy="36" r="3" fill="${a}"/><path d="M50 36v26" stroke="${a}" stroke-width="1.5" opacity=".5"/>`,
    tee: (f, a) => `<path d="M38 22l-18 10 6 14 8-4v38h32V42l8 4 6-14-18-10c-2 5-6 8-12 8s-10-3-12-8z" fill="${f}"/><path d="M38 22c2 5 6 8 12 8s10-3 12-8" fill="none" stroke="${a}" stroke-width="2"/>`,
    tube: (f, a) => `<path d="M36 20h28l-4 52H40z" fill="${f}"/><rect x="42" y="72" width="16" height="9" rx="2" fill="${a}"/><rect x="41" y="38" width="18" height="12" rx="2" fill="${a}" opacity=".35"/>`,
    cactus: (f, a) => `<rect x="43" y="22" width="14" height="40" rx="7" fill="${f}"/><path d="M43 46h-6a5 5 0 0 1-5-5v-8" fill="none" stroke="${f}" stroke-width="7" stroke-linecap="round"/><path d="M57 40h6a5 5 0 0 0 5-5v-6" fill="none" stroke="${f}" stroke-width="7" stroke-linecap="round"/><path d="M36 58h28l-4 22H40z" fill="${a}"/>`,
    speaker: (f, a) => `<rect x="32" y="22" width="36" height="58" rx="10" fill="${f}"/><circle cx="50" cy="60" r="11" fill="${a}"/><circle cx="50" cy="60" r="4" fill="${f}"/><circle cx="50" cy="36" r="5" fill="${a}"/>`,
    ebook: (f, a) => `<path d="M30 20h34a6 6 0 0 1 6 6v54H36a6 6 0 0 1-6-6z" fill="${f}"/><path d="M36 74h34v6H36a3 3 0 0 1 0-6z" fill="${a}" opacity=".5"/><rect x="38" y="30" width="24" height="4" rx="2" fill="${a}"/><rect x="38" y="38" width="16" height="3" rx="1.5" fill="${a}" opacity=".6"/><path d="M30 26v48" stroke="${a}" stroke-width="2" opacity=".35"/>`,
    course: (f, a) => `<rect x="18" y="26" width="64" height="42" rx="7" fill="${f}"/><path d="M45 38v18l15-9z" fill="${a}"/><rect x="38" y="72" width="24" height="4" rx="2" fill="${a}" opacity=".6"/><rect x="26" y="62" width="48" height="2.5" rx="1.25" fill="${a}" opacity=".35"/><rect x="26" y="62" width="20" height="2.5" rx="1.25" fill="${a}"/>`,
    template: (f, a) => `<rect x="20" y="22" width="60" height="56" rx="7" fill="${f}"/><rect x="26" y="28" width="48" height="16" rx="3" fill="${a}" opacity=".7"/><rect x="26" y="48" width="22" height="24" rx="3" fill="${a}" opacity=".45"/><rect x="52" y="48" width="22" height="10" rx="3" fill="${a}" opacity=".45"/><rect x="52" y="62" width="22" height="10" rx="3" fill="${a}" opacity=".45"/>`,
    audio: (f, a) => `<circle cx="50" cy="50" r="28" fill="${f}"/><circle cx="50" cy="50" r="10" fill="${a}"/><circle cx="50" cy="50" r="3" fill="${f}"/><path d="M50 22a28 28 0 0 1 28 28" stroke="${a}" stroke-width="2" fill="none" opacity=".5"/>`,
    software: (f, a) => `<rect x="18" y="24" width="64" height="48" rx="7" fill="${f}"/><rect x="18" y="24" width="64" height="10" rx="5" fill="${a}" opacity=".6"/><circle cx="25" cy="29" r="2" fill="${f}"/><circle cx="31" cy="29" r="2" fill="${f}"/><path d="M38 46l-7 6 7 6M62 46l7 6-7 6M54 42l-8 20" stroke="${a}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    file: (f, a) => `<path d="M32 18h26l14 14v48a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z" fill="${f}"/><path d="M58 18v12a2 2 0 0 0 2 2h12" fill="${a}" opacity=".5"/><path d="M50 44v20M42 56l8 8 8-8" stroke="${a}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  };
  const DIGITAL_KINDS = ['ebook', 'course', 'template', 'audio', 'software', 'file'];
  const KINDS = Object.keys(ART);
  const KIND_NAMES = {
    mug: 'كوب', sneaker: 'حذاء', tote: 'حقيبة', lamp: 'مصباح', plant: 'نبتة', headphones: 'سماعات',
    serum: 'قارورة', chair: 'كرسي', watch: 'ساعة', candle: 'شمعة', vase: 'مزهرية', glasses: 'نظارة',
    cap: 'قبعة', tee: 'قميص', tube: 'أنبوب', cactus: 'صبّار', speaker: 'مكبّر صوت',
    ebook: 'كتاب إلكتروني', course: 'دورة فيديو', template: 'قالب', audio: 'صوتيات', software: 'برنامج', file: 'ملف',
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hex = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);
  const safeImg = (s) => (typeof s === 'string' && (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s) || /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/[\w\-./%]+$/.test(s)) ? s
    : typeof s === 'string' && /^(?:\.{0,2}\/)?[\w\-./]+\.(png|jpe?g|webp|gif|svg)$/i.test(s) && !s.includes('..//') ? s : '');

  // pages outside the site root (the admin) prefix relative product images
  const imgBase = /\/admin\/[^/]*$/.test(location.pathname) ? '../' : '';
  const art = (p) => {
    const img = safeImg(p.img);
    if (img) return `<img src="${esc(/^(data:|https:)/.test(img) ? img : imgBase + img.replace(/^\.\//, ''))}" alt="" loading="lazy" decoding="async">`;
    const draw = ART[p.kind] || ART.tote;
    return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><ellipse cx="50" cy="83" rx="28" ry="3" fill="#000" opacity=".08"/>${draw(hex(p.fg, '#efe8dc'), hex(p.ac, '#665a54'))}</svg>`;
  };

  const isDigital = (p) => !!p && p.type === 'digital';
  const safeUrl = (u) => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(u.trim()) ? u.trim() : '');
  const nf = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 });
  const num = (n) => nf.format(+n || 0);
  const money = (n, cur = '$') => `${num(n)}${cur}`;
  const compact = (n) => (n >= 1000 ? `${nf.format(Math.round(n / 100) / 10)} ألف` : nf.format(n));
  const toLatinDigits = (s) => String(s ?? '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  const norm = (s) => String(s ?? '').toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();

  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  /* ---------- Order codes: an order travels inside a WhatsApp message as RAFF1.<base64url json> ---------- */
  const b64u = {
    enc(str) {
      const bytes = new TextEncoder().encode(str);
      let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    dec(s) {
      const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
      return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
    },
  };
  const METHODS = { cod: 'الدفع عند الاستلام', paypal: 'PayPal أو بطاقة عبر PayPal', bank: 'تحويل بنكي', manual: 'تواصل للدفع (واتساب)' };
  const newOrderId = () => `R-${Date.now().toString(36).slice(-5).toUpperCase()}${Math.floor(Math.random() * 36 * 36).toString(36).toUpperCase().padStart(2, '0')}`;

  const encodeOrder = (o) => 'RAFF1.' + b64u.enc(JSON.stringify({
    i: o.id, t: o.createdAt, n: o.customer.name, p: o.customer.phone, e: o.customer.email || '', c: o.customer.city, a: o.customer.address, o: o.customer.notes || '',
    m: o.method, s: o.shipping, T: o.total, it: o.items.map((x) => [x.id, x.qty, x.price, x.name, x.digital ? 1 : 0]),
  }));

  const str = (v, max = 300) => String(v ?? '').slice(0, max);
  const n0 = (v) => (Number.isFinite(+v) && +v >= 0 ? Math.round(+v * 100) / 100 : 0);
  const decodeOrder = (text) => {
    const m = /RAFF1\.([A-Za-z0-9_-]{10,8000})/.exec(String(text || ''));
    if (!m) return null;
    let d; try { d = JSON.parse(b64u.dec(m[1])); } catch { return null; }
    if (!d || typeof d !== 'object' || !Array.isArray(d.it)) return null;
    const items = d.it.slice(0, 100).map((x) => ({ id: +x[0] || 0, qty: Math.max(1, Math.min(999, +x[1] | 0)), price: n0(x[2]), name: str(x[3], 120), ...(x[4] ? { digital: true } : {}) }));
    const sub = items.reduce((s, x) => s + x.qty * x.price, 0);
    return {
      id: str(d.i, 20) || newOrderId(),
      createdAt: Number.isFinite(+d.t) ? +d.t : Date.now(),
      customer: { name: str(d.n, 120), phone: str(d.p, 40), email: str(d.e, 120), city: str(d.c, 80), address: str(d.a, 300), notes: str(d.o, 500) },
      method: METHODS[d.m] ? d.m : 'cod',
      items, subtotal: n0(sub), shipping: n0(d.s), total: n0(sub + n0(d.s)),
      status: 'new', paid: false,
    };
  };

  const loadCatalog = async (base = '') => {
    const preview = /[?&]preview=1/.test(location.search) ? ls.get('raff.preview', null) : null;
    if (preview && Array.isArray(preview.products)) return { ...preview, isPreview: true };
    const r = await fetch(`${base}data/store.json?t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-cache' });
    if (!r.ok) throw new Error('catalog ' + r.status);
    return r.json();
  };

  window.RaffShared = {
    ART, KINDS, DIGITAL_KINDS, KIND_NAMES, isDigital, safeUrl, art, esc, hex, safeImg, num, money, compact, toLatinDigits, norm, ls,
    METHODS, newOrderId, encodeOrder, decodeOrder, loadCatalog,
  };
})();
