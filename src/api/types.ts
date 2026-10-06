import type {
  AdminPlant, Application, Availability, Booking, BookingStatus, MyBooking, ProviderJob, ProviderOption, ServiceDef, SubmitBookingInput, CategoryDef, CustomForm, Lead, LeadStatus, Slideshow, SubmitLeadInput, AuditRow, Complaint, DeliveryPartner, Earnings, NewPlantInput, Nursery, Order,
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
  listCategories(): Promise<CategoryDef[]>;
  listSlideshows(): Promise<Slideshow[]>;
  listForms(): Promise<CustomForm[]>;
  submitLead(input: SubmitLeadInput): Promise<void>;
  listServices(): Promise<ServiceDef[]>;
  checkAvailability(serviceKey: string, date: string, time?: string): Promise<Availability>;
  submitBooking(input: SubmitBookingInput): Promise<{ shortId: string }>;
  myBookings(): Promise<MyBooking[]>;
  cancelMyBooking(id: string): Promise<{ refund: number }>;
  claimTokenPaid(id: string): Promise<void>;

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
  myJobs(): Promise<ProviderJob[]>;
  respondJob(id: string, action: 'accept' | 'decline' | 'done'): Promise<void>;
  updateMyProfile(patch: { startingPrice?: number; serviceRadiusKm?: number; bio?: string; blockedDates?: string[] }): Promise<void>;
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
  adminSetNurseryOpen(id: string, open: boolean): Promise<void>;
  adminUpdateNursery(id: string, patch: Partial<Pick<Nursery, 'legalName' | 'brandName' | 'ownerPhone' | 'lat' | 'lng' | 'city' | 'partnerType' | 'tier' | 'licenceNo' | 'licenceExpiry' | 'gstin' | 'startingPrice' | 'serviceRadiusKm' | 'bio' | 'blockedDates' | 'priority'>>): Promise<void>;
  adminUpdatePlant(id: string, patch: Partial<Pick<Plant, 'name' | 'categories' | 'ribbon' | 'price' | 'stock' | 'image' | 'care' | 'festivalTags'>>): Promise<void>;
  adminAllCategories(): Promise<CategoryDef[]>;
  adminSaveCategory(c: CategoryDef): Promise<void>;
  adminDeleteCategory(key: string): Promise<void>;
  adminAllForms(): Promise<CustomForm[]>;
  adminSaveForm(f: CustomForm): Promise<void>;
  adminDeleteForm(id: string): Promise<void>;
  adminLeads(): Promise<Lead[]>;
  adminUpdateLead(id: string, patch: { status?: LeadStatus; note?: string }): Promise<void>;
  adminDeleteLead(id: string): Promise<void>;
  adminServices(): Promise<ServiceDef[]>;
  adminSaveService(s: ServiceDef): Promise<void>;
  adminBookings(): Promise<Booking[]>;
  adminUpdateBooking(id: string, patch: Partial<Pick<Booking, 'customerName' | 'customerPhone' | 'date' | 'time' | 'venue' | 'pincode' | 'remarks' | 'note' | 'agreedAmount'>>): Promise<void>;
  adminBookingCalled(id: string): Promise<void>;
  adminBookingConfirm(id: string, agreedAmount: number): Promise<void>;
  adminBookingTokenPaid(id: string): Promise<void>;
  adminBookingAssign(id: string, providerId: string | null): Promise<void>;
  adminBookingDone(id: string): Promise<void>;
  adminBookingCancel(id: string, by: 'customer' | 'owner' | 'provider', reason: string): Promise<{ refund: number }>;
  adminProvidersFor(bookingId: string): Promise<ProviderOption[]>;
  adminAllSlideshows(): Promise<Slideshow[]>;
  adminSaveSlideshow(s: Slideshow): Promise<void>;
  adminDeleteSlideshow(id: string): Promise<void>;
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
