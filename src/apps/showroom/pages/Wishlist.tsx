import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Empty, Spinner } from '../../../components/ui';
import { useLang } from '../../../lib/i18n';
import { useLoc, useWishlist } from '../stores';
import PlantCard from './PlantCard';

export default function Wishlist() {
  const { t } = useLang();
  const { loc } = useLoc();
  const wish = useWishlist();
  const { data, loading } = useLive(() => api.listPublicPlants(loc), [loc.lat, loc.lng]);
  if (loading) return <Spinner />;
  const list = (data ?? []).filter((p) => wish.has(p.id));
  return (
    <div className="p-3">
      <h2 className="mb-3 text-xl font-extrabold">❤️ {t('wishlist')}</h2>
      {list.length === 0 ? <Empty text={t('empty')} emoji="🤍" /> : <div className="grid grid-cols-2 gap-3">{list.map((p) => <PlantCard key={p.id} p={p} />)}</div>}
    </div>
  );
}
