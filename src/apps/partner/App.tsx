import { useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useSession } from '../../components/hooks';
import { DemoBanner, LangGrid, Spinner } from '../../components/ui';
import { hasChosenLang, useLang } from '../../lib/i18n';
import { Login, Register } from './pages/Auth';
import Join from './pages/Join';
import Status from './pages/Status';
import Home from './pages/Home';
import Listings from './pages/Listings';
import Earnings from './pages/Earnings';
import Settings from './pages/Settings';
import Jobs from './pages/Jobs';
import Profile from './pages/Profile';
import { api } from '../../api';
import { useLive } from '../../components/hooks';
import { isServiceType } from '../../lib/types';

function LangGate({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  return (
    <div className="mx-auto min-h-screen max-w-lg p-5">
      <div className="my-6 text-center"><div className="text-6xl">🌳</div><h1 className="text-3xl font-extrabold text-leaf-800">NurseryFlower Godown</h1><p className="mt-3 text-2xl font-bold">{t('lang_title')}</p></div>
      <LangGrid big onPick={onDone} />
    </div>
  );
}

function PartnerShell({ refresh }: { refresh: () => void }) {
  const { t } = useLang();
  const { data: n, loading } = useLive(() => api.myNursery(), []);
  const jobs = useLive(() => api.myJobs(), []);
  if (loading) return <Spinner />;
  const hasJobs = (jobs.data ?? []).length > 0;
  const svc = !!n && isServiceType(n.partnerType);
  const tab = ({ isActive }: { isActive: boolean }) => 'flex flex-1 flex-col items-center py-2.5 text-sm font-bold ' + (isActive ? 'text-leaf-700' : 'text-slate-500');
  return (
    <div className="mx-auto min-h-screen max-w-xl bg-white pb-24">
      <DemoBanner />
      <Routes>
        {svc ? <Route path="/" element={<Jobs />} /> : <Route path="/" element={<Home />} />}
        {svc ? <Route path="/profile" element={<Profile />} /> : <Route path="/listings" element={<Listings />} />}
        {!svc ? <Route path="/earnings" element={<Earnings />} /> : null}
        {!svc && hasJobs ? <Route path="/jobs" element={<Jobs />} /> : null}
        <Route path="/settings" element={<Settings onLogout={refresh} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-xl border-t border-slate-200 bg-white">
        {svc ? <>
          <NavLink to="/" end className={tab}><span className="text-2xl">🧰</span>{t('jobs')}</NavLink>
          <NavLink to="/profile" className={tab}><span className="text-2xl">🙋</span>{t('profile')}</NavLink>
        </> : <>
          <NavLink to="/" end className={tab}><span className="text-2xl">📦</span>{t('orders')}</NavLink>
          <NavLink to="/listings" className={tab}><span className="text-2xl">🪴</span>{t('listings')}</NavLink>
          <NavLink to="/earnings" className={tab}><span className="text-2xl">💰</span>{t('earnings')}</NavLink>
          {hasJobs ? <NavLink to="/jobs" className={tab}><span className="text-2xl">🧰</span>{t('jobs')}</NavLink> : null}
        </>}
        <NavLink to="/settings" className={tab}><span className="text-2xl">⚙️</span>{t('settings')}</NavLink>
      </nav>
    </div>
  );
}

export default function App() {
  const { user, refresh, loading } = useSession();
  const { t } = useLang();
  const [chosen, setChosen] = useState(hasChosenLang());
  if (!chosen) return <LangGate onDone={() => setChosen(true)} />;
  if (loading) return <Spinner />;
  const wrap = (el: React.ReactNode) => <div className="mx-auto min-h-screen max-w-xl bg-white"><DemoBanner />{el}</div>;

  if (!user) {
    return wrap(
      <Routes>
        <Route path="/register" element={<Register onDone={refresh} />} />
        <Route path="/join" element={<Navigate to="/register" replace />} />
        <Route path="*" element={<Login onDone={refresh} />} />
      </Routes>,
    );
  }
  if (user.role === 'partner' && user.nurseryId) return <PartnerShell refresh={refresh} />;
  return wrap(
    <Routes>
      <Route path="/join" element={<Join />} />
      <Route path="*" element={<Status onLogout={refresh} />} />
    </Routes>,
  );
}
