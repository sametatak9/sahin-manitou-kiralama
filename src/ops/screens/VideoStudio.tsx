import { useState } from 'react';
import {
  Film, Sparkles, CalendarClock, Download, ExternalLink, CheckCircle2, Copy, Check
} from 'lucide-react';
import { Button, Panel, Pill, Notice, StateView, cx } from '../ui';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import { useRouter } from '../session';
import { VideoPool } from '../components/VideoPool';

// Video havuzu yalnızca gerçekten yüklenmiş videoları gösterir (Yayın Kuyruğu'ndan yüklenen, social_drafts.video_url).
interface VideoRow { id: string; title: string; caption: string | null; video_url: string; primary_platform: string | null; format: string | null; workflow_status: string; scheduled_at: string | null; created_at: string }
const WF_LABEL: Record<string, string> = { scheduled: 'ZAMANLANDI', pending_approval: 'ONAY BEKLİYOR', published: 'PAYLAŞILDI', failed: 'BAŞARISIZ', cancelled: 'İPTAL', processing: 'PAYLAŞILIYOR', approved: 'ONAYLI', draft: 'TASLAK' };

export function VideoStudioScreen() {
  const { go } = useRouter();
  const [activeTab, setActiveTab] = useState<'pool' | 'generator'>('pool');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const videos = useQuery(async () => unwrap(await db().from('social_drafts').select('id,title,caption,video_url,primary_platform,format,workflow_status,scheduled_at,created_at')
    .not('video_url', 'is', null).order('created_at', { ascending: false }).limit(60)) as VideoRow[], [] as VideoRow[], [], ['social_drafts']);

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

  return (
    <div className="space-y-5">
      {/* Üst Başlık & Sekmeler */}
      <section className="ops-panel p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-100 mt-1 flex items-center gap-2">
              <Film className="w-6 h-6 text-brand-green" /> Video Havuzu & AI Üretim
            </h2>
            <p className="text-xs text-ink-300 mt-1">
              Videolarınızı buraya yükleyin: havuza kaydolur, uygulamasını seçer, kırpar/kapak seçer ve istediğiniz saatte paylaşılmak üzere kuyruğa gönderirsiniz.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'pool' ? 'primary' : 'ghost'}
              onClick={() => setActiveTab('pool')}
              icon={<Film className="w-4 h-4" />}
            >
              Video havuzu
            </Button>
            <Button
              variant={activeTab === 'generator' ? 'primary' : 'ghost'}
              onClick={() => setActiveTab('generator')}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Higgsfield AI İstemcisi
            </Button>
          </div>
        </div>
      </section>

      {activeTab === 'pool' && <VideoPool />}
      {activeTab === 'pool' && videos.data.length > 0 && <h3 className="text-sm font-semibold text-ink-100 pt-2">Yayın Kuyruğu’ndaki videolar ({videos.data.length})</h3>}
      {activeTab === 'pool' && (videos.loading ? null : videos.data.length === 0 ? null : (        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.data.map((v) => (
            <Panel key={v.id} className="flex flex-col justify-between overflow-hidden">
              <div>
                <video src={v.video_url} controls playsInline preload="metadata" className="w-full aspect-video rounded-xl bg-ink-900 border border-ink-800 mb-3" />
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <Pill tone={v.workflow_status === 'published' ? 'go' : v.workflow_status === 'failed' ? 'stop' : 'info'}>{WF_LABEL[v.workflow_status] ?? v.workflow_status}</Pill>
                  <span className="text-[10px] font-mono text-ink-500">{(v.primary_platform ?? '').toUpperCase()} · {v.format ?? 'video'}</span>
                </div>
                <h3 className="font-semibold text-sm text-ink-100 line-clamp-2 leading-snug">{v.title}</h3>
                {v.caption && <p className="text-xs text-ink-400 mt-1 line-clamp-2">{v.caption}</p>}
                <div className="text-[10px] font-mono text-ink-500 mt-1.5">{v.scheduled_at ? `Paylaşım: ${fmtDateTime(v.scheduled_at)}` : `Yüklendi: ${fmtDateTime(v.created_at)}`}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-ink-800/80 flex items-center gap-2">
                <Button variant="ghost" className="flex-1 text-xs py-1.5" icon={<CalendarClock className="w-3.5 h-3.5" />} onClick={() => go('queue')}>Yayın Kuyruğu</Button>
                <a href={v.video_url} target="_blank" rel="noreferrer" className="ops-chip"><Download className="w-3.5 h-3.5" />İndir</a>
              </div>
            </Panel>
          ))}
        </div>
      ))}

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
                  className="ops-input w-full"
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
                  className="ops-input w-full"
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
