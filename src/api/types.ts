import type {
  AdminPlant, Application, AuditRow, Complaint, DeliveryPartner, Earnings, NewPlantInput, Nursery, Order,
  PartnerType, PlaceOrderInput, PublicPlant, Plant, Rule, Settings, User,
} from '../lib/types';

/**
 * Ek hi interface: demo.ts (browser me) aur supabase.ts (asli backend) dono isko implement karte hain.
 * UI sirf isi interface se baat karta hai, isliye demo -> real switch me UI nahi badalta.
 */
export interface Api {
  mode: 'demo' | 'supabase';
  subscribe(cb: () => void): () => void;

  // ---- session ----
  currentUser(): Promise<User | null>;
  customerSendCode(identifier: string): Promise<{ hint?: string }>;
  customerVerifyCode(identifier: string, code: string, name?: string): Promise<User>;
  partnerLogin(phone: string, pin: string): Promise<User>;
  partnerRegister(phone: string, pin: string, name: string): Promise<User>;
  adminLogin(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  setLanguage(lang: string): Promise<void>;

  // ---- public catalog ----
  listPublicPlants(loc: { lat: number; lng: number }): Promise<PublicPlant[]>;
  listDeliveryPartners(): Promise<DeliveryPartner[]>;
  getSettings(): Promise<Settings>;

  // ---- customer ----
  placeOrders(input: PlaceOrderInput): Promise<Order[]>;
  myOrders(): Promise<Order[]>;
  cancelMyOrder(id: string): Promise<void>;
  reviewOrder(id: string, rating: number, comment: string): Promise<void>;
  raiseComplaint(orderId: string, reason: string, photo?: string): Promise<void>;

  // ---- partner (Godown) ----
  myNursery(): Promise<Nursery | null>;
  myRule(): Promise<Rule | null>;
  setShopOpen(open: boolean): Promise<void>;
  nurseryOrders(): Promise<Order[]>;
  respondOrder(id: string, action: 'accept' | 'reject' | 'packed'): Promise<void>;
  myPlants(): Promise<Plant[]>;
  addMyPlant(input: NewPlantInput): Promise<void>;
  setStock(plantId: string, stock: number): Promise<void>;
  earnings(): Promise<Earnings>;

  // ---- partner application ----
  listRules(): Promise<Rule[]>;
  myApplication(): Promise<Application | null>;
  saveApplication(a: Partial<Application> & { partnerType: PartnerType }): Promise<Application>;
  submitApplication(): Promise<Application>;

  // ---- admin (Office) ----
  adminApplications(): Promise<Application[]>;
  adminUpdateApplication(id: string, patch: Partial<Application>): Promise<void>;
  adminApprove(id: string, brandName: string): Promise<void>;
  adminReject(id: string, reason: string): Promise<void>;
  adminNeedInfo(id: string, note: string): Promise<void>;
  adminDocUrl(applicationId: string, docType: string): Promise<string>;
  adminNurseries(): Promise<Nursery[]>;
  adminAddNursery(n: Pick<Nursery, 'legalName' | 'brandName' | 'ownerPhone' | 'lat' | 'lng' | 'city' | 'partnerType'>): Promise<Nursery>;
  adminSetNurseryStatus(id: string, status: Nursery['status']): Promise<void>;
  adminPlants(): Promise<AdminPlant[]>;
  adminSetPlantStatus(id: string, status: 'live' | 'rejected' | 'pending', reason?: string): Promise<void>;
  adminAddPlant(nurseryId: string, input: NewPlantInput, goLive: boolean): Promise<void>;
  adminOrders(): Promise<Order[]>;
  adminAdvanceOrder(id: string): Promise<void>;
  adminCancelOrder(id: string): Promise<void>;
  adminAllDeliveryPartners(): Promise<DeliveryPartner[]>;
  adminSaveDeliveryPartner(dp: Partial<DeliveryPartner> & { name: string }): Promise<void>;
  adminDeleteDeliveryPartner(id: string): Promise<void>;
  adminComplaints(): Promise<Complaint[]>;
  adminResolveComplaint(id: string, resolution: string): Promise<void>;
  adminUpdateRule(rule: Rule): Promise<void>;
  adminSaveSettings(s: Settings): Promise<void>;
  adminAudit(): Promise<AuditRow[]>;
  adminResetDemo?(): Promise<void>;
}
