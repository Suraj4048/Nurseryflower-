import { useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api } from '../../api';
import { useSession } from '../../components/hooks';
import { DemoBanner, Button, Field, Input, Spinner, toastErr } from '../../components/ui';
import { config } from '../../config';
import { useLive } from '../../components/hooks';
import { useEffect, useRef } from 'react';
import { toast } from '../../components/ui';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import { Nurseries, Products } from './pages/Catalog';
import { Orders, Delivery, Complaints } from './pages/Ops';
import { Categories, Slideshows } from './pages/Cms';
import { Forms } from './pages/Forms';
import { Leads } from './pages/Leads';
import { Bookings, Services } from './pages/Bookings';
import { Rules, SettingsPage, Audit } from './pages/Admin';

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(config.mode === 'demo' ? 'admin@demo.local' : '');
  const [pw, setPw] = useState(config.mode === 'demo' ? 'demo123' : '');
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await api.adminLogin(email, pw); onDone(); } catch (e) { toastErr(e); } setBusy(false); };
  return (
    <div className="mx-auto max-w-sm space-y-4 p-8">
      <div className="text-center"><div className="text-5xl">🏢</div><h1 className="text-2xl font-extrabold">NurseryFlower Office</h1><p className="text-sm text-slate-500">Admin login</p></div>
      <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></Field>
      <Field label="Password"><Input value={pw} onChange={(e) => setPw(e.target.value)} type="password" /></Field>
      <Button block size="lg" loading={busy} onClick={go}>Login</Button>
      {config.mode === 'demo' ? <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Demo: admin@demo.local / demo123</p> : null}
    </div>
  );
}

/** Naya lead aate hi (Office khula ho tab) toast + beep + nav badge. */
function useNewLeads() {
  const { data } = useLive(() => api.adminLeads(), []);
  const n = (data ?? []).filter((l) => l.status === 'new').length;
  const total = (data ?? []).length;
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (data === null) return;
    if (prev.current !== null && total > prev.current) {
      toast('📥 Naya lead aaya! Leads page dekho');
      try { const C = window.AudioContext; const ctx = new C(); const o = ctx.createOscillator(); o.frequency.value = 880; o.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.25); } catch { /* sound optional */ }
    }
    prev.current = total;
  }, [total, data]);
  return n;
}

function LeadBadge() {
  const n = useNewLeads();
  return n > 0 ? <span data-testid="leads-badge" className="ml-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{n}</span> : null;
}

/** Nayi booking aate hi toast + beep + nav badge. */
function BookingBadge() {
  const { data } = useLive(() => api.adminBookings(), []);
  const n = (data ?? []).filter((b) => b.status === 'new').length;
  const total = (data ?? []).length;
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (data === null) return;
    if (prev.current !== null && total > prev.current) {
      toast('📅 Nayi booking aayi! Bookings page dekho');
      try { const C = window.AudioContext; const ctx = new C(); const o = ctx.createOscillator(); o.frequency.value = 660; o.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.3); } catch { /* sound optional */ }
    }
    prev.current = total;
  }, [total, data]);
  return n > 0 ? <span data-testid="bookings-badge" className="ml-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{n}</span> : null;
}

const NAV: [string, string, string][] = [
  ['/', '📊', 'Dashboard'], ['/bookings', '📅', 'Bookings'], ['/services', '🧰', 'Services'], ['/applications', '📝', 'Applications'], ['/nurseries', '🌳', 'Nurseries'], ['/products', '🪴', 'Products'], ['/leads', '📥', 'Leads'], ['/forms', '🧩', 'Forms'], ['/categories', '🗂️', 'Categories'], ['/slideshows', '🖼️', 'Slideshows'], ['/orders', '📦', 'Orders'],
  ['/delivery', '🚚', 'Delivery'], ['/complaints', '🛟', 'Complaints'], ['/rules', '📋', 'Rules'], ['/settings', '⚙️', 'Settings'], ['/audit', '🧾', 'Audit'],
];

export default function App() {
  const { user, refresh, loading } = useSession();
  if (loading) return <Spinner />;
  if (!user || user.role !== 'admin') {
    return (<div className="min-h-screen bg-slate-50"><DemoBanner /><AdminLogin onDone={refresh} />{user && user.role !== 'admin' ? <p className="text-center text-sm text-red-600">Ye account admin nahi hai.</p> : null}</div>);
  }
  const link = ({ isActive }: { isActive: boolean }) => 'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ' + (isActive ? 'bg-leaf-600 text-white' : 'text-slate-700 hover:bg-slate-100');
  return (
    <div className="min-h-screen bg-slate-50">
      <DemoBanner />
      <header className="flex items-center gap-3 border-b bg-white px-4 py-2"><span className="text-lg font-extrabold text-leaf-800">🏢 NurseryFlower Office</span><span className="ml-auto text-sm text-slate-500">{user.email ?? user.name}</span>
        <Button size="sm" variant="ghost" onClick={() => api.logout().then(refresh)}>Logout</Button></header>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 p-3 md:flex-row">
        <nav className="no-scrollbar flex gap-1 overflow-x-auto md:w-48 md:shrink-0 md:flex-col">
          {NAV.map(([to, ic, label]) => <NavLink key={to} to={to} end={to === '/'} className={link}><span>{ic}</span>{label}{to === '/leads' ? <LeadBadge /> : null}{to === '/bookings' ? <BookingBadge /> : null}</NavLink>)}
        </nav>
        <main className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/services" element={<Services />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/nurseries" element={<Nurseries />} />
            <Route path="/products" element={<Products />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/forms" element={<Forms />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/slideshows" element={<Slideshows />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
