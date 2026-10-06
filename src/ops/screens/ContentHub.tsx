// İÇERİK MERKEZİ: eskiden ayrı ayrı olan Yayın Merkezi, İçerik Stüdyosu, İçerik Takvimi, Medya Havuzu ve editli videolar
// tek ekranda, amaca göre 5 sekme: Takvim & Yayın · Video Stüdyosu · Kontrol · Üret · Medya Havuzu.
import { lazy, Suspense, useState } from 'react';
import { CalendarClock, Clapperboard, FolderOpen, ShieldCheck, Sparkles } from 'lucide-react';
import { useRouter } from '../session';
import { cx, StateView } from '../ui';

const QueueScreen = lazy(() => import('./Queue').then((m) => ({ default: m.QueueScreen })));
const VideoEditorPanel = lazy(() => import('./VideoEditor').then((m) => ({ default: m.VideoEditorPanel })));
const EditedVideosScreen = lazy(() => import('./EditedVideos').then((m) => ({ default: m.EditedVideosScreen })));
const ContentCheckPanel = lazy(() => import('./ContentCheck').then((m) => ({ default: m.ContentCheckPanel })));
const StudioScreen = lazy(() => import('./Studio').then((m) => ({ default: m.StudioScreen })));
const PlannerScreen = lazy(() => import('./Planner').then((m) => ({ default: m.PlannerScreen })));
const PoolsScreen = lazy(() => import('./Pools').then((m) => ({ default: m.PoolsScreen })));

export type HubTab = 'plan' | 'video' | 'check' | 'create' | 'media';
const TABS: Array<{ id: HubTab; label: string; hint: string; icon: typeof Sparkles }> = [
  { id: 'plan', label: 'Takvim & Yayın', hint: 'Ne, ne zaman paylaşılıyor · havuz · onay', icon: CalendarClock },
  { id: 'video', label: 'Video Stüdyosu', hint: 'Kurgula · düzelt · hazır Reels', icon: Clapperboard },
  { id: 'check', label: 'Kontrol', hint: 'Bot her içeriği denetler', icon: ShieldCheck },
  { id: 'create', label: 'Üret', hint: 'AI gönderi · tasarım · aylık plan', icon: Sparkles },
  { id: 'media', label: 'Medya Havuzu', hint: 'Ham foto · video · Drive', icon: FolderOpen },
];

export function ContentHubScreen({ initial = 'plan', queueTab }: { initial?: HubTab; queueTab?: 'calendar' | 'pool' | 'approval' | 'done' }) {
  const { state, go } = useRouter();
  const urlTab = state.params.get('hub') as HubTab | null;
  const [tab, setTabState] = useState<HubTab>(urlTab && TABS.some((t) => t.id === urlTab) ? urlTab : initial);
  const [sub, setSub] = useState<'studio' | 'planner'>(state.params.get('sub') === 'planner' ? 'planner' : 'studio');
  const setTab = (t: HubTab) => { setTabState(t); go('queue', null, { hub: t }); };
  return (
    <div className="space-y-4">
      <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2" aria-label="İçerik Merkezi">
        {TABS.map((t) => {
          const Icon = t.icon; const on = tab === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cx('ops-hubtab', on && 'ops-hubtab-on')}>
              <Icon className="w-5 h-5 shrink-0" />
              <span className="min-w-0 text-left"><span className="block text-[13px] font-semibold truncate">{t.label}</span><span className="block text-[10px] opacity-75 truncate">{t.hint}</span></span>
            </button>
          );
        })}
      </nav>
      <Suspense fallback={<StateView kind="loading" />}>
        {tab === 'plan' && <QueueScreen initialTab={queueTab ?? 'calendar'} />}
        {tab === 'video' && <div className="space-y-6"><VideoEditorPanel /><div><h3 className="ops-section-title">Hazır Reels ve kaydırmalı gönderiler</h3><EditedVideosScreen embedded /></div></div>}
        {tab === 'check' && <ContentCheckPanel />}
        {tab === 'create' && (
          <div className="space-y-4">
            <div className="flex gap-1.5">
              <button type="button" className={cx('ops-chip', sub === 'studio' && 'ops-chip-on')} onClick={() => setSub('studio')}>AI gönderi & tasarım</button>
              <button type="button" className={cx('ops-chip', sub === 'planner' && 'ops-chip-on')} onClick={() => setSub('planner')}>Aylık içerik planı</button>
            </div>
            {sub === 'studio' ? <StudioScreen /> : <PlannerScreen />}
          </div>
        )}
        {tab === 'media' && <PoolsScreen />}
      </Suspense>
    </div>
  );
}
