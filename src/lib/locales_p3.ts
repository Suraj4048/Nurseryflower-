// Part 3 keys (services, bookings, new partner types). English + Hindi; baaki bhasha me English dikhta hai.
import { DICT } from './locales';

Object.assign(DICT.en, {
  type_decorator: 'Decorator', type_decorator_docs: '1 ID + selfie + work/shop photo',
  type_gardener: 'Gardener', type_gardener_docs: '1 ID + selfie',
  type_flower_shop: 'Flower Shop', type_flower_shop_docs: '1 ID + 2 shop photos',
  type_flower_vendor: 'Flower Vendor', type_flower_vendor_docs: '1 ID + selfie + stall photo',
  svc_title: 'Services & events', svc_flowers: 'Flowers & Bouquets', svc_flowers_sub: 'Flowers, bouquets, mala - delivered fast', svc_instant: 'Instant delivery',
  bk_starting: 'From {p}', bk_how: 'Our team will call you to confirm the price. Booking is fixed once you pay a {pct}% token. Needs {h} hours notice.',
  bk_date: 'Date', bk_time: 'Time', bk_venue: 'Venue address', bk_pincode: 'Pincode (optional)', bk_remarks: 'Remarks (optional)', bk_send: 'Send request',
  bk_err_date: 'Please choose a date', bk_err_time: 'Please choose a time', bk_err_venue: 'Please enter the venue address',
  bk_avail_ok: 'Available ({n} slot(s) left)', bk_full: 'This date is fully booked. Please choose another date.', bk_past: 'Past dates are not allowed', bk_notice: 'Needs {h} hours notice. Earliest date: {d}',
  bk_privacy: 'Your number and address are seen only by the NurseryFlower team. A provider gets your details only if you confirm.',
  bk_sent: 'Request sent!', bk_sent_note: 'Our team will call you shortly (within 24 hours) to confirm.', bk_view: 'See my bookings',
  bk_my: 'My bookings', bk_none: 'No bookings yet', bk_login: 'Login to see your bookings',
  bkst_new: 'Request sent', bkst_called: 'Called', bkst_confirmed: 'Confirmed', bkst_token_paid: 'Booked', bkst_done: 'Done', bkst_cancelled: 'Cancelled',
  bk_wait_call: 'Our team will call you within {h} hour(s).', bk_called_note: 'We spoke to you. Waiting for the final price.', bk_agreed: 'Agreed amount',
  bk_token_due: 'Pay token {amt} ({pct}%)', bk_token_note: 'Your date is reserved once the token is received.', bk_pay_upi: 'Pay token by UPI', bk_i_paid: 'I have paid the token',
  bk_claimed: 'Waiting for our team to confirm your payment', bk_booked_note: 'Date booked', bk_done_note: 'Service completed', bk_provider: 'Your service provider',
  bk_cancel: 'Cancel booking', bk_cancel_confirm: 'Cancel this booking?', bk_refund_preview: 'Refund if you cancel now: {amt}', bk_refund: 'Refund', bk_cancelled_ok: 'Booking cancelled',
  jobs: 'Jobs', profile: 'Profile',
});
Object.assign(DICT.hi, {
  type_decorator: 'डेकोरेटर', type_decorator_docs: '1 आईडी + सेल्फी + काम/दुकान की फोटो',
  type_gardener: 'माली', type_gardener_docs: '1 आईडी + सेल्फी',
  type_flower_shop: 'फूलों की दुकान', type_flower_shop_docs: '1 आईडी + दुकान की 2 फोटो',
  type_flower_vendor: 'फूल विक्रेता', type_flower_vendor_docs: '1 आईडी + सेल्फी + ठेले/स्टॉल की फोटो',
  svc_title: 'सेवाएँ और इवेंट', svc_flowers: 'फूल और बुके', svc_flowers_sub: 'फूल, बुके, माला - जल्दी डिलीवरी', svc_instant: 'तुरंत डिलीवरी',
  bk_starting: '{p} से शुरू', bk_how: 'हमारी टीम कॉल करके कीमत तय करेगी। {pct}% टोकन देने पर बुकिंग पक्की होगी। {h} घंटे पहले बताना ज़रूरी।',
  bk_date: 'तारीख', bk_time: 'समय', bk_venue: 'जगह का पता', bk_pincode: 'पिनकोड (ज़रूरी नहीं)', bk_remarks: 'कोई बात (ज़रूरी नहीं)', bk_send: 'रिक्वेस्ट भेजें',
  bk_err_date: 'तारीख चुनें', bk_err_time: 'समय चुनें', bk_err_venue: 'जगह का पता लिखें',
  bk_avail_ok: 'उपलब्ध ({n} स्लॉट बाकी)', bk_full: 'इस तारीख की बुकिंग भर चुकी है। दूसरी तारीख चुनें।', bk_past: 'बीती तारीख नहीं चलेगी', bk_notice: '{h} घंटे पहले बताना ज़रूरी। सबसे पहली तारीख: {d}',
  bk_privacy: 'आपका नंबर और पता सिर्फ NurseryFlower की टीम देखती है। आपकी हामी के बाद ही प्रोवाइडर को जानकारी मिलती है।',
  bk_sent: 'रिक्वेस्ट भेज दी गई!', bk_sent_note: 'हमारी टीम जल्दी (24 घंटे के अंदर) आपको कॉल करेगी।', bk_view: 'मेरी बुकिंग देखें',
  bk_my: 'मेरी बुकिंग', bk_none: 'अभी कोई बुकिंग नहीं', bk_login: 'बुकिंग देखने के लिए लॉगिन करें',
  bkst_new: 'रिक्वेस्ट भेजी', bkst_called: 'कॉल हुआ', bkst_confirmed: 'कन्फर्म', bkst_token_paid: 'बुक', bkst_done: 'पूरा', bkst_cancelled: 'रद्द',
  bk_wait_call: 'हमारी टीम {h} घंटे के अंदर कॉल करेगी।', bk_called_note: 'आपसे बात हो गई। अंतिम कीमत का इंतज़ार है।', bk_agreed: 'तय रकम',
  bk_token_due: 'टोकन दें {amt} ({pct}%)', bk_token_note: 'टोकन मिलते ही आपकी तारीख पक्की हो जाएगी।', bk_pay_upi: 'यूपीआई से टोकन दें', bk_i_paid: 'मैंने टोकन दे दिया',
  bk_claimed: 'हमारी टीम आपके भुगतान की पुष्टि कर रही है', bk_booked_note: 'तारीख बुक हो गई', bk_done_note: 'सेवा पूरी हुई', bk_provider: 'आपका सेवा प्रदाता',
  bk_cancel: 'बुकिंग रद्द करें', bk_cancel_confirm: 'ये बुकिंग रद्द करें?', bk_refund_preview: 'अभी रद्द करने पर रिफंड: {amt}', bk_refund: 'रिफंड', bk_cancelled_ok: 'बुकिंग रद्द हो गई',
  jobs: 'काम', profile: 'प्रोफाइल',
});

Object.assign(DICT.en, {
  job_assigned: 'New job', job_accepted: 'Accepted', job_declined: 'Declined', job_amount: 'Your amount', job_amount_tbd: 'to be fixed', job_token_paid: 'Token received', job_token_wait: 'Token pending',
  job_privacy: 'Customer name and number are shared by the NurseryFlower team only after confirmation.', job_accept: 'Accept', job_decline: 'Decline', job_mark_done: 'Mark done',
  job_decline_confirm: 'Decline this job?', job_done_ok: 'Job marked done', job_available: 'Available', job_unavailable: 'Not available', job_none: 'No jobs yet. Keep yourself Available.', job_history: 'Past jobs',
  pf_saved: 'Profile saved', pf_price: 'Starting price (₹)', pf_radius: 'Service area (km)', pf_bio: 'About you (short)', pf_blocked: 'Dates you are NOT available', pf_save: 'Save profile',
});
Object.assign(DICT.hi, {
  job_assigned: 'नया काम', job_accepted: 'स्वीकार', job_declined: 'मना किया', job_amount: 'आपकी रकम', job_amount_tbd: 'तय होनी बाकी', job_token_paid: 'टोकन मिल गया', job_token_wait: 'टोकन बाकी',
  job_privacy: 'कस्टमर का नाम और नंबर कन्फर्म होने के बाद NurseryFlower टीम ही देगी।', job_accept: 'स्वीकार करें', job_decline: 'मना करें', job_mark_done: 'काम पूरा',
  job_decline_confirm: 'ये काम मना करें?', job_done_ok: 'काम पूरा मार्क हुआ', job_available: 'उपलब्ध', job_unavailable: 'उपलब्ध नहीं', job_none: 'अभी कोई काम नहीं। खुद को उपलब्ध रखें।', job_history: 'पुराने काम',
  pf_saved: 'प्रोफाइल सेव हुई', pf_price: 'शुरुआती कीमत (₹)', pf_radius: 'सेवा का इलाका (किमी)', pf_bio: 'आपके बारे में (छोटा)', pf_blocked: 'जिन तारीखों पर आप उपलब्ध नहीं', pf_save: 'प्रोफाइल सेव करें',
});
