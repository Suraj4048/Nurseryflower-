export type Role = 'customer' | 'partner' | 'admin';

/** Category ab dynamic hai (Office > Categories se badal sakte ho). Ye default list hai. */
export type Category = string;
export const CATEGORIES: Category[] = ['indoor', 'outdoor', 'flowering', 'succulent', 'medicinal', 'seeds', 'pots', 'tools', 'soil_manure', 'flowers', 'bouquet', 'mala'];
export const CATEGORY_EMOJI: Record<string, string> = {
  indoor: '🪴', outdoor: '🌳', flowering: '🌸', succulent: '🌵', medicinal: '🌿', seeds: '🌱', pots: '🏺', tools: '🛠️', soil_manure: '🧺', flowers: '💐', bouquet: '🌹', mala: '📿',
};

export type PartnerType = 'at_home' | 'nursery' | 'fertilizer_shop' | 'seed_shop' | 'decorator' | 'gardener' | 'flower_shop' | 'flower_vendor';
export const PARTNER_TYPES: PartnerType[] = ['at_home', 'nursery', 'fertilizer_shop', 'seed_shop', 'flower_shop', 'flower_vendor', 'gardener', 'decorator'];
export const PARTNER_TYPE_EMOJI: Record<PartnerType, string> = { at_home: '🏡', nursery: '🌳', fertilizer_shop: '🧪', seed_shop: '🌾', decorator: '🎊', gardener: '🧑‍🌾', flower_shop: '💐', flower_vendor: '🌸' };
/** Service-provider partners (booking se kaam milta hai, products nahi bechte) */
export const SERVICE_PARTNER_TYPES: PartnerType[] = ['decorator', 'gardener'];
export const isServiceType = (t: PartnerType) => SERVICE_PARTNER_TYPES.includes(t);

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
  // Service provider (gardener/decorator) profile. Admin sab badal sakta hai.
  startingPrice?: number;
  serviceRadiusKm?: number;
  bio?: string;
  blockedDates?: string[]; // YYYY-MM-DD
  priority?: number; // owner ki domain priority: zyada = pehle
}

export interface Plant {
  id: string;
  nurseryId: string;
  sku: string; // alag nurseries ke same paudhe ko jodta hai (reassign ke liye)
  name: Record<string, string>; // {hi, en, ...}
  category: Category; // primary (purani field, categories[0])
  categories: Category[]; // product kai categories me ho sakta hai
  ribbon?: string; // 'Hot Deals', 'New' (optional)
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
  confirmHours: number; // booking ke baad owner ko itne ghante me call/confirm karna hai
  refund72: number; // customer cancel: 72+ ghante pehle, token ka % wapas
  refund24: number; // 24-72 ghante
  refundLow: number; // 24 ghante se kam
  split: { nursery: number; platform: number; pool: number };
}

export interface AuditRow { id: string; at: number; actor: string; action: string; detail: string }

export interface NewPlantInput {
  sku?: string;
  name: Record<string, string>;
  category: Category;
  categories?: Category[];
  ribbon?: string;
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

export interface CategoryDef { key: string; name: Record<string, string>; emoji: string; active: boolean; order: number }

// ---------- CMS: slideshow / actions ----------
export type ActionType = 'call' | 'whatsapp' | 'link' | 'category' | 'product' | 'search' | 'form' | 'service';
export interface Action { type: ActionType; value: string }
export interface SlideButton extends Action { label: Record<string, string> }
export interface Slide {
  id: string;
  image: string; // dataURL/URL (khali ho to bg + emoji dikhta hai)
  bg: string; // "#16a34a,#4ade80" gradient
  emoji: string;
  ribbon: string;
  title: Record<string, string>;
  subtitle: Record<string, string>;
  buttons: SlideButton[];
  action?: Action; // poore slide par click
}
export interface Slideshow {
  id: string;
  name: string;
  placement: 'top' | 'mid';
  enabled: boolean;
  intervalSec: number;
  border: boolean;
  transition: 'slide' | 'fade';
  height: 'sm' | 'md' | 'lg';
  slides: Slide[];
}

// ---------- Form Builder + Leads (Part 2) ----------
export type FieldType = 'text' | 'number' | 'phone' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'time' | 'photo';
export const FIELD_TYPES: FieldType[] = ['text', 'number', 'phone', 'textarea', 'select', 'radio', 'checkbox', 'date', 'time', 'photo'];
export interface FormField {
  id: string;
  type: FieldType;
  label: Record<string, string>;
  required: boolean;
  options?: Record<string, string>[]; // select / radio / checkbox ke vikalp ({en, hi})
}
/** Home page par form ka button kahan dikhe */
export type FormPlacement = 'below_search' | 'below_categories' | 'mid' | 'bottom';
export const FORM_PLACEMENTS: FormPlacement[] = ['below_search', 'below_categories', 'mid', 'bottom'];
export interface CustomForm {
  id: string;
  name: string; // sirf admin ko
  enabled: boolean;
  placement: FormPlacement;
  emoji: string;
  buttonText: Record<string, string>;
  buttonSub: Record<string, string>;
  title: Record<string, string>;
  description: Record<string, string>;
  successText: Record<string, string>;
  fields: FormField[];
}
export type LeadStatus = 'new' | 'called' | 'confirmed' | 'done' | 'rejected';
export const LEAD_STATUSES: LeadStatus[] = ['new', 'called', 'confirmed', 'done', 'rejected'];
export interface LeadAnswer { id: string; label: string; type: FieldType; value: string }
export interface Lead {
  id: string;
  formId: string;
  formName: string;
  name: string;
  phone: string;
  answers: LeadAnswer[];
  status: LeadStatus;
  note: string;
  createdAt: number;
  updatedAt: number;
}
export interface SubmitLeadInput { formId: string; name: string; phone: string; answers: { id: string; value: string }[] }

// ---------- Part 3: services + bookings ----------
export type ServiceKind = 'gardener' | 'decor' | 'bulk';
export interface ServiceDef {
  key: string; // 'gardener' | 'decor' | 'bulk'
  kind: ServiceKind;
  name: Record<string, string>;
  sub: Record<string, string>;
  emoji: string;
  startingPrice: number;
  tokenPercent: number;
  minNoticeHours: number;
  dailyCapacity: number;
  commissionPercent: number;
  needsTime: boolean;
  enabled: boolean;
  order: number;
}
/** Kaun se partner type kis service ke liye eligible hain */
export const SERVICE_PROVIDER_TYPES: Record<ServiceKind, PartnerType[]> = {
  gardener: ['gardener'],
  decor: ['decorator'],
  bulk: ['nursery', 'at_home', 'flower_shop', 'flower_vendor', 'seed_shop', 'fertilizer_shop'],
};
export type BookingStatus = 'new' | 'called' | 'confirmed' | 'token_paid' | 'done' | 'cancelled';
export const BOOKING_PIPELINE: BookingStatus[] = ['new', 'called', 'confirmed', 'token_paid', 'done'];
export type ProviderState = 'assigned' | 'accepted' | 'declined';
export interface BookingEvent { at: number; text: string }
export interface Booking {
  id: string;
  shortId: string;
  serviceKey: string;
  serviceName: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  venue: string;
  pincode: string;
  lat?: number;
  lng?: number;
  remarks: string;
  photo?: string;
  status: BookingStatus;
  createdAt: number;
  updatedAt: number;
  ownerDueAt: number; // owner ko iske pehle call karna hai
  calledAt?: number;
  agreedAmount: number;
  tokenPercent: number;
  tokenAmount: number;
  tokenClaimedAt?: number; // customer ne "token de diya" dabaya
  tokenPaidAt?: number; // admin ne token mil gaya mark kiya
  handler: 'owner' | 'provider';
  providerId?: string;
  providerBrand?: string;
  providerState?: ProviderState;
  commissionPercent: number;
  refundAmount?: number;
  cancelledBy?: 'customer' | 'owner' | 'provider';
  cancelReason?: string;
  note: string;
  events: BookingEvent[];
}
/** Customer ko dikhne wala booking. Provider ka naam/number sirf confirm hone ke baad. */
export interface MyBooking extends Omit<Booking, 'customerId' | 'note' | 'providerId' | 'providerState' | 'commissionPercent' | 'lat' | 'lng' | 'events' | 'providerBrand'> {
  provider?: { brand: string; phone: string };
  supportPhone?: string;
}
/** Partner ko dikhne wala kaam: customer ka naam/number kabhi nahi. */
export interface ProviderJob {
  id: string;
  shortId: string;
  serviceKey: string;
  serviceName: string;
  date: string;
  time: string;
  venue: string;
  pincode: string;
  remarks: string;
  photo?: string;
  status: BookingStatus;
  providerState: ProviderState;
  tokenPaid: boolean;
  amount: number; // partner ka hissa (commission ke baad)
  createdAt: number;
}
export interface ProviderOption {
  id: string;
  brand: string;
  partnerType: PartnerType;
  distanceKm: number;
  priority: number;
  isOpen: boolean;
  busy: boolean; // us din kisi aur token-paid booking me laga hai ya blocked date
  startingPrice?: number;
  radiusKm?: number;
}
export interface Availability { ok: boolean; reason?: 'notice' | 'full' | 'past'; left: number; minDate: string }
export interface SubmitBookingInput {
  serviceKey: string; name: string; phone: string; date: string; time: string; venue: string; pincode: string; remarks: string; photo?: string; lat?: number; lng?: number;
}
