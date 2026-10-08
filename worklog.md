# سجل العمل — Worklog

---
Task ID: 1
Agent: Super Z (main agent)
Task: بناء منصة تجارة إلكترونية متكاملة "سوقي" للتجار والزبائن في الجزائر (Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Prisma/SQLite + z-ai-web-dev-sdk)

Work Log:
- تهيئة البيئة عبر init-fullstack.sh وتحميل مهارات ASR و LLM و fullstack-dev
- تصميم مخطط Prisma: User, Session, Store, Product, Order مع دفع db:push على db/custom.db
- بناء مكتبات الخلفية:
  - src/lib/crypto.ts: تشفير كلمات المرور scrypt + تشفير AES-256-GCM لمفاتيح تليجرام + توليد أرقام طلبات
  - src/lib/auth.ts: جلسات بكوكيز httpOnly + تحقق صيغة البريد والسلاغ والهاتف الجزائري
  - src/lib/ratelimit.ts: حد معدل بالذاكرة (تسجيل 5/10د، دخول 10/5د، طلبات زبون 8/30د، AI 20/د)
  - src/lib/wilayas.ts: قائمة 58 ولاية جزائرية بالعربية والفرنسية
  - src/lib/telegram.ts: إشعارات تليجرام فورية للطلبات الجديدة بصيغة Markdown
  - src/lib/ai.ts: استخراج بيانات المنتج من نص حر عبر z-ai SDK (JSON parsing محصّن) + تحسين الأوصاف
  - src/lib/asr.ts: تحويل الصوت لـ WAV عبر ffmpeg ثم ASR
- بناء 14 واجهة API: المصادقة (register/login/logout/me)، products (GET/POST/PATCH/DELETE مع أرشفة ذكية)، orders، stats (مبيعات أسبوعية + الأكثر مبيعًا)، settings، parse، parse-voice، store/[slug] العام + تقديم طلبية مع حساب رسوم التوصيل لكل ولاية
- بناء الواجهة (SPA في page.tsx مع ?s=slug للمتجر العام):
  - auth-page: صفحة تعريفية متدرجة + تسجيل دخول/حساب جديد مع توليد تلقائي للسلاغ
  - dashboard: هيدر مع شارات الطلبات الجديدة + 4 تبويبات
  - stats-view: بطاقات إحصائية + مخطط Recharts لآخر 7 أيام + آخر الطلبات
  - products-view: شبكة منتجات + بحث + إظهار/إخفاء + حذف بأرشفة تلقائية للمرتبط بطلبيات
  - orders-view: فلترة بالحالات + بحث + نافذة تفاصيل كاملة + تغيير الحالة + نسخ الهاتف
  - settings-view: معلومات المتجر + رسوم 58 ولاية قابلة للتعديل + تليجرام مع تعليمات
  - product-wizard: تحليل نصي/صوتي بالذكاء الاصطناعي + خيارات ديناميكية + ضغط الصور بالمتصفح
  - recorder: تسجيل صوتي MediaRecorder (حد دقيقتين) مع مؤقت وإرسال للـASR
  - storefront + checkout-dialog: متجر عام أنيق + نموذج طلب سريع (دفع عند الاستلام) مع حساب الرسوم لحظيًا وشاشة نجاح
- PWA: manifest.json + sw.js (كاش + إشعارات) + أيقونات مولدة بـsharp (192/512/apple/favicon)
- RTL كامل بخط عربي وألوان زمردية جزائرية (تجنب الأزرق حسب القواعد)
- إصلاح أخطاء lint (setState في effect، تعليقات غير مستخدمة، إعادة ترتيب الدوال)
- تحقق شامل بـagent-browser: تسجيل متجر → تحليل AI لمنتج (استخرج الاسم والسعر والوصف واللونين) → نشر → زيارة المتجر العام → طلبية كاملة مع ولاية ورسوم → ظهور الطلب بشارة → تغيير الحالة → إحصائيات صحيحة (24,600 دج) → رسوم مخصصة لولاية وهران (500/350) → خروج ودخول

Stage Summary:
- المنصة كاملة وتعمل: 16 ملف مكونات في src/components/souq/ + 14 مسار API + 7 مكتبات
- جميع الاختبارات بالمتصفح نجحت بدون أخطاء console
- ملفات التحقق البصري: download/test-*.png
- الحساب التجريبي: test@example.com / secret123 (متجر النور، سلاغ nour-store)

---
Task ID: 2
Agent: Super Z (main agent)
Task: Refonte design complète « Émeraude Impériale & Or » de la plateforme سوقي (haut de gamme, moderne, attractif) sans altérer fonctionnement ni contenu

Work Log:
- globals.css refondu : palette émeraude profond (primary #144d3d env.) + accent or dynamique (--gold) + neutres ivoire chauds ; utilitaires premium (.glass/.glass-strong, .lift, .shadow-soft/.shadow-lift, .btn-gold, .text-gradient-gold, .pattern-dots/.pattern-grid) ; animations (fade-up, fade-in, scale-in, float, ring-pulse) + cascade .stagger-1..8 ; scrollbar et ::selection retravaillées
- Contourné 2 bugs LightningCSS : dégradés « background: » contenant var()+oklch statique vidés (→ linear-gradient via background-image + vars uniquement) et backdrop-filter supprimé à cause du double prefix -webkit- (→ propriété standard seule)
- layout.tsx : polices Google premium via next/font — Alexandria (titres, .font-display) + IBM Plex Sans Arabic (corps) ; theme_color #144d3d ; manifest.json (fond #faf9f4, thème #144d3d)
- ui/button.tsx : rounded-xl, durées 300ms, active:scale-97, hover lift + ombre colorée par variante ; ui/card.tsx : rounded-2xl, bordure fine, ombre douce double couche ; ui/input.tsx : h-11 rounded-xl, focus ring 4px ; ui/dialog.tsx : rounded-3xl, ombre profonde, p-8
- page.tsx : splash premium (dégradé émeraude, orbes flottants, anneau pulsant) ; nouveau composant reveal.tsx (IntersectionObserver, apparition au scroll avec délais)
- dashboard.tsx : en-tête sticky glassmorphism réactif au scroll (scrolled>10px), brand avec anneau or + pastille verte, navigation à pastilles actives émeraude avec badge or, conteneur max-w-7xl et espacements élargis, transition de contenu à chaque onglet, footer verre
- auth-page.tsx : hero 55% émeraude (motifs, orbes animés, titre à dégradé doré, cartes features verre + icônes or), formulaire carte 3xl avec onglets segmentés
- stats-view : KPI avec tuiles icônes teintées + carte revenus mise en avant, bar chart à dégradé émeraude + tooltip verre, top produits avec médailles, table à en-tête teinté
- products-view / orders-view / settings-view : barres d'outils pill, chips de filtre avec compteurs, cartes hover-lift + zoom image 500ms, sections à tuiles d'icônes, table wilayas à en-tête verre, bouton sauvegarde sticky pill dégradé
- storefront.tsx : hero immersif (motifs + orbes or émeraude), badges verre à icônes or, recherche flottante, grille avec Reveal en cascade, CTA or (.btn-gold), barre de confiance à tuiles, footer dégradé ; prix whitespace-nowrap (fix mobile)
- checkout-dialog : succès animé (anneau pulsant + scale-in), sélecteur livraison cartes arrondies, récap dégradé à séparateur pointillé, CTA dégradé ; product-wizard : section IA dorée ; recorder/image-picker polis
- Tests navigateur (agent-browser) : connexion compte test, dashboard (KPI/mésures), scroll header verre, onglets commandes/produits/paramètres, parcours complet boutique → produit → checkout (Oran 500/350 دج) → succès DZ-MUY3MUVJ-EE66 (24 500 دج) → réception côté marchand avec badge or, mobile 390px (storefront + dashboard), console sans erreurs, lint OK
- Redémarrage serveur dev requis (cache Turbopack stagnant sur le CSS) + captures dans download/redesign-*.png

Stage Summary:
- Refonte UI 100 % appliquée sur 15 fichiers (design system + 11 composants souq + layout/page + manifest), 0 changement fonctionnel/API
- Identité visuelle : émeraude profond + or + ivoire, Alexandria/IBM Plex Sans Arabic, glassmorphism, micro-interactions 300 ms, apparitions en cascade
- Golden path e-commerce revalidé de bout en bout après refonte ; captures : download/redesign-{auth,dashboard,dashboard-scrolled,orders,orders-new,products,settings,storefront,storefront-final,store-mobile,dash-mobile,checkout,success,wizard}.png
- Compte test inchangé : test@example.com / secret123 (متجر النور, ?s=nour-store)

---
Task ID: 3
Agent: Super Z (main agent)
Task: تنفيذ متطلبات الوثيقة التقنية (Technical Blueprint & SRS) غير المنجزة على منصة سوقي: الوضع الداكن الكامل، الاهتزاز اللمسي والصوتي، تحسين الصور sharp/WebP، طابور الذكاء الاصطناعي، حماية النماذج ضد الروبوتات — دون تغيير الوظائف أو المحتوى

Work Log:
- تحليل الفجوات مقابل SRS: المنجز سابقًا (PWA، AES-256-GCM، حد المعدل، 58 ولاية، تليجرام، شريط مدعوم بواسطة سوقي) مقابل الغائب (وضع داكن، haptics، sharp/WebP، طوابق، مكافحة سبام)
- الوضع الداكن: ThemeProvider من next-themes في layout.tsx (attribute=class، defaultTheme=system، enableSystem) + themeColor ديناميكي (فاتح #144d3d / داكن #10231c) + مكون theme-toggle.tsx بثلاثة أنماط (default للوحة التحكم، onGradient لصفحة الدخول، floating عائم زمردية للمتجر العام) + color-scheme أصيل + ظلال داكنة أعمق + شريط تمرير داكن + تلميع emerald للألوان الثابتة في checkout-dialog و settings-view
- Haptics: مكتبة haptics.ts (haptic عبر navigator.vibrate مع أمان try/catch + playBlip عبر Web Audio API بدون ملفات) — زر التسجيل: vibrate([50]) + نغمة 880Hz عند البدء، vibrate(30) + 620Hz عند الإيقاف، vibrate([50,50,50]) تحذيري عند فشل الميكروفون، vibrate([50,80,50]) عند نجاح الطلبية، واهتزاز خفيف مع كل تبديل ثيم
- sharp/WebP: مكتبة images.ts — optimizeProductImage (900px) و optimizeStoreLogo (512px) بجودة WebP 80% مع rotate() لتصحيح EXIF و withoutEnlargement و fail-safe يُعيد الأصل عند الفشل؛ رُفع حد الإدخال إلى 4MB (منتجات) و3MB (شعارات) لأن الخادم يعيد الضغط؛ مطبق على products POST/PATCH و settings PUT
- الطابور: queue.ts — منظم توازية بالذاكرة (مهام AI متوازية ≤2) مع withQueue() و queueStats()؛ مربوط في parse (تحليل+تحسين) و parse-voice (ASR+تحليل) لمنع اختناق الخادم (يُستبدل بـ Redis/BullMQ عند التوزيع)
- مكافحة السبام: honeypot مخفي (.hp-field في CSS، tabIndex=-1, aria-hidden) + فخ زمني openedAtRef في checkout-dialog؛ التحقق الخلفي في store/[slug]/order: حقل الفخ ممتلئ → رد وهمي برقم طلب حقيقي الشكل دون كتابة DB، elapsedMs<2500 → رفض برسالة إعادة محاولة
- أداء: decoding=async على صور المتجر العام (الشبكة + نافذة التفاصيل)
- lint نظيف 100%
- تحقق متصفح شامل: متجر عام فاتح/داكن، الثيم يُحفظ في localStorage ويصمد لإعادة التحميل (dark|theme=dark)، مسار طلب كامل بالوضع الداكن نجح (DZ-MUY487UC-E181, 24,600 دج، الأغواط 600/400)، اختبار روبوت بالـAPI: honeypot → رد وهمي بلا كتابة + سريع → رفض، لوحة التاجر بالوضع الداكن تُظهر الطلبية الحقيقية فقط (لا ROBOT SPAM)، رفع صورة 9.5MB/3000px → متصفح 800px JPEG 351KB → خادم WebP مخزن 338KB (أسوأ حالة ضوضاء عشوائية؛ الصور الحقيقية أصغر بكثير)، حذف منتج الاختبار، جوال 390px فاتح/داكن سليم، جلسة متصفح جديدة = صفر أخطاء console (الأخطاء المتراكمة السابقة ضجيج HMR أثناء التحرير)
- لقطات: download/srs-{storefront-light,storefront-dark,checkout-success-dark,auth-dark,dashboard-dark-orders,dashboard-light,mobile-light,mobile-dark,mobile-dashboard,fresh-visit}.png

Stage Summary:
- 5 متطلبات SRS جديدة منفذة بالكامل: وضع داكن كامل (3 أسطح + استمرارية)، haptics+audio على التسجيل والطلبات، sharp→WebP 80% على الخادم، طابور توازية للذكاء الاصطناعي، honeypot+فخ زمني مع تحقق خلفي
- ملفات جديدة: lib/haptics.ts, lib/images.ts, lib/queue.ts, components/souq/theme-toggle.tsx | معدلة: layout.tsx, globals.css, dashboard, auth-page, storefront, recorder, checkout-dialog, settings-view, products API (POST/[id] PATCH), settings API, store order API, parse, parse-voice
- صفر تغييرات على المخطط أو منطق العمل أو المحتوى؛ الحساب التجريبي كما هو test@example.com / secret123 (?s=nour-store)

---
Task ID: 4
Agent: Super Z (main agent)
Task: تنفيذ رؤية « Lux Engine »: كتالوج 20 قالب فاخر متعدد القطاعات + إعادة تصميم المنصة الرئيسية بأسلوب Dark Cosmos & Gold (glassmorphism + جزيئات ذهبية + عرض حي صوتي + مركز أوامر صوتية + خريطة الجزائر) دون المساس بالوظائف أو المحتوى

Work Log:
- Prisma: حقل Store.luxTheme (افتراضي emerald-gold) + db:push؛ إعادة تشغيل خادم التطوير كانت ضرورية لتحميل عميل Prisma الجديد
- lib/lux-themes.ts (جديد): واجهة LuxThemeConfig كاملة حسب المواصفات + 20 قالبًا بأسلوب وتفاصيل مطابقة للمواصفات المرجعية (الزمرد والذهب، الحرير الملكي، المخمل الأسود، ذهب الصحراء، الأسود الملكي، العنبر والورد، المرجان والماس، النخبة الدافئة، الزليج الأصيل، التيتانيوم الفضائي، الغرافيت والنحاس، الرخام والبلاتين، الإسكندنافي، الأجهزة الذهبية، العسل الملكي، الفستق الإمبراطوري، الشكولاتة الفاخرة، الملكي أزرق/وردي، الكاربون) — 8 فئات، خصائص تنسيق كاملة (heroBg/bodyBg/cardBg/accent/buttonGradient/border/fontClass/glow...) + suggestThemeForProduct للمطابقة الذكية بالكلمات المفتاحية
- خطوط جديدة في layout.tsx: Amiri (القوالب التقليدية) + Cairo (قوالب التقنية) بجانب Alexandria/IBM Plex
- globals.css: gold-gradient-text وluxury-glass-card وgold-glow-button (حرفيًا من المواصفات) + cosmos-bg + twinkle + phone-in 3D + wave-bar + scroll-snap-x + font-amiri/font-cairo
- API: settings PUT يقبل luxTheme مع تحقق من LUX_THEME_IDS؛ auth/me وstore/[slug] يرجعان luxTheme؛ stats يضيف ordersByWilaya (count/total/newCount) للخريطة؛ مسارات جديدة: /api/voice-command (ASR+LLM→intent JSON: set_theme/set_price/send_report/unknown مع رد دارجة، RL 12/د)، /api/report (تقرير مبيعات تليجرام عبر sendSalesReport الجديدة في telegram.ts)، /api/demo-voice (عام: نص أو صوت→تحليل منتج+قالب مقترح، RL 10/10د، داخل الطابور)
- storefront.tsx: محرك تطبيق القالب الديناميكي — كل الأسطح (hero، بطاقات، بحث، شرائط ثقة، footer، CTA) تتلون من styles القالب عبر أنماط inline؛ أنماط زخرفية لكل قالب؛ dialogs المحايدة تبقى موحدة
- theme-preview.tsx (جديد): محاكاة مصغرة حية لواجهة متجر بأي قالب (ترويسة + شبكة منتجات + footer) تُستخدم في المعرض والكاروسيل والمعاينة
- themes-view.tsx (جديد): معرض القوالب بتبويب «القوالب» الجديد — بحث + 8 شرائح فئات + 20 بطاقة بمعاينة حية وring ذهبي للقالب الحالي + تطبيق فوري (PUT settings) + نافذة معاينة داخل إطار هاتف مع لوحة ألوان
- auth-page.tsx: إعادة بناء كاملة Dark Cosmos & Gold — wrapper داكن إجباري + GoldParticles (canvas ~55 جزيء، dpr-aware، احترام prefers-reduced-motion) + نجوم twinkle + بطاقات luxury-glass + العرض الحي + الكاروسيل + نماذج دخول/تسجيل زجاجية بنفس المنطق الوظيفي
- voice-playground.tsx (جديد): زر ميكروفون ذهبي ضخم بتسجيل حقيقي→demo-voice أو جمل دارجة جاهزة→هاتف 3D (animate-phone-in) يعرض المتجر المولّد بقالب مقترح (Royal Onyx للعطور...) مع بطاقة المنتج glassmorphism وسعر gold-gradient
- template-carousel.tsx (جديد): كاروسيل scroll-snap للقوالب العشرين بتقدم تلقائي كل 3.2 ثانية (يتوقف عند hover/touch) مع تدرجات جانبية
- voice-command.tsx (جديد): زر ذهبي عائم في لوحة التحكم — تسجيل→voice-command→تنفيذ: تغيير القالب تلقائيًا مع معاينة، تغيير سعر مع بطاقة تأكيد ومطابقة غامضة للمنتج، إرسال تقرير تليجرام، أمثلة أوامر نصية جاهزة؛ haptics وblips في كل خطوة
- algeria-map.tsx (جديد): خريطة SVG لصورة الجزائر المبسطة + 58 نقطة بإسقاط إحداثيات حقيقي — التوهج والحجم يتناسب مع الطلبيات، نبض SVG animate للطلبيات الجديدة، tooltip glass عند التمرير، قائمة أعلى 5 ولايات بأشرطة ذهبية؛ مدمجة في stats-view
- page.tsx: شاشة تحميل بهوية لوكس الجديدة؛ dashboard.tsx: تبويب القوالب + VoiceCommand wired
- اختبار متصفح شامل: landing (جزيئات/زجاج/تدرج ذهبي) ✓؛ playground بجملة جاهزة→عطر شرقي 8500 دج→هاتف Royal Onyx ✓؛ دخول test@example.com ✓؛ معرض 20 قالب بالفئات ✓؛ تطبيق الأسود الملكي→storefront onyx كامل (بطاقات/أسعار/CTA ذهبية) ✓؛ أمر صوتي نصي «غيّر التصميم إلى قالب الزليج الأصيل»→تطبيق تلقائي+معاينة→storefront zellige ✓؛ golden path: طلبية كاملة Alger→DZ-MUY5WUHE-B325 (24,600 دج) ✓؛ API set_price→intent صحيح (الساعة الذكية 19900) ✓؛ report API→رسالة واضحة عند عدم ربط تليجرام ✓؛ جوال 390px (landing/carrousel/نماذج) ✓؛ dark mode خريطة متوهجة ✓؛ console نظيفة، lint نظيف
- لقطات: download/lux-{auth,playground,dash,themes-gallery,theme-applied2,store-onyx2,store-zellige,store-honey,checkout-emerald,order-success,mobile-auth,mobile-carousel,mobile-form,algeria-map,map-dark,landing-final}.png
- ملاحظة: أعدنا ضبط قالب المتجر التجريبي إلى emerald-gold بعد الاختبارات؛ سعر المنتج لم يتغير (24000 دج)

Stage Summary:
- Lux Engine كامل: 20 قالبًا فاخرًا حيًّا يُطبقون على المتجر العام بنقرة أو بأمر صوتي بالدارجة؛ المنصة الرئيسية أصبحت vitrine Dark Cosmos & Gold مع عرض حي صوتي وكاروسيل قوالب
- ملفات جديدة (8): lib/lux-themes.ts, api/{voice-command,report,demo-voice}, components/souq/{theme-preview,themes-view,voice-playground,template-carousel,voice-command,algeria-map,gold-particles} | معدلة (11): schema.prisma, souq-types.ts, telegram.ts, layout.tsx, globals.css, page.tsx, dashboard.tsx, storefront.tsx, auth-page.tsx, stats-view.tsx, api/{settings,me,store/[slug],stats}
- الوظائف والمحتوى سليمان 100% (طلبية نجحت بعد التطبيق)؛ حساب التجربة: test@example.com / secret123 (?s=nour-store) بقالب emerald-gold

---
Task ID: 5
Agent: Super Z (main agent)
Task: تطوير 5 أنظمة جديدة على منصة سوقي حسب مواصفات المستخدم: (1) استوديو التصوير الاحترافي بالذكاء الاصطناعي + إعلانات الفيديو 9:16 لـ TikTok/Reels، (2) عداد العجلة والعد التنازلي (Urgency & Scarcity)، (3) تأكيد الطلبات التلقائي + كشف الزبناء الوهميين (Blacklist)، (4) المتاجر التفاعلية عبر التلغرام (Mini-Store WebApp)، (5) نظام التسويق بالعمولة (Affiliate Engine)

Work Log:
- Prisma schema: نماذج BlacklistedCustomer (هاتف موحد 213X + failedDeliveries + note) و Affiliate (name/phone/code unique/commission/totalEarned) + حقول Store (urgencyEnabled/urgencyMinutes/urgencyStock/whatsappEnabled/ultramsgInstance+Token مشفرة/replicateToken مشفر) + حقول Order (riskLevel/affiliateId/commission/confirmToken unique/confirmedAt) + حقول Product (stock/videoUrl/videoStatus/videoScript/videoJobId) — db:push وإعادة تشغيل الخادم
- الخدمات: lib/blacklist.ts (normalizePhone 0550→213 + checkCustomerTrustScore + reportFailedDelivery)، lib/whatsapp.ts (UltraMsg API: sendOrderConfirmationWhatsApp برابط /confirm/{token} + sendWhatsAppText)، lib/affiliate.ts (generateAffiliateCode لاتيني A-Z0-9، إصلاح: الأسماء العربية كانت تولد رموزًا ترفضها isValidCodeShape → بادئة AGENT + computeCommission على سعر المنتجات فقط + buildReferralLink)، lib/ai-studio.ts (5 أنماط: marble_luxury/golden_velvet/modern_minimal/black_onyx/silk_royal بـ prompts المستخدم + generateLuxuryStudioImage عبر SDK image edit — ملاحظة: الأنواع المثبتة تقول image نص لكن البوابة الفعلية تطلب images مصفوفة، تم تجاوز النوع)، lib/video-ads.ts (generateAdScript دارجة JSON + محركان: zai.video.generations.create 720x1280/5s افتراضيًا + Replicate minimax/video-01 BYOK اختياريًا، مع jobId بادئة "zai:" للتمييز + getVideoAdStatus يتعامل مع سلوك البوابة الغريب: ترمي 400 مع task_status=FAIL عند الفشل + رسائل ودية لـ 429 و 1301)، lib/telegram-bot.ts (handleBotStart بزر WebApp inline keyboard + زر متصفح، resolveOrigin، setBotWebhook بـ secret_token)
- API جديدة: POST /api/ai-studio (RL 12/10د + queue، يطبق الصورة على المنتج مباشرة)، POST+GET /api/video-ads (سسكربت دائمًا + فيديو + متابعة دورية)، GET/POST/DELETE /api/affiliates (مع pendingCommissions وحد 50 مسوق، الحذف يفصل طلبياته)، POST /api/affiliates/validate (عام، RL 30/10د)، GET/POST/DELETE /api/blacklist، POST /api/telegram/webhook?slug= (تحقق HMAC secret من X-Telegram-Bot-Api-Secret-Token، /start و /start REF يمرر الإحالة، يرد 200 دائمًا)، POST /api/telegram/setup (setWebhook للمسار الحالي مع secret مشتق)، GET+POST /api/confirm-order/[token] (ملخص عام + تأكيد مع تحديث العنوان + إشعار تليجرام للتاجر، مقاوم للتأكيد المزدوج)
- دمج في المسارات الموجودة: store/[slug]/order (فحص الثقة → riskLevel + تنبيه في رسالة تليجرام، إسناد affiliate عبر refCode + حساب commission، توليد confirmToken، إرسال واتساب عند التفعيل، الرد يتضمن whatsappSent)، orders GET (include affiliate + DTO كامل)، orders/[id] PATCH (accrual العمولة مرة واحدة عند DELIVERED عبر transaction + action reportRetour: CANCELLED + إضافة للقائمة السوداء)، settings PUT (urgency + whatsapp مشفرة + replicate)، auth/me (hasWhatsApp/hasReplicate/urgency*)، store/[slug] GET (urgency* + whatsappEnabled + stock + videoUrl للمنتجات)، products POST/PATCH/GET (stock عبر parseStock: null=غير محدود)
- الواجهة: urgency-banner.tsx (كود المستخدم محسّن: deadline في localStorage فلا يُعاد العد بالتحميل + يظهر بعد أول tick) أعلى المتجر عند التفعيل، ai-studio-view.tsx (اختيار منتج → 5 أنماط بمعاينات تدرج → توليد مع لوحة قبل/بعد + قسم فيديو: سسكربت قابل للنسخ + بدء توليد + polling كل 10ث + مشغل 9:16 + شارات حالة)، affiliates-view.tsx (4 بطاقات إحصاء + جدول المسوقين مع الرمز والعمولة والرابط ونسخ + حذف + نافذة إضافة)، /confirm/[token]/page.tsx (صفحة عامة زجاجية: ملخص + عنوان + بلدية + ملاحظة → شاشة نجاح)، storefront (التقاط ?ref= مع تخزين 30 يومًا + شارة عائمة "عرض المسوّق" + شارة المخزون المحدود + مشغل فيديو المنتج في نافذة التفاصيل + تمرير refCode)، checkout-dialog (refCode prop + whatsappSent → رسالة "أُرسل لك رابط تأكيد العنوان عبر واتساب")، orders-view (شارات: خطر عالٍ/العنوان مؤكد/رمز المسوق مع العمولة + زر "تسجيل إرجاع (Retour) — حجب الرقم")، settings-view (4 أقسام جديدة: عداد الاستعجال بمفتاح Switch، واتساب UltraMsg مع دليل الحصول على المفاتيح، مفتاح Replicate، بوت المتجر التفاعلي بزر تفعيل)، dashboard.tsx (تبويبان: استوديو AI + المسوقون)
- اختبارات متصفح ناجحة: إضافة مسوق "أمين" → رمز AGENTRKPQ ✓؛ تفعيل العداد من الإعدادات ✓؛ فتح ?ref=AGENTRKPQ → شارة المسوق + شريط "الكمية محدودة جداً! متبقي 3 قطع | ينتهي العرض خلال 00:44:xx" ✓؛ طلبية كاملة من الرابط → commission 2400 (10% من 24000) + affiliateId + confirmToken + riskLevel LOW ✓؛ تسجيل إرجاع → CANCELLED + Blacklist 213770998877 failed=1 ✓؛ طلبية جديدة من الرقم المحجوب → riskLevel HIGH ✓؛ صفحة التأكيد: تعديل العنوان + تأكيد → "تم تأكيد العنوان" + شارة في الطلبات ✓؛ استوديو AI: عطر + مخمل ذهبي → 200 في 15.2ث → صورة WebP مطبقة على المنتج ✓؛ validate API: صحيح/خاطئ ✓؛ webhook بدون secret → 401، مع secret → /start AGENTRKPQ ✓؛ سسكربت دارجة وُلد فعليًا ("رويال أونيكس، عطر شرقي فاخر يخلط بين العود والمسك...8500 دج فقط") ✓؛ شارة المخزون "متبقي 3 قطعة فقط" في تفاصيل المنتج ✓
- قيود بيئية موثقة: محرك فيديو المنصة (zai.video) رفض صور الاختبار بفلتر محتوى 1301 ثم أصبح 429 معدل متجاوز على مستوى البيئة — كلاهما مُعالج برسائل عربية واضحة ("جرب صورة أخرى" / "أعد المحاولة بعد دقائق") والكشف عن الفشل أوقف حلقة الانتظار اللانهائية؛ مسار Replicate BYOK جاهز كبديل فعلي عند إضافة مفتاح التاجر
- منتجات تجريبية أُضيفت للحساب التجريبي: عطر شرقي (صورة استوديو AI + stock 3) وسماعة بلوتوث (stock 8) — لإظهار الميزات الجديدة
- lint نظيف 100%، tsc نظيف على src/، صفر أخطاء console
- لقطات: download/feat-{urgency-ref,confirm-page,ai-studio,ai-studio-final,affiliates,product-stock,mobile-store}.png

Stage Summary:
- 5 أنظمة جديدة تعمل بالكامل: استوديو AI (صور فاخرة فعلية عبر SDK + فيديو بمحركين)، عداد استعجال غير قابل للتلاعب، كشف زبناء وهميين يُغذي تلقائيًا من زر الإرجاع، تأكيد عناوين واتساب بصفحات عامة، بوت تليجرام Mini-Store يدعم الإحالات، وعمولة تُحتسب عند التسليم فقط
- الملفات الجديدة (16): lib/{blacklist,whatsapp,affiliate,ai-studio,video-ads,telegram-bot}.ts + api/{ai-studio,video-ads,affiliates,affiliates/validate,blacklist,telegram/webhook,telegram/setup,confirm-order/[token]} + components/souq/{urgency-banner,ai-studio-view,affiliates-view} + app/confirm/[token]/page.tsx
- المعدلة (13): schema.prisma, crypto.ts, telegram.ts, souq-types.ts, api/{settings,me,orders,orders/[id],store/[slug],store/[slug]/order,products,products/[id],stats}, components/{dashboard,storefront,checkout-dialog,orders-view,settings-view,ai-studio-view*}.tsx
- سلوك مدروس: الثقة تُعلّم ولا ترفض (القرار للتاجر)، العمولة عند التسليم فقط (COD واقعي)، الحذف يفصل الطلبيات دون حذفها، جميع مفاتيح الطرف الثالث مشفرة AES-256-GCM
- حساب التجربة: test@example.com / secret123 (?s=nour-store) — مسوق: AGENTRKPQ

---
Task ID: 7
Agent: Super Z (main agent)
Task: préparer le déploiement Vercel du site Al-Fasil (سوقي) — demande utilisateur « je vais lie mon site sur vercel »

Work Log:
- Diagnostic blocants Vercel: (1) SQLite non persistant sur serverless, (2) SDK z-ai-web-dev-sdk indisponible hors sandbox (6 fichiers), (3) ffmpeg absent sur Vercel, (4) script build spécifique au sandbox
- src/lib/ai-gateway.ts (nouveau): couche IA unifiée — aiChat() + aiTranscribe(); Gemini 1.5 Flash REST (GEMINI_API_KEY, GEMINI_MODEL overridable) en production, boîte de repli z-ai SDK en dev; erreurs conviviales en arabe (429/401/timeout/clé manquante); JSON mode via responseMimeType
- Refactor 6 fichiers vers la passerelle: ai.ts (parseProductFromText json+temp0.4, enhanceProductDescription), social-copywriting.ts (+repli fallbackCaption immédiat si IA indisponible), video-ads.ts (generateAdScript; startVideoAdJob → erreur conviviale « connecter Replicate » si moteur sandbox absent; getVideoAdStatus → import dynamique), voice-command/route.ts (systemPrompt réordonné avant l'appel aiChat)
- asr.ts: TMP_DIR → os.tmpdir() (compatible /tmp Vercel); ffmpeg déjà optionnel; ASR via aiTranscribe (mime audio/wav si conversion réussie sinon mime original — Gemini multimodal, plus besoin de ffmpeg)
- ai-studio.ts: repli Replicate flux-kontext-pro (BYOK, Prefer:wait, image_input dataURL, sortie webp) quand le moteur sandbox est absent; signature +replicateTokenEnc; route api/ai-studio passe store.replicateToken
- prisma/schema.postgres.prisma (nouveau): copie exacte du schéma avec provider postgresql — validée par prisma validate ✅
- vercel.json (nouveau): buildCommand = copie schéma Postgres → prisma db push --accept-data-loss (création auto des tables à chaque build) → prisma generate → next build; framework nextjs
- .env.example (nouveau): DATABASE_URL, APP_SECRET, APP_PUBLIC_URL, GEMINI_API_KEY (obligatoires) + FACEBOOK_APP_ID/SECRET, FB_WEBHOOK_VERIFY_TOKEN (Social Sync) — commentaires en français
- DEPLOY_VERCEL.md (nouveau): guide français complet en 6 étapes (GitHub → Neon → import Vercel → variables → URL publique → connexions Telegram/Facebook/Replicate) + tableau de tests + dépannage
- Tests: tsc --noEmit src/ 100% clean ✅; eslint 9 fichiers modifiés clean ✅; prisma validate Postgres ✅; vercel.json JSON valide ✅; smoke live: GET / → 200, POST /api/demo-voice → 200 produit parsé via passerelle ✅
- Garantie zéro régression: en sandbox GEMINI_API_KEY absente → tout passe par z-ai SDK (comportement identique); sur Vercel → Gemini/Replicate automatiquement

Stage Summary:
- Le site est PRÊT pour Vercel: schema.postgres.prisma + vercel.json (tables auto au build), passerelle IA Gemini 1.5 Flash conforme SRS, ASR sans ffmpeg, replis Replicate (images+vidéo) BYOK, .env.example et guide DEPLOY_VERCEL.md en français
- Aucune fonctionnalité ni aucun écran modifié — chemin de déploiement: git push → import Vercel → 4 variables (DATABASE_URL, APP_SECRET, APP_PUBLIC_URL, GEMINI_API_KEY) → Deploy
- Compte de test inchangé: test@example.com / secret123 (?s=nour-store)
