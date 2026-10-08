"use client";

import { useEffect, useState } from "react";
import { AuthPage } from "@/components/souq/auth-page";
import { Dashboard } from "@/components/souq/dashboard";
import { Storefront } from "@/components/souq/storefront";
import type { MeDTO } from "@/lib/souq-types";
import { Loader2, Store } from "lucide-react";

type AppState = "loading" | "auth" | "dashboard" | "storefront";

export default function Home() {
  const [state, setState] = useState<AppState>("loading");
  const [me, setMe] = useState<MeDTO | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data: MeDTO = await res.json();
        setMe(data);
        setState("dashboard");
        return;
      }
    } catch {
      // خطأ في الشبكة
    }
    setState("auth");
  }

  useEffect(() => {
    // تسجيل Service Worker لدعم PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("s");

    if (slug) {
      // عرض متجر عام
      setStoreSlug(slug);
      setState("storefront");
      return;
    }

    // التحقق من جلسة التاجر
    void checkAuth();
  }, []);

  function handleAuthSuccess(data: MeDTO) {
    setMe(data);
    setState("dashboard");
  }

  function handleLogout() {
    setMe(null);
    setState("auth");
  }

  if (state === "loading") {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden cosmos-bg">
        <div className="absolute inset-0 pattern-dots opacity-25" />
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gold/15 blur-3xl float-slow" />
        <div className="absolute -bottom-28 -right-20 w-96 h-96 rounded-full bg-white/[0.05] blur-3xl float-slower" />

        <div className="relative flex flex-col items-center gap-6">
          <div className="relative animate-scale-in">
            <span className="absolute inset-0 rounded-3xl border-2 border-gold/60 ring-pulse" />
            <div className="relative w-20 h-20 rounded-3xl luxury-glass-card flex items-center justify-center">
              <Store className="w-10 h-10 text-gold" />
            </div>
          </div>
          <div className="text-center animate-fade-up stagger-3">
            <p className="font-display text-3xl font-bold tracking-tight text-white">
              سوقي<span className="gold-gradient-text"> ✦ </span>لوكس
            </p>
            <p className="mt-1 text-sm text-white/60">
              منصة التجارة الإلكترونية الجزائرية
            </p>
          </div>
          <div className="flex items-center gap-2 text-white/65 animate-fade-in stagger-5">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">جارٍ التحميل...</span>
          </div>
        </div>
      </div>
    );
  }

  if (state === "storefront" && storeSlug) {
    return <Storefront slug={storeSlug} />;
  }

  if (state === "auth") {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }

  return <Dashboard me={me!} onLogout={handleLogout} />;
}
