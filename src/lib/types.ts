export type Role = 'customer' | 'partner' | 'admin';

export type Category = 'indoor' | 'outdoor' | 'flowering' | 'succulent' | 'medicinal' | 'seeds' | 'pots' | 'tools' | 'soil_manure';
export const CATEGORIES: Category[] = ['indoor', 'outdoor', 'flowering', 'succulent', 'medicinal', 'seeds', 'pots', 'tools', 'soil_manure'];
export const CATEGORY_EMOJI: Record<Category, string> = {
  indoor: '🪴', outdoor: '🌳', flowering: '🌸', succulent: '🌵', medicinal: '🌿', seeds: '🌱', pots: '🏺', tools: '🛠️', soil_manure: '🧺',
};

export type PartnerType = 'at_home' | 'nursery' | 'fertilizer_shop' | 'seed_shop';
export const PARTNER_TYPES: PartnerType[] = ['at_home', 'nursery', 'fertilizer_shop', 'seed_shop'];
export const PARTNER_TYPE_EMOJI: Record<PartnerType, string> = { at_home: '🏡', nursery: '🌳', fertilizer_shop: '🧪', seed_shop: '🌾' };

export type PlantStatus = 'pending' | 'live' | 'rejected';
export type OrderStatus = 'new' | 'accepted' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected' | 'expired';
export type AppStatus = 'draft' | 'submitted' | 'under_review' | 'need_more_info' | 'approved' | 'rejected' | 'withdrawn';

export type DocType =
  | 'aadhaar_masked' | 'pan' | 'residence_certificate' | 'driving_licence' | 'passport' | 'voter_id'
  | 'shop_photo_front' | 'shop_photo_inside' | 'home_garden_photo' | 'selfie' | 'fertilizer_licence' | 'seed_licence' | 'gst_certificate';
export const ID_DOCS: DocType[] = ['aadhaar_masked', 'pan', 'residence_certificate', 'driving_licence', 'passport', 'voter_id'];

export interface User {
  id: string;
  role: Role;
  name: string;
  phone?: string;
  email?: string;
  nurseryId?: string;
  language: string;
}

export interface Nursery {
  id: string;
  uniqueId: string;
  partnerType: PartnerType;
  legalName: string; // sirf admin + owner partner
  brandName: string; // customer ko yahi dikhta hai
  seoAliases: string[];
  ownerPhone: string;
  lat: number;
  lng: number;
  city: string;
  isOpen: boolean;
  tier: 'new' | 'verified' | 'trusted' | 'star';
  probationEndsOn?: string;
  licenceNo?: string;
  licenceExpiry?: string;
  gstin?: string;
  status: 'active' | 'blocked';
  createdAt: number;
}

export interface Plant {
  id: string;
  nurseryId: string;
  sku: string; // alag nurseries ke same paudhe ko jodta hai (reassign ke liye)
  name: Record<string, string>; // {hi, en, ...}
  category: Category;
  price: number;
  stock: number;
  image: string; // emoji ya dataURL/URL
  care: string;
  festivalTags: string[];
  status: PlantStatus;
  rejectReason?: string;
  createdAt: number;
}

/** Customer ko milne wala plant: sirf brand naam, legal naam kabhi nahi */
export interface PublicPlant extends Plant {
  brandName: string;
  nurseryPartnerType: PartnerType;
  tier: Nursery['tier'];
  nurseryLat: number;
  nurseryLng: number;
  distanceKm: number;
}

export interface AdminPlant extends Plant {
  nurseryBrand: string;
  nurseryUid: string;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  ratePerKm: number;
  minCharge: number;
  vehicleTypes: string[];
  active: boolean;
  deepLink?: string;
}

export interface OrderItem {
  plantId: string;
  sku: string;
  name: string;
  price: number;
  qty: number;
  image: string;
}
export interface OrderEvent { status: OrderStatus | 'reassigned'; at: number; note?: string }

export interface Order {
  id: string;
  shortId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  nurseryId: string;
  nurseryBrand: string;
  triedNurseryIds: string[];
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: 'cod' | 'upi';
  status: OrderStatus;
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  address: string;
  pincode: string;
  lat: number;
  lng: number;
  cancelUntil: number;
  acceptBy: number;
  createdAt: number;
  events: OrderEvent[];
  rating?: number;
  review?: string;
}

export interface DocFile {
  type: DocType;
  name: string;
  thumb: string; // compressed dataURL
  takenAt: number;
  gps?: { lat: number; lng: number };
}

export interface Application {
  id: string;
  applicantId: string;
  partnerType: PartnerType;
  shopName: string;
  brandSuggestion: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  pincode: string;
  lat?: number;
  lng?: number;
  language: string;
  upiId: string;
  gstin: string;
  licenceNo: string;
  licenceExpiry: string;
  docs: DocFile[];
  status: AppStatus;
  checklist: Record<string, boolean>;
  reviewNote?: string;
  rejectReason?: string;
  consentAt?: number;
  submittedAt?: number;
  reviewedAt?: number;
  slaDueAt?: number;
  nurseryId?: string;
  createdAt: number;
}

export interface Complaint {
  id: string;
  orderId: string;
  customerId: string;
  reason: string;
  photo?: string;
  status: 'open' | 'resolved';
  resolution?: string;
  createdAt: number;
}

export interface Rule {
  partnerType: PartnerType;
  allowedIdDocs: DocType[];
  requiredDocs: DocType[];
  licenceRequired: boolean;
  gstRequired: boolean;
  allowedCategories: Category[];
  maxLiveProbation: number;
}

export interface Settings {
  acceptSeconds: number;
  cancelSeconds: number;
  probationDays: number;
  payoutHoldDays: number;
  slaHours: number;
  split: { nursery: number; platform: number; pool: number };
}

export interface AuditRow { id: string; at: number; actor: string; action: string; detail: string }

export interface NewPlantInput {
  sku?: string;
  name: Record<string, string>;
  category: Category;
  price: number;
  stock: number;
  image?: string;
  care?: string;
  festivalTags?: string[];
}

export interface PlaceOrderInput {
  lines: { plantId: string; qty: number }[];
  address: string;
  pincode: string;
  lat: number;
  lng: number;
  paymentMethod: 'cod' | 'upi';
  deliveryPartnerId?: string;
}

export interface Earnings { today: number; month: number; pending: number; deliveredCount: number; holdNote?: string }
