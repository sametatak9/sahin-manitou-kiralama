import { useState } from 'react';
import { Copy, Check, Code, Globe, Tag, HelpCircle, FileText } from 'lucide-react';
import { WEBSITE_SEO_DATA, BUSINESS_INFO } from '../data/marketingData';

export function SiteSeoSection() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const faqItems = [
    {
      q: 'Manitou kiralama fiyatları nasıl hesaplanır?',
      a: 'Manitou kiralama fiyatlarımız şantiyenin bulunduğu ilçe (Güngören, Bağcılar, Bakırköy vb.), işin kaç saat veya kaç gün süreceği, kaldırılacak malzemenin cinsi ve operatör tercihinize göre belirlenir. Net ve güncel teklif almak için 0531 436 29 04 numaramızı arayabilirsiniz.'
    },
    {
      q: 'Kira süresi en az ne kadardır?',
      a: 'Projelerinizin büyüklüğüne göre saatlik, günlük, haftalık veya aylık periyotlarda esnek kiralama çözümleri sunmaktayız.'
    },
    {
      q: 'Hangi katlara kadar malzeme çıkartılabilir?',
      a: 'Teleskopik yükleyicilerimiz modeline göre 14 ila 18 metreye kadar uzanarak 4-5 katlı binalara doğrudan paletli yük aktarımı yapabilmektedir.'
    },
    {
      q: 'Embay Yapı ile kentsel dönüşüm süreci nasıl işler?',
      a: 'Embay Yapı olarak Güngören ve çevresinde eski binaların kentsel dönüşüm kapsamında yenilenmesi, kat karşılığı taahhüt ve anahtar teslim konut projelerini kendi iş makinesi filomuzla hızlı ve güvenilir şekilde yürütüyoruz.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/30 mb-2">
              <Globe className="w-3.5 h-3.5" />
              Vercel Web Sitesi SEO & Yapısal Veri (Schema)
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              sahin-manitou-kiralama.vercel.app İçin Kod ve Metin Seti
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              Google botlarının siteyi taradığında işletmenin yerini (Güngören), telefonunu ({BUSINESS_INFO.phone}) ve hizmet alanlarını eksiksiz anlaması için optimize edilmiştir.
            </p>
          </div>
          <a
            href={BUSINESS_INFO.website}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-blue-950/40"
          >
            <Globe className="w-4 h-4" />
            Canlı Siteyi Aç
          </a>
        </div>
      </div>

      {/* Meta Tags & Headings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Title & Description */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-400" />
              Google Arama Snippet'i (Title & Description)
            </h3>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-medium">Meta Title (Başlık):</span>
              <button
                onClick={() => handleCopy('title', WEBSITE_SEO_DATA.title)}
                className="text-xs text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedKey === 'title' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Kopyala
              </button>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs sm:text-sm text-blue-400 font-semibold select-all">
              {WEBSITE_SEO_DATA.title}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-medium">Meta Description (Açıklama):</span>
              <button
                onClick={() => handleCopy('desc', WEBSITE_SEO_DATA.metaDescription)}
                className="text-xs text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedKey === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Kopyala
              </button>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-300 select-all leading-relaxed">
              {WEBSITE_SEO_DATA.metaDescription}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-medium">Site Ana H1 Başlığı:</span>
              <button
                onClick={() => handleCopy('h1', WEBSITE_SEO_DATA.h1)}
                className="text-xs text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedKey === 'h1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Kopyala
              </button>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-bold select-all">
              {WEBSITE_SEO_DATA.h1}
            </div>
          </div>
        </div>

        {/* H2 Structure & SSS */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              Site İçi Sıkça Sorulan Sorular (SSS / FAQ)
            </h3>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {faqItems.map((faq, fIdx) => (
              <div key={fIdx} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="text-xs font-bold text-amber-400 mb-1">{faq.q}</div>
                <div className="text-xs text-slate-300 leading-relaxed">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* JSON-LD Schema Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-400" />
              Google Arama Motoru İçin JSON-LD Yapısal Veri (Schema.org)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Bu kodu Vercel sitenizin &lt;head&gt; etiketleri arasına yerleştirdiğinizde Google; Şahin Manitou ve Embay Yapı'nın aynı çatı altında, Güngören'de faaliyet gösterdiğini doğrular.
            </p>
          </div>
          <button
            onClick={() => handleCopy('schema', `<script type="application/ld+json">\n${WEBSITE_SEO_DATA.jsonLdSchema}\n</script>`)}
            className="px-3.5 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
          >
            {copiedKey === 'schema' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Schema Kodu Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Script Kodunu Kopyala</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed select-all">
{`<script type="application/ld+json">
${WEBSITE_SEO_DATA.jsonLdSchema}
</script>`}
        </pre>
      </div>
    </div>
  );
}
