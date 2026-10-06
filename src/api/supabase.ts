// ============================================================
// REAL BACKEND: Supabase adapter. Sirf VITE_MODE=supabase par use hota hai.
// UI isi Api interface se baat karta hai (types.ts), isliye demo -> real me screens nahi badalte.
// Zaruri .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY. Setup: README_DEPLOY.md
// Login: customer = OTP (integrations/otp.ts), partner = phone+PIN (neeche), admin = email+password.
// ============================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { APP, config } from '../config';
import type { Api } from './types';
import type {
  AdminPlant, Application, AuditRow, Booking, MyBooking, ProviderJob, ProviderOption, ServiceDef, Availability, CategoryDef, CustomForm, Lead, LeadStatus, Slideshow, Complaint, DeliveryPartner, DocFile, DocType, Earnings, NewPlantInput, Nursery, Order, PlaceOrderInput,
  Plant, PublicPlant, Rule, Settings, User,
} from '../lib/types';
import { roadKm } from '../lib/geo';
import { digits } from '../lib/format';
import { dataUrlToBlob } from '../lib/image';
import { sendOtp, verifyOtp } from '../integrations/otp';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const PARTNER_DOMAIN = 'partners.nurseryflower.com';
const ms = (s?: string | null) => (s ? Date.parse(s) : 0);
const msOpt = (s?: string | null) => (s ? Date.parse(s) : undefined);

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (client) return client;
  if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY set nahi hain (.env ya hosting ke Environment Variables)');
  client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    // teen apps ek hi domain par hain, isliye har app ka alag login-storage
    auth: { storageKey: 'nl_sb_' + APP, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  startBackground(client);
  return client;
}

function ok<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------- mappers ----------
const toNursery = (r: Row): Nursery => ({
  id: r.id, uniqueId: r.unique_id, partnerType: r.partner_type, legalName: r.legal_name, brandName: r.brand_name, seoAliases: r.seo_aliases ?? [], ownerPhone: r.owner_phone ?? '',
  lat: r.lat, lng: r.lng, city: r.city, isOpen: r.is_open, tier: r.tier, probationEndsOn: r.probation_ends_on ?? undefined, licenceNo: r.licence_no ?? undefined,
  licenceExpiry: r.licence_expiry ?? undefined, gstin: r.gstin ?? undefined, status: r.status, createdAt: ms(r.created_at),
  startingPrice: r.starting_price != null ? Number(r.starting_price) : undefined, serviceRadiusKm: r.service_radius_km != null ? Number(r.service_radius_km) : undefined,
  bio: r.bio ?? '', blockedDates: r.blocked_dates ?? [], priority: r.priority ?? 0,
});
const toPlant = (r: Row): Plant => ({
  id: r.id, nurseryId: r.nursery_id, sku: r.sku, name: r.name, category: r.category, categories: r.categories?.length ? r.categories : [r.category], ribbon: r.ribbon ?? undefined, price: Number(r.price), stock: r.stock, image: r.image ?? '', care: r.care ?? '',
  festivalTags: r.festival_tags ?? [], status: r.status, rejectReason: r.reject_reason ?? undefined, createdAt: ms(r.created_at),
});
const toCat = (r: Row): CategoryDef => ({ key: r.key, name: r.name ?? {}, emoji: r.emoji ?? '🌱', active: r.active, order: r.sort_order ?? 0 });
const toOrder = (r: Row): Order => ({
  id: r.id, shortId: r.short_id, customerId: r.customer_id, customerName: r.customer_name ?? '', customerPhone: r.customer_phone ?? '', nurseryId: r.nursery_id,
  nurseryBrand: r.nursery_brand, triedNurseryIds: r.tried_nursery_ids ?? [], items: r.items ?? [], subtotal: Number(r.subtotal), deliveryFee: Number(r.delivery_fee),
  total: Number(r.total), paymentMethod: r.payment_method, status: r.status, deliveryPartnerId: r.delivery_partner_id ?? undefined, deliveryPartnerName: r.delivery_partner_name ?? undefined,
  address: r.address ?? '', pincode: r.pincode ?? '', lat: r.lat, lng: r.lng, cancelUntil: ms(r.cancel_until), acceptBy: ms(r.accept_by), createdAt: ms(r.created_at),
  events: r.events ?? [], rating: r.rating ?? undefined, review: r.review ?? undefined,
});
const toDP = (r: Row): DeliveryPartner => ({
  id: r.id, name: r.name, ratePerKm: Number(r.rate_per_km), minCharge: Number(r.min_charge), vehicleTypes: r.vehicle_types ?? [], active: r.active, deepLink: r.deep_link ?? undefined,
});
const toRule = (r: Row): Rule => ({
  partnerType: r.partner_type, allowedIdDocs: r.allowed_id_docs, requiredDocs: r.required_docs, licenceRequired: r.licence_required, gstRequired: r.gst_required,
  allowedCategories: r.allowed_categories, maxLiveProbation: r.max_live_probation,
});
const toService = (r: Row): ServiceDef => ({
  key: r.key, kind: r.kind, name: r.name ?? {}, sub: r.sub ?? {}, emoji: r.emoji ?? '🧰', startingPrice: Number(r.starting_price), tokenPercent: r.token_percent, minNoticeHours: r.min_notice_hours,
  dailyCapacity: r.daily_capacity, commissionPercent: r.commission_percent, needsTime: r.needs_time, enabled: r.enabled, order: r.sort_order ?? 0,
});
const toBooking = (r: Row): Booking => ({
  id: r.id, shortId: r.short_id, serviceKey: r.service_key, serviceName: r.service_name ?? '', customerId: r.customer_id ?? undefined, customerName: r.customer_name, customerPhone: r.customer_phone,
  date: r.date, time: r.time ?? '', venue: r.venue, pincode: r.pincode ?? '', lat: r.lat ?? undefined, lng: r.lng ?? undefined, remarks: r.remarks ?? '', photo: r.photo ?? undefined,
  status: r.status, createdAt: ms(r.created_at), updatedAt: ms(r.updated_at), ownerDueAt: ms(r.owner_due_at), calledAt: msOpt(r.called_at), agreedAmount: Number(r.agreed_amount),
  tokenPercent: r.token_percent, tokenAmount: Number(r.token_amount), tokenClaimedAt: msOpt(r.token_claimed_at), tokenPaidAt: msOpt(r.token_paid_at), handler: r.handler,
  providerId: r.provider_id ?? undefined, providerBrand: r.provider_brand ?? undefined, providerState: r.provider_state ?? undefined, commissionPercent: r.commission_percent,
  refundAmount: r.refund_amount != null ? Number(r.refund_amount) : undefined, cancelledBy: r.cancelled_by ?? undefined, cancelReason: r.cancel_reason ?? undefined, note: r.note ?? '', events: r.events ?? [],
});
const toMyBooking = (r: Row): MyBooking => ({
  id: r.id, shortId: r.short_id, serviceKey: r.service_key, serviceName: r.service_name ?? '', customerName: r.customer_name, customerPhone: r.customer_phone, date: r.date, time: r.time ?? '',
  venue: r.venue, pincode: r.pincode ?? '', remarks: r.remarks ?? '', photo: r.photo ?? undefined, status: r.status, createdAt: ms(r.created_at), updatedAt: ms(r.updated_at),
  ownerDueAt: ms(r.owner_due_at), calledAt: msOpt(r.called_at), agreedAmount: Number(r.agreed_amount), tokenPercent: r.token_percent, tokenAmount: Number(r.token_amount),
  tokenClaimedAt: msOpt(r.token_claimed_at), tokenPaidAt: msOpt(r.token_paid_at), handler: r.handler, refundAmount: r.refund_amount != null ? Number(r.refund_amount) : undefined,
  cancelledBy: r.cancelled_by ?? undefined, cancelReason: r.cancel_reason ?? undefined,
  provider: r.provider_brand ? { brand: r.provider_brand, phone: r.provider_phone ?? '' } : undefined, supportPhone: config.supportWhatsApp,
});
const toJob = (r: Row): ProviderJob => ({
  id: r.id, shortId: r.short_id, serviceKey: r.service_key, serviceName: r.service_name ?? '', date: r.date, time: r.time ?? '', venue: r.venue, pincode: r.pincode ?? '', remarks: r.remarks ?? '',
  photo: r.photo ?? undefined, status: r.status, providerState: r.provider_state, tokenPaid: !!r.token_paid, amount: Number(r.amount ?? 0), createdAt: ms(r.created_at),
});
const toSettings = (r: Row): Settings => ({
  acceptSeconds: r.accept_seconds, cancelSeconds: r.cancel_seconds, probationDays: r.probation_days, payoutHoldDays: r.payout_hold_days, slaHours: r.sla_hours, confirmHours: r.confirm_hours ?? 24, refund72: r.refund_72 ?? 80, refund24: r.refund_24 ?? 50, refundLow: r.refund_low ?? 0, split: r.split,
});
const toComplaint = (r: Row): Complaint => ({
  id: r.id, orderId: r.order_id, customerId: r.customer_id, reason: r.reason, photo: r.photo ?? undefined, status: r.status, resolution: r.resolution ?? undefined, createdAt: ms(r.created_at),
});
const toApp = (r: Row, thumbs: Record<string, string> = {}): Application => ({
  id: r.id, applicantId: r.applicant_id, partnerType: r.partner_type, shopName: r.shop_name, brandSuggestion: r.brand_suggestion, ownerName: r.owner_name, phone: r.phone,
  whatsapp: r.whatsapp, address: r.address, city: r.city, pincode: r.pincode, lat: r.lat ?? undefined, lng: r.lng ?? undefined, language: r.language, upiId: r.upi_id, gstin: r.gstin,
  licenceNo: r.licence_no, licenceExpiry: r.licence_expiry,
  docs: ((r.docs ?? []) as Row[]).map((d): DocFile => ({ type: d.type as DocType, name: d.name ?? '', thumb: thumbs[d.path] ?? '', takenAt: d.takenAt ?? 0, gps: d.gps })),
  status: r.status, checklist: r.checklist ?? {}, reviewNote: r.review_note ?? undefined, rejectReason: r.reject_reason ?? undefined, consentAt: msOpt(r.consent_at),
  submittedAt: msOpt(r.submitted_at), reviewedAt: msOpt(r.reviewed_at), slaDueAt: msOpt(r.sla_due_at), nurseryId: r.nursery_id ?? undefined, createdAt: ms(r.created_at),
});

// ---------- session helpers ----------
async function myId(): Promise<string> {
  const { data } = await sb().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Pehle login karo');
  return id;
}
async function profile(): Promise<User | null> {
  const { data } = await sb().auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return null;
  const r = ok(await sb().from('profiles').select('*').eq('id', uid).maybeSingle());
  if (!r) return null;
  const x = r as Row;
  return { id: x.id, role: x.role, name: x.name, phone: x.phone ?? undefined, email: x.email?.endsWith('@' + PARTNER_DOMAIN) ? undefined : x.email ?? undefined, nurseryId: x.nursery_id ?? undefined, language: x.language };
}
async function myNurseryId(): Promise<string> {
  const u = await profile();
  if (!u?.nurseryId) throw new Error('Aapki nursery abhi approve nahi hui');
  return u.nurseryId;
}
const partnerEmail = (phone: string) => digits(phone).slice(-10) + '@' + PARTNER_DOMAIN;
const partnerPassword = (pin: string) => 'nl-' + pin;

// ---------- storage ----------
async function uploadDataUrl(bucket: string, path: string, dataUrl: string): Promise<void> {
  const res = await sb().storage.from(bucket).upload(path, dataUrlToBlob(dataUrl), { upsert: true, contentType: 'image/jpeg' });
  if (res.error) throw new Error(res.error.message);
}
async function plantImage(image: string | undefined): Promise<string> {
  if (!image || !image.startsWith('data:')) return image ?? '';
  const uid = await myId();
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  await uploadDataUrl('plant-images', path, image);
  return sb().storage.from('plant-images').getPublicUrl(path).data.publicUrl;
}
async function signedThumbs(docs: Row[]): Promise<Record<string, string>> {
  const paths = docs.map((d) => d.path as string).filter(Boolean);
  if (!paths.length) return {};
  const res = await sb().storage.from('partner-docs').createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  (res.data ?? []).forEach((x) => { if (x.path && x.signedUrl) out[x.path] = x.signedUrl; });
  return out;
}
const skuOf = (n: Record<string, string>) => (n.en || n.hi || Object.values(n)[0] || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- realtime + background ----------
const listeners = new Set<() => void>();
let channel: ReturnType<SupabaseClient['channel']> | null = null;
const fire = () => listeners.forEach((f) => f());
function startBackground(c: SupabaseClient) {
  c.auth.onAuthStateChange(() => fire());
  // pg_cron na ho tab bhi 5-min accept timer chale: app khula ho to har 30 sec server ko jagao
  setInterval(() => { if (!document.hidden) void c.rpc('tick_orders').then(() => undefined, () => undefined); }, 30000);
  // partner ko order ka alert turant chahiye: view par realtime nahi chalta, isliye 5 sec polling
  if (APP === 'partner') setInterval(() => { if (!document.hidden) fire(); }, 5000);
}
function ensureChannel() {
  if (channel) return;
  let ch = sb().channel('nl-changes');
  for (const table of ['orders', 'plants', 'nurseries', 'applications', 'complaints', 'profiles', 'bookings', 'services']) ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => fire());
  channel = ch.subscribe();
}

export const supabaseApi: Api = {
  mode: 'supabase',
  subscribe(cb) {
    listeners.add(cb);
    try { ensureChannel(); } catch { /* env missing: UI error dikhayega */ }
    return () => { listeners.delete(cb); };
  },

  // ---- session ----
  currentUser: () => profile(),
  async customerSendCode(identifier) { await sendOtp(sb(), identifier); return {}; },
  async customerVerifyCode(identifier, code, name) {
    await verifyOtp(sb(), identifier, code);
    if (name) await sb().rpc('set_my_name', { p_name: name });
    const u = await profile();
    if (!u) throw new Error('Login nahi ho paya');
    return name ? { ...u, name } : u;
  },
  async partnerLogin(phone, pin) {
    const res = await sb().auth.signInWithPassword({ email: partnerEmail(phone), password: partnerPassword(pin) });
    if (res.error) throw new Error('Phone ya PIN galat hai');
    const u = await profile();
    if (!u) throw new Error('Login nahi ho paya');
    return u;
  },
  async partnerRegister(phone, pin, name) {
    const p = digits(phone).slice(-10);
    if (!/^[6-9]\d{9}$/.test(p)) throw new Error('Sahi 10-digit mobile number daalo');
    if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN 4 se 6 ank ka hona chahiye');
    const res = await sb().auth.signUp({ email: partnerEmail(p), password: partnerPassword(pin), options: { data: { name: name || 'Partner', phone: p } } });
    if (res.error) throw new Error(res.error.message.includes('registered') ? 'Ye number pehle se registered hai, login karo' : res.error.message);
    if (!res.data.session) throw new Error('Supabase me Authentication > Providers > Email > "Confirm email" band (OFF) karo, phir dobara try karo.');
    const u = await profile();
    if (!u) throw new Error('Account nahi bana');
    return u;
  },
  async adminLogin(email, password) {
    const res = await sb().auth.signInWithPassword({ email: email.trim(), password });
    if (res.error) throw new Error(res.error.message);
    const u = await profile();
    if (!u || u.role !== 'admin') { await sb().auth.signOut(); throw new Error('Ye account admin nahi hai (supabase/make_admin.sql chalao)'); }
    return u;
  },
  async logout() { await sb().auth.signOut(); },
  async setLanguage(lang) { try { ok(await sb().rpc('set_my_language', { p_lang: lang })); } catch { /* login na ho to chalega */ } },

  // ---- public catalog ----
  async listPublicPlants(loc) {
    const rows = ok(await sb().from('public_plants').select('*')) as Row[];
    return rows.map((r): PublicPlant => ({
      ...toPlant(r), brandName: r.brand_name, nurseryPartnerType: r.nursery_partner_type, tier: r.tier, nurseryLat: r.nursery_lat, nurseryLng: r.nursery_lng,
      distanceKm: Math.round(roadKm(r.nursery_lat, r.nursery_lng, loc.lat, loc.lng) * 10) / 10,
    }));
  },
  async listDeliveryPartners() { return ((ok(await sb().from('delivery_partners').select('*').eq('active', true)) as Row[]) ?? []).map(toDP); },
  async getSettings() { return toSettings(ok(await sb().from('settings').select('*').eq('id', 1).single()) as Row); },

  // ---- services & bookings ----
  async listServices() { return ((ok(await sb().from('services').select('*').eq('enabled', true).order('sort_order')) as Row[]) ?? []).map(toService); },
  async checkAvailability(serviceKey, date, time) {
    const r = ok(await sb().rpc('booking_availability', { p_service: serviceKey, p_date: date, p_time: time ?? '' })) as Row;
    return { ok: !!r.ok, reason: r.reason, left: r.left ?? 0, minDate: r.minDate } as Availability;
  },
  async submitBooking(i) {
    const sid = ok(await sb().rpc('submit_booking', {
      p_service: i.serviceKey, p_name: i.name, p_phone: i.phone, p_date: i.date, p_time: i.time, p_venue: i.venue, p_pincode: i.pincode ?? '', p_remarks: i.remarks ?? '',
      p_photo: i.photo ?? null, p_lat: i.lat ?? null, p_lng: i.lng ?? null,
    })) as string;
    return { shortId: sid };
  },
  async myBookings() { return ((ok(await sb().rpc('my_bookings')) as Row[]) ?? []).map(toMyBooking); },
  async cancelMyBooking(id) { return { refund: Number(ok(await sb().rpc('cancel_my_booking', { p_id: id }))) }; },
  async claimTokenPaid(id) { ok(await sb().rpc('claim_token_paid', { p_id: id })); },

  // ---- partner: jobs & profile ----
  async myJobs() { return ((ok(await sb().from('partner_jobs').select('*').order('date')) as Row[]) ?? []).map(toJob); },
  async respondJob(id, action) { ok(await sb().rpc('respond_job', { p_id: id, p_action: action })); },
  async updateMyProfile(patch) { ok(await sb().rpc('update_my_profile', { p_patch: patch })); },

  // ---- admin: services & bookings ----
  async adminServices() { return ((ok(await sb().from('services').select('*').order('sort_order')) as Row[]) ?? []).map(toService); },
  async adminSaveService(sv) {
    ok(await sb().from('services').update({
      name: sv.name, sub: sv.sub, emoji: sv.emoji, starting_price: sv.startingPrice, token_percent: sv.tokenPercent, min_notice_hours: sv.minNoticeHours, daily_capacity: sv.dailyCapacity,
      commission_percent: sv.commissionPercent, needs_time: sv.needsTime, enabled: sv.enabled, sort_order: sv.order,
    }).eq('key', sv.key));
  },
  async adminBookings() { return ((ok(await sb().from('bookings').select('*').order('created_at', { ascending: false }).limit(500)) as Row[]) ?? []).map(toBooking); },
  async adminUpdateBooking(id, patch) { ok(await sb().rpc('admin_update_booking', { p_id: id, p_patch: patch })); },
  async adminBookingCalled(id) { ok(await sb().rpc('admin_booking_called', { p_id: id })); },
  async adminBookingConfirm(id, amount) { ok(await sb().rpc('admin_booking_confirm', { p_id: id, p_amount: amount })); },
  async adminBookingTokenPaid(id) { ok(await sb().rpc('admin_booking_token_paid', { p_id: id })); },
  async adminBookingAssign(id, providerId) { ok(await sb().rpc('admin_booking_assign', { p_id: id, p_provider: providerId })); },
  async adminBookingDone(id) { ok(await sb().rpc('admin_booking_done', { p_id: id })); },
  async adminBookingCancel(id, by, reason) { return { refund: Number(ok(await sb().rpc('admin_booking_cancel', { p_id: id, p_by: by, p_reason: reason }))) }; },
  async adminProvidersFor(bookingId) { return (ok(await sb().rpc('admin_providers_for', { p_booking: bookingId })) as ProviderOption[]) ?? []; },

  // ---- customer ----
  async placeOrders(input: PlaceOrderInput) {
    const rows = ok(await sb().rpc('place_orders', {
      p_lines: input.lines.map((l) => ({ plantId: l.plantId, qty: l.qty })), p_address: input.address, p_pincode: input.pincode, p_lat: input.lat, p_lng: input.lng,
      p_payment: input.paymentMethod, p_dp: input.deliveryPartnerId ?? null,
    })) as Row[];
    return (rows ?? []).map(toOrder);
  },
  async myOrders() { return ((ok(await sb().from('orders').select('*').order('created_at', { ascending: false })) as Row[]) ?? []).map(toOrder); },
  async cancelMyOrder(id) { ok(await sb().rpc('customer_cancel_order', { p_id: id })); },
  async reviewOrder(id, rating, comment) { ok(await sb().rpc('review_order', { p_id: id, p_rating: rating, p_comment: comment })); },
  async raiseComplaint(orderId, reason, photo) { ok(await sb().rpc('raise_complaint', { p_order: orderId, p_reason: reason, p_photo: photo ?? null })); },

  // ---- partner ----
  async myNursery() {
    const u = await profile();
    if (!u?.nurseryId) return null;
    return toNursery(ok(await sb().from('nurseries').select('*').eq('id', u.nurseryId).single()) as Row);
  },
  async myRule() {
    const n = await supabaseApi.myNursery();
    if (!n) return null;
    const r = ok(await sb().from('rules').select('*').eq('partner_type', n.partnerType).maybeSingle());
    return r ? toRule(r as Row) : null;
  },
  async setShopOpen(open) { ok(await sb().rpc('set_shop_open', { p_open: open })); },
  async nurseryOrders() { return ((ok(await sb().from('partner_orders').select('*').order('created_at', { ascending: false }).limit(100)) as Row[]) ?? []).map(toOrder); },
  async respondOrder(id, action) { ok(await sb().rpc('partner_respond_order', { p_id: id, p_action: action })); },
  async myPlants() { return ((ok(await sb().from('plants').select('*').order('created_at', { ascending: false })) as Row[]) ?? []).map(toPlant); },
  async addMyPlant(input: NewPlantInput) {
    const nid = await myNurseryId();
    if (!(input.price > 0)) throw new Error('Sahi price daalo');
    const image = await plantImage(input.image);
    ok(await sb().from('plants').insert({
      nursery_id: nid, sku: input.sku || skuOf(input.name), name: input.name, category: (input.categories?.[0] ?? input.category), categories: input.categories?.length ? input.categories : [input.category], ribbon: input.ribbon || null, price: input.price, stock: input.stock, image, care: input.care ?? '',
      festival_tags: input.festivalTags ?? [], status: 'pending',
    }));
  },
  async setStock(plantId, stock) { ok(await sb().rpc('set_stock', { p_plant: plantId, p_stock: stock })); },
  async earnings(): Promise<Earnings> { return ok(await sb().rpc('partner_earnings')) as Earnings; },

  // ---- partner application ----
  async listRules() { return ((ok(await sb().from('rules').select('*')) as Row[]) ?? []).map(toRule); },
  async myApplication() {
    const uid = await myId();
    const r = ok(await sb().from('applications').select('*').eq('applicant_id', uid).neq('status', 'withdrawn').order('created_at', { ascending: false }).limit(1).maybeSingle()) as Row | null;
    if (!r) return null;
    return toApp(r, await signedThumbs(r.docs ?? []));
  },
  async saveApplication(patch) {
    const uid = await myId();
    const cur = ok(await sb().from('applications').select('*').eq('applicant_id', uid).in('status', ['draft', 'need_more_info']).order('created_at', { ascending: false }).limit(1).maybeSingle()) as Row | null;
    const oldDocs = (cur?.docs ?? []) as Row[];
    let docs: Row[] | undefined;
    if (patch.docs) {
      docs = [];
      for (const d of patch.docs) {
        let path = oldDocs.find((o) => o.type === d.type)?.path as string | undefined;
        if (d.thumb.startsWith('data:')) { path = `${uid}/${d.type}-${Date.now()}.jpg`; await uploadDataUrl('partner-docs', path, d.thumb); }
        if (path) docs.push({ type: d.type, name: d.name, path, takenAt: d.takenAt, gps: d.gps ?? null });
      }
    }
    const fields: Row = {
      partner_type: patch.partnerType, shop_name: patch.shopName, brand_suggestion: patch.brandSuggestion, owner_name: patch.ownerName, phone: patch.phone, whatsapp: patch.whatsapp,
      address: patch.address, city: patch.city, pincode: patch.pincode, lat: patch.lat, lng: patch.lng, language: patch.language, upi_id: patch.upiId, gstin: patch.gstin,
      licence_no: patch.licenceNo, licence_expiry: patch.licenceExpiry, consent_at: patch.consentAt ? new Date(patch.consentAt).toISOString() : undefined, docs,
    };
    Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);
    const row = cur
      ? ok(await sb().from('applications').update(fields).eq('id', cur.id).select('*').single())
      : ok(await sb().from('applications').insert({ ...fields, applicant_id: uid, status: 'draft' }).select('*').single());
    const r = row as Row;
    return toApp(r, await signedThumbs(r.docs ?? []));
  },
  async submitApplication() {
    ok(await sb().rpc('submit_application'));
    const a = await supabaseApi.myApplication();
    if (!a) throw new Error('Application nahi mili');
    return a;
  },

  // ---- admin ----
  async adminApplications() {
    const rows = (ok(await sb().from('applications').select('*').neq('status', 'draft').order('submitted_at', { ascending: false, nullsFirst: false })) as Row[]) ?? [];
    return rows.map((r) => toApp(r));
  },
  async adminUpdateApplication(id, patch) {
    const upd: Row = {};
    if (patch.checklist) upd.checklist = patch.checklist;
    if (patch.reviewNote !== undefined) upd.review_note = patch.reviewNote;
    const edits: Record<string, string> = { shopName: 'shop_name', brandSuggestion: 'brand_suggestion', ownerName: 'owner_name', phone: 'phone', whatsapp: 'whatsapp', address: 'address', city: 'city', pincode: 'pincode', upiId: 'upi_id', gstin: 'gstin', licenceNo: 'licence_no', licenceExpiry: 'licence_expiry' };
    const edited: string[] = [];
    for (const [k, col] of Object.entries(edits)) { const v = (patch as Record<string, unknown>)[k]; if (v !== undefined) { upd[col] = col === 'licence_expiry' && !v ? null : v; edited.push(k); } }
    if (edited.length) await sb().rpc('audit_log', { p_action: 'application_edit', p_detail: id + ': ' + edited.join(',') }).then(() => undefined, () => undefined);
    if (patch.status === 'under_review') {
      const cur = ok(await sb().from('applications').select('status').eq('id', id).single()) as Row;
      if (cur.status === 'submitted') upd.status = 'under_review';
    }
    ok(await sb().from('applications').update(upd).eq('id', id));
  },
  async adminApprove(id, brandName) { ok(await sb().rpc('approve_partner_application', { p_id: id, p_brand: brandName })); },
  async adminReject(id, reason) {
    if (!reason.trim()) throw new Error('Reject ka reason likho');
    ok(await sb().from('applications').update({ status: 'rejected', reject_reason: reason, reviewed_at: new Date().toISOString() }).eq('id', id));
    await sb().rpc('audit_log', { p_action: 'reject_application', p_detail: id }).then(() => undefined, () => undefined);
  },
  async adminNeedInfo(id, note) {
    if (!note.trim()) throw new Error('Partner ko kya chahiye, wo likho');
    ok(await sb().from('applications').update({ status: 'need_more_info', review_note: note, reviewed_at: new Date().toISOString() }).eq('id', id));
  },
  async adminDocUrl(applicationId, docType) {
    const r = ok(await sb().from('applications').select('docs').eq('id', applicationId).single()) as Row;
    const d = ((r.docs ?? []) as Row[]).find((x) => x.type === docType);
    if (!d?.path) return '';
    await sb().rpc('log_doc_view', { p_app: applicationId, p_doc: docType }).then(() => undefined, () => undefined);
    const res = await sb().storage.from('partner-docs').createSignedUrl(d.path, 300);
    if (res.error) throw new Error(res.error.message);
    return res.data.signedUrl;
  },
  async adminNurseries() { return ((ok(await sb().from('nurseries').select('*').order('created_at', { ascending: false })) as Row[]) ?? []).map(toNursery); },
  async adminAddNursery(n) {
    const r = ok(await sb().from('nurseries').insert({
      legal_name: n.legalName, brand_name: n.brandName, owner_phone: n.ownerPhone, lat: n.lat, lng: n.lng, city: n.city, partner_type: n.partnerType, tier: 'verified',
    }).select('*').single());
    return toNursery(r as Row);
  },
  async adminSetNurseryStatus(id, status) { ok(await sb().from('nurseries').update({ status, ...(status === 'blocked' ? { is_open: false } : {}) }).eq('id', id)); },
  async listCategories() {
    const rows = (ok(await sb().from('categories').select('*').eq('active', true).order('sort_order')) as Row[]) ?? [];
    return rows.map(toCat);
  },
  async listForms() { return ((ok(await sb().from('forms').select('*').eq('enabled', true).order('created_at')) as Row[]) ?? []).map((r) => ({ ...(r.data as CustomForm), id: r.id, enabled: true })).filter((f) => f.fields?.length); },
  async submitLead(input) { ok(await sb().rpc('submit_lead', { p_form: input.formId, p_name: input.name, p_phone: input.phone, p_answers: input.answers })); },
  async adminAllForms() { return ((ok(await sb().from('forms').select('*').order('created_at')) as Row[]) ?? []).map((r) => ({ ...(r.data as CustomForm), id: r.id, enabled: r.enabled })); },
  async adminSaveForm(f) {
    if (!f.name.trim()) throw new Error('Form ka naam daalo');
    if (f.fields.length === 0) throw new Error('Kam se kam ek field jodo');
    for (const fl of f.fields) if (['select', 'radio', 'checkbox'].includes(fl.type) && !(fl.options && fl.options.length)) throw new Error('Is field ke vikalp (options) daalo');
    ok(await sb().from('forms').upsert({ id: f.id, data: f, enabled: f.enabled }));
  },
  async adminDeleteForm(id) { ok(await sb().from('forms').delete().eq('id', id)); },
  async adminLeads() {
    const rows = (ok(await sb().from('leads').select('*').order('created_at', { ascending: false }).limit(500)) as Row[]) ?? [];
    return rows.map((r): Lead => ({ id: r.id, formId: r.form_id, formName: r.form_name ?? '', name: r.name, phone: r.phone, answers: r.answers ?? [], status: r.status as LeadStatus, note: r.note ?? '', createdAt: ms(r.created_at), updatedAt: ms(r.updated_at) }));
  },
  async adminUpdateLead(id, patch) {
    const m: Row = { updated_at: new Date().toISOString() };
    if (patch.status) m.status = patch.status; if (patch.note !== undefined) m.note = patch.note;
    ok(await sb().from('leads').update(m).eq('id', id));
  },
  async adminDeleteLead(id) { ok(await sb().from('leads').delete().eq('id', id)); },
  async adminAllCategories() { return ((ok(await sb().from('categories').select('*').order('sort_order')) as Row[]) ?? []).map(toCat); },
  async adminSaveCategory(c) { ok(await sb().from('categories').upsert({ key: c.key, name: c.name, emoji: c.emoji, active: c.active, sort_order: c.order })); },
  async adminDeleteCategory(key) {
    const used = ok(await sb().from('plants').select('id').contains('categories', [key]).limit(1)) as Row[];
    if (used.length) throw new Error('Is category me products hain. Pehle unhe dusri category me daalo ya category ko off karo.');
    ok(await sb().from('categories').delete().eq('key', key));
  },
  async listSlideshows() { return ((ok(await sb().from('slideshows').select('*').eq('enabled', true)) as Row[]) ?? []).map((r) => ({ ...(r.data as Slideshow), id: r.id, enabled: true })).filter((x) => x.slides?.length); },
  async adminAllSlideshows() { return ((ok(await sb().from('slideshows').select('*').order('created_at')) as Row[]) ?? []).map((r) => ({ ...(r.data as Slideshow), id: r.id, enabled: r.enabled })); },
  async adminSaveSlideshow(x) { ok(await sb().from('slideshows').upsert({ id: x.id, data: x, enabled: x.enabled })); },
  async adminDeleteSlideshow(id) { ok(await sb().from('slideshows').delete().eq('id', id)); },
  async adminUpdateNursery(id, patch) {
    const m: Row = {};
    if (patch.legalName !== undefined) m.legal_name = patch.legalName; if (patch.brandName !== undefined) m.brand_name = patch.brandName;
    if (patch.ownerPhone !== undefined) m.owner_phone = patch.ownerPhone; if (patch.lat !== undefined) m.lat = patch.lat; if (patch.lng !== undefined) m.lng = patch.lng;
    if (patch.city !== undefined) m.city = patch.city; if (patch.partnerType !== undefined) m.partner_type = patch.partnerType; if (patch.tier !== undefined) m.tier = patch.tier;
    if (patch.licenceNo !== undefined) m.licence_no = patch.licenceNo || null; if (patch.licenceExpiry !== undefined) m.licence_expiry = patch.licenceExpiry || null; if (patch.gstin !== undefined) m.gstin = patch.gstin || null;
    if (patch.startingPrice !== undefined) m.starting_price = patch.startingPrice; if (patch.serviceRadiusKm !== undefined) m.service_radius_km = patch.serviceRadiusKm;
    if (patch.bio !== undefined) m.bio = patch.bio; if (patch.blockedDates !== undefined) m.blocked_dates = patch.blockedDates; if (patch.priority !== undefined) m.priority = patch.priority;
    ok(await sb().from('nurseries').update(m).eq('id', id));
  },
  async adminUpdatePlant(id, patch) {
    const m: Row = {};
    if (patch.name !== undefined) m.name = patch.name;
    if (patch.categories !== undefined) { m.categories = patch.categories; m.category = patch.categories[0]; }
    if (patch.ribbon !== undefined) m.ribbon = patch.ribbon || null;
    if (patch.price !== undefined) m.price = patch.price; if (patch.stock !== undefined) m.stock = patch.stock;
    if (patch.image !== undefined) m.image = await plantImage(patch.image);
    if (patch.care !== undefined) m.care = patch.care; if (patch.festivalTags !== undefined) m.festival_tags = patch.festivalTags;
    ok(await sb().from('plants').update(m).eq('id', id));
  },
  async adminSetNurseryOpen(id, open) { ok(await sb().from('nurseries').update({ is_open: open }).eq('id', id)); },
  async adminPlants() {
    const rows = (ok(await sb().from('plants').select('*, nurseries(brand_name, unique_id)').order('created_at', { ascending: false })) as Row[]) ?? [];
    return rows.map((r): AdminPlant => ({ ...toPlant(r), nurseryBrand: r.nurseries?.brand_name ?? '', nurseryUid: r.nurseries?.unique_id ?? '' }));
  },
  async adminSetPlantStatus(id, status, reason) { ok(await sb().from('plants').update({ status, reject_reason: status === 'rejected' ? reason ?? '' : null }).eq('id', id)); },
  async adminAddPlant(nurseryId, input, goLive) {
    if (!nurseryId) throw new Error('Pehle nursery select karo');
    if (!(input.price > 0)) throw new Error('Sahi price daalo');
    const image = await plantImage(input.image);
    ok(await sb().from('plants').insert({
      nursery_id: nurseryId, sku: input.sku || skuOf(input.name), name: input.name, category: (input.categories?.[0] ?? input.category), categories: input.categories?.length ? input.categories : [input.category], ribbon: input.ribbon || null, price: input.price, stock: input.stock, image, care: input.care ?? '',
      festival_tags: input.festivalTags ?? [], status: goLive ? 'live' : 'pending',
    }));
  },
  async adminOrders() { return ((ok(await sb().from('orders').select('*').order('created_at', { ascending: false }).limit(300)) as Row[]) ?? []).map(toOrder); },
  async adminAdvanceOrder(id) { ok(await sb().rpc('admin_advance_order', { p_id: id })); },
  async adminCancelOrder(id) { ok(await sb().rpc('admin_cancel_order', { p_id: id })); },
  async adminAllDeliveryPartners() { return ((ok(await sb().from('delivery_partners').select('*').order('name')) as Row[]) ?? []).map(toDP); },
  async adminSaveDeliveryPartner(dp) {
    const row = { name: dp.name, rate_per_km: dp.ratePerKm ?? 8, min_charge: dp.minCharge ?? 50, vehicle_types: dp.vehicleTypes ?? ['bike'], active: dp.active ?? true, deep_link: dp.deepLink || null };
    ok(dp.id ? await sb().from('delivery_partners').update(row).eq('id', dp.id) : await sb().from('delivery_partners').insert(row));
  },
  async adminDeleteDeliveryPartner(id) { ok(await sb().from('delivery_partners').delete().eq('id', id)); },
  async adminComplaints() { return ((ok(await sb().from('complaints').select('*').order('created_at', { ascending: false })) as Row[]) ?? []).map(toComplaint); },
  async adminResolveComplaint(id, resolution) { ok(await sb().from('complaints').update({ status: 'resolved', resolution }).eq('id', id)); },
  async adminUpdateRule(r) {
    ok(await sb().from('rules').upsert({
      partner_type: r.partnerType, allowed_id_docs: r.allowedIdDocs, required_docs: r.requiredDocs, licence_required: r.licenceRequired, gst_required: r.gstRequired,
      allowed_categories: r.allowedCategories, max_live_probation: r.maxLiveProbation,
    }));
  },
  async adminSaveSettings(s) {
    ok(await sb().from('settings').update({
      accept_seconds: s.acceptSeconds, cancel_seconds: s.cancelSeconds, probation_days: s.probationDays, payout_hold_days: s.payoutHoldDays, sla_hours: s.slaHours, confirm_hours: s.confirmHours, refund_72: s.refund72, refund_24: s.refund24, refund_low: s.refundLow, split: s.split,
    }).eq('id', 1));
  },
  async adminAudit() {
    const rows = (ok(await sb().from('audit').select('*').order('at', { ascending: false }).limit(300)) as Row[]) ?? [];
    return rows.map((r): AuditRow => ({ id: r.id, at: ms(r.at), actor: r.actor, action: r.action, detail: r.detail }));
  },
};
