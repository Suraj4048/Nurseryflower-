// ============================================================
// DEMO BACKEND: poora backend browser ke localStorage me chalta hai.
// - Koi server, OTP, API key nahi chahiye.
// - Teen tabs (Showroom / Godown / Office) ek dusre ko turant update dikhate hain (storage event).
// - Order timers (5 min accept, 2 min cancel, auto reassign) yaha setInterval se chalte hain;
//   asli backend me ye Supabase pg_cron se chalte hain.
// DHYAN: demo data har browser ka alag hota hai. Asli customers ke liye VITE_MODE=supabase karo.
// ============================================================
import { APP, config } from '../config';
import type { Api } from './types';
import { seed, defaultCategories, defaultSlideshows, defaultForms, defaultServices, type DemoDB, type DemoUser } from './seed';
import type {
  AdminPlant, Application, AppStatus, CategoryDef, Complaint, Slideshow, DeliveryPartner, DocType, Earnings, NewPlantInput, Nursery, Order, OrderStatus,
  PlaceOrderInput, Plant, PublicPlant, Rule, Settings, User, Booking, MyBooking, ProviderJob, ProviderOption, ServiceDef,
} from '../lib/types';
import { SERVICE_PROVIDER_TYPES } from '../lib/types';
import { localDate, refundFor, startTs } from '../lib/booking';
import { cheapestPartner, deliveryFee, haversineKm, roadKm } from '../lib/geo';
import { addDays, digits, todayStr } from '../lib/format';
import { pickName } from '../lib/i18n';

const KEY = 'nl_demo_db_v1';
const SKEY = 'nl_session_' + APP;
let cache: DemoDB | null = null;
const listeners = new Set<() => void>();

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const uid = (p: string) => p + '_' + Math.random().toString(36).slice(2, 10);

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { console.warn('Demo storage full', e); }
}
function db(): DemoDB {
  if (!cache) {
    let raw: string | null = null;
    try { raw = localStorage.getItem(KEY); } catch { /* ignore */ }
    if (raw) { try { cache = JSON.parse(raw) as DemoDB; } catch { cache = null; } }
    if (!cache) { cache = seed(); save(); }
    else migrate(cache);
  }
  return cache;
}
/** Purana demo data bhi chalta rahe: naye fields apne aap jud jate hain, kuch delete nahi hota. */
function migrate(d: DemoDB) {
  let ch = false;
  if (!d.categories) { d.categories = defaultCategories(); ch = true; }
  if (!d.slideshows) { d.slideshows = defaultSlideshows(); ch = true; }
  if (!d.forms) { d.forms = defaultForms(); ch = true; }
  if (!d.leads) { d.leads = []; ch = true; }
  if (!d.services) { d.services = defaultServices(); ch = true; }
  if (!d.bookings) { d.bookings = []; ch = true; }
  const st = d.settings as Settings;
  if (st.confirmHours === undefined) { st.confirmHours = 24; st.refund72 = 80; st.refund24 = 50; st.refundLow = 0; ch = true; }
  const fresh = seed();
  for (const c of fresh.categories) if (!d.categories.some((x) => x.key === c.key)) { d.categories.push({ ...c, order: d.categories.length }); ch = true; }
  for (const r of fresh.rules) if (!d.rules.some((x) => x.partnerType === r.partnerType)) { d.rules.push(r); ch = true; }
  for (const id of ['n4', 'n5', 'n6', 'n7']) {
    if (d.nurseries.some((x) => x.id === id)) continue;
    d.nurseries.push(fresh.nurseries.find((x) => x.id === id)!);
    const u = fresh.users.find((x) => x.nurseryId === id)!;
    if (!d.users.some((x) => x.phone === u.phone)) d.users.push(u);
    if (id === 'n6') d.plants.push(...fresh.plants.filter((x) => x.nurseryId === 'n6'));
    ch = true;
  }
  for (const p of d.plants) if (!p.categories) { p.categories = [p.category]; ch = true; }
  if (ch) save();
}
function commit() { save(); listeners.forEach((f) => f()); }
window.addEventListener('storage', (e) => { if (e.key === KEY) { cache = null; listeners.forEach((f) => f()); } });

const sessionId = () => { try { return localStorage.getItem(SKEY); } catch { return null; } };
const setSession = (id: string | null) => { try { id ? localStorage.setItem(SKEY, id) : localStorage.removeItem(SKEY); } catch { /* ignore */ } };
const toUser = (u: DemoUser): User => ({ id: u.id, role: u.role, name: u.name, phone: u.phone, email: u.email, nurseryId: u.nurseryId, language: u.language });
const meRaw = (): DemoUser | undefined => { const id = sessionId(); return id ? db().users.find((u) => u.id === id) : undefined; };
function need(roles?: DemoUser['role'][]): DemoUser {
  const u = meRaw();
  if (!u) throw new Error('Pehle login karo');
  if (roles && !roles.includes(u.role)) throw new Error('Is kaam ki permission nahi hai');
  return u;
}
function log(actor: string, action: string, detail: string) {
  const d = db();
  d.audit.unshift({ id: uid('a'), at: Date.now(), actor, action, detail });
  if (d.audit.length > 300) d.audit.length = 300;
}

const CITY_CODE: Record<string, string> = { lucknow: 'LKO', delhi: 'DEL', kanpur: 'KNP', varanasi: 'VNS', patna: 'PAT', mumbai: 'MUM' };

// ---------------- order engine ----------------
function stockDelta(d: DemoDB, o: Order, sign: 1 | -1) {
  for (const it of o.items) {
    const p = d.plants.find((x) => x.id === it.plantId);
    if (p) p.stock = Math.max(0, p.stock + sign * it.qty);
  }
}

function reassign(d: DemoDB, o: Order, note: string) {
  stockDelta(d, o, 1); // purana stock wapas
  o.triedNurseryIds.push(o.nurseryId);
  const cands = d.nurseries
    .filter((n) => n.status === 'active' && n.isOpen && !o.triedNurseryIds.includes(n.id))
    .filter((n) => o.items.every((it) => d.plants.some((p) => p.nurseryId === n.id && p.sku === it.sku && p.status === 'live' && p.stock >= it.qty)))
    .sort((a, b) => haversineKm(a.lat, a.lng, o.lat, o.lng) - haversineKm(b.lat, b.lng, o.lat, o.lng));
  const next = cands[0];
  if (!next) {
    o.status = 'expired';
    o.events.push({ status: 'expired', at: Date.now(), note: note + ' - koi aur nursery nahi mili' });
    return;
  }
  o.items = o.items.map((it) => {
    const p = d.plants.find((x) => x.nurseryId === next.id && x.sku === it.sku)!;
    return { ...it, plantId: p.id };
  });
  stockDelta(d, o, -1);
  o.nurseryId = next.id;
  o.nurseryBrand = next.brandName;
  o.status = 'new';
  o.acceptBy = Date.now() + d.settings.acceptSeconds * 1000;
  o.events.push({ status: 'reassigned', at: Date.now(), note: note + ' -> ' + next.brandName });
}

function tick() {
  const d = db();
  const t = Date.now();
  let changed = false;
  for (const o of d.orders) {
    if (o.status === 'new' && o.acceptBy < t) { reassign(d, o, 'Accept time khatam'); changed = true; }
  }
  if (changed) commit();
}
if (config.mode === 'demo') setInterval(tick, 3000);


// ---------------- bookings engine ----------------
const bk = (d: DemoDB, id: string): Booking => {
  const b = d.bookings.find((x) => x.id === id);
  if (!b) throw new Error('Booking nahi mili');
  return b;
};
function availability(d: DemoDB, serviceKey: string, date: string, time?: string, exceptId?: string, ignoreNotice = false): import('../lib/types').Availability {
  const svc = d.services.find((x) => x.key === serviceKey);
  const minDate = localDate(Date.now() + (svc?.minNoticeHours ?? 0) * 3600000);
  if (!svc || !date) return { ok: false, reason: 'past', left: 0, minDate };
  const booked = d.bookings.filter((b) => b.serviceKey === serviceKey && b.date === date && b.id !== exceptId && ['token_paid', 'done'].includes(b.status)).length;
  const left = Math.max(0, svc.dailyCapacity - booked);
  if (date < localDate()) return { ok: false, reason: 'past', left, minDate };
  if (!ignoreNotice && startTs(date, time) < Date.now() + svc.minNoticeHours * 3600000) return { ok: false, reason: 'notice', left, minDate };
  if (left <= 0) return { ok: false, reason: 'full', left, minDate };
  return { ok: true, left, minDate };
}
function toMyBooking(d: DemoDB, b: Booking): MyBooking {
  const { customerId: _c, note: _n, providerId, providerState: _s, commissionPercent: _m, lat: _a, lng: _b, events: _e, providerBrand: _pb, ...rest } = b;
  const out: MyBooking = { ...rest, supportPhone: config.supportWhatsApp };
  // provider ka naam/number sirf confirm hone ke baad
  if (providerId && b.handler === 'provider' && ['confirmed', 'token_paid', 'done'].includes(b.status)) {
    const n = d.nurseries.find((x) => x.id === providerId);
    if (n) out.provider = { brand: n.brandName, phone: n.ownerPhone };
  }
  return out;
}
function cancelBooking(d: DemoDB, b: Booking, by: 'customer' | 'owner' | 'provider', reason: string, actor: string): { refund: number } {
  if (['done', 'cancelled'].includes(b.status)) throw new Error('Ye booking pehle hi band ho chuki hai');
  const refund = refundFor(by, !!b.tokenPaidAt, b.tokenAmount, b.date, b.time, d.settings);
  b.status = 'cancelled'; b.cancelledBy = by; b.cancelReason = reason; b.refundAmount = refund; b.updatedAt = Date.now();
  b.events.push({ at: b.updatedAt, text: 'Cancel (' + by + '): ' + reason + (b.tokenPaidAt ? ' | refund ₹' + refund : '') });
  log(actor, 'booking_cancel', b.shortId + ' by ' + by + ' refund ' + refund);
  commit();
  return { refund };
}

// ---------------- application rules ----------------
function appProblems(app: Application, rule: Rule): string[] {
  const p: string[] = [];
  if (!app.docs.some((x) => rule.allowedIdDocs.includes(x.type))) p.push('Koi ek ID document chahiye');
  for (const r of rule.requiredDocs) if (!app.docs.some((x) => x.type === r)) p.push('Document chahiye: ' + r);
  if (rule.licenceRequired) {
    if (!app.licenceNo.trim()) p.push('Licence number chahiye');
    if (!app.licenceExpiry || app.licenceExpiry < todayStr()) p.push('Licence ki expiry date chalu honi chahiye');
  }
  if (rule.gstRequired && app.gstin.trim().length < 10) p.push('GST number chahiye');
  return p;
}
function checklistProblems(app: Application, rule: Rule): string[] {
  const need: [string, string][] = [
    ['id_checked', 'ID check'], ['name_matches', 'Naam match'], ['geotag_ok', 'Photo location check'], ['phone_call_done', 'Phone/WhatsApp call'],
  ];
  if (rule.licenceRequired) need.push(['licence_checked', 'Licence check']);
  if (rule.gstRequired) need.push(['gst_checked', 'GST check']);
  return need.filter(([k]) => !app.checklist[k]).map(([, label]) => 'Checklist baaki: ' + label);
}

function newApplication(u: DemoUser, partnerType: Application['partnerType']): Application {
  return {
    id: uid('app'), applicantId: u.id, partnerType, shopName: '', brandSuggestion: '', ownerName: u.name, phone: u.phone ?? '', whatsapp: u.phone ?? '',
    address: '', city: 'Lucknow', pincode: '', language: u.language, upiId: '', gstin: '', licenceNo: '', licenceExpiry: '', docs: [], status: 'draft',
    checklist: {}, createdAt: Date.now(),
  };
}
const myApp = (u: DemoUser) => db().applications.filter((a) => a.applicantId === u.id && a.status !== 'withdrawn').sort((a, b) => b.createdAt - a.createdAt)[0];

// ---------------- the API ----------------
export const demoApi: Api = {
  mode: 'demo',
  subscribe(cb) { listeners.add(cb); return () => { listeners.delete(cb); }; },

  async currentUser() { const u = meRaw(); return u ? toUser(u) : null; },

  async customerSendCode(identifier) {
    if (digits(identifier).length < 10 && !identifier.includes('@')) throw new Error('Sahi mobile number daalo');
    return { hint: config.demoOtp };
  },
  async customerVerifyCode(identifier, code, name) {
    if (code !== config.demoOtp) throw new Error('Galat OTP (demo me OTP 123456 hai)');
    const d = db();
    const phone = digits(identifier).slice(-10);
    let u = d.users.find((x) => (phone && x.phone === phone) || (identifier.includes('@') && x.email === identifier));
    if (!u) {
      u = { id: uid('u'), role: 'customer', name: name || 'Customer', phone: phone || undefined, email: identifier.includes('@') ? identifier : undefined, language: 'hi' };
      d.users.push(u);
    } else if (name && (u.name === 'Customer' || !u.name)) u.name = name;
    commit();
    setSession(u.id);
    return toUser(u);
  },
  async partnerLogin(phone, pin) {
    const p = digits(phone).slice(-10);
    const u = db().users.find((x) => x.phone === p && x.pin === pin && x.role !== 'admin');
    if (!u) throw new Error('Phone ya PIN galat hai (demo: 9000000001 / 1234)');
    setSession(u.id);
    return toUser(u);
  },
  async partnerRegister(phone, pin, name) {
    const p = digits(phone).slice(-10);
    if (!/^[6-9]\d{9}$/.test(p)) throw new Error('Sahi 10-digit mobile number daalo');
    if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN 4 se 6 ank ka hona chahiye');
    const d = db();
    let u = d.users.find((x) => x.phone === p);
    if (u?.pin) throw new Error('Ye number pehle se registered hai, login karo');
    if (!u) { u = { id: uid('u'), role: 'customer', name: name || 'Partner', phone: p, language: 'hi' }; d.users.push(u); }
    u.pin = pin; if (name) u.name = name;
    commit();
    setSession(u.id);
    return toUser(u);
  },
  async adminLogin(email, password) {
    const u = db().users.find((x) => x.role === 'admin' && x.email === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new Error('Email ya password galat hai (demo: admin@demo.local / demo123)');
    setSession(u.id);
    log(u.id, 'admin_login', email);
    commit();
    return toUser(u);
  },
  async logout() { setSession(null); },
  async setLanguage(lang) { const u = meRaw(); if (u) { u.language = lang; commit(); } },

  async listPublicPlants(loc) {
    const d = db();
    const out: PublicPlant[] = [];
    for (const p of d.plants) {
      const n = d.nurseries.find((x) => x.id === p.nurseryId);
      if (!n || p.status !== 'live' || !n.isOpen || n.status !== 'active') continue;
      // legalName kabhi bahar nahi jata
      out.push({ ...clone(p), brandName: n.brandName, nurseryPartnerType: n.partnerType, tier: n.tier, nurseryLat: n.lat, nurseryLng: n.lng,
        distanceKm: Math.round(roadKm(n.lat, n.lng, loc.lat, loc.lng) * 10) / 10 });
    }
    return out;
  },
  async listDeliveryPartners() { return clone(db().deliveryPartners.filter((x) => x.active)); },
  async getSettings() { return clone(db().settings); },


  // ---- services & bookings (customer) ----
  async listServices() { return clone(db().services.filter((x) => x.enabled).sort((a, b) => a.order - b.order)); },
  async checkAvailability(serviceKey, date, time) { return availability(db(), serviceKey, date, time); },
  async submitBooking(input) {
    const d = db();
    const svc = d.services.find((x) => x.key === input.serviceKey && x.enabled);
    if (!svc) throw new Error('Ye service abhi band hai');
    const name = input.name.trim(); const phone = digits(input.phone).slice(-10);
    if (name.length < 2) throw new Error('Apna naam daalo');
    if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Sahi 10 ank ka mobile number daalo');
    if (!input.date) throw new Error('Tareekh chuno');
    if (svc.needsTime && !input.time) throw new Error('Time chuno');
    if (input.venue.trim().length < 6) throw new Error('Jagah (venue) ka address daalo');
    if (input.pincode && !/^\d{6}$/.test(input.pincode.trim())) throw new Error('Pincode 6 ank ka hona chahiye');
    if (input.photo && input.photo.length > 140000) throw new Error('Photo 100 KB se chhoti honi chahiye');
    const av = availability(d, svc.key, input.date, input.time);
    if (!av.ok) throw new Error(av.reason === 'full' ? 'Is din ki booking poori hai, dusri tareekh chuno' : av.reason === 'past' ? 'Beeti hui tareekh nahi chalegi' : 'Is service ke liye kam se kam ' + svc.minNoticeHours + ' ghante pehle booking chahiye (' + av.minDate + ' ya baad)');
    const u = meRaw();
    const now = Date.now();
    const b: Booking = {
      id: uid('bk'), shortId: 'BK' + (1000 + d.seq++), serviceKey: svc.key, serviceName: pickName(svc.name, 'en'), customerId: u?.role === 'customer' ? u.id : undefined,
      customerName: name, customerPhone: phone, date: input.date, time: svc.needsTime ? input.time : '', venue: input.venue.trim(), pincode: (input.pincode ?? '').trim(),
      lat: input.lat, lng: input.lng, remarks: (input.remarks ?? '').trim(), photo: input.photo || undefined, status: 'new', createdAt: now, updatedAt: now,
      ownerDueAt: now + d.settings.confirmHours * 3600000, agreedAmount: 0, tokenPercent: svc.tokenPercent, tokenAmount: 0, handler: 'owner',
      commissionPercent: svc.commissionPercent, note: '', events: [{ at: now, text: 'Request mili (sirf owner ko)' }],
    };
    d.bookings.unshift(b); commit();
    return { shortId: b.shortId };
  },
  async myBookings() {
    const u = need(); const d = db();
    const mine = d.bookings.filter((b) => b.customerId === u.id || (!!u.phone && b.customerPhone === u.phone));
    return clone(mine.map((b) => toMyBooking(d, b)));
  },
  async cancelMyBooking(id) {
    const d = db(); const u = need();
    const b = d.bookings.find((x) => x.id === id && (x.customerId === u.id || (!!u.phone && x.customerPhone === u.phone)));
    if (!b) throw new Error('Booking nahi mili');
    return cancelBooking(d, b, 'customer', 'Customer ne cancel kiya', u.id);
  },
  async claimTokenPaid(id) {
    const d = db(); const u = need();
    const b = d.bookings.find((x) => x.id === id && (x.customerId === u.id || (!!u.phone && x.customerPhone === u.phone)));
    if (!b) throw new Error('Booking nahi mili');
    if (b.status !== 'confirmed') throw new Error('Token abhi nahi maanga gaya');
    b.tokenClaimedAt = Date.now(); b.updatedAt = Date.now(); b.events.push({ at: Date.now(), text: 'Customer ne bataya: token de diya' }); commit();
  },

  // ---- partner: service jobs & profile ----
  async myJobs() {
    const u = need(['partner']); const d = db();
    return clone(d.bookings.filter((b) => b.providerId === u.nurseryId && b.handler === 'provider')
      .map((b): ProviderJob => ({
        id: b.id, shortId: b.shortId, serviceKey: b.serviceKey, serviceName: b.serviceName, date: b.date, time: b.time, venue: b.venue, pincode: b.pincode, remarks: b.remarks,
        photo: b.photo, status: b.status, providerState: b.providerState ?? 'assigned', tokenPaid: !!b.tokenPaidAt, createdAt: b.createdAt,
        amount: Math.round(b.agreedAmount * (100 - b.commissionPercent) / 100),
      })));
  },
  async respondJob(id, action) {
    const d = db(); const u = need(['partner']);
    const b = d.bookings.find((x) => x.id === id && x.providerId === u.nurseryId && x.handler === 'provider');
    if (!b) throw new Error('Kaam nahi mila');
    const n = d.nurseries.find((x) => x.id === u.nurseryId);
    const now = Date.now();
    if (action === 'accept') {
      if (b.providerState !== 'assigned' || b.status === 'cancelled') throw new Error('Ab accept nahi ho sakta');
      b.providerState = 'accepted'; b.events.push({ at: now, text: (n?.brandName ?? 'Provider') + ' ne kaam accept kiya' });
    } else if (action === 'decline') {
      if (b.status === 'done' || b.status === 'cancelled') throw new Error('Ab mana nahi kar sakte');
      b.events.push({ at: now, text: (n?.brandName ?? 'Provider') + ' ne mana kiya, kaam owner ke paas wapas' });
      b.handler = 'owner'; b.providerId = undefined; b.providerBrand = undefined; b.providerState = undefined;
    } else {
      if (b.providerState !== 'accepted') throw new Error('Pehle kaam accept karo');
      if (b.status !== 'token_paid') throw new Error('Token aane ke baad hi kaam poora mark ho sakta hai');
      b.status = 'done'; b.events.push({ at: now, text: 'Provider ne kaam poora mark kiya' });
    }
    b.updatedAt = now; commit();
  },
  async updateMyProfile(patch) {
    const d = db(); const u = need(['partner']);
    const n = d.nurseries.find((x) => x.id === u.nurseryId); if (!n) throw new Error('Profile nahi mili');
    if (patch.startingPrice !== undefined) { if (!(patch.startingPrice >= 0)) throw new Error('Sahi price daalo'); n.startingPrice = patch.startingPrice; }
    if (patch.serviceRadiusKm !== undefined) { if (!(patch.serviceRadiusKm >= 0)) throw new Error('Sahi km daalo'); n.serviceRadiusKm = patch.serviceRadiusKm; }
    if (patch.bio !== undefined) n.bio = patch.bio.slice(0, 300);
    if (patch.blockedDates !== undefined) n.blockedDates = [...new Set(patch.blockedDates.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)))].sort();
    log(u.id, 'provider_profile', n.uniqueId); commit();
  },

  // ---- admin: services & bookings ----
  async adminServices() { need(['admin']); return clone([...db().services].sort((a, b) => a.order - b.order)); },
  async adminSaveService(sv: ServiceDef) {
    const d = db(); const admin = need(['admin']);
    if (!(sv.tokenPercent >= 0 && sv.tokenPercent <= 100)) throw new Error('Token % 0 se 100 ke beech ho');
    if (!(sv.commissionPercent >= 0 && sv.commissionPercent <= 100)) throw new Error('Commission % 0 se 100 ke beech ho');
    if (!(sv.dailyCapacity >= 1)) throw new Error('Din ki limit kam se kam 1 ho');
    if (!(sv.minNoticeHours >= 0)) throw new Error('Notice ghante sahi daalo');
    const i = d.services.findIndex((x) => x.key === sv.key);
    if (i < 0) throw new Error('Service nahi mili');
    d.services[i] = clone(sv); log(admin.id, 'service_save', sv.key); commit();
  },
  async adminBookings() { need(['admin']); return clone(db().bookings); },
  async adminUpdateBooking(id, patch) {
    const d = db(); const admin = need(['admin']);
    const b = bk(d, id);
    if (['done', 'cancelled'].includes(b.status)) throw new Error('Ye booking band ho chuki hai');
    if (patch.customerPhone !== undefined && !/^[6-9]\d{9}$/.test(digits(patch.customerPhone).slice(-10))) throw new Error('Sahi mobile number daalo');
    if (patch.agreedAmount !== undefined && !(patch.agreedAmount >= 0)) throw new Error('Sahi amount daalo');
    Object.assign(b, patch);
    if (patch.customerPhone !== undefined) b.customerPhone = digits(patch.customerPhone).slice(-10);
    if (patch.agreedAmount !== undefined && b.status !== 'new' && b.status !== 'called') b.tokenAmount = Math.round(b.agreedAmount * b.tokenPercent / 100);
    b.updatedAt = Date.now(); b.events.push({ at: Date.now(), text: 'Admin ne badla: ' + Object.keys(patch).join(', ') });
    log(admin.id, 'booking_edit', b.shortId + ' ' + Object.keys(patch).join(',')); commit();
  },
  async adminBookingCalled(id) {
    const d = db(); const admin = need(['admin']); const b = bk(d, id);
    if (b.status !== 'new') throw new Error('Ye booking "new" nahi hai');
    b.status = 'called'; b.calledAt = Date.now(); b.updatedAt = b.calledAt; b.events.push({ at: b.calledAt, text: 'Owner ne customer se baat ki' });
    log(admin.id, 'booking_called', b.shortId); commit();
  },
  async adminBookingConfirm(id, agreedAmount) {
    const d = db(); const admin = need(['admin']); const b = bk(d, id);
    if (!['new', 'called'].includes(b.status)) throw new Error('Ye booking ab confirm nahi ho sakti');
    if (!(agreedAmount > 0)) throw new Error('Tay hui rakam (amount) daalo');
    b.agreedAmount = Math.round(agreedAmount); b.tokenAmount = Math.round(b.agreedAmount * b.tokenPercent / 100);
    b.status = 'confirmed'; b.calledAt = b.calledAt ?? Date.now(); b.updatedAt = Date.now();
    b.events.push({ at: b.updatedAt, text: 'Confirm: ₹' + b.agreedAmount + ', token ₹' + b.tokenAmount + ' (' + b.tokenPercent + '%)' });
    log(admin.id, 'booking_confirm', b.shortId + ' ' + b.agreedAmount); commit();
  },
  async adminBookingTokenPaid(id) {
    const d = db(); const admin = need(['admin']); const b = bk(d, id);
    if (b.status !== 'confirmed') throw new Error('Pehle booking confirm karo');
    const av = availability(d, b.serviceKey, b.date, b.time, b.id, true);
    if (av.left <= 0) throw new Error('Is din ki limit poori ho chuki hai (dusri booking ka token pehle aa gaya)');
    b.status = 'token_paid'; b.tokenPaidAt = Date.now(); b.updatedAt = b.tokenPaidAt;
    b.events.push({ at: b.tokenPaidAt, text: 'Token mila ₹' + b.tokenAmount + ' - tareekh pakki' });
    log(admin.id, 'booking_token_paid', b.shortId); commit();
  },
  async adminBookingAssign(id, providerId) {
    const d = db(); const admin = need(['admin']); const b = bk(d, id);
    if (['done', 'cancelled'].includes(b.status)) throw new Error('Ye booking band ho chuki hai');
    if (providerId === null) {
      b.handler = 'owner'; b.providerId = undefined; b.providerBrand = undefined; b.providerState = undefined;
      b.events.push({ at: Date.now(), text: 'Kaam owner ke paas hi rakha' });
    } else {
      const n = d.nurseries.find((x) => x.id === providerId && x.status === 'active');
      const svc = d.services.find((x) => x.key === b.serviceKey);
      if (!n || !svc || !SERVICE_PROVIDER_TYPES[svc.kind].includes(n.partnerType)) throw new Error('Ye partner is service ke liye sahi nahi hai');
      b.handler = 'provider'; b.providerId = n.id; b.providerBrand = n.brandName; b.providerState = 'assigned';
      b.events.push({ at: Date.now(), text: 'Local provider ko diya: ' + n.brandName });
    }
    b.updatedAt = Date.now(); log(admin.id, 'booking_assign', b.shortId + ' -> ' + (providerId ?? 'owner')); commit();
  },
  async adminBookingDone(id) {
    const d = db(); const admin = need(['admin']); const b = bk(d, id);
    if (b.status !== 'token_paid') throw new Error('Token aane ke baad hi poora mark ho sakta hai');
    b.status = 'done'; b.updatedAt = Date.now(); b.events.push({ at: b.updatedAt, text: 'Kaam poora' }); log(admin.id, 'booking_done', b.shortId); commit();
  },
  async adminBookingCancel(id, by, reason) {
    const d = db(); const admin = need(['admin']); const b = bk(d, id);
    if (!reason.trim()) throw new Error('Cancel ka reason likho');
    return cancelBooking(d, b, by, reason.trim(), admin.id);
  },
  async adminProvidersFor(bookingId) {
    const d = db(); need(['admin']); const b = bk(d, bookingId);
    const svc = d.services.find((x) => x.key === b.serviceKey);
    if (!svc) return [];
    const types = SERVICE_PROVIDER_TYPES[svc.kind];
    const from = { lat: b.lat ?? config.defaultLocation.lat, lng: b.lng ?? config.defaultLocation.lng };
    const out: ProviderOption[] = d.nurseries.filter((n) => n.status === 'active' && types.includes(n.partnerType)).map((n) => ({
      id: n.id, brand: n.brandName, partnerType: n.partnerType, distanceKm: Math.round(roadKm(n.lat, n.lng, from.lat, from.lng) * 10) / 10, priority: n.priority ?? 0,
      isOpen: n.isOpen, startingPrice: n.startingPrice, radiusKm: n.serviceRadiusKm,
      busy: (n.blockedDates ?? []).includes(b.date) || d.bookings.some((x) => x.id !== b.id && x.providerId === n.id && x.date === b.date && x.status === 'token_paid'),
    }));
    return out.sort((a, c) => c.priority - a.priority || a.distanceKm - c.distanceKm);
  },

  // ---- customer ----
  async placeOrders(input: PlaceOrderInput) {
    const d = db();
    const u = need();
    if (!input.lines.length) throw new Error('Cart khali hai');
    if (input.address.trim().length < 6) throw new Error('Poora address daalo');
    const groups = new Map<string, { plant: Plant; qty: number }[]>();
    for (const l of input.lines) {
      const p = d.plants.find((x) => x.id === l.plantId);
      if (!p || p.status !== 'live') throw new Error('Ek product ab available nahi hai');
      const n = d.nurseries.find((x) => x.id === p.nurseryId);
      if (!n || !n.isOpen || n.status !== 'active') throw new Error((n?.brandName ?? 'Nursery') + ' abhi band hai');
      if (p.stock < l.qty) throw new Error(pickName(p.name, 'en') + ' ka stock kam hai');
      groups.set(p.nurseryId, [...(groups.get(p.nurseryId) ?? []), { plant: p, qty: l.qty }]);
    }
    const partners = d.deliveryPartners.filter((x) => x.active);
    const chosen = input.deliveryPartnerId ? partners.find((x) => x.id === input.deliveryPartnerId) : undefined;
    const created: Order[] = [];
    for (const [nid, lines] of groups) {
      const n = d.nurseries.find((x) => x.id === nid)!;
      const km = roadKm(n.lat, n.lng, input.lat, input.lng);
      const dp = chosen ?? cheapestPartner(partners, km);
      if (!dp) throw new Error('Abhi koi delivery partner active nahi hai');
      const items = lines.map(({ plant, qty }) => ({ plantId: plant.id, sku: plant.sku, name: plant.name.en || plant.name.hi, price: plant.price, qty, image: plant.image }));
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const fee = deliveryFee(dp, km);
      const now = Date.now();
      const o: Order = {
        id: uid('o'), shortId: 'NL' + (1000 + d.seq++), customerId: u.id, customerName: u.name, customerPhone: u.phone ?? '', nurseryId: n.id, nurseryBrand: n.brandName,
        triedNurseryIds: [], items, subtotal, deliveryFee: fee, total: subtotal + fee, paymentMethod: input.paymentMethod, status: 'new',
        deliveryPartnerId: dp.id, deliveryPartnerName: dp.name, address: input.address, pincode: input.pincode, lat: input.lat, lng: input.lng,
        cancelUntil: now + d.settings.cancelSeconds * 1000, acceptBy: now + d.settings.acceptSeconds * 1000, createdAt: now, events: [{ status: 'new', at: now }],
      };
      d.orders.unshift(o);
      stockDelta(d, o, -1);
      created.push(o);
    }
    commit();
    return clone(created);
  },
  async myOrders() { const u = need(); return clone(db().orders.filter((o) => o.customerId === u.id)); },
  async cancelMyOrder(id) {
    const d = db(); const u = need();
    const o = d.orders.find((x) => x.id === id && x.customerId === u.id);
    if (!o) throw new Error('Order nahi mila');
    if (!['new', 'accepted'].includes(o.status) || Date.now() > o.cancelUntil) throw new Error('Cancel karne ka time khatam ho gaya');
    stockDelta(d, o, 1);
    o.status = 'cancelled';
    o.events.push({ status: 'cancelled', at: Date.now(), note: 'Customer ne cancel kiya' });
    commit();
  },
  async reviewOrder(id, rating, comment) {
    const d = db(); const u = need();
    const o = d.orders.find((x) => x.id === id && x.customerId === u.id && x.status === 'delivered');
    if (!o) throw new Error('Review sirf delivered order par');
    o.rating = rating; o.review = comment; commit();
  },
  async raiseComplaint(orderId, reason, photo) {
    const d = db(); const u = need();
    const o = d.orders.find((x) => x.id === orderId && x.customerId === u.id && x.status === 'delivered');
    if (!o) throw new Error('Replacement sirf delivered order par');
    const delivered = [...o.events].reverse().find((e) => e.status === 'delivered')?.at ?? o.createdAt;
    if (Date.now() - delivered > 7 * 86400000) throw new Error('7 din ka time khatam');
    const c: Complaint = { id: uid('c'), orderId, customerId: u.id, reason, photo, status: 'open', createdAt: Date.now() };
    d.complaints.unshift(c); commit();
  },

  // ---- partner ----
  async myNursery() { const u = need(); return u.nurseryId ? clone(db().nurseries.find((n) => n.id === u.nurseryId) ?? null) : null; },
  async myRule() {
    const u = need(); const d = db();
    const n = u.nurseryId ? d.nurseries.find((x) => x.id === u.nurseryId) : undefined;
    return n ? clone(d.rules.find((r) => r.partnerType === n.partnerType) ?? null) : null;
  },
  async setShopOpen(open) {
    const u = need(['partner']); const n = db().nurseries.find((x) => x.id === u.nurseryId);
    if (!n) throw new Error('Nursery nahi mili');
    n.isOpen = open; commit();
  },
  async nurseryOrders() { const u = need(['partner']); return clone(db().orders.filter((o) => o.nurseryId === u.nurseryId)); },
  async respondOrder(id, action) {
    const d = db(); const u = need(['partner']);
    const o = d.orders.find((x) => x.id === id && x.nurseryId === u.nurseryId);
    if (!o) throw new Error('Order nahi mila');
    if (action === 'accept') {
      if (o.status !== 'new') throw new Error('Order ab "new" nahi hai');
      o.status = 'accepted'; o.events.push({ status: 'accepted', at: Date.now() });
    } else if (action === 'reject') {
      if (o.status !== 'new') throw new Error('Reject sirf accept se pehle');
      o.events.push({ status: 'rejected', at: Date.now(), note: o.nurseryBrand + ' ne mana kiya' });
      reassign(d, o, 'Nursery ne mana kiya');
    } else {
      if (o.status !== 'accepted') throw new Error('Pehle order accept karo');
      o.status = 'packed'; o.events.push({ status: 'packed', at: Date.now() });
    }
    commit();
  },
  async myPlants() { const u = need(['partner']); return clone(db().plants.filter((p) => p.nurseryId === u.nurseryId)); },
  async addMyPlant(input: NewPlantInput) {
    const d = db(); const u = need(['partner']);
    const n = d.nurseries.find((x) => x.id === u.nurseryId);
    if (!n) throw new Error('Nursery nahi mili');
    const rule = d.rules.find((r) => r.partnerType === n.partnerType);
    const cats = input.categories?.length ? input.categories : [input.category];
    if (rule && cats.some((c) => !rule.allowedCategories.includes(c))) throw new Error('Is type ka partner ye category nahi bech sakta');
    if (!(input.name.hi || input.name.en)) throw new Error('Product ka naam daalo');
    if (!(input.price > 0)) throw new Error('Sahi price daalo');
    const sku = input.sku || (input.name.en || input.name.hi).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    d.plants.unshift({
      id: uid('p'), nurseryId: n.id, sku, name: input.name, category: cats[0], categories: cats, ribbon: input.ribbon || undefined, price: input.price, stock: input.stock,
      image: input.image || '🌱', care: input.care ?? '', festivalTags: input.festivalTags ?? [], status: 'pending', createdAt: Date.now(),
    });
    log(u.id, 'partner_add_plant', n.uniqueId + ' ' + (input.name.en || input.name.hi));
    commit();
  },
  async setStock(plantId, stock) {
    const d = db(); const u = need(['partner']);
    const p = d.plants.find((x) => x.id === plantId && x.nurseryId === u.nurseryId);
    if (!p) throw new Error('Product nahi mila');
    p.stock = Math.max(0, stock); log(u.id, 'stock', p.sku + '=' + p.stock); commit();
  },
  async earnings(): Promise<Earnings> {
    const d = db(); const u = need(['partner']);
    const mine = d.orders.filter((o) => o.nurseryId === u.nurseryId);
    const share = (o: Order) => (o.subtotal * d.settings.split.nursery) / 100;
    const deliveredAt = (o: Order) => [...o.events].reverse().find((e) => e.status === 'delivered')?.at ?? 0;
    const delivered = mine.filter((o) => o.status === 'delivered');
    const startDay = new Date(); startDay.setHours(0, 0, 0, 0);
    const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
    const n = d.nurseries.find((x) => x.id === u.nurseryId);
    const inProb = n?.probationEndsOn && n.probationEndsOn >= todayStr();
    return {
      today: delivered.filter((o) => deliveredAt(o) >= startDay.getTime()).reduce((s, o) => s + share(o), 0),
      month: delivered.filter((o) => deliveredAt(o) >= startMonth.getTime()).reduce((s, o) => s + share(o), 0),
      pending: mine.filter((o) => ['accepted', 'packed', 'out_for_delivery'].includes(o.status)).reduce((s, o) => s + share(o), 0),
      deliveredCount: delivered.length,
      holdNote: inProb ? 'Naye partner ke payout ' + d.settings.payoutHoldDays + ' din baad milte hain' : undefined,
    };
  },

  // ---- application ----
  async listRules() { return clone(db().rules); },
  async myApplication() { const u = need(); const a = myApp(u); return a ? clone(a) : null; },
  async saveApplication(patch) {
    const d = db(); const u = need();
    let a = myApp(u);
    if (a && !['draft', 'need_more_info'].includes(a.status)) throw new Error('Application ab edit nahi ho sakti');
    if (!a) { a = newApplication(u, patch.partnerType); d.applications.push(a); }
    Object.assign(a, patch, { id: a.id, applicantId: a.applicantId, status: a.status });
    commit();
    return clone(a);
  },
  async submitApplication() {
    const d = db(); const u = need();
    const a = myApp(u);
    if (!a) throw new Error('Pehle form bharo');
    if (!['draft', 'need_more_info'].includes(a.status)) throw new Error('Application pehle hi jama hai');
    const missing: string[] = [];
    if (!a.shopName.trim()) missing.push('Dukaan/nursery ka naam');
    if (!a.ownerName.trim()) missing.push('Malik ka naam');
    if (!/^[6-9]\d{9}$/.test(digits(a.phone).slice(-10))) missing.push('Sahi phone number');
    if (a.address.trim().length < 6) missing.push('Poora address');
    if (!a.consentAt) missing.push('Consent (sahmati)');
    const rule = d.rules.find((r) => r.partnerType === a.partnerType)!;
    missing.push(...appProblems(a, rule));
    if (missing.length) throw new Error(missing.join(' | '));
    a.status = 'submitted'; a.submittedAt = Date.now(); a.slaDueAt = Date.now() + d.settings.slaHours * 3600000;
    log(u.id, 'application_submitted', a.shopName);
    commit();
    return clone(a);
  },

  // ---- admin ----
  async adminApplications() { need(['admin']); return clone(db().applications.filter((a) => a.status !== 'draft').sort((x, y) => (y.submittedAt ?? 0) - (x.submittedAt ?? 0))); },
  async adminUpdateApplication(id, patch) {
    const d = db(); const admin = need(['admin']);
    const a = d.applications.find((x) => x.id === id);
    if (!a) throw new Error('Application nahi mili');
    const EDITABLE = ['shopName', 'brandSuggestion', 'ownerName', 'phone', 'whatsapp', 'address', 'city', 'pincode', 'upiId', 'gstin', 'licenceNo', 'licenceExpiry'] as const;
    const edited = EDITABLE.filter((k) => patch[k] !== undefined && patch[k] !== a[k]);
    if (edited.length) {
      if (patch.phone !== undefined && !/^[6-9]\d{9}$/.test(digits(patch.phone).slice(-10))) throw new Error('Sahi 10 ank ka phone daalo');
      for (const k of edited) (a as unknown as Record<string, string>)[k] = String(patch[k]);
      log(admin.id, 'application_edit', a.shopName + ': ' + edited.join(','));
    }
    if (patch.checklist) a.checklist = { ...a.checklist, ...patch.checklist };
    if (patch.status === 'under_review' && a.status === 'submitted') a.status = 'under_review';
    if (patch.reviewNote !== undefined) a.reviewNote = patch.reviewNote;
    commit();
  },
  async adminApprove(id, brandName) {
    const d = db(); const admin = need(['admin']);
    const a = d.applications.find((x) => x.id === id);
    if (!a) throw new Error('Application nahi mili');
    if (!['submitted', 'under_review'].includes(a.status)) throw new Error('Is application ko ab approve nahi kar sakte');
    if (!brandName.trim()) throw new Error('Brand naam daalo (customer ko yahi dikhega)');
    const rule = d.rules.find((r) => r.partnerType === a.partnerType)!;
    const problems = [...appProblems(a, rule), ...checklistProblems(a, rule)];
    if (problems.length) throw new Error(problems.join(' | '));
    const code = CITY_CODE[a.city.trim().toLowerCase()] ?? a.city.slice(0, 3).toUpperCase();
    const n: Nursery = {
      id: uid('n'), uniqueId: 'NURS-' + code + '-' + String(d.nurseries.length + 1).padStart(3, '0'), partnerType: a.partnerType, legalName: a.shopName,
      brandName: brandName.trim(), seoAliases: [], ownerPhone: digits(a.phone).slice(-10), lat: a.lat ?? config.defaultLocation.lat, lng: a.lng ?? config.defaultLocation.lng,
      city: a.city, isOpen: false, tier: 'new', probationEndsOn: addDays(d.settings.probationDays), licenceNo: a.licenceNo || undefined,
      licenceExpiry: a.licenceExpiry || undefined, gstin: a.gstin || undefined, status: 'active', createdAt: Date.now(),
    };
    d.nurseries.push(n);
    const user = d.users.find((u) => u.id === a.applicantId);
    if (user) { user.role = 'partner'; user.nurseryId = n.id; }
    a.status = 'approved'; a.nurseryId = n.id; a.reviewedAt = Date.now();
    log(admin.id, 'approve_application', a.shopName + ' -> ' + n.uniqueId);
    commit();
  },
  async adminReject(id, reason) {
    const d = db(); const admin = need(['admin']);
    const a = d.applications.find((x) => x.id === id);
    if (!a) throw new Error('Application nahi mili');
    if (!reason.trim()) throw new Error('Reject ka reason likho');
    a.status = 'rejected'; a.rejectReason = reason; a.reviewedAt = Date.now();
    log(admin.id, 'reject_application', a.shopName + ': ' + reason); commit();
  },
  async adminNeedInfo(id, note) {
    const d = db(); const admin = need(['admin']);
    const a = d.applications.find((x) => x.id === id);
    if (!a) throw new Error('Application nahi mili');
    if (!note.trim()) throw new Error('Kya chahiye wo likho');
    a.status = 'need_more_info' as AppStatus; a.reviewNote = note; a.reviewedAt = Date.now();
    log(admin.id, 'need_more_info', a.shopName + ': ' + note); commit();
  },
  async adminDocUrl(applicationId, docType) {
    const d = db(); const admin = need(['admin']);
    const a = d.applications.find((x) => x.id === applicationId);
    const doc = a?.docs.find((x) => x.type === (docType as DocType));
    log(admin.id, 'kyc_doc_viewed', (a?.shopName ?? '?') + ' / ' + docType); commit();
    return doc?.thumb ?? '';
  },
  async adminNurseries() { need(['admin']); return clone(db().nurseries); },
  async adminAddNursery(n) {
    const d = db(); const admin = need(['admin']);
    const code = CITY_CODE[n.city.trim().toLowerCase()] ?? n.city.slice(0, 3).toUpperCase();
    const row: Nursery = {
      id: uid('n'), uniqueId: 'NURS-' + code + '-' + String(d.nurseries.length + 1).padStart(3, '0'), partnerType: n.partnerType, legalName: n.legalName, brandName: n.brandName,
      seoAliases: [], ownerPhone: n.ownerPhone, lat: n.lat, lng: n.lng, city: n.city, isOpen: false, tier: 'verified', status: 'active', createdAt: Date.now(),
    };
    d.nurseries.push(row); log(admin.id, 'add_nursery', row.uniqueId); commit();
    return clone(row);
  },
  async adminSetNurseryStatus(id, status) {
    const d = db(); const admin = need(['admin']);
    const n = d.nurseries.find((x) => x.id === id); if (!n) throw new Error('Nursery nahi mili');
    n.status = status; log(admin.id, 'nursery_status', n.uniqueId + '=' + status); commit();
  },
  async listCategories() { return clone(db().categories.filter((c) => c.active).sort((a, b) => a.order - b.order)); },
  async listSlideshows() { return clone(db().slideshows.filter((x) => x.enabled && x.slides.length > 0)); },
  async adminUpdateNursery(id, patch) {
    const d = db(); const admin = need(['admin']);
    const n = d.nurseries.find((x) => x.id === id); if (!n) throw new Error('Nursery nahi mili');
    if (patch.brandName !== undefined && !patch.brandName.trim()) throw new Error('Brand name khali nahi ho sakta');
    Object.assign(n, patch);
    log(admin.id, 'nursery_edit', n.uniqueId + ' ' + Object.keys(patch).join(',')); commit();
  },
  async adminUpdatePlant(id, patch) {
    const d = db(); const admin = need(['admin']);
    const p = d.plants.find((x) => x.id === id); if (!p) throw new Error('Product nahi mila');
    if (patch.price !== undefined && !(patch.price > 0)) throw new Error('Sahi price daalo');
    if (patch.categories !== undefined) { if (!patch.categories.length) throw new Error('Kam se kam ek category chuno'); p.category = patch.categories[0]; }
    Object.assign(p, patch);
    if (!p.ribbon) delete p.ribbon;
    log(admin.id, 'plant_edit', p.sku + ' ' + Object.keys(patch).join(',')); commit();
  },
  async adminAllCategories() { need(['admin']); return clone([...db().categories].sort((a, b) => a.order - b.order)); },
  async adminSaveCategory(c: CategoryDef) {
    const d = db(); const admin = need(['admin']);
    if (!/^[a-z0-9_]+$/.test(c.key)) throw new Error('Category key sirf a-z, 0-9, _ me');
    if (!(c.name.hi || c.name.en)) throw new Error('Category ka naam daalo');
    const ex = d.categories.find((x) => x.key === c.key);
    if (ex) Object.assign(ex, c); else d.categories.push({ ...c, order: c.order ?? d.categories.length });
    log(admin.id, 'category_save', c.key); commit();
  },
  async adminDeleteCategory(key) {
    const d = db(); const admin = need(['admin']);
    if (d.plants.some((p) => p.categories.includes(key))) throw new Error('Is category me products hain. Pehle unhe dusri category me daalo ya category ko off karo.');
    d.categories = d.categories.filter((c) => c.key !== key); log(admin.id, 'category_delete', key); commit();
  },
  async listForms() { return clone(db().forms.filter((f) => f.enabled && f.fields.length > 0)); },
  async submitLead(input) {
    const d = db();
    const f = d.forms.find((x) => x.id === input.formId && x.enabled);
    if (!f) throw new Error('Ye form abhi band hai');
    const name = input.name.trim(); const phone = digits(input.phone).slice(-10);
    if (name.length < 2) throw new Error('Apna naam daalo');
    if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Sahi 10 ank ka mobile number daalo');
    const answers = [];
    for (const fld of f.fields) {
      const a = input.answers.find((x) => x.id === fld.id);
      const v = (a?.value ?? '').trim();
      if (fld.required && !v) throw new Error('Zaruri jawab bharo: ' + pickName(fld.label, 'en'));
      if (v) answers.push({ id: fld.id, label: pickName(fld.label, 'en'), type: fld.type, value: v });
    }
    const now = Date.now();
    d.leads.unshift({ id: uid('lead'), formId: f.id, formName: f.name, name, phone, answers, status: 'new', note: '', createdAt: now, updatedAt: now });
    commit();
  },
  async adminAllForms() { need(['admin']); return clone(db().forms); },
  async adminSaveForm(f) {
    const d = db(); const admin = need(['admin']);
    if (!f.name.trim()) throw new Error('Form ka naam daalo');
    if (f.fields.length === 0) throw new Error('Kam se kam ek field jodo');
    const ids = new Set<string>();
    for (const fl of f.fields) {
      if (!(fl.label.en || fl.label.hi)) throw new Error('Har field ka label daalo');
      if (['select', 'radio', 'checkbox'].includes(fl.type) && !(fl.options && fl.options.length)) throw new Error('Is field ke vikalp (options) daalo: ' + (fl.label.en || fl.label.hi));
      if (ids.has(fl.id)) throw new Error('Field id repeat ho rahi hai');
      ids.add(fl.id);
    }
    const i = d.forms.findIndex((x) => x.id === f.id);
    if (i >= 0) d.forms[i] = clone(f); else d.forms.push(clone(f));
    log(admin.id, 'form_save', f.name); commit();
  },
  async adminDeleteForm(id) {
    const d = db(); const admin = need(['admin']);
    d.forms = d.forms.filter((x) => x.id !== id); log(admin.id, 'form_delete', id); commit();
  },
  async adminLeads() { need(['admin']); return clone(db().leads); },
  async adminUpdateLead(id, patch) {
    const d = db(); const admin = need(['admin']);
    const l = d.leads.find((x) => x.id === id); if (!l) throw new Error('Lead nahi mili');
    if (patch.status) { log(admin.id, 'lead_status', l.name + ': ' + l.status + ' -> ' + patch.status); l.status = patch.status; }
    if (patch.note !== undefined) { l.note = patch.note; log(admin.id, 'lead_note', l.name); }
    l.updatedAt = Date.now(); commit();
  },
  async adminDeleteLead(id) {
    const d = db(); const admin = need(['admin']);
    d.leads = d.leads.filter((x) => x.id !== id); log(admin.id, 'lead_delete', id); commit();
  },
  async adminAllSlideshows() { need(['admin']); return clone(db().slideshows); },
  async adminSaveSlideshow(s: Slideshow) {
    const d = db(); const admin = need(['admin']);
    if (!s.name.trim()) throw new Error('Slideshow ka naam daalo');
    const i = d.slideshows.findIndex((x) => x.id === s.id);
    if (i >= 0) d.slideshows[i] = clone(s); else d.slideshows.push(clone(s));
    log(admin.id, 'slideshow_save', s.name); commit();
  },
  async adminDeleteSlideshow(id) {
    const d = db(); const admin = need(['admin']);
    d.slideshows = d.slideshows.filter((x) => x.id !== id); log(admin.id, 'slideshow_delete', id); commit();
  },
  async adminSetNurseryOpen(id, open) {
    const d = db(); const admin = need(['admin']);
    const n = d.nurseries.find((x) => x.id === id); if (!n) throw new Error('Nursery nahi mili');
    if (open && n.status !== 'active') throw new Error('Blocked nursery ko open nahi kar sakte');
    n.isOpen = open; log(admin.id, 'nursery_open', n.uniqueId + '=' + open); commit();
  },
  async adminPlants(): Promise<AdminPlant[]> {
    const d = db(); need(['admin']);
    return clone(d.plants.map((p) => {
      const n = d.nurseries.find((x) => x.id === p.nurseryId);
      return { ...p, nurseryBrand: n?.brandName ?? '?', nurseryUid: n?.uniqueId ?? '?' };
    }));
  },
  async adminSetPlantStatus(id, status, reason) {
    const d = db(); const admin = need(['admin']);
    const p = d.plants.find((x) => x.id === id); if (!p) throw new Error('Product nahi mila');
    if (status === 'live') {
      const n = d.nurseries.find((x) => x.id === p.nurseryId);
      const rule = d.rules.find((r) => r.partnerType === n?.partnerType);
      const inProb = n?.probationEndsOn && n.probationEndsOn >= todayStr();
      const liveCount = d.plants.filter((x) => x.nurseryId === p.nurseryId && x.status === 'live').length;
      if (inProb && rule && liveCount >= rule.maxLiveProbation) throw new Error('Probation limit: is nursery ke max ' + rule.maxLiveProbation + ' live products ho sakte hain');
    }
    p.status = status; p.rejectReason = status === 'rejected' ? reason : undefined;
    log(admin.id, 'plant_' + status, p.sku); commit();
  },
  async adminAddPlant(nurseryId, input, goLive) {
    const d = db(); const admin = need(['admin']);
    const n = d.nurseries.find((x) => x.id === nurseryId);
    if (!n) throw new Error('Pehle nursery select karo');
    if (!(input.name.hi || input.name.en)) throw new Error('Naam daalo');
    if (!(input.price > 0)) throw new Error('Sahi price daalo');
    const sku = input.sku || (input.name.en || input.name.hi).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const cats = input.categories?.length ? input.categories : [input.category];
    d.plants.unshift({ id: uid('p'), nurseryId, sku, name: input.name, category: cats[0], categories: cats, ribbon: input.ribbon || undefined, price: input.price, stock: input.stock, image: input.image || '🌱',
      care: input.care ?? '', festivalTags: input.festivalTags ?? [], status: goLive ? 'live' : 'pending', createdAt: Date.now() });
    log(admin.id, 'admin_add_plant', n.uniqueId + ' ' + sku); commit();
  },
  async adminOrders() { need(['admin']); return clone(db().orders); },
  async adminAdvanceOrder(id) {
    const d = db(); const admin = need(['admin']);
    const o = d.orders.find((x) => x.id === id); if (!o) throw new Error('Order nahi mila');
    const next: Partial<Record<OrderStatus, OrderStatus>> = { new: 'accepted', accepted: 'packed', packed: 'out_for_delivery', out_for_delivery: 'delivered' };
    const to = next[o.status];
    if (!to) throw new Error('Aage badhane layak status nahi');
    o.status = to; o.events.push({ status: to, at: Date.now(), note: 'Admin' }); log(admin.id, 'order_' + to, o.shortId); commit();
  },
  async adminCancelOrder(id) {
    const d = db(); const admin = need(['admin']);
    const o = d.orders.find((x) => x.id === id); if (!o) throw new Error('Order nahi mila');
    if (['delivered', 'cancelled'].includes(o.status)) throw new Error('Ab cancel nahi ho sakta');
    if (['new', 'accepted', 'packed', 'out_for_delivery'].includes(o.status)) stockDelta(d, o, 1);
    o.status = 'cancelled'; o.events.push({ status: 'cancelled', at: Date.now(), note: 'Admin ne cancel kiya' }); log(admin.id, 'order_cancel', o.shortId); commit();
  },
  async adminAllDeliveryPartners() { need(['admin']); return clone(db().deliveryPartners); },
  async adminSaveDeliveryPartner(dp) {
    const d = db(); const admin = need(['admin']);
    const ex = dp.id ? d.deliveryPartners.find((x) => x.id === dp.id) : undefined;
    if (ex) Object.assign(ex, dp);
    else d.deliveryPartners.push({ id: uid('d'), name: dp.name, ratePerKm: dp.ratePerKm ?? 8, minCharge: dp.minCharge ?? 50, vehicleTypes: dp.vehicleTypes ?? ['bike'], active: dp.active ?? true, deepLink: dp.deepLink });
    log(admin.id, 'delivery_partner_save', dp.name); commit();
  },
  async adminDeleteDeliveryPartner(id) {
    const d = db(); const admin = need(['admin']);
    d.deliveryPartners = d.deliveryPartners.filter((x) => x.id !== id); log(admin.id, 'delivery_partner_delete', id); commit();
  },
  async adminComplaints() { need(['admin']); return clone(db().complaints); },
  async adminResolveComplaint(id, resolution) {
    const d = db(); const admin = need(['admin']);
    const c = d.complaints.find((x) => x.id === id); if (!c) throw new Error('Complaint nahi mili');
    c.status = 'resolved'; c.resolution = resolution; log(admin.id, 'complaint_resolved', id); commit();
  },
  async adminUpdateRule(rule) {
    const d = db(); const admin = need(['admin']);
    const i = d.rules.findIndex((r) => r.partnerType === rule.partnerType);
    if (i >= 0) d.rules[i] = clone(rule);
    log(admin.id, 'rule_update', rule.partnerType); commit();
  },
  async adminSaveSettings(s) { const d = db(); const admin = need(['admin']); d.settings = clone(s); log(admin.id, 'settings', 'updated'); commit(); },
  async adminAudit() { need(['admin']); return clone(db().audit); },
  async adminResetDemo() { need(['admin']); cache = seed(); commit(); },
};
