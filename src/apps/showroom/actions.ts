import type { Action } from '../../lib/types';
import { config } from '../../config';
import { setHomeFilter } from './stores';
import { openForm } from './FormSheet';
import { openBooking } from './BookingSheet';

/** Ek hi jagah se har action (slide, button, banner) chalta hai: call / whatsapp / link / category / product / search */
export function runAction(a: Action | undefined, nav: (to: string) => void) {
  if (!a || !a.value) return;
  switch (a.type) {
    case 'call': window.location.href = 'tel:' + a.value.replace(/[^\d+]/g, ''); break;
    case 'whatsapp': window.open('https://wa.me/' + (a.value.replace(/\D/g, '') || config.supportWhatsApp), '_blank'); break;
    case 'link':
      if (/^https?:\/\//i.test(a.value)) window.open(a.value, '_blank');
      else nav(a.value.startsWith('/') ? a.value : '/' + a.value);
      break;
    case 'category': setHomeFilter({ cat: a.value, q: '' }); nav('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    case 'search': setHomeFilter({ cat: 'all', q: a.value }); nav('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    case 'product': nav('/plant/' + a.value); break;
    case 'form': openForm(a.value); break;
    case 'service': openBooking(a.value); break;
  }
}
