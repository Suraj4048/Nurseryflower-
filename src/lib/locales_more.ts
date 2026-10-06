// Extra keys (en + hi). Baaki bhasha me nahi hain to English dikhta hai.
import { DICT } from './locales';

Object.assign(DICT.en, {
  login_title: 'Login / Sign up', enter_phone_or_email: 'Enter your mobile number', enter_otp: 'Enter the OTP', otp_sent: 'OTP sent',
  change_number: 'Change number', delivery_to: 'Deliver to', address_hint: 'House no, street, area, landmark', auto_cheapest: 'Cheapest (auto)',
  delivery_est: 'Delivery', order_summary: 'Order summary', pay_upi_now: 'Pay with UPI app', order_timeline: 'Order status', rate_submit: 'Send rating',
  write_review: 'Write a review (optional)', complaint_reason: 'What went wrong?', send: 'Send', cancelled_ok: 'Order cancelled', location_set: 'Location set',
  identify_run: 'Identify', identify_result: 'It may be', find_in_shop: 'Find in shop', order_id: 'Order', split_note: 'Your order is split across {n} nurseries (separate delivery).',
  your_orders: 'Your orders', no_login_orders: 'Login to see your orders', language_change: 'Change language', hello_user: 'Hello, {name}', city_label: 'Your area',
  share_text: 'Order plants on NurseryFlower', reassigned: 'Moved to another nursery', fee_note: 'Delivery fee depends on distance',
  login_needed: 'Please login first', paid_note: 'Pay on delivery, or use UPI after the order is accepted.', add_address: 'Please enter your address',
});
Object.assign(DICT.hi, {
  login_title: 'लॉगिन / साइन अप', enter_phone_or_email: 'अपना मोबाइल नंबर डालें', enter_otp: 'ओटीपी डालें', otp_sent: 'ओटीपी भेज दिया',
  change_number: 'नंबर बदलें', delivery_to: 'डिलीवरी का पता', address_hint: 'मकान नंबर, गली, इलाका, लैंडमार्क', auto_cheapest: 'सबसे सस्ता (अपने आप)',
  delivery_est: 'डिलीवरी', order_summary: 'ऑर्डर का सार', pay_upi_now: 'यूपीआई ऐप से भुगतान करें', order_timeline: 'ऑर्डर की स्थिति', rate_submit: 'रेटिंग भेजें',
  write_review: 'अपनी राय लिखें (ज़रूरी नहीं)', complaint_reason: 'क्या दिक्कत हुई?', send: 'भेजें', cancelled_ok: 'ऑर्डर रद्द हो गया', location_set: 'लोकेशन मिल गई',
  identify_run: 'पहचानें', identify_result: 'ये हो सकता है', find_in_shop: 'दुकान में खोजें', order_id: 'ऑर्डर', split_note: 'आपका ऑर्डर {n} नर्सरी में बँटेगा (अलग डिलीवरी)।',
  your_orders: 'आपके ऑर्डर', no_login_orders: 'ऑर्डर देखने के लिए लॉगिन करें', language_change: 'भाषा बदलें', hello_user: 'नमस्ते, {name}', city_label: 'आपका इलाका',
  share_text: 'नर्सरीफ्लावर पर पौधे मँगाएँ', reassigned: 'दूसरी नर्सरी को भेजा गया', fee_note: 'डिलीवरी शुल्क दूरी पर निर्भर है',
  login_needed: 'पहले लॉगिन करें', paid_note: 'डिलीवरी पर भुगतान करें, या ऑर्डर स्वीकार होने पर यूपीआई से।', add_address: 'कृपया पता डालें',
});

Object.assign(DICT.en, {
  sound_on: 'Tap to turn on alarm sound', no_new: 'No new orders. Keep the app open.', packed_wait: 'Packed. Waiting for pickup.', my_shop: 'My shop',
  unique_id: 'Your shop ID', brand_shown: 'Customers see', stock_qty: 'Stock quantity', care_tips_opt: 'Care tips (optional)', licence_needed: 'Licence needed for this type',
  gst_needed: 'GST needed for this type', use_gps: 'Use my current location', location_saved: 'Shop location saved', id_one: 'Any ONE of these', login_phone_pin: 'Login with mobile and PIN',
  creating: 'Please wait...', pin_wrong: 'PIN must be 4-6 digits', payout_note: 'You receive 80% of the product price. Paid after the hold period.', approved_msg: 'Congratulations! You are approved.',
  select_photo_first: 'Add the required photos first', tier_new: 'New', tier_verified: 'Verified', tier_trusted: 'Trusted', tier_star: 'Star', rule_cats: 'Allowed categories',
  accepted_pack: 'Accepted. Pack it now.', rejected_ok: 'Order declined', pickup_by: 'Pickup by', no_products: 'No products yet. Add your first product.', price_rs: 'Price (Rs)',
});
Object.assign(DICT.hi, {
  sound_on: 'आवाज़ चालू करने के लिए दबाएँ', no_new: 'अभी कोई नया ऑर्डर नहीं। ऐप खुला रखें।', packed_wait: 'पैक हो गया। पिकअप का इंतज़ार।', my_shop: 'मेरी दुकान',
  unique_id: 'आपकी दुकान की आईडी', brand_shown: 'ग्राहक को दिखेगा', stock_qty: 'स्टॉक की मात्रा', care_tips_opt: 'देखभाल (ज़रूरी नहीं)', licence_needed: 'इस प्रकार के लिए लाइसेंस चाहिए',
  gst_needed: 'इस प्रकार के लिए जीएसटी चाहिए', use_gps: 'मेरी अभी की लोकेशन लें', location_saved: 'दुकान की लोकेशन सेव हो गई', id_one: 'इनमें से कोई एक', login_phone_pin: 'मोबाइल और पिन से लॉगिन',
  creating: 'रुकिए...', pin_wrong: 'पिन 4-6 अंक का होना चाहिए', payout_note: 'प्रोडक्ट की कीमत का 80% आपको मिलेगा। होल्ड अवधि के बाद भुगतान।', approved_msg: 'बधाई हो! आप अप्रूव हो गए।',
  select_photo_first: 'पहले ज़रूरी फोटो जोड़ें', tier_new: 'नया', tier_verified: 'वेरीफाइड', tier_trusted: 'भरोसेमंद', tier_star: 'स्टार', rule_cats: 'अनुमत श्रेणियाँ',
  accepted_pack: 'स्वीकार हुआ। अब पैक करें।', rejected_ok: 'ऑर्डर मना कर दिया', pickup_by: 'पिकअप', no_products: 'अभी कोई प्रोडक्ट नहीं। पहला प्रोडक्ट जोड़ें।', price_rs: 'कीमत (₹)',
});

Object.assign(DICT.en, { filters: 'Filters', max_price: 'Max price', nursery: 'Nursery', clear_filters: 'Clear filters', try_these: 'Try these nearby', show_all: 'Show everything', current_location: 'Current location',
  reorder: 'Order again', reorder_added: '{n} item(s) added to cart', reorder_none: 'These items are not available right now' });
Object.assign(DICT.hi, { filters: 'फ़िल्टर', max_price: 'अधिकतम कीमत', nursery: 'नर्सरी', clear_filters: 'फ़िल्टर हटाएँ', try_these: 'पास में ये देखें', show_all: 'सब दिखाएँ', current_location: 'मौजूदा लोकेशन',
  reorder: 'दोबारा ऑर्डर करें', reorder_added: '{n} चीज़ें कार्ट में डालीं', reorder_none: 'ये चीज़ें अभी उपलब्ध नहीं हैं' });

Object.assign(DICT.en, { f_name: 'Your name', f_phone: 'Mobile number', f_send: 'Send', f_close: 'Close', f_choose: '-- choose --', f_photo: 'Add photo (auto 100 KB)', f_sent: 'Sent', f_err_name: 'Please enter your name', f_err_phone: 'Enter a valid 10-digit mobile number', f_err_required: 'Please fill', f_privacy: 'Your number is only seen by the NurseryFlower team.' });
Object.assign(DICT.hi, { f_name: 'आपका नाम', f_phone: 'मोबाइल नंबर', f_send: 'भेजें', f_close: 'बंद करें', f_choose: '-- चुनें --', f_photo: 'फोटो जोड़ें (अपने आप 100 KB तक)', f_sent: 'भेज दिया गया', f_err_name: 'अपना नाम लिखें', f_err_phone: 'सही 10 अंक का मोबाइल नंबर लिखें', f_err_required: 'ये भरना ज़रूरी है', f_privacy: 'आपका नंबर सिर्फ NurseryFlower की टीम देखती है।' });
