import { useState } from 'react';
import { Copy, Check, Star, Search, HelpCircle, MapPin, Sparkles, MessageSquare, Wrench, Reply, Megaphone, Compass } from 'lucide-react';
import { 
  GBP_POSTS, 
  GBP_QA, 
  REVIEW_TEMPLATES, 
  KEYWORD_CATEGORIES, 
  BUSINESS_INFO,
  GBP_SERVICES_LIST,
  REVIEW_REPLIES,
  GOOGLE_ADS_COPY,
  DIRECTORY_CITATIONS
} from '../data/marketingData';

export function GbpSeoSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'posts' | 'services' | 'reviews' | 'replies' | 'qa' | 'keywords' | 'ads'>('posts');
  const [reviewLink, setReviewLink] = useState('https://g.page/r/sahin-manitou-yorum');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              1. Öncelik: Google Haritalar & Yerel SEO Sıralaması
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Google İşletme Profili (GBP) & Yerel Arama Kokpiti
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              "Kiralık manitou", "teleskopik yükleyici İstanbul" ve "inşaat Güngören" aramalarında üst sıralara tırmanmak için düzenli haftalık gönderi, soru-cevap, hizmet listesi ve gerçek müşteri yorumu akışı esastır.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSubTab('posts')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeSubTab === 'posts'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              GBP Gönderileri ({GBP_POSTS.length})
            </button>
            <button
              onClick={() => setActiveSubTab('services')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'services'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              GBP Hizmetler
            </button>
            <button
              onClick={() => setActiveSubTab('reviews')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'reviews'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Yorum İsteme
            </button>
            <button
              onClick={() => setActiveSubTab('replies')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'replies'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Reply className="w-3.5 h-3.5 text-purple-400" />
              Yorum Cevaplama
            </button>
            <button
              onClick={() => setActiveSubTab('qa')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'qa'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              Q&A
            </button>
            <button
              onClick={() => setActiveSubTab('keywords')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'keywords'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              Kelimeler
            </button>
            <button
              onClick={() => setActiveSubTab('ads')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'ads'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 text-red-400" />
              Ads & Dizinler
            </button>
          </div>
        </div>
      </div>

      {/* 1. GBP POSTLARI */}
      {activeSubTab === 'posts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Haftalık Hazır GBP Güncelleme Gönderileri</span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                Tek Tıkla Kopyala & Google Haritalar'a Yapıştır
              </span>
            </h3>
            <span className="text-xs text-amber-400/90 font-medium">
              💡 İpucu: Her gönderide sahada çekilmiş gerçek iş fotoğrafı kullanın.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GBP_POSTS.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        {post.targetAudience}
                      </span>
                      <h4 className="text-base font-bold text-white mt-0.5">
                        {post.title}
                      </h4>
                    </div>
                    <button
                      onClick={() => handleCopy(post.id, post.content)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                      title="Metni Kopyala"
                    >
                      {copiedId === post.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Metni Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-3.5 text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed font-sans select-all my-3 max-h-60 overflow-y-auto">
                    {post.content}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-emerald-400 font-medium">{post.callToAction}</span>
                  <span className="text-slate-400 italic text-[11px] truncate max-w-[220px]">
                    {post.tip}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. YORUM İSTEME (REVIEW GENERATION) */}
      {activeSubTab === 'reviews' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  Google Haritalar 5 Yıldızlı Yorum Toplama Sistemi
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Google algoritması, içinde anahtar kelime geçen (örn: "Güngören'de Manitou kiraladık, çok hızlı geldi") gerçek müşteri yorumlarına EN YÜKSEK sıralama puanını verir.
                </p>
              </div>
              <div className="shrink-0">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Google Yorum Kısa Linkiniz (İşletme Profilinizden alın):
                </label>
                <input
                  type="text"
                  value={reviewLink}
                  onChange={(e) => setReviewLink(e.target.value)}
                  placeholder="https://g.page/r/..."
                  className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REVIEW_TEMPLATES.map((tmpl) => {
              const formattedText = tmpl.text.replace('[GOOGLE_HARİTALAR_YORUM_LİNKİNİZ]', reviewLink);
              return (
                <div key={tmpl.id} className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        {tmpl.title}
                      </h4>
                      <button
                        onClick={() => handleCopy(tmpl.id, formattedText)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedId === tmpl.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>WhatsApp Metni Kopyalandı!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>WhatsApp'a Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="rounded-lg bg-slate-950 border border-slate-800 p-3.5 text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed my-2 select-all">
                      {formattedText}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    💡 Tavsiye: İşi bitirdikten hemen sonra, operatör veya patron WhatsApp üzerinden müşteriye bu mesajı gönderdiğinde geri dönüş oranı %60'ın üzerine çıkar.
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. GBP SORU & CEVAP */}
      {activeSubTab === 'qa' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4">
            <p className="text-xs sm:text-sm text-blue-200">
              📌 <strong>GBP Q&A Stratejisi:</strong> Google Haritalar profilinizde "Soru Sor" kısmına bu soruları kendi yedek hesabınızdan sorup işletme profili hesabınızdan cevaplayabilirsiniz. Google bu soruları doğrudan arama motorunda arayan kullanıcılara snippet olarak gösterir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GBP_QA.map((qa, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-400 mb-1">{qa.question}</h4>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                    {qa.answer}
                  </p>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleCopy(`qa-${idx}`, `${qa.question}\n${qa.answer}`)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === `qa-${idx}` ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Kopyalandı</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ANAHTAR KELİME MATRİSİ */}
      {activeSubTab === 'keywords' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {KEYWORD_CATEGORIES.map((cat, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <h4 className="text-sm font-bold text-white">{cat.title}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                    {cat.intent}
                  </span>
                </div>
                <div className="space-y-2">
                  {cat.keywords.map((kw, kIdx) => (
                    <div
                      key={kIdx}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between gap-2 hover:border-slate-700"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">{kw.term}</div>
                        <div className="text-[10px] text-slate-400">{kw.usageArea}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        kw.monthlyInterest === 'Çok Yüksek'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : kw.monthlyInterest === 'Yüksek'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {kw.monthlyInterest}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. GBP HİZMETLER (SERVICES) LİSTESİ */}
      {activeSubTab === 'services' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs sm:text-sm text-slate-200">
            <p>
              💡 <strong>Google Haritalar Sıralama Kuralı:</strong> Google İşletme Profilinizde "Hizmetleri Düzenle" sekmesine girip aşağıdaki hizmet adlarını ve 300 karakterlik açıklamalarını ekleyin. Google, kullanıcılar bu kelimeleri arattığında profilinizi "Bu işletme bu hizmeti sunuyor" etiketiyle ilk 3'e taşır.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GBP_SERVICES_LIST.map((srv, sIdx) => (
              <div key={sIdx} className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{srv.category}</span>
                    <button
                      onClick={() => handleCopy(`srv-${sIdx}`, `${srv.name}\n\n${srv.description}`)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === `srv-${sIdx}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-2">{srv.name}</h4>
                  <p className="text-xs sm:text-sm text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed select-all">
                    {srv.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. YORUM CEVAPLAMA ŞABLONLARI (SEO GÜÇLENDİRİCİ) */}
      {activeSubTab === 'replies' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-4 text-xs sm:text-sm text-slate-200">
            <p>
              🌟 <strong>SEO Sırrı:</strong> Google, işletme sahibinin müşteriye verdiği yanıtta geçen anahtar kelimeleri (örn: Güngören kiralık manitou) okur ve arama dizinine ekler. Müşteriye sadece "Teşekkürler" demek yerine aşağıdaki kelime zengin yanıtları kullanın.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REVIEW_REPLIES.map((rep, rIdx) => (
              <div key={rIdx} className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-400">{rep.type}</span>
                    <button
                      onClick={() => handleCopy(`rep-${rIdx}`, rep.replyText)}
                      className="px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === `rep-${rIdx}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Yanıtı Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-slate-400 italic mb-2">Müşteri Yorumu Örneği: {rep.customerReviewExample}</div>
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed select-all">
                    {rep.replyText}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-amber-300">
                  🎯 <strong>SEO Etkisi:</strong> {rep.seoTip}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. GOOGLE ADS & YEREL DİZİNLER */}
      {activeSubTab === 'ads' && (
        <div className="space-y-6">
          {/* Google Ads Headlines & Descriptions */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                Google Ads Arama Ağı Reklam Metinleri (Pazar Alanı Büyütme)
              </h3>
              <span className="text-xs text-slate-400">Google Ads Karakter Limitlerine (30 ve 90) Tam Uygun</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Headlines */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400">Başlıklar (Maks 30 Karakter):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GOOGLE_ADS_COPY.headlines.map((hl, hIdx) => (
                    <div key={hIdx} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-white font-medium truncate">{hl}</span>
                      <button
                        onClick={() => handleCopy(`hl-${hIdx}`, hl)}
                        className="text-slate-400 hover:text-amber-400 text-[11px] ml-1 shrink-0"
                      >
                        {copiedId === `hl-${hIdx}` ? '✓' : 'Kopya'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400">Açıklamalar (Maks 90 Karakter):</span>
                <div className="space-y-2">
                  {GOOGLE_ADS_COPY.descriptions.map((desc, dIdx) => (
                    <div key={dIdx} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-2">
                      <span className="text-slate-300 leading-tight">{desc}</span>
                      <button
                        onClick={() => handleCopy(`desc-${dIdx}`, desc)}
                        className="text-slate-400 hover:text-amber-400 text-[11px] shrink-0"
                      >
                        {copiedId === `desc-${dIdx}` ? '✓' : 'Kopya'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Directory Citations */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                Yerel Dizinler & Haritalar Kayıt Listesi (NAP Tutarlılığı)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DIRECTORY_CITATIONS.map((dir, dIdx) => (
                <div key={dIdx} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{dir.platform}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                        {dir.status}
                      </span>
                    </div>
                    <p className="text-xs text-amber-300/90 font-mono mb-2">{dir.target}</p>
                    <p className="text-[11px] text-slate-400 leading-normal">{dir.benefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
