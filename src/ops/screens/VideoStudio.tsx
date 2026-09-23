import { useState } from 'react';
import {
  Film, Sparkles, Play, CalendarClock, Download, Share2, Plus, ExternalLink,
  CheckCircle2, Clock, Truck, Building2, Copy, Check
} from 'lucide-react';
import { Button, Panel, Pill, Notice, cx } from '../ui';
import { useRouter } from '../session';

interface VideoItem {
  id: string;
  title: string;
  category: 'rental' | 'construction';
  format: 'reel' | 'post' | 'landscape';
  duration: string;
  thumbnail: string;
  videoUrl?: string;
  prompt: string;
  aiEngine: string;
  status: 'ready' | 'scheduled' | 'draft';
  targetAudience: string;
  cta: string;
}

const INITIAL_VIDEOS: VideoItem[] = [
  {
    id: 'vid-1',
    title: 'Şahin Manitou — 18 Metre Yüksek İrtifa Güngören Şantiye Operasyonu',
    category: 'rental',
    format: 'reel',
    duration: '0:28 sn',
    thumbnail: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=800&auto=format&fit=crop&q=80',
    prompt: 'Cinematic drone shot orbiting an 18-meter Manitou telehandler lifting pallets into an urban regeneration construction site in Istanbul, realistic lighting, golden hour, 4k ultra-detailed.',
    aiEngine: 'Higgsfield AI (Cinema 4K)',
    status: 'ready',
    targetAudience: 'Müteahhitler, Taşeronlar, Şantiye Şefleri',
    cta: 'Hızlı kiralama & sevk için: 0531 436 29 04',
  },
  {
    id: 'vid-2',
    title: 'Embay Yapı — Tozkoparan Güvenli Kentsel Dönüşüm Temel Atma & Dönüşüm',
    category: 'construction',
    format: 'reel',
    duration: '0:35 sn',
    thumbnail: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80',
    prompt: 'Hyper-realistic architectural visual transition, old risky building transforming into a modern earthquake-resilient luxury residential apartment building in Gungoren Istanbul, smooth slider shot.',
    aiEngine: 'Higgsfield AI + Runway Gen-3',
    status: 'ready',
    targetAudience: 'Hak Sahipleri, Arsa Sahipleri, Daire Sakinleri',
    cta: 'Ücretsiz yerinde dönüşüm danışmanlığı: 0531 436 29 04',
  },
  {
    id: 'vid-3',
    title: 'Operatörlü Manitou Kiralama — Acil Sevk & Sertifikalı Uzman Kadro',
    category: 'rental',
    format: 'reel',
    duration: '0:22 sn',
    thumbnail: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800&auto=format&fit=crop&q=80',
    prompt: 'Macro and wide cuts of a heavy machinery transport truck arriving at a busy construction site, unloading a Manitou machine, professional certified operator waving, high-energy commercial.',
    aiEngine: 'Higgsfield AI commercial cut',
    status: 'scheduled',
    targetAudience: 'Fabrikalar, Lojistik Depolar, Çelik Konstrüksiyon',
    cta: 'Saatlik / Günlük / Aylık kiralama: 0531 436 29 04',
  },
];

export function VideoStudioScreen() {
  const { go } = useRouter();
  const [activeTab, setActiveTab] = useState<'pool' | 'generator'>('pool');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

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
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-brand-green">Medya Stüdyosu · Higgsfield AI</div>
            <h2 className="font-display text-2xl font-bold text-ink-100 mt-1 flex items-center gap-2">
              <Film className="w-6 h-6 text-brand-green" /> Video Havuzu & AI Üretim
            </h2>
            <p className="text-xs text-ink-300 mt-1">
              Instagram Reels, TikTok ve YouTube Shorts için hazır reklam videoları ve Higgsfield AI video istemleri.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'pool' ? 'primary' : 'ghost'}
              onClick={() => setActiveTab('pool')}
              icon={<Film className="w-4 h-4" />}
            >
              Hazır Videolar ({INITIAL_VIDEOS.length})
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

      {activeTab === 'pool' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INITIAL_VIDEOS.map((v) => (
            <Panel key={v.id} className="flex flex-col justify-between overflow-hidden group">
              <div>
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-ink-900 border border-ink-800">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-black/20" />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <Pill tone={v.category === 'rental' ? 'go' : 'info'} dot={false}>
                      {v.category === 'rental' ? 'ŞAHİN MANİTOU' : 'EMBAY YAPI'}
                    </Pill>
                    <span className="text-[10px] font-mono bg-black/60 text-white px-2 py-0.5 rounded-full border border-white/10">
                      {v.duration}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white/90">
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <Sparkles className="w-3 h-3 text-amber-400" /> {v.aiEngine}
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold text-sm text-ink-100 line-clamp-2 leading-snug">{v.title}</h3>
                <p className="text-xs text-ink-400 mt-1.5 line-clamp-2 bg-ink-850 p-2 rounded-lg font-mono text-[11px]">
                  "{v.prompt}"
                </p>

                <div className="mt-3 space-y-1 text-[11px] text-ink-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-500">Hedef:</span> <span>{v.targetAudience}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-500">CTA:</span> <span className="text-brand-green font-medium">{v.cta}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-ink-800/80 flex items-center gap-2">
                <Button
                  variant="primary"
                  className="flex-1 text-xs py-1.5"
                  icon={<CalendarClock className="w-3.5 h-3.5" />}
                  onClick={() => go('queue')}
                >
                  Kuyruğa Ekle
                </Button>
                <Button
                  variant="ghost"
                  className="px-2.5 py-1.5"
                  title="İstemi Kopyala"
                  onClick={() => copyPrompt(v.prompt, v.id)}
                  icon={copiedId === v.id ? <Check className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                />
              </div>
            </Panel>
          ))}
        </div>
      )}

      {activeTab === 'generator' && (
        <Panel kicker="Higgsfield AI & Runway Entegrasyonu" title="Yeni Reklam Videosu İstemcisi">
          <div className="space-y-4 max-w-2xl">
            <Notice tone="info">
              Bu istem oluşturucu; Higgsfield AI, Runway Gen-3 ve Luma Dream Machine için 4K dikey Reels reklam komutları hazırlar. Oluşturduğunuz istemi tek tıkla kopyalayabilir veya doğrudan <b>Yayın Kuyruğu</b> planına ekleyebilirsiniz.
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
                    Yayın Kuyruğuna Ekle
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
