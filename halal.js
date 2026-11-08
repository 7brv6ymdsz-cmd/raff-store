/* Halal use · the same banned-terms screen the database applies (public.halal_violations), run in the
   browser first so people get an instant, clear answer. The database stays the real gate. */
(() => {
  'use strict';
  const TERMS = {
    alcohol: ['خمر', 'خمور', 'نبيذ', 'بيره', 'فودكا', 'ويسكي', 'عرق بلدي', 'مشروبات روحيه', 'alcohol', 'beer', 'wine', 'vodka', 'whisky', 'whiskey', 'liquor'],
    drugs: ['مخدرات', 'حشيش', 'سجائر', 'معسل', 'شيشه', 'فيب', 'cannabis', 'cigarettes', 'vape', 'tobacco', 'hookah'],
    gambling: ['قمار', 'كازينو', 'مراهنه', 'مراهنات', 'يانصيب', 'روليت', 'بوكر', 'casino', 'gambling', 'betting', 'lottery', 'poker', 'roulette'],
    riba: ['ربا', 'قرض بفائده', 'قروض بفائده', 'تمويل بفائده', 'خيارات ثنائيه', 'payday loan', 'binary options'],
    adult: ['اباحي', 'اباحيه', 'سكس', 'تعارف وزواج مؤقت', 'مواعده', 'porn', 'xxx', 'escort', 'dating app'],
    pork: ['خنزير', 'لحم خنزير', 'pork', 'bacon'],
    sorcery: ['سحر اسود', 'جلب الحبيب', 'شعوذه', 'قراءه الطالع', 'تاروت', 'ابراج الحظ', 'tarot', 'horoscope'],
    music: ['حفله غنائيه', 'ملهى ليلي', 'ديسكو', 'nightclub'],
    fraud: ['ربح مضمون', 'تسويق هرمي', 'ماركه مقلده', 'guaranteed profit', 'pyramid scheme'],
  };
  const NAMES = { alcohol: 'الخمور والمسكرات', drugs: 'المخدرات والتدخين', gambling: 'القمار والمراهنات', riba: 'الربا والفوائد', adult: 'المحتوى الإباحي والتعارف', pork: 'الخنزير', sorcery: 'السحر والشعوذة', music: 'الحفلات والملاهي', fraud: 'الغش والاحتيال' };
  const PREFIXES = ['', 'ال', 'و', 'وال', 'ب', 'بال', 'وب', 'وبال', 'ل', 'لل', 'ول', 'ولل', 'ف', 'فال', 'فب', 'فبال', 'كال'];
  const MAP = { 'إ': 'ا', 'أ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه' };
  // same steps as public.halal_normalize(): lower case, no diacritics/tatweel, one alef/yaa/taa marbuta, words padded by spaces
  const normalize = (t) => ` ${String(t || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[إأآٱىة]/g, (c) => MAP[c])
    .replace(/[^0-9a-zء-ي]+/g, ' ').trim()} `;
  const norms = Object.fromEntries(Object.entries(TERMS).map(([k, list]) => [k, list.map((x) => normalize(x).trim())]));
  /** Banned categories found in the text (empty when clean). */
  function check(text) {
    const s = normalize(text);
    return Object.keys(norms).filter((k) => norms[k].some((term) => PREFIXES.some((p) => s.includes(` ${p}${term} `))));
  }
  const message = (cats) => `هالمحتوى مخالف لسياسة الاستخدام الحلال (${cats.map((c) => NAMES[c] || c).join('، ')}). منصتنا ما بتقبل الترويج أو البيع لأي شي محرّم.`;
  window.RaffHalal = { check, message, NAMES, normalize };
})();
