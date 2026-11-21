/**
 * Arabic (MSA + Tunisian darja) support for the rule-based smart search.
 *
 * `arabicToFrench(raw, categories)` rewrites the Arabic parts of a query into the
 * French vocabulary understood by `interpret()` (units, price ceilings, "cheap",
 * "promo", "near me", governorates, categories), and returns the remaining Arabic
 * words so they can still be searched (they match Arabic translations in `i18n`).
 */

const AR_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٫': ',' };

/** Strip diacritics/tatweel and unify alef / ya / ta marbuta so spelling variants match. */
export const normalizeArabic = (s) => String(s || '')
  .replace(/[٠-٩٫]/g, (d) => AR_DIGITS[d])
  .replace(/[ً-ٰٟـ]/g, '')
  .replace(/[إأآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه');

export const hasArabic = (s) => /[؀-ۿ]/.test(s);

// governorates (French value used by the API ← Arabic spellings)
const GOVERNORATES_AR = {
  Ariana: ['اريانه'], Beja: ['باجه'], 'Ben Arous': ['بن عروس'], Bizerte: ['بنزرت'], Gabes: ['قابس'], Gafsa: ['قفصه'],
  Jendouba: ['جندوبه'], Kairouan: ['القيروان', 'قيروان'], Kasserine: ['القصرين', 'قصرين'], Kebili: ['قبلي'], Kef: ['الكاف', 'كاف'],
  Mahdia: ['المهديه', 'مهديه'], Manouba: ['منوبه'], Medenine: ['مدنين', 'جربه', 'جرجيس'], Monastir: ['المنستير', 'منستير'],
  Nabeul: ['نابل', 'الحمامات', 'قليبيه'], Sfax: ['صفاقس'], 'Sidi Bouzid': ['سيدي بوزيد'], Siliana: ['سليانه'], Sousse: ['سوسه'],
  Tataouine: ['تطاوين'], Tozeur: ['توزر'], Tunis: ['تونس العاصمه', 'تونس'], Zaghouan: ['زغوان'],
};

// phrase → French token(s) understood by interpret()  (order matters: longer first)
const PHRASES = [
  [/(اقل من|أقل من|ما يفوتش|لا يتجاوز|ماكس|اقصي|حد اقصي)\s*/g, ' moins de '],
  [/\s*(دينار|دنانير|دينارات|د\.ت|دت|مليم)(?=\s|$)/g, ' dt '], // (\b does not work with Arabic letters)
  [/(\d+(?:[.,]\d+)?)\s*(طن|اطنان|طنات)/g, '$1 tonnes '],
  [/(\d+(?:[.,]\d+)?)\s*(كغ|كلغ|كيلو|كيلوغرام|كغم)/g, '$1 kg '],
  [/(\d+(?:[.,]\d+)?)\s*(لتر|لترات|ليتر|ليترو)/g, '$1 litres '],
  [/(رخيص|رخيصه|ارخص|بسوم رخيص|سومه مليحه|باهي في السوم|اقتصادي)/g, ' pas cher '],
  [/(تخفيض|تخفيضات|تخفيضه|برومو|صولد|عرض خاص|تنزيل|ريميز)/g, ' promo '],
  [/(قريب مني|بالقرب مني|قريب ليا|حذايا|حذاي|قريب)/g, ' pres de moi '],
];

const STOP_AR = new Set('نحب نلوج نشري نشتري ابحث اريد احتاج عن في من علي الي على إلى و او مع ب ل ال هذا هذه متاع امتاع بش باش'.split(' '));

/**
 * @param {string} raw user query
 * @param {Array<{id, name, keywords, i18n}>} categories (i18n.name.ar / i18n.keywords.ar give Arabic vocabulary)
 * @returns {{ text: string, arabicWords: string[] }} `text` = query with Arabic parts translated
 */
export function arabicToFrench(raw, categories = []) {
  if (!hasArabic(raw)) return { text: raw, arabicWords: [] };
  let text = ` ${normalizeArabic(raw)} `;
  for (const [re, fr] of PHRASES) text = text.replace(re, fr);

  for (const [fr, variants] of Object.entries(GOVERNORATES_AR)) {
    for (const v of variants) {
      const re = new RegExp(`(^|\\s)(ب|في|و)?${normalizeArabic(v)}(?=\\s|$)`, 'g');
      if (re.test(text)) text = text.replace(re, ` ${fr} `);
    }
  }

  // categories: Arabic name words + Arabic keywords → first French keyword of the category
  for (const c of categories) {
    const vocab = [
      ...String(c.i18n?.name?.ar ?? '').split(/[\s،,/]+/),
      ...(c.i18n?.keywords?.ar ?? []),
    ].map(normalizeArabic).filter((w) => w.length > 2);
    const frWord = (c.keywords?.[0] ?? c.name).split(/\s+/)[0];
    for (const w of vocab) {
      const re = new RegExp(`(^|\\s)(ال)?${w}\\S*`, 'g');
      if (re.test(text)) text = text.replace(re, ` ${frWord} `);
    }
  }

  const arabicWords = text.split(/\s+/).filter((w) => hasArabic(w) && w.length > 2 && !STOP_AR.has(w));
  return { text: text.replace(/\s+/g, ' ').trim(), arabicWords };
}
