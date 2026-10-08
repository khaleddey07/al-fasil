"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoldParticles } from "./gold-particles";
import { VoicePlayground } from "./voice-playground";
import { TemplateCarousel } from "./template-carousel";
import { BadgeCheck, Loader2, Mic, Sparkles, Store, Truck, Eye, EyeOff, Zap } from "lucide-react";
import type { MeDTO } from "@/lib/souq-types";

interface AuthPageProps {
  onSuccess: (me: MeDTO) => void;
}

/**
 * الواجهة الرئيسية للمنصة — "Dark Cosmos & Gold"
 * جزيئات ذهبية + زجاج فاخر + عرض حي صوتي + كاروسيل القوالب الفاخرة
 */
export function AuthPage({ onSuccess }: AuthPageProps) {
  return (
    <div className="dark min-h-screen cosmos-bg text-white flex flex-col lg:flex-row relative overflow-hidden">
      {/* جزيئات ذهبية متحركة على كامل الصفحة */}
      <GoldParticles density={55} />

      {/* نجوم خافتة ثابتة للعمق */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {[
          { top: "12%", left: "8%", d: "0s" },
          { top: "22%", left: "88%", d: "0.8s" },
          { top: "70%", left: "14%", d: "1.6s" },
          { top: "85%", left: "76%", d: "0.4s" },
          { top: "38%", left: "94%", d: "2.1s" },
          { top: "8%", left: "55%", d: "1.2s" },
        ].map((s, i) => (
          <span
            key={i}
            className="twinkle absolute w-1 h-1 rounded-full bg-gold"
            style={{ top: s.top, left: s.left, animationDelay: s.d }}
          />
        ))}
      </div>

      {/* ————— الجانب التعريفي + العرض الحي ————— */}
      <div className="relative lg:w-[55%] p-6 sm:p-10 lg:p-14 flex flex-col overflow-hidden">
        {/* توهجات كونية */}
        <div className="pointer-events-none absolute -top-40 right-1/4 w-[30rem] h-[30rem] rounded-full bg-gold/[0.07] blur-3xl float-slow" />
        <div className="pointer-events-none absolute bottom-0 -left-24 w-96 h-96 rounded-full bg-amber-500/[0.05] blur-3xl float-slower" />

        {/* الشريط العلوي */}
        <div className="relative flex items-center gap-3.5 animate-fade-up">
          <div className="relative w-14 h-14 rounded-2xl luxury-glass-card flex items-center justify-center">
            <Store className="w-7 h-7 text-gold" />
            <span className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-gold shadow-[0_0_12px_rgba(212,175,55,0.8)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              سوقي
              <span className="gold-gradient-text"> ✦ </span>
              لوكس
            </h1>
            <p className="text-xs text-white/50 mt-0.5">
              منصة التجارة الإلكترونية الجزائرية — بالذكاء الاصطناعي الصوتي
            </p>
          </div>
          <a
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-bold text-gold transition-all duration-300 hover:bg-gold/20 hover:border-gold/50"
          >
            <Store className="w-3.5 h-3.5" />
            منصة التجار
          </a>
        </div>

        {/* العنوان الرئيسي */}
        <div className="relative mt-10 lg:mt-14 max-w-xl animate-fade-up stagger-1">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold leading-[1.4] tracking-tight">
            تكلم… <span className="gold-gradient-text">ومتجرك الفاخر</span>{" "}
            يُبنى أمام عينيك
          </h2>
          <p className="mt-4 text-white/65 leading-relaxed text-[15px]">
            صوّر منتجك، سجّل وصفًا بالدارجة، وسيولّد الذكاء الاصطناعي متجرًا
            أنيقًا من 20 قالبًا فاخرًا — مع طلبات فورية وتوصيل لكل ولايات الوطن
            الـ 58 والدفع عند الاستلام.
          </p>
        </div>

        {/* العرض الحي الصوتي */}
        <div
          className="relative mt-8 luxury-glass-card rounded-3xl p-5 sm:p-7 max-w-xl animate-fade-up stagger-2"
          id="playground"
        >
          <div className="flex items-center gap-2 mb-5">
            <span className="w-8 h-8 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
              <Mic className="w-4 h-4 text-gold" />
            </span>
            <div>
              <p className="font-display font-bold text-sm">العرض الحي — جرّبه الآن</p>
              <p className="text-[10.5px] text-white/45">
                بدون تسجيل — الذكاء الاصطناعي يولّد متجرًا فاخرًا خلال ثوانٍ
              </p>
            </div>
          </div>

          <VoicePlayground />
        </div>

        {/* كاروسيل القوالب الفاخرة */}
        <div className="relative mt-6 max-w-2xl w-full animate-fade-up stagger-3">
          <div className="flex items-center justify-between mb-1 px-2">
            <p className="text-xs font-bold text-white/70 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              معرض القوالب الفاخرة
            </p>
            <span className="text-[10px] text-white/40">20 template de luxe</span>
          </div>
          <TemplateCarousel />
        </div>

        <p className="relative mt-auto pt-6 text-[11px] text-white/40 flex items-center gap-2 animate-fade-in stagger-5">
          <span className="inline-block w-8 h-px bg-gradient-to-l from-gold/60 to-transparent" />
          الدفع عند الاستلام · بدون عمولات خفية · رابط متجر خاص بك
        </p>
      </div>

      {/* ————— جانب الدخول/التسجيل: بطاقة زجاجية فاخرة ————— */}
      <div className="lg:w-[45%] relative flex items-center justify-center p-6 sm:p-10 lg:p-14 border-t lg:border-t-0 lg:border-r border-white/[0.07] bg-white/[0.02] backdrop-blur-sm">
        <div className="pointer-events-none absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-gold/[0.06] blur-3xl float-slow" />

        <div className="w-full max-w-md animate-fade-up stagger-2 relative">
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-1.5 text-[11px] font-bold text-gold mb-4">
              <Zap className="w-3.5 h-3.5" />
              انضم إلى آلاف التجار في الجزائر
            </div>
            <h3 className="font-display text-2xl font-bold tracking-tight">
              متجرك الفاخر <span className="gold-gradient-text">يبدأ من هنا</span>
            </h3>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1.5 rounded-2xl bg-white/[0.06] border border-white/10">
              <TabsTrigger
                value="login"
                className="rounded-xl text-white/75 data-[state=active]:bg-gold data-[state=active]:text-[#050505] data-[state=active]:shadow-[0_0_20px_rgba(212,175,55,0.35)] font-semibold transition-all duration-300"
              >
                تسجيل الدخول
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="gap-1.5 rounded-xl text-white/75 data-[state=active]:bg-gold data-[state=active]:text-[#050505] data-[state=active]:shadow-[0_0_20px_rgba(212,175,55,0.35)] font-semibold transition-all duration-300"
              >
                <BadgeCheck className="w-4 h-4" />
                إنشاء متجر
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm onSuccess={onSuccess} />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm onSuccess={onSuccess} />
            </TabsContent>
          </Tabs>

          {/* ميزات سريعة */}
          <div className="grid grid-cols-3 gap-2.5 mt-7">
            {[
              { icon: Mic, label: "إضافة بالصوت" },
              { icon: Sparkles, label: "20 قالب فاخر" },
              { icon: Truck, label: "توصيل 58 ولاية" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] py-3 transition-all duration-300 hover:border-gold/30 hover:bg-gold/[0.06]"
              >
                <f.icon className="w-4.5 h-4.5 text-gold" />
                <span className="text-[10px] text-white/65 font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل تسجيل الدخول");
        return;
      }
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (meRes.ok) {
        onSuccess(await meRes.json());
      }
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="luxury-glass-card rounded-3xl p-7 animate-fade-in">
      <p className="font-display font-bold text-lg mb-1">مرحبًا بعودتك</p>
      <p className="text-xs text-white/55 mb-6">سجّل الدخول لإدارة متجرك وطلبياتك</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-white/80">
            البريد الإلكتروني
          </Label>
          <Input
            id="login-email"
            type="email"
            dir="ltr"
            className="text-left bg-white/[0.06] border-white/15 text-white placeholder:text-white/30 focus-visible:ring-gold/40 focus-visible:border-gold/50 h-11"
            placeholder="merchant@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-white/80">
            كلمة المرور
          </Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-11 bg-white/[0.06] border-white/15 text-white placeholder:text-white/30 focus-visible:ring-gold/40 focus-visible:border-gold/50 h-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-gold transition-colors"
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/25 rounded-xl px-3.5 py-2.5 animate-fade-in">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11.5 gold-glow-button border-0 rounded-xl text-[15px]"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          تسجيل الدخول
        </Button>
      </form>
    </div>
  );
}

function RegisterForm({ onSuccess }: AuthPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function autoSlug(value: string) {
    if (slugTouched) return;
    const generated = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setSlug(generated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, storeName, slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل إنشاء الحساب");
        return;
      }
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (meRes.ok) {
        onSuccess(await meRes.json());
      }
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "bg-white/[0.06] border-white/15 text-white placeholder:text-white/30 focus-visible:ring-gold/40 focus-visible:border-gold/50";

  return (
    <div className="luxury-glass-card rounded-3xl p-7 animate-fade-in">
      <p className="font-display font-bold text-lg mb-1">أنشئ متجرك الفاخر</p>
      <p className="text-xs text-white/55 mb-6">مجانًا وبدون بطاقة بنكية — جاهز خلال دقيقة</p>

      <form onSubmit={handleSubmit} className="space-y-4.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="reg-name" className="text-white/80">
              اسمك الكامل
            </Label>
            <Input
              id="reg-name"
              placeholder="محمد الأمين"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-store" className="text-white/80">
              اسم المتجر
            </Label>
            <Input
              id="reg-store"
              placeholder="متجر النور"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value);
                autoSlug(e.target.value);
              }}
              required
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-email" className="text-white/80">
            البريد الإلكتروني
          </Label>
          <Input
            id="reg-email"
            type="email"
            dir="ltr"
            className={`text-left ${inputCls}`}
            placeholder="merchant@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-password" className="text-white/80">
            كلمة المرور
          </Label>
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              placeholder="6 أحرف على الأقل"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={`pl-10 ${inputCls}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-gold transition-colors"
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-slug" className="text-white/80">
            رابط متجرك
          </Label>
          <div
            dir="ltr"
            className="flex items-center rounded-xl border border-white/15 bg-white/[0.06] text-sm overflow-hidden transition-all duration-300 focus-within:border-gold/50 focus-within:shadow-[0_0_0_4px_rgba(212,175,55,0.15)]"
          >
            <span className="px-3.5 py-2.5 bg-white/[0.07] text-gold whitespace-nowrap font-semibold">
              ?s=
            </span>
            <Input
              id="reg-slug"
              className="border-0 rounded-none rounded-ee-xl text-left flex-1 focus-visible:ring-0 focus-visible:shadow-none bg-transparent text-white placeholder:text-white/30"
              placeholder="my-store"
              dir="ltr"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              required
            />
          </div>
          <p className="text-[11px] text-white/45">
            حروف إنجليزية صغيرة وأرقام وشرطات — سيكون هذا رابط متجرك للزبائن
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/25 rounded-xl px-3.5 py-2.5 animate-fade-in">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11.5 gap-2 gold-glow-button border-0 rounded-xl text-[15px]"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          إنشاء المتجر مجانًا
        </Button>
      </form>
    </div>
  );
}
