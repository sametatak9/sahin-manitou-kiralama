import React, { useState } from 'react';
import {
  Sparkles,
  Image,
  Send,
  CheckCircle2,
  Calendar,
  Layers,
  Sliders,
  Eye,
  RefreshCw,
  Hash,
  MessageSquare
} from 'lucide-react';
import { PlatformType } from '../../types';

interface PostStudioViewProps {
  onSchedulePost: (post: any) => void;
}

export const PostStudioView: React.FC<PostStudioViewProps> = ({ onSchedulePost }) => {
  const [platform, setPlatform] = useState<PlatformType>('INSTAGRAM');
  const [contentType, setContentType] = useState<'CAROUSEL' | 'IMAGE' | 'REEL' | 'STORY'>('IMAGE');
  const [topic, setTopic] = useState('18 Metre Manitou MT-X 1840 Şantiye Verimliliği');
  const [tone, setTone] = useState('Kurumsal & Güven Verici');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generated post preview
  const [title, setTitle] = useState('Şantiyelerde Yüksek İrtifa Gücü: 18m Manitou MT-X 1840');
  const [caption, setCaption] = useState(
    'Çelik çatı, sandviç panel montajı ve şantiye içi ağır yük transferlerinizde 4 ton kaldırma kapasitesiyle Şahin Manitou güvencesi yanınızda! İstanbul geneli operatörlü hızlı şantiye teslimi.'
  );
  const [hashtags, setHashtags] = useState('#manitou #işmakineleri #telehandler #kiralıkmanitou #embayyapi #güngören');
  const [cta, setCta] = useState('Şantiyenize en uygun makine ve kiralama şartları için: 0531 436 29 04');

  const handleGenerateAI = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      if (topic.includes('Kentsel') || topic.includes('Tozkoparan')) {
        setTitle('Güngören Tozkoparan Kentsel Dönüşümde Güvenli Yarınlar');
        setCaption('Embay Yapı olarak Tozkoparan sakinlerine deprem yönetmeliğine uygun, C35 beton ve radye temel kalitesiyle yeni yaşam alanları inşa ediyoruz. Şeffaf süreç, yerinde inceleme.');
        setHashtags('#tozkoparan #güngören #kentseldönüşüm #depremgüvenliği #embayyapi');
        setCta('Ücretsiz yerinde bina zemin keşfi ve danışmanlık: 0531 436 29 04');
      } else {
        setTitle('18 Metre Teleskopik Manitou MT-X 1840 Kiralama');
        setCaption('Hadımköy, Çorlu ve İstanbul sanayi projelerine özel 18m sepetli ve çatallı Manitou kiralama filomuz hizmetinizde. 250 saatlik düzenli bakımlı, sigortalı ve sertifikalı operatörlü.');
        setHashtags('#manitou #telehandler #teleskopikforklift #inşaatmakinesi #şahinmanitou');
        setCta('Anında şantiye sevkiyatı ve fiyat teklifi için arayın: 0531 436 29 04');
      }
    }, 1000);
  };

  const handleSaveToCalendar = () => {
    onSchedulePost({
      platform,
      title,
      caption,
      hashtags: hashtags.split(' '),
      cta,
      plannedAt: '2026-09-27 11:00',
      bot: 'Post Studio AI Engine',
      campaign: 'Eylül 2026 Sosyal Medya İletişimi',
      approvalStatus: 'APPROVED'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          POST STUDIO • SOSYAL MEDYA & İÇERİK FABRİKASI
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Akıllı İçerik Üretimi & Önizleme
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Platform, içerik tipi ve hedef şantiye/dönüşüm konusunu seçin; yapay zeka sektörünüze uygun metin, görsel yönlendirmesi ve çağrı (CTA) üretsin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Parameters (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            1. Üretim Parametreleri
          </h2>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Hedef Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {(['INSTAGRAM', 'GOOGLE_BUSINESS', 'FACEBOOK'] as PlatformType[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                    platform === p
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p === 'GOOGLE_BUSINESS' ? 'Google İşletme' : p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">İçerik Türü</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setContentType('IMAGE')}
                className={`p-2 rounded-xl text-xs font-semibold border ${
                  contentType === 'IMAGE' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                🖼️ Tek Görsel Post
              </button>
              <button
                type="button"
                onClick={() => setContentType('CAROUSEL')}
                className={`p-2 rounded-xl text-xs font-semibold border ${
                  contentType === 'CAROUSEL' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                📚 Çoklu Kaydırma
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Konu & Kampanya</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
              placeholder="Örn: 18m Manitou kiralama veya Tozkoparan kentsel dönüşüm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">İletişim Tonu</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600 bg-white"
            >
              <option value="Kurumsal & Güven Verici">Kurumsal & Güven Verici (Tavsiye Edilen)</option>
              <option value="Teknik & Mühendislik Odaklı">Teknik & Mühendislik Odaklı (Şantiyeler İçin)</option>
              <option value="Doğrudan Aksiyon Çağrılı">Doğrudan Aksiyon Çağrılı (Hemen Arayın)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerateAI}
            disabled={isGenerating}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'AI ile Oluşturuluyor...' : 'Yapay Zeka ile Metni Yenile'}
          </button>
        </div>

        {/* Right Form: Live Interactive Preview (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Canlı Önizleme & Düzenleme
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {platform} Önizlemesi
            </span>
          </div>

          {/* Social Mockup Card */}
          <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {/* Mock Header */}
            <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  SM
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">sahinmanitou_kiralama</h4>
                  <p className="text-[10px] text-slate-400">İstanbul, Güngören</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-bold">•••</span>
            </div>

            {/* Visual Box */}
            <div className="h-48 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="text-[10px] font-mono tracking-widest text-emerald-300 uppercase">
                EMBAY YAPI & ŞAHİN MANİTOU
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white leading-tight drop-shadow-sm">
                  {title}
                </h3>
                <p className="text-xs text-emerald-200 mt-1 font-medium">
                  {cta}
                </p>
              </div>
              <div className="text-[11px] text-emerald-400 font-mono">
                📞 0531 436 29 04
              </div>
            </div>

            {/* Captions Editable Area */}
            <div className="p-4 bg-white space-y-2 text-xs">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="w-full p-2 text-slate-700 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 leading-relaxed"
              />
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="w-full p-2 text-emerald-700 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Master Plan Step 6: Canva & Figma Creative Design Links */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-700 block">🎨 Tasarım & Şablon Bağlantıları (Figma / Canva):</span>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://canva.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-semibold hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
              >
                <span>Canva Şablonunu Aç</span>
                <span className="text-[10px] text-blue-600">↗</span>
              </a>
              <a
                href="https://figma.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-semibold hover:bg-purple-100 flex items-center gap-1.5 transition-colors"
              >
                <span>Figma Varlık Dosyası</span>
                <span className="text-[10px] text-purple-600">↗</span>
              </a>
              <span className="text-[11px] text-slate-500">
                Resmi şablon referansı: <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">#manitou-industrial-post-v1</code>
              </span>
            </div>
          </div>

          {/* Schedule button */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={handleSaveToCalendar}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              Onayla ve Takvime Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
