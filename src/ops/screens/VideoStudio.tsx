import { useState } from 'react';
import {
  Film, Sparkles, CalendarClock, Download, ExternalLink, CheckCircle2, Copy, Check, Clapperboard, Music, Wand2
} from 'lucide-react';
import { Button, Panel, Pill, Notice, StateView, cx } from '../ui';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import { useRouter } from '../session';
import { VideoPool } from '../components/VideoPool';
import { MontageStudio } from '../components/MontageStudio';
import { DEMO_VIDEOS, isDemoMode } from '../lib/demoData';

interface VideoRow { id: string; title: string; caption: string | null; video_url: string; primary_platform: string | null; format: string | null; workflow_status: string; scheduled_at: string | null; created_at: string }
const WF_LABEL: Record<string, string> = { scheduled: 'ZAMANLANDI', pending_approval: 'ONAY BEKLİYOR', published: 'PAYLAŞILDI', failed: 'BAŞARISIZ', cancelled: 'İPTAL', processing: 'PAYLAŞILIYOR', approved: 'ONAYLI', draft: 'TASLAK' };

export function VideoStudioScreen() {
  const { go } = useRouter();
  const [activeTab, setActiveTab] = useState<'pool' | 'generator'>('pool');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMontageModal, setShowMontageModal] = useState(false);

  const videos = useQuery(async () => {
    let rows = unwrap(await db().from('social_drafts').select('id,title,caption,video_url,primary_platform,format,workflow_status,scheduled_at,created_at')
      .not('video_url', 'is', null).order('created_at', { ascending: false }).limit(60)) as VideoRow[];
    if (!rows || rows.length === 0) {
      rows = DEMO_VIDEOS.map((v) => ({
        id: v.id,
        title: v.title,
        caption: v.caption,
        video_url: v.url,
        primary_platform: 'instagram',
        format: 'instagram_reel',
        workflow_status: 'scheduled',
        scheduled_at: v.created_at,
        created_at: v.created_at,
      }));
    }
    return rows;
  }, [] as VideoRow[], [], ['social_drafts']);

  // Higgsfield prompt generator state
  const [brand, setBrand] = useState<'rental' | 'construction'>('rental');
  const [motion, setMotion] = useState('drone-orbit');
  const [details, setDetails] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  const copyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreatePrompt = () => {
    let p = '';
    if (brand === 'rental') {
      p = `Professional commercial video of Manitou telehandler machine performing ${details || 'heavy material handling'} on an Istanbul construction site, camera movement: ${motion}, cinematic lighting, photorealistic, 4K resolution, 60fps vertical reel.`;
    } else {
      p = `Cinematic documentary style video of modern urban regeneration project by Embay Yapi in Gungoren, showing ${details || 'earthquake resistant reinforced foundation and modern architectural facade'}, camera movement: ${motion}, warm sunlight, ultra-photorealistic 4k.`;
    }
    setGeneratedPrompt(p);
  };

  const videoList = videos.data.length ? videos.data : (DEMO_VIDEOS.map((v) => ({
    id: v.id,
    title: v.title,
    caption: v.caption,
    video_url: v.url,
    primary_platform: 'instagram',
    format: 'instagram_reel',
    workflow_status: 'scheduled',
    scheduled_at: v.created_at,
    created_at: v.created_at,
  })) as VideoRow[]);

  return (
    <div className="space-y-5">
      {/* Üst Bilgi ve Hızlı Eylem Çubuğu */}
      <section className="ops-panel p-6 relative overflow-hidden bg-gradient-to-r from-emerald-50/40 via-white to-sky-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-ping" />
              <span className="text-[11px] font-mono uppercase font-bold text-brand-green tracking-widest">
                Reels Montaj & Video Operasyon Merkezi
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-ink-100 mt-1 flex items-center gap-2">
              <Film className="w-6 h-6 text-brand-green" /> Video Stüdyosu & Kurgu
            </h2>
            <p className="text-xs text-ink-400 mt-1 max-w-2xl leading-relaxed">
              Şantiye kliplerini birleştirin, profesyonel fon müziği ekleyin, açılış kanca sorusu ve firma künyesiyle otomatik dikey Reels/Shorts üretin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setShowMontageModal(true)}
              icon={<Clapperboard className="w-4 h-4" />}
            >
              Reels Montajı & Müzikli Birleştirme
            </Button>

            <a
              href="https://www.canva.com/create/instagram-reels/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-semibold shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Canva Video Editörü
            </a>

            <div className="h-6 w-px bg-ink-700 hidden sm:block" />

            <div className="flex items-center gap-1.5 bg-ink-850 p-1 rounded-xl border border-ink-700">
              <button
                type="button"
                onClick={() => setActiveTab('pool')}
                className={cx('px-3 py-1.5 rounded-lg text-xs font-semibold transition', activeTab === 'pool' ? 'bg-white text-ink-100 shadow-xs' : 'text-ink-400 hover:text-ink-200')}
              >
                Video Havuzu
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('generator')}
                className={cx('px-3 py-1.5 rounded-lg text-xs font-semibold transition', activeTab === 'generator' ? 'bg-white text-ink-100 shadow-xs' : 'text-ink-400 hover:text-ink-200')}
              >
                AI 4K İstemcisi
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Montaj Modal Penceresi */}
      {showMontageModal && (
        <MontageStudio
          onClose={() => setShowMontageModal(false)}
          onDone={() => {
            setShowMontageModal(false);
            videos.reload();
          }}
        />
      )}

      {activeTab === 'pool' && (
        <div className="space-y-6">
          <VideoPool />

          {videoList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-ink-800 pb-2">
                <h3 className="text-sm font-bold text-ink-100 flex items-center gap-2">
                  <Film className="w-4 h-4 text-brand-green" />
                  <span>Yayın Kuyruğu & Hazır Videolar ({videoList.length})</span>
                </h3>
                <span className="text-xs text-ink-400">Canlı önizleyebilir veya indirebilirsiniz</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoList.map((v) => (
                  <Panel key={v.id} className="flex flex-col justify-between overflow-hidden shadow-xs border border-ink-700 hover:border-brand-green/70 transition">
                    <div>
                      <video
                        src={v.video_url}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full aspect-video rounded-xl bg-black mb-3 object-cover shadow-xs"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <Pill tone={v.workflow_status === 'published' ? 'go' : v.workflow_status === 'failed' ? 'stop' : 'info'}>
                          {WF_LABEL[v.workflow_status] ?? v.workflow_status}
                        </Pill>
                        <span className="text-[10px] font-mono uppercase font-bold text-ink-400 bg-ink-900 px-2 py-0.5 rounded">
                          {(v.primary_platform ?? 'INSTAGRAM').toUpperCase()} · {v.format ?? 'REEL'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm text-ink-100 line-clamp-2 leading-snug">{v.title}</h3>
                      {v.caption && <p className="text-xs text-ink-400 mt-1 line-clamp-2">{v.caption}</p>}
                      <div className="text-[10px] font-mono text-ink-500 mt-2 font-medium">
                        {v.scheduled_at ? `Yayın: ${fmtDateTime(v.scheduled_at)}` : `Tarih: ${fmtDateTime(v.created_at)}`}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-ink-800 flex items-center gap-2">
                      <Button variant="ghost" className="flex-1 text-xs py-1.5 font-semibold" icon={<CalendarClock className="w-3.5 h-3.5" />} onClick={() => go('queue')}>
                        Yayın Kuyruğu
                      </Button>
                      <a href={v.video_url} target="_blank" download rel="noreferrer" className="ops-chip !py-1.5">
                        <Download className="w-3.5 h-3.5" /> İndir
                      </a>
                    </div>
                  </Panel>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'generator' && (
        <Panel kicker="Higgsfield AI & Runway Entegrasyonu" title="Yeni Reklam Videosu İstemcisi">
          <div className="space-y-4 max-w-2xl">
            <Notice tone="info">
              Bu istem oluşturucu; Higgsfield AI, Runway Gen-3 ve Luma Dream Machine için 4K dikey Reels reklam komutları hazırlar. İstemi kopyalayıp ilgili araçta videoyu üretin, sonra videoyu <b>Yayın Kuyruğu</b>’na yükleyip zamanlayın.
            </Notice>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-300 mb-1">Marka / Hizmet</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value as any)}
                  className="ops-input w-full font-semibold"
                >
                  <option value="rental">Şahin Manitou Kiralama (14m-18m Telehandler)</option>
                  <option value="construction">Embay Yapı (Tozkoparan Kentsel Dönüşüm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-300 mb-1">Kamera Hareketi</label>
                <select
                  value={motion}
                  onChange={(e) => setMotion(e.target.value)}
                  className="ops-input w-full font-semibold"
                >
                  <option value="drone-orbit">360° Drone Yörünge (Drone Orbit)</option>
                  <option value="fpv-flythrough">Hızlı Şantiye İçi FPV Geçiş</option>
                  <option value="cinematic-push-in">Sinematik Yavaş Yakınlaşma (Slow Push)</option>
                  <option value="crane-boom-up">Yerden Göğe Vinç Yükselişi (Boom Up)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-300 mb-1">Özel Sahne Detayı (Opsiyonel)</label>
              <input
                type="text"
                placeholder="Örn: 5. kata palet tuğla indirme, yağmurlu şantiye, operatör kabini detayı..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="ops-input w-full"
              />
            </div>

            <Button
              variant="primary"
              onClick={handleCreatePrompt}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Higgsfield 4K İstemini Üret
            </Button>

            {generatedPrompt && (
              <div className="p-4 rounded-xl bg-ink-900 border border-brand-green/30 mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-brand-green font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hazır Higgsfield Prompt:
                  </span>
                  <Button
                    variant="ghost"
                    className="text-xs py-1 px-2.5"
                    onClick={() => copyPrompt(generatedPrompt, 'gen')}
                    icon={copiedId === 'gen' ? <Check className="w-3 h-3 text-brand-green" /> : <Copy className="w-3 h-3" />}
                  >
                    {copiedId === 'gen' ? 'Kopyalandı' : 'Kopyala'}
                  </Button>
                </div>
                <p className="font-mono text-xs text-ink-200 bg-ink-850 p-3 rounded-lg leading-relaxed select-all">
                  {generatedPrompt}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="primary"
                    onClick={() => go('queue')}
                    icon={<CalendarClock className="w-3.5 h-3.5" />}
                  >
                    Videoyu yükle (Yayın Kuyruğu)
                  </Button>
                  <a
                    href="https://higgsfield.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-200 px-3 py-2 rounded-xl ring-1 ring-ink-700"
                  >
                    Higgsfield AI Aç <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
