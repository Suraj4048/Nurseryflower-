import { useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useSession } from '../../components/hooks';
import { DemoBanner, LangGrid, Modal } from '../../components/ui';
import { hasChosenLang, useLang } from '../../lib/i18n';
import { SessionCtx } from './ctx';
import { detectAndSetLocation, useCart, useLoc } from './stores';
import { toast, toastErr } from '../../components/ui';
import Home from './pages/Home';
import PlantPage from './pages/PlantPage';
import CartPage from './pages/CartPage';
import Checkout from './pages/Checkout';
import { OrderList, OrderDetail } from './pages/Orders';
import Identify from './pages/Identify';
import Account from './pages/Account';
import Login from './pages/Login';
import Wishlist from './pages/Wishlist';
import { FormHost } from './FormSheet';
import { BookingHost } from './BookingSheet';
import Bookings from './pages/Bookings';

function LangGate({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  return (
    <div className="mx-auto min-h-screen max-w-lg p-5">
      <div className="mb-6 mt-8 text-center">
        <div className="text-6xl">🌿</div>
        <h1 className="mt-2 text-3xl font-extrabold text-leaf-800">NurseryFlower</h1>
        <p className="mt-4 text-xl font-bold">{t('lang_title')}</p>
        <p className="text-sm text-slate-500">{t('lang_sub')}</p>
      </div>
      <LangGrid big onPick={onDone} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  const cart = useCart();
  const { loc } = useLoc();
  const nav = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const tab = ({ isActive }: { isActive: boolean }) => 'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold ' + (isActive ? 'text-leaf-700' : 'text-slate-500');
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white pb-20 shadow-sm">
      <DemoBanner />
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-100 bg-white/95 px-3 py-2.5 backdrop-blur">
        <Link to="/" className="text-xl font-extrabold text-leaf-700">🌿 NurseryFlower</Link>
        <button onClick={async () => { try { const l = await detectAndSetLocation(t('current_location')); toast(t('location_set') + ': ' + l.label); } catch (e) { toastErr(e); } }}
          className="ml-auto max-w-[9rem] truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600" title={t('use_my_location')}>📍 {loc.label}</button>
        <button onClick={() => setLangOpen(true)} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm" aria-label="language">🌐</button>
        <button onClick={() => nav('/cart')} className="relative rounded-full bg-leaf-50 px-3 py-1.5 text-lg" aria-label="cart">
          🛒{cart.count > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{cart.count}</span> : null}
        </button>
      </header>
      <main>{children}</main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-2xl border-t border-slate-200 bg-white">
        <NavLink to="/" end className={tab}><span className="text-xl">🏠</span>{t('home')}</NavLink>
        <NavLink to="/identify" className={tab}><span className="text-xl">📷</span>{t('identify_plant')}</NavLink>
        <NavLink to="/wishlist" className={tab}><span className="text-xl">❤️</span>{t('wishlist')}</NavLink>
        <NavLink to="/orders" className={tab}><span className="text-xl">📦</span>{t('my_orders')}</NavLink>
        <NavLink to="/account" className={tab}><span className="text-xl">👤</span>{t('account')}</NavLink>
      </nav>
      <FormHost />
      <BookingHost />
      <Modal open={langOpen} onClose={() => setLangOpen(false)} title={t('lang_title')}>
        <LangGrid onPick={() => setLangOpen(false)} />
      </Modal>
    </div>
  );
}

export default function App() {
  const { user, refresh } = useSession();
  const [chosen, setChosen] = useState(hasChosenLang());
  if (!chosen) return <LangGate onDone={() => setChosen(true)} />;
  return (
    <SessionCtx.Provider value={{ user: user ?? null, refresh }}>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plant/:id" element={<PlantPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/identify" element={<Identify />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Shell>
    </SessionCtx.Provider>
  );
}
