// HAVUZLAR: Video · Banner · Gönderi metni. Gönderi planlarken (Yayın Kuyruğu) "Havuzdan seç" ile kullanılır.
import { useState } from 'react';
import { Layers } from 'lucide-react';
import { BannerPool, PostPool } from '../components/Pools';
import { DriveSources } from '../components/DriveSources';
import { Tabs } from '../ui';
import { VideoStudioScreen } from './VideoStudio';

export function PoolsScreen() {
  const [tab, setTab] = useState<'banner' | 'video' | 'photo' | 'post'>('banner');
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink-100 inline-flex items-center gap-2"><Layers className="w-5 h-5 text-brand-green" />Havuzlar</h1>
        <p className="text-sm text-ink-400">Hazır içerik depoları. Banner’lar şablondan üretilir; başlığını/rengini değiştirip yeniden çizebilir, kopyalayabilir veya arşive kaldırabilirsiniz. Yayın Kuyruğu’nda “Havuzdan seç” ile gönderiye eklenir.</p>
      </div>
      <Tabs value={tab} onChange={setTab} items={[{ id: 'banner', label: 'Banner havuzu' }, { id: 'video', label: 'Video havuzu' }, { id: 'photo', label: 'Fotoğraf & Drive' }, { id: 'post', label: 'Gönderi metinleri' }]} />
      {tab === 'banner' ? <BannerPool /> : tab === 'photo' ? <DriveSources /> : tab === 'post' ? <PostPool /> : <VideoStudioScreen />}
    </div>
  );
}
