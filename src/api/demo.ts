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
import { seed, type DemoDB, type DemoUser } from './seed';
import type {
  AdminPlant, Application, AppStatus, Complaint, DeliveryPartner, DocType, Earnings, NewPlantInput, Nursery, Order, OrderStatus,
  PlaceOrderInput, Plant, PublicPlant, Rule, Settings, User,
} from '../lib/types';
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
  }
  return cache;
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
    if (rule && !rule.allowedCategories.includes(input.category)) throw new Error('Is type ka partner ye category nahi bech sakta');
    if (!(input.name.hi || input.name.en)) throw new Error('Product ka naam daalo');
    if (!(input.price > 0)) throw new Error('Sahi price daalo');
    const sku = input.sku || (input.name.en || input.name.hi).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    d.plants.unshift({
      id: uid('p'), nurseryId: n.id, sku, name: input.name, category: input.category, price: input.price, stock: input.stock,
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
    const d = db(); need(['admin']);
    const a = d.applications.find((x) => x.id === id);
    if (!a) throw new Error('Application nahi mili');
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
    d.plants.unshift({ id: uid('p'), nurseryId, sku, name: input.name, category: input.category, price: input.price, stock: input.stock, image: input.image || '🌱',
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
