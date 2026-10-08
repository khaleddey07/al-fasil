// الأنواع المشتركة بين الواجهة والخلفية

export type OrderStatus = "NEW" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "جديد",
  PROCESSING: "قيد المعالجة",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغى",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  NEW: "bg-amber-100 text-amber-800 border-amber-200",
  PROCESSING: "bg-sky-100 text-sky-800 border-sky-200",
  SHIPPED: "bg-violet-100 text-violet-800 border-violet-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-800 border-rose-200",
};

export interface ProductOption {
  name: string;
  choices: string[];
}

export interface ProductDTO {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  options: ProductOption[];
  isActive: boolean;
  stock: number | null;
  videoUrl: string | null;
  videoStatus: string;
  videoScript: string | null;
  createdAt: string;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  selectedOption: string | null;
  customerName: string;
  customerPhone: string;
  wilayaCode: number;
  wilayaName: string;
  commune: string | null;
  address: string | null;
  deliveryType: "home" | "desk";
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  notes: string | null;
  riskLevel: "LOW" | "HIGH" | null;
  confirmedAt: string | null;
  affiliateCode: string | null;
  commission: number;
  source: string; // STOREFRONT | FACEBOOK_LEAD_AD
  createdAt: string;
}

export interface StorePublicDTO {
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  phone: string | null;
  luxTheme: string;
  urgencyEnabled: boolean;
  urgencyMinutes: number;
  urgencyStock: number;
  whatsappEnabled: boolean;
}

export interface DeliveryFeeEntry {
  home: number;
  desk: number;
}

export interface StatsDTO {
  totalRevenue: number; // إجمالي مبيعات الطلبيات المسلمة
  pipelineRevenue: number; // قيمة الطلبيات الجارية
  ordersCount: number;
  ordersByStatus: Record<OrderStatus, number>;
  productsCount: number;
  activeProductsCount: number;
  topProducts: { name: string; count: number; revenue: number }[];
  weeklySales: { day: string; total: number; count: number }[];
  recentOrders: OrderDTO[];
  ordersByWilaya: { code: number; count: number; total: number; newCount: number }[];
}

export interface MeDTO {
  user: { id: string; name: string; email: string };
  store: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    description: string | null;
    phone: string | null;
    hasTelegram: boolean;
    hasWhatsApp: boolean;
    hasReplicate: boolean;
    luxTheme: string;
    urgencyEnabled: boolean;
    urgencyMinutes: number;
    urgencyStock: number;
    whatsappEnabled: boolean;
    defaultHomeFee: number;
    defaultDeskFee: number;
    deliveryFees: Record<string, DeliveryFeeEntry>;
  };
}

export interface AffiliateDTO {
  id: string;
  name: string;
  phone: string | null;
  code: string;
  commission: number;
  totalEarned: number;
  ordersCount: number;
  createdAt: string;
}

// ————— Social Sync (النشر التلقائي على الشبكات) —————

export type SocialNetworkId =
  | "FACEBOOK_PAGE"
  | "INSTAGRAM"
  | "TIKTOK"
  | "TELEGRAM_CHANNEL"
  | "WHATSAPP";

export interface SocialAccountDTO {
  id: string;
  network: SocialNetworkId;
  displayName: string | null;
  externalId: string | null;
  connectedAt: string;
}

export interface PublishResultDTO {
  network: SocialNetworkId;
  success: boolean;
  message: string;
}

export interface SocialPostDTO {
  id: string;
  productId: string | null;
  network: string;
  status: string;
  error: string | null;
  createdAt: string;
}

export function formatDZD(amount: number): string {
  return `${new Intl.NumberFormat("fr-DZ").format(Math.round(amount))} دج`;
}

export function formatDateAr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
