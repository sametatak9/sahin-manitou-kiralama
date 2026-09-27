// HAVUZLAR: İçerik üretiminin depoları — Bot Raporları ekranıyla aynı düzen: üstte özet kutucukları, altta amaca göre bölümler.
import { useState } from 'react';
import { Clapperboard, Film, FolderOpen, Image as ImageIcon, Layers, Sparkles, Type } from 'lucide-react';
import { BannerPool, PostPool } from '../components/Pools';
import { DriveSources } from '../components/DriveSources';
import { VideoPool } from '../components/VideoPool';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import { cx, StateView } from '../ui';

type View = 'reels' | 'video' | 'banner' | 'photo' | 'post';
const VIEWS: Array<{ id: View; label: string; icon: typeof Film; hint: string }> = [
  { id: 'reels', label: 'Editli Reels', icon: Clapperboard, hint: 'Müzikli · geçişli · yayına hazır' },
  { id: 'video', label: 'Ham videolar', icon: Film, hint: 'Şantiye çekimleri (her biri 1 kez)' },
  { id: 'banner', label: 'Banner’lar', icon: ImageIcon, hint: 'Şablondan çizilen görseller' },
  { id: 'photo', label: 'Fotoğraf & Drive', icon: FolderOpen, hint: 'Kaynak klasörler' },
  { id: 'post', label: 'Gönderi metinleri', icon: Type, hint: 'Hazır açıklama + etiket' },
];

interface ReelRow { id: string; headline: string | null; primary_platform: string | null; video_url: string | null; design_url: string | null; scheduled_at: string | null; workflow_status: string | null }

function EditedReels() {
  const q = useQuery(async () => unwrap(await db().from('social_drafts').select('id,headline,primary_platform,video_url,design_url,scheduled_at,workflow_status')
    .eq('design_provider', 'embay_montage').is('archived_at', null).order('scheduled_at', { ascending: false }).limit(24)) as ReelRow[], [] as ReelRow[], [], ['social_drafts']);
  if (q.loading && !q.data.length) return <StateView kind="loading" compact />;
  if (!q.data.length) return <StateView kind="empty" title="Henüz editli Reels yok" message="Otomatik montaj her saat başı çalışır: ham videoyu keser, müzik, geçiş, logo ve telefon ekler." />;
  return (
    <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {q.data.map((r) => (
        <li key={r.id} className="rounded-2xl overflow-hidden bg-white ring-1 ring-ink-700/70 shadow-sm">
          <div className="relative aspect-[9/16] bg-[#1B1F52]">
            {r.video_url ? <video src={r.video_url} poster={r.design_url ?? undefined} controls preload="none" playsInline className="w-full h-full object-cover" /> : null}
            <span className="absolute top-2 left-2 rounded-full bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">EDİTLİ</span>
          </div>
          <div className="p-2.5">
            <div className="text-[12px] font-semibold text-ink-100 line-clamp-2">{r.headline || 'Reels'}</div>
            <div className="text-[10px] text-ink-400 mt-0.5">{(r.primary_platform || '').toUpperCase()} · {r.workflow_status === 'published' ? 'Yayında' : r.scheduled_at ? fmtDateTime(r.scheduled_at) : 'Zamanlanmadı'}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PoolsScreen() {
  const [view, setView] = useState<View>('reels');
  const stats = useQuery(async () => {
    const c = (r: { count: number | null }) => r.count ?? 0;
    const [vid, fresh, ban, reels, posts] = await Promise.all([
      db().from('media_library').select('id', { count: 'exact', head: true }).eq('kind', 'video').is('archived_at', null).neq('source', 'montage'),
      db().from('media_library').select('id', { count: 'exact', head: true }).eq('kind', 'video').is('archived_at', null).neq('source', 'montage').or('use_count.is.null,use_count.eq.0'),
      db().from('media_library').select('id', { count: 'exact', head: true }).eq('kind', 'banner').is('archived_at', null),
      db().from('social_drafts').select('id', { count: 'exact', head: true }).eq('design_provider', 'embay_montage').is('archived_at', null),
      db().from('post_templates').select('id', { count: 'exact', head: true }),
    ]);
    return { videos: c(vid), fresh: c(fresh), banners: c(ban), reels: c(reels), posts: c(posts) };
  }, { videos: 0, fresh: 0, banners: 0, reels: 0, posts: 0 }, [], ['media_library', 'social_drafts']);
  const s = stats.data;
  const tiles = [
    { label: 'Editli Reels', value: s.reels, icon: Clapperboard, tone: 'text-emerald-700' },
    { label: 'Kullanılmamış video', value: `${s.fresh}/${s.videos}`, icon: Film, tone: s.fresh < 6 ? 'text-amber-700' : 'text-sky-700' },
    { label: 'Banner', value: s.banners, icon: ImageIcon, tone: 'text-ink-100' },
    { label: 'Gönderi metni', value: s.posts, icon: Type, tone: 'text-ink-100' },
  ];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink-100 inline-flex items-center gap-2"><Layers className="w-5 h-5 text-brand-green" />İçerik Havuzları</h1>
        <p className="text-xs text-ink-400">Botların içerik ürettiği depolar. Her ham video yalnızca bir kez kullanılır; aynı video/gönderi tekrar paylaşılmaz. Editsiz video asla yayınlanmaz.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-white ring-1 ring-ink-700/70 p-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-ink-900 grid place-items-center"><t.icon className={cx('w-5 h-5', t.tone)} /></span>
            <div><div className={cx('text-xl font-bold tabular-nums', t.tone)}>{t.value}</div><div className="text-[11px] text-ink-400">{t.label}</div></div>
          </div>
        ))}
      </div>
      {s.videos > 0 && s.fresh < 6 && (
        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[12px] text-amber-900 inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4" />Kullanılmamış video azaldı ({s.fresh}). Tekrar olmaması için “Ham videolar”a yeni şantiye / tadilat videosu yükleyin.
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto ops-scroll pb-1 -mx-1 px-1">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" onClick={() => setView(v.id)}
            className={cx('shrink-0 rounded-2xl px-3.5 py-2 text-left ring-1 transition', view === v.id ? 'bg-gradient-to-br from-[#262A6B] to-[#1E3FA0] text-white ring-transparent shadow' : 'bg-white ring-ink-700 text-ink-200 hover:ring-brand-green/40')}>
            <div className="text-[13px] font-semibold inline-flex items-center gap-1.5"><v.icon className="w-4 h-4" />{v.label}</div>
            <div className={cx('text-[10px]', view === v.id ? 'text-[#CFE4FA]' : 'text-ink-400')}>{v.hint}</div>
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-white/60 ring-1 ring-ink-700/50 p-3">
        {view === 'reels' ? <EditedReels /> : view === 'banner' ? <BannerPool /> : view === 'photo' ? <DriveSources /> : view === 'post' ? <PostPool /> : <VideoPool />}
      </div>
    </div>
  );
}
