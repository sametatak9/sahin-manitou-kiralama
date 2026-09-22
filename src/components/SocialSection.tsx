import { useState } from 'react';
import { Copy, Check, Instagram, Video, Film, Eye, Sparkles, Hash, MessageCircle } from 'lucide-react';
import { INSTAGRAM_BIOS, REELS_SCRIPTS, BUSINESS_INFO } from '../data/marketingData';

export function SocialSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reels' | 'bio' | 'stories' | 'hashtags'>('reels');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const sampleStories = [
    {
      title: 'Hikaye 1: Sabah Mesaisi & Lokasyon Belirtme',
      format: 'Şantiye Girişi Fotoğrafı / Kısa Video',
      content: '📍 Konum Çıkartması: Güngören / Tozkoparan\nMetin: "Yeni gün, yeni şantiye. Şahin Manitou sahada hazır! 🚜 Hayırlı işler."',
      strategy: 'Konum çıkartması Güngören bölgesindeki yerel kullanıcıların hikaye akışına düşmeyi sağlar.'
    },
    {
      title: 'Hikaye 2: Etkileşimli Bom Yüksekliği Anketi',
      format: 'Bom 4. kata doğru uzanırken çekilen video',
      content: 'Metin: "Sizce yük kaçıncı kata çıkıyor?"\nAnket Çıkartması: [3. Kat] vs [5. Kat]',
      strategy: 'Ankete tıklanması Instagram algoritmasında "yüksek etkileşimli hesap" sinyali verir.'
    },
    {
      title: 'Hikaye 3: Hızlı Teklif & İletişim CTA',
      format: 'Makinanın önünden temiz bir kare',
      content: 'Metin: "Tır indirme, palet taşıma ve şantiye yükleme işlerinizde acil makine mi lazım?\n📞 0531 436 29 04\n🔗 sahin-manitou-kiralama.vercel.app"',
      strategy: 'Bağlantı çıkartması ile arayan veya web sitesine giden sıcak müşterileri toplar.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-pink-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-semibold border border-pink-500/30 mb-2">
              <Instagram className="w-3.5 h-3.5" />
              Instagram Popülerlik & Keşfet Yönetimi: @embayyapi
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Reels Kancaları, Bio Optimizasyonu ve Samimi Şantiye Hikayeleri
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              İnşaat ve iş makinesi sektöründe en çok izlenen içerikler: <strong>Yapay süslü reklamlar değil, çamurlu botlar, motor sesi, dar sokak manevraları ve milimetrik yük kaldırmadır.</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('reels')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reels'
                  ? 'bg-pink-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Reels Senaryoları ({REELS_SCRIPTS.length})
            </button>
            <button
              onClick={() => setActiveTab('bio')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bio'
                  ? 'bg-pink-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Instagram Bio
            </button>
            <button
              onClick={() => setActiveTab('stories')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'stories'
                  ? 'bg-pink-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Hikaye (Story) Şablonları
            </button>
            <button
              onClick={() => setActiveTab('hashtags')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'hashtags'
                  ? 'bg-pink-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              Temiz Hashtagler
            </button>
          </div>
        </div>
      </div>

      {/* 1. REELS SENARYOLARI */}
      {activeTab === 'reels' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-5">
            {REELS_SCRIPTS.map((script) => (
              <div
                key={script.id}
                className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 hover:border-pink-500/40 transition-all shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                      <Video className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-white">{script.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(`${script.id}-all`, `${script.caption}\n\n${script.hashtags.join(' ')}`)}
                      className="px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedId === `${script.id}-all` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Açıklama & Etiketler Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Caption & Hashtag Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Hook Box */}
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                      İlk 3 Saniye Kancası (Videonun Üzerine Yazılacak Metin)
                    </span>
                    <p className="text-sm font-bold text-white mt-1">
                      {script.hookText}
                    </p>
                  </div>
                </div>

                {/* Visual Scene Idea */}
                <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-3 text-xs text-slate-300">
                  <strong className="text-pink-400 block mb-1">📹 Sahada Çekilecek Görüntü (Kamera Açısı):</strong>
                  {script.visualIdea}
                </div>

                {/* Caption */}
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    Gönderi Açıklama Metni (Instagram Caption):
                  </span>
                  <div className="rounded-lg bg-slate-950 border border-slate-800/80 p-3.5 text-xs text-slate-200 whitespace-pre-line leading-relaxed select-all">
                    {script.caption}
                  </div>
                </div>

                {/* Hashtags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {script.hashtags.map((tag, tIdx) => (
                    <span key={tIdx} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-pink-300 font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. BIO OPTİMİZASYONU */}
      {activeTab === 'bio' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {INSTAGRAM_BIOS.map((bio) => {
            const bioText = bio.lines.join('\n');
            return (
              <div key={bio.id} className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-white">{bio.title}</h3>
                    <button
                      onClick={() => handleCopy(bio.id, bioText)}
                      className="px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedId === bio.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Bio Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Bio'yu Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bio Preview Box */}
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-sans text-xs sm:text-sm text-slate-100 whitespace-pre-line leading-relaxed select-all">
                    {bioText}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
                  ℹ️ {bio.note}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. STORY ŞABLONLARI */}
      {activeTab === 'stories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sampleStories.map((story, sIdx) => (
            <div key={sIdx} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-1">
                  {story.format}
                </div>
                <h4 className="text-sm font-bold text-white mb-2">{story.title}</h4>
                <div className="rounded-lg bg-slate-950 p-3 text-xs text-slate-200 whitespace-pre-line border border-slate-800">
                  {story.content}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-amber-300">
                🎯 {story.strategy}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. TEMİZ HASHTAG KÜMELERİ */}
      {activeTab === 'hashtags' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Temiz ve Spam Filtresine Takılmayan Etiket Kümeleri</h3>
            <p className="text-xs text-slate-400 mt-1">
              Instagram algoritmasında 30 adet alakasız etiket paylaşmak hesabın keşfetini kapatır (Shadowban). En ideali 6-8 adet nokta atışı sektörel ve yerel etikettir.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400">Makine & Manitou Kümesi</span>
                <button
                  onClick={() => handleCopy('hash-1', '#kiralıkmanitou #manitouistanbul #şahinmanitou #işmakinesi #teleskopikyükleyici #güngören #şantiye')}
                  className="text-xs text-pink-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Kopyala
                </button>
              </div>
              <p className="text-xs text-slate-300 font-mono">
                #kiralıkmanitou #manitouistanbul #şahinmanitou #işmakinesi #teleskopikyükleyici #güngören #şantiye
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-400">İnşaat & Taahhüt Kümesi</span>
                <button
                  onClick={() => handleCopy('hash-2', '#embayyapi #inşaat #kentseldönüşüm #müteahhit #konutinşaatı #tozkoparan #güngöreninşaat')}
                  className="text-xs text-pink-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Kopyala
                </button>
              </div>
              <p className="text-xs text-slate-300 font-mono">
                #embayyapi #inşaat #kentseldönüşüm #müteahhit #konutinşaatı #tozkoparan #güngöreninşaat
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
