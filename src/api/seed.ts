import type { Application, Category, CategoryDef, Complaint, DeliveryPartner, Nursery, Plant, Rule, Settings, Slideshow, CustomForm, Lead, ServiceDef, Booking } from '../lib/types';
import { CATEGORIES, CATEGORY_EMOJI } from '../lib/types';
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
  categories: CategoryDef[];
  slideshows: Slideshow[];
  forms: CustomForm[];
  leads: Lead[];
  services: ServiceDef[];
  bookings: Booking[];
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
  id: 'p' + ++pid, nurseryId, sku, name: { hi, en }, category, categories: [category], price, stock, image, care, festivalTags: tags, status: 'live', createdAt: now - 20 * DAY,
});

const CAT_NAMES: Record<string, [string, string]> = {
  indoor: ['इनडोर', 'Indoor'], outdoor: ['आउटडोर', 'Outdoor'], flowering: ['फूल वाले', 'Flowering'], succulent: ['सक्यूलेंट', 'Succulent'], medicinal: ['औषधीय', 'Medicinal'],
  seeds: ['बीज', 'Seeds'], pots: ['गमले', 'Pots'], tools: ['औज़ार', 'Tools'], soil_manure: ['मिट्टी और खाद', 'Soil & Manure'],
  flowers: ['फूल', 'Flowers'], bouquet: ['बुके', 'Bouquet'], mala: ['माला', 'Mala / Garland'],
};
export const defaultCategories = (): CategoryDef[] => CATEGORIES.map((k, i) => ({ key: k, name: { hi: CAT_NAMES[k][0], en: CAT_NAMES[k][1] }, emoji: CATEGORY_EMOJI[k], active: true, order: i }));

export const defaultSlideshows = (): Slideshow[] => {
  const sl = (id: string, bg: string, emoji: string, ribbon: string, hi: string, en: string, shi: string, sen: string, action?: { type: 'category' | 'search' | 'link'; value: string }, btnHi = 'देखें', btnEn = 'Shop now') => ({
    id, image: '', bg, emoji, ribbon, title: { hi, en }, subtitle: { hi: shi, en: sen }, action,
    buttons: action ? [{ type: action.type, value: action.value, label: { hi: btnHi, en: btnEn } }] : [],
  });
  return [
    { id: 'ss_top', name: 'Top slideshow (search ke neeche)', placement: 'top', enabled: true, intervalSec: 4, border: false, transition: 'slide', height: 'md', slides: [
      sl('s1', '#15803d,#4ade80', '🌿', 'New', 'पौधे घर तक', 'Plants at your door', 'पास की नर्सरी से सीधे', 'Straight from nearby nurseries', { type: 'category', value: 'indoor' }),
      sl('s2', '#b45309,#fbbf24', '🪔', 'Festival', 'त्योहार विशेष', 'Festival special', 'गेंदा, तुलसी और बहुत कुछ', 'Marigold, tulsi and more', { type: 'category', value: 'flowering' }),
      sl('s3', '#0e7490,#67e8f9', '🪴', '', 'इनडोर पौधे', 'Indoor plants', 'घर को हरा-भरा बनाएँ', 'Make your home green', { type: 'category', value: 'indoor' }),
      sl('s4', '#7c2d12,#fdba74', '🌱', '', 'बीज और खाद', 'Seeds & manure', 'बागवानी की हर चीज़', 'Everything for gardening', { type: 'category', value: 'seeds' }),
      sl('s5', '#4d7c0f,#bef264', '🛠️', '', 'बागवानी के औज़ार', 'Gardening tools', 'अच्छे औज़ार, अच्छी फसल', 'Good tools, good growth', { type: 'category', value: 'tools' }),
    ] },
    { id: 'ss_mid', name: 'Mid slideshow (home ke beech)', placement: 'mid', enabled: true, intervalSec: 5, border: true, transition: 'fade', height: 'sm', slides: [
      sl('m1', '#166534,#86efac', '🌳', 'Hot', 'आउटडोर पौधे', 'Outdoor plants', 'छाँव और हरियाली', 'Shade and greenery', { type: 'category', value: 'outdoor' }),
      sl('m2', '#9d174d,#f9a8d4', '🌸', '', 'फूलों के पौधे', 'Flowering plants', 'रंग-बिरंगे फूल', 'Colourful blooms', { type: 'category', value: 'flowering' }),
      sl('m3', '#1e3a8a,#93c5fd', '🏺', '', 'गमले', 'Pots', 'हर साइज़ के गमले', 'Pots of every size', { type: 'category', value: 'pots' }),
    ] },
  ];
};

export function seed(): DemoDB {
  pid = 0;
  const nurseries: Nursery[] = [
    nursery(1, { legalName: 'Ram Prasad Nursery', brandName: 'Green Heaven', ownerPhone: '9000000001', lat: 26.85, lng: 81.01, tier: 'trusted' }),
    nursery(2, { legalName: 'Sharma Garden Centre', brandName: 'City Greens', ownerPhone: '9000000002', lat: 26.89, lng: 80.94 }),
    nursery(3, { legalName: 'Verma Khad Beej Bhandar', brandName: 'Kisan Khaad Bhandar', ownerPhone: '9000000003', partnerType: 'fertilizer_shop', lat: 26.8, lng: 80.91,
      licenceNo: 'FERT/LKO/2024/118', licenceExpiry: addDays(200), gstin: '09ABCDE1234F1Z5' }),
    nursery(4, { legalName: 'Ram Mali', brandName: 'Mali Ram Services', ownerPhone: '9000000004', partnerType: 'gardener', lat: 26.86, lng: 80.96, startingPrice: 500, serviceRadiusKm: 15, bio: '10 saal ka anubhav. Lawn, chhantai, gamla bharna.' }),
    nursery(5, { legalName: 'Shubh Events', brandName: 'Shubh Decor', ownerPhone: '9000000005', partnerType: 'decorator', lat: 26.84, lng: 80.93, startingPrice: 5000, serviceRadiusKm: 25, bio: 'Shaadi, birthday aur ghar ke function ki phool sajawat.' }),
    nursery(6, { legalName: 'Bloom Flowers', brandName: 'Bloom Shop', ownerPhone: '9000000006', partnerType: 'flower_shop', lat: 26.87, lng: 80.92 }),
    nursery(7, { legalName: 'Kanpur Road Mali', brandName: 'Far Gardener', ownerPhone: '9000000007', partnerType: 'gardener', lat: 26.45, lng: 80.33, startingPrice: 400, serviceRadiusKm: 10 }),
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
    plant('n6', 'rose-bouquet', 'गुलाब बुके', 'Rose Bouquet (12)', 'bouquet', 499, 20, '🌹', 'Thande paani me rakho.'),
    plant('n6', 'marigold-mala', 'गेंदे की माला', 'Marigold Mala (5 ft)', 'mala', 120, 40, '📿', 'Taza rakhne ke liye halka paani chhidko.', ['diwali']),
    plant('n6', 'loose-flowers', 'खुले फूल (500g)', 'Loose Flowers (500 g)', 'flowers', 90, 30, '💐', 'Pooja ke liye taza phool.'),
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
    { partnerType: 'flower_shop', allowedIdDocs: idDocs, requiredDocs: ['shop_photo_front', 'shop_photo_inside'], licenceRequired: false, gstRequired: false,
      allowedCategories: ['flowers', 'bouquet', 'mala', 'flowering', 'pots'], maxLiveProbation: 20 },
    { partnerType: 'flower_vendor', allowedIdDocs: idDocs, requiredDocs: ['selfie', 'shop_photo_front'], licenceRequired: false, gstRequired: false,
      allowedCategories: ['flowers', 'mala', 'bouquet'], maxLiveProbation: 20 },
    { partnerType: 'gardener', allowedIdDocs: idDocs, requiredDocs: ['selfie'], licenceRequired: false, gstRequired: false, allowedCategories: [], maxLiveProbation: 0 },
    { partnerType: 'decorator', allowedIdDocs: idDocs, requiredDocs: ['selfie', 'shop_photo_front'], licenceRequired: false, gstRequired: false, allowedCategories: [], maxLiveProbation: 0 },
  ];
  const settings: Settings = {
    acceptSeconds: 300, cancelSeconds: 120, probationDays: 14, payoutHoldDays: 7, slaHours: 48, confirmHours: 24, refund72: 80, refund24: 50, refundLow: 0, split: { nursery: 80, platform: 15, pool: 5 },
  };
  const users: DemoUser[] = [
    { id: 'u_admin', role: 'admin', name: 'Admin (Demo)', email: 'admin@demo.local', password: 'demo123', language: 'hi' },
    { id: 'u_p1', role: 'partner', name: 'Ram Prasad', phone: '9000000001', pin: '1234', nurseryId: 'n1', language: 'hi' },
    { id: 'u_p2', role: 'partner', name: 'Sharma Ji', phone: '9000000002', pin: '1234', nurseryId: 'n2', language: 'hi' },
    { id: 'u_p3', role: 'partner', name: 'Verma Ji', phone: '9000000003', pin: '1234', nurseryId: 'n3', language: 'hi' },
    { id: 'u_p4', role: 'partner', name: 'Mali Ram', phone: '9000000004', pin: '1234', nurseryId: 'n4', language: 'hi' },
    { id: 'u_p5', role: 'partner', name: 'Shubh Events', phone: '9000000005', pin: '1234', nurseryId: 'n5', language: 'hi' },
    { id: 'u_p6', role: 'partner', name: 'Bloom Owner', phone: '9000000006', pin: '1234', nurseryId: 'n6', language: 'hi' },
    { id: 'u_p7', role: 'partner', name: 'Far Mali', phone: '9000000007', pin: '1234', nurseryId: 'n7', language: 'hi' },
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
  return { users, nurseries, plants, deliveryPartners, orders: [], applications, complaints: [], rules, settings, categories: defaultCategories(), slideshows: defaultSlideshows(), forms: defaultForms(), leads: [], services: defaultServices(), bookings: [], audit: [], seq: 10 };
}

export function defaultServices(): ServiceDef[] {
  return [
    { key: 'gardener', kind: 'gardener', name: { en: 'Hire a Gardener', hi: 'माली बुलाएँ' }, sub: { en: 'Trimming, lawn, pots, garden care', hi: 'छँटाई, लॉन, गमले, बगीचे की देखभाल' }, emoji: '🧑‍🌾',
      startingPrice: 500, tokenPercent: 20, minNoticeHours: 12, dailyCapacity: 6, commissionPercent: 10, needsTime: true, enabled: true, order: 1 },
    { key: 'decor', kind: 'decor', name: { en: 'Event Decoration', hi: 'इवेंट सजावट' }, sub: { en: 'Wedding, birthday, puja & home functions', hi: 'शादी, जन्मदिन, पूजा और घर के कार्यक्रम' }, emoji: '🎊',
      startingPrice: 5000, tokenPercent: 25, minNoticeHours: 72, dailyCapacity: 3, commissionPercent: 10, needsTime: true, enabled: true, order: 2 },
    { key: 'bulk', kind: 'bulk', name: { en: 'Bulk / Event Order', hi: 'बल्क / इवेंट ऑर्डर' }, sub: { en: 'Many plants or flowers for an event, NGO or office', hi: 'इवेंट, NGO या ऑफिस के लिए ढेर सारे पौधे या फूल' }, emoji: '📦',
      startingPrice: 2000, tokenPercent: 30, minNoticeHours: 48, dailyCapacity: 5, commissionPercent: 10, needsTime: false, enabled: true, order: 3 },
  ];
}

export function defaultForms(): CustomForm[] {
  return [{
    id: 'form_ask', name: 'App puchh lo', enabled: true, placement: 'bottom', emoji: '💬',
    buttonText: { en: 'Ask us anything', hi: 'App पूछ लो' }, buttonSub: { en: 'Tell us what you need, we will call you', hi: 'अपनी ज़रूरत बताइए, हम आपको कॉल करेंगे' },
    title: { en: 'Tell us what you need', hi: 'अपनी ज़रूरत बताइए' }, description: { en: 'Our team will call you shortly.', hi: 'हमारी टीम जल्दी आपको कॉल करेगी।' },
    successText: { en: 'Thank you! We will call you soon.', hi: 'धन्यवाद! हम जल्दी आपको कॉल करेंगे।' },
    fields: [
      { id: 'need', type: 'select', label: { en: 'What do you need?', hi: 'आपको क्या चाहिए?' }, required: true,
        options: [{ en: 'Help choosing plants', hi: 'पौधे चुनने में मदद' }, { en: 'Garden design', hi: 'गार्डन डिज़ाइन' }, { en: 'NGO / bulk order', hi: 'NGO / बल्क ऑर्डर' }, { en: 'Something else', hi: 'कुछ और' }] },
      { id: 'details', type: 'textarea', label: { en: 'Details', hi: 'विवरण' }, required: false },
      { id: 'when', type: 'date', label: { en: 'Preferred date', hi: 'पसंदीदा तारीख' }, required: false },
      { id: 'pic', type: 'photo', label: { en: 'Photo (optional)', hi: 'फोटो (वैकल्पिक)' }, required: false },
    ],
  }];
}
