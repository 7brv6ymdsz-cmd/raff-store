# رَفّ · متجر إلكتروني عربي

متجر سريع بواجهة ثلاثية الأبعاد ولوحة إدارة كاملة، يعمل على **GitHub Pages** مجاناً، ويتّصل اختيارياً بـ **Supabase** للحسابات والطلبات الفورية.

**الرابط:** https://7brv6ymdsz-cmd.github.io/raff-store/  ·  **لوحة الإدارة:** `/admin/`

## الأنظمة
- **المتجر:** بحث يفهم الإملاء العربي، ترتيب وتصفية، صفحة منتج بمقاسات وألوان، سلة، كوبونات، الدفع عند الاستلام / PayPal / تحويل بنكي، تتبّع الطلب.
- **الزبائن:** حسابات، عناوين، مفضلة، طلباتي، رسائلي، حذف الحساب.
- **نظام الإجابة:** إجابات فورية، محادثات مع الفريق، أسئلة وأجوبة على المنتجات.
- **الإدارة:** إحصاءات، طلبات وفواتير، منتجات، مخزون بسجل حركات وتنبيهات، عملاء، كوبونات، تقييمات، رسائل، أدوار الفريق، سجل النشاط.
- **الأمان:** كل الأسعار والمخزون والصلاحيات تُحسب داخل قاعدة البيانات (RLS ودوال آمنة)، وCSP صارمة.

## التشغيل محلياً
```bash
npm ci
npm start          # http://localhost:8766/raff-store/
```

## الاختبارات
```bash
npm run lint       # ESLint + Stylelint + html-validate
npm test           # Playwright: الصفحات، الشراء، الإدارة، وضع السيرفر، إمكانية الوصول، الأمان
npm run test:db    # قاعدة البيانات على PostgreSQL حقيقي
npm run audit      # Lighthouse
```
تعمل كلها تلقائياً على GitHub مع كل تعديل (`.github/workflows/ci.yml`).

## ربط السيرفر
راجع [`supabase/README.md`](supabase/README.md). وجرد الأنظمة وخطة التطوير في [`docs/SYSTEMS.md`](docs/SYSTEMS.md).

## Selling digital products

The store sells digital products (e-books, courses, templates, audio, tools) out of the box. Each product in the admin editor is **digital** by default:

- **Automatic payment and delivery (recommended):** create the product on Payhip, Gumroad or Lemon Squeezy (free to start, they take a small fee per sale), upload the file there, and paste its product link into «رابط الدفع والتحميل التلقائي». The product page then shows «اشترِ الآن · تحميل فوري»: the customer pays on that secure page and gets the file by email automatically.
- **Manual:** leave the link empty. The customer orders (name, phone, email — no address, no shipping, no cash on delivery), the order reaches your WhatsApp, and from the order sheet in the admin you paste a download link (Google Drive, Dropbox…) and send it by WhatsApp or email in one click.

Digital products have no stock, are limited to one copy per order and are skipped by the inventory page. Physical products still work: switch the editor to «منتج عادي (شحن)». With the server connected, `place_order` applies the same rules (`product_type`, `digital` columns; `manual` payment method), covered by `tests/db/50-digital-products.sql`.
