import type { Application, Category, Complaint, DeliveryPartner, Nursery, Plant, Rule, Settings } from '../lib/types';
import { addDays } from '../lib/format';

// ---- Demo data. Demo mode me yahi dikhta hai. Real mode me Supabase ka data dikhega. ----
export interface DemoUser {
  id: string;
  role: 'customer' | 'partner' | 'admin';
  name: string;
  phone?: string;
  email?: string;
  pin?: string; // demo only
  password?: string; // demo only
  nurseryId?: string;
  language: string;
}

export interface DemoDB {
  users: DemoUser[];
  nurseries: Nursery[];
  plants: Plant[];
  deliveryPartners: DeliveryPartner[];
  orders: import('../lib/types').Order[];
  applications: Application[];
  complaints: Complaint[];
  rules: Rule[];
  settings: Settings;
  audit: import('../lib/types').AuditRow[];
  seq: number;
}

const now = Date.now();
const DAY = 86400000;

const nursery = (i: number, o: Partial<Nursery>): Nursery => ({
  id: 'n' + i, uniqueId: 'NURS-LKO-' + String(i).padStart(3, '0'), partnerType: 'nursery', legalName: '', brandName: '', seoAliases: [],
  ownerPhone: '', lat: 26.85, lng: 80.95, city: 'Lucknow', isOpen: true, tier: 'verified', status: 'active', createdAt: now - 30 * DAY, ...o,
});

let pid = 0;
const plant = (nurseryId: string, sku: string, hi: string, en: string, category: Category, price: number, stock: number, image: string, care: string, tags: string[] = []): Plant => ({
  id: 'p' + ++pid, nurseryId, sku, name: { hi, en }, category, price, stock, image, care, festivalTags: tags, status: 'live', createdAt: now - 20 * DAY,
});

export function seed(): DemoDB {
  pid = 0;
  const nurseries: Nursery[] = [
    nursery(1, { legalName: 'Ram Prasad Nursery', brandName: 'Green Heaven', ownerPhone: '9000000001', lat: 26.85, lng: 81.01, tier: 'trusted' }),
    nursery(2, { legalName: 'Sharma Garden Centre', brandName: 'City Greens', ownerPhone: '9000000002', lat: 26.89, lng: 80.94 }),
    nursery(3, { legalName: 'Verma Khad Beej Bhandar', brandName: 'Kisan Khaad Bhandar', ownerPhone: '9000000003', partnerType: 'fertilizer_shop', lat: 26.8, lng: 80.91,
      licenceNo: 'FERT/LKO/2024/118', licenceExpiry: addDays(200), gstin: '09ABCDE1234F1Z5' }),
  ];
  const plants: Plant[] = [
    plant('n1', 'tulsi', 'तुलसी', 'Tulsi (Holy Basil)', 'medicinal', 60, 40, '🌿', 'Roz thoda paani, dhoop me rakho. Sardiyon me thanda se bachao.', ['diwali']),
    plant('n2', 'tulsi', 'तुलसी', 'Tulsi (Holy Basil)', 'medicinal', 75, 25, '🌿', 'Roz thoda paani, dhoop me rakho.', ['diwali']),
    plant('n1', 'money-plant', 'मनी प्लांट', 'Money Plant', 'indoor', 120, 30, '🪴', 'Chhaon ya halki dhoop. Hafte me 2 baar paani.'),
    plant('n2', 'money-plant', 'मनी प्लांट', 'Money Plant', 'indoor', 99, 12, '🪴', 'Chhaon ya halki dhoop. Hafte me 2 baar paani.'),
    plant('n1', 'rose', 'गुलाब', 'Rose (Desi)', 'flowering', 150, 18, '🌹', 'Roz 5-6 ghante dhoop. Sardi me chhantai karo.'),
    plant('n2', 'marigold', 'गेंदा', 'Marigold', 'flowering', 40, 80, '🌼', 'Poori dhoop. Phool todte raho, naye aayenge.', ['diwali', 'holi']),
    plant('n1', 'aloe-vera', 'एलोवेरा', 'Aloe Vera', 'medicinal', 90, 35, '🪴', 'Kam paani, achhi dhoop. Jad me paani na ruke.'),
    plant('n2', 'snake-plant', 'स्नेक प्लांट', 'Snake Plant', 'indoor', 220, 14, '🌱', 'Bahut kam paani. Kam roshni me bhi chalta hai.'),
    plant('n1', 'jade', 'जेड प्लांट', 'Jade Plant', 'succulent', 180, 10, '🌵', 'Hafte me ek baar paani. Tez dhoop se bachao.'),
    plant('n2', 'neem', 'नीम का पौधा', 'Neem Sapling', 'outdoor', 70, 50, '🌳', 'Khuli dhoop. Pehle saal roz paani.'),
    plant('n2', 'terracotta-pot', 'मिट्टी का गमला', 'Terracotta Pot (10 inch)', 'pots', 130, 40, '🏺', 'Paani nikasi ka chhed hona zaruri hai.'),
    plant('n1', 'tool-set', 'बागवानी औज़ार सेट', 'Gardening Tool Set (3 pc)', 'tools', 349, 15, '🛠️', 'Istemal ke baad saaf karke sukhao.'),
    plant('n3', 'vermicompost', 'वर्मी कम्पोस्ट 5kg', 'Vermicompost 5 kg', 'soil_manure', 199, 60, '🧺', 'Gamle me upar ki mitti me milao.'),
    plant('n3', 'npk', 'एनपीके खाद 1kg', 'NPK Fertilizer 1 kg', 'soil_manure', 140, 45, '🧪', 'Package par likhi matra se zyada mat daalo.'),
    plant('n3', 'tomato-seed', 'टमाटर के बीज', 'Tomato Seeds', 'seeds', 30, 100, '🍅', 'Oct-Nov me boyein. Halki dhoop wali jagah.'),
    plant('n3', 'marigold-seed', 'गेंदा के बीज', 'Marigold Seeds', 'seeds', 25, 90, '🌼', 'Poori dhoop. 7-10 din me ankur.', ['diwali']),
  ];
  const deliveryPartners: DeliveryPartner[] = [
    { id: 'd1', name: 'Porter', ratePerKm: 9, minCharge: 60, vehicleTypes: ['bike', '3w', 'ace'], active: true, deepLink: 'https://porter.in/' },
    { id: 'd2', name: 'Shadowfax', ratePerKm: 8, minCharge: 55, vehicleTypes: ['bike'], active: true },
    { id: 'd3', name: 'Borzo', ratePerKm: 10, minCharge: 70, vehicleTypes: ['bike', 'ace'], active: true },
    { id: 'd4', name: 'Rapido', ratePerKm: 7, minCharge: 40, vehicleTypes: ['bike'], active: true },
    { id: 'd5', name: 'Own Delivery', ratePerKm: 6, minCharge: 30, vehicleTypes: ['bike'], active: false },
  ];
  const idDocs = ['aadhaar_masked', 'pan', 'residence_certificate', 'driving_licence', 'passport', 'voter_id'] as Rule['allowedIdDocs'];
  const rules: Rule[] = [
    { partnerType: 'at_home', allowedIdDocs: idDocs, requiredDocs: ['selfie', 'home_garden_photo'], licenceRequired: false, gstRequired: false,
      allowedCategories: ['indoor', 'outdoor', 'flowering', 'succulent', 'medicinal', 'seeds', 'pots'], maxLiveProbation: 20 },
    { partnerType: 'nursery', allowedIdDocs: idDocs, requiredDocs: ['shop_photo_front', 'shop_photo_inside'], licenceRequired: false, gstRequired: false,
      allowedCategories: ['indoor', 'outdoor', 'flowering', 'succulent', 'medicinal', 'seeds', 'pots', 'tools', 'soil_manure'], maxLiveProbation: 20 },
    { partnerType: 'fertilizer_shop', allowedIdDocs: idDocs, requiredDocs: ['shop_photo_front', 'shop_photo_inside', 'fertilizer_licence'], licenceRequired: true, gstRequired: true,
      allowedCategories: ['soil_manure', 'tools', 'pots'], maxLiveProbation: 20 },
    { partnerType: 'seed_shop', allowedIdDocs: idDocs, requiredDocs: ['shop_photo_front', 'shop_photo_inside'], licenceRequired: false, gstRequired: true,
      allowedCategories: ['seeds', 'tools'], maxLiveProbation: 20 },
  ];
  const settings: Settings = {
    acceptSeconds: 300, cancelSeconds: 120, probationDays: 14, payoutHoldDays: 7, slaHours: 48, split: { nursery: 80, platform: 15, pool: 5 },
  };
  const users: DemoUser[] = [
    { id: 'u_admin', role: 'admin', name: 'Admin (Demo)', email: 'admin@demo.local', password: 'demo123', language: 'hi' },
    { id: 'u_p1', role: 'partner', name: 'Ram Prasad', phone: '9000000001', pin: '1234', nurseryId: 'n1', language: 'hi' },
    { id: 'u_p2', role: 'partner', name: 'Sharma Ji', phone: '9000000002', pin: '1234', nurseryId: 'n2', language: 'hi' },
    { id: 'u_p3', role: 'partner', name: 'Verma Ji', phone: '9000000003', pin: '1234', nurseryId: 'n3', language: 'hi' },
    { id: 'u_applicant', role: 'customer', name: 'Sunita Devi', phone: '9000000010', pin: '1234', language: 'hi' },
    { id: 'u_c1', role: 'customer', name: 'Demo Customer', phone: '9876543210', language: 'hi' },
  ];
  const applications: Application[] = [{
    id: 'app1', applicantId: 'u_applicant', partnerType: 'at_home', shopName: 'Sunita Home Garden', brandSuggestion: 'Sunita Green Corner', ownerName: 'Sunita Devi',
    phone: '9000000010', whatsapp: '9000000010', address: 'Indira Nagar, Lucknow', city: 'Lucknow', pincode: '226016', lat: 26.87, lng: 80.99, language: 'hi',
    upiId: 'sunita@upi', gstin: '', licenceNo: '', licenceExpiry: '', docs: [
      { type: 'voter_id', name: 'voter.jpg', thumb: '', takenAt: now - DAY },
      { type: 'selfie', name: 'selfie.jpg', thumb: '', takenAt: now - DAY, gps: { lat: 26.87, lng: 80.99 } },
      { type: 'home_garden_photo', name: 'garden.jpg', thumb: '', takenAt: now - DAY, gps: { lat: 26.87, lng: 80.99 } },
    ], status: 'submitted', checklist: {}, consentAt: now - DAY, submittedAt: now - DAY, slaDueAt: now + DAY, createdAt: now - 2 * DAY,
  }];
  return { users, nurseries, plants, deliveryPartners, orders: [], applications, complaints: [], rules, settings, audit: [], seq: 10 };
}
