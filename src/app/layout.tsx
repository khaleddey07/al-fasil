import type { Metadata, Viewport } from "next";
import { Alexandria, IBM_Plex_Sans_Arabic, Amiri, Cairo } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

/* Police d'affichage — géométrique moderne pour les titres */
const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  variable: "--font-alexandria",
  display: "swap",
});

/* Police de corps — lisible et élégante */
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

/* Police identité arabo-andalouse — templates Lux traditionnels */
const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

/* Police tech moderne — templates Lux high-tech */
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "سوقي | منصة التجارة الإلكترونية الجزائرية",
  description:
    "منصة تجارة إلكترونية متكاملة للتجار والزبائن في الجزائر: إدارة المتاجر والمنتجات، استقبال الطلبات بسرعة فائقة، متجر إلكتروني خاص بك، دعم الدفع عند الاستلام والتوصيل لكل الولايات.",
  keywords: [
    "تجارة إلكترونية",
    "الجزائر",
    "متجر إلكتروني",
    "بيع online",
    "الدفع عند الاستلام",
    "سوقي",
  ],
  authors: [{ name: "سوقي" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "سوقي | منصة التجارة الإلكترونية الجزائرية",
    description:
      "أنشئ متجرك الإلكتروني في دقائق واستقبل طلبات زبائنك من كل ولايات الجزائر",
    type: "website",
    locale: "ar_DZ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#144d3d" },
    { media: "(prefers-color-scheme: dark)", color: "#10231c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${alexandria.variable} ${plexArabic.variable} ${amiri.variable} ${cairo.variable} antialiased bg-background text-foreground`}
      >
        {/* الوضع الداكن: يحترم تفضيل النظام ويتذكر اختيار المستخدم */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
