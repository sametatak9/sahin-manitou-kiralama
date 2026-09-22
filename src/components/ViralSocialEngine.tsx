import { useState } from 'react';
import { 
  Instagram, 
  Video, 
  Sparkles, 
  Copy, 
  Check, 
  Play, 
  Music, 
  TrendingUp, 
  Layers, 
  Clock, 
  Share2,
  ExternalLink,
  Flame
} from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

interface ViralReelsScript {
  id: string;
  hookTitle: string;
  targetFocus: 'manitou' | 'insaat' | 'both';
  duration: string;
  musicSuggestion: string;
  estimatedReach: string;
  hookVisual: string;
  hookVoiceover: string;
  bodyVisual: string;
  bodyVoiceover: string;
  ctaVisual: string;
  ctaVoiceover: string;
  caption: string;
  hashtags: string[];
}

const REELS_SCRIPTS: ViralReelsScript[] = [
  {
    id: 'reels-1',
    hookTitle: '1. "Güngören’in En Dar Sokağında Tır Boşaltılır mı?"',
    targetFocus: 'manitou',
    duration: '22 Saniye',
    musicSuggestion: 'Popüler & Hareketli Fon Müziği (Phonk veya ritmik inşaat tempolu)',
    estimatedReach: '15.000 - 45.000 İzlenme (Keşfet Garanti)',
    hookVisual: 'Kamera arkadan dar sokağı ve sıkışık arabaları gösterir. Manitou 4 tekerini birden kırarak milimetrik olarak geri geri yanaşır. Ekranda büyük kırmızı yazı: "VİNÇ GİREMEZ DEDİLER! 🚨"',
    hookVoiceover: '"Tozkoparan’da bu sokağa vinç girse tüm Güngören kilitlenirdi! Ama şantiyede işin durması demek binlerce lira zarar demek."',
    bodyVisual: 'Hızlı kurgu: Manitou çatallarını tırdaki 1.5 tonluk tuğla paletine takar, bomu 14 metre havaya kaldırıp doğrudan 4. katın balkonuna pürüzsüzce bırakır.',
    bodyVoiceover: '"Şahin Manitou ile tırdan aldık, doğrudan 4. kata sıfır zayiatla teslim ettik. 2 tır dolusu malzeme sadece 1.5 saatte içeride."',
    ctaVisual: 'Operatör kabinden el sallar, ekranda yeşil telefon butonu ve logo belirir: "İstanbul Avrupa Yakası Şantiye Hattı: 0531 436 29 04"',
    ctaVoiceover: '"Dar sokakta işiniz durmasın, bizi hemen arayın!"',
    caption: `Dar sokakta vinç yolu kapatır, ameleyle taşımak günlerce sürer! 🚜🏗️

Şahin Manitou Kiralama olarak Güngören Tozkoparan şantiyemizde tırdan aldığımız tuğla ve ytong paletlerini 4. kat tabliyesine sıfır kırıkla teslim ettik.

📍 Güngören, Bağcılar, Bakırköy ve tüm Avrupa Yakası
⏱️ Saatlik, günlük ve proje bazlı kiralama
📞 Şantiye Hattı: 0531 436 29 04
🏗️ Müteahhitlik & Kentsel Dönüşüm: @embayyapi`,
    hashtags: ['#kiralıkmanitou', '#manitoukiralama', '#güngören', '#tozkoparan', '#kentseldönüşüm', '#inşaat', '#embayyapi', '#şantiyegünlükleri', '#işmakinesi']
  },
  {
    id: 'reels-2',
    hookTitle: '2. "Eski Çürük Binadan Depreme Dayanıklı Yaşam Alanına!"',
    targetFocus: 'insaat',
    duration: '28 Saniye',
    musicSuggestion: 'İlham Verici & Duygusal Başlayıp Güçlü Baslarla Yükselen Müzik',
    estimatedReach: '25.000 - 80.000 İzlenme (Arsa & Daire Sahipleri)',
    hookVisual: 'Eski, çatlak kolonlu binanın yıkım anı hızlıca gösterilir. Üstünde kırmızı yazı: "1999 ÖNCESİ YAPILAN BİNALAR GÜVENLİ Mİ?"',
    hookVoiceover: '"Tozkoparan’da 40 yıllık bu binanın yerinde şimdi deprem yönetmeliğine uygun, kaya gibi sağlam modern bir yuva yükseliyor."',
    bodyVisual: 'Temel demirlerinin bağlanması, C35 beton dökümü, modern asansörlü bina cephesi ve tamamlanan örnek dairenin pırıl pırıl iç çekimi.',
    bodyVoiceover: '"Embay Yapı olarak zemin etüdünden anahtar teslime kadar her aşamayı şeffaf ve tavizsiz yürütüyoruz. Çünkü insan canı her şeyden değerlidir."',
    ctaVisual: 'Müteahhit ve arsa sahiplerinin el sıkışması, ofis görüşmesi: "Ücretsiz Risk Tespiti & Kat Karşılığı Bilgi: 0531 436 29 04"',
    ctaVoiceover: '"Eski binanız için yerinde kentsel dönüşüm teklifi almak için bize DM atın veya arayın."',
    caption: `Güngören Tozkoparan’da güvenli geleceğe sağlam adımlar! 🏢✨

Embay Yapı olarak eski ve riskli binaları yerinde dönüştürüyor; modern mimari, birinci sınıf malzeme ve tavizsiz deprem güvenliğiyle hak sahiplerine teslim ediyoruz.

Kat karşılığı konut ve yerinde dönüşüm projeleriniz için ofisimize bir çay içmeye bekleriz.
📞 Keşif & Bilgi: 0531 436 29 04
📍 Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul`,
    hashtags: ['#kentseldönüşüm', '#embayyapi', '#güngöreninşaat', '#tozkoparandönüşüm', '#depremgüvenliği', '#katkarşılığı', '#konutprojeleri', '#binaöncesisonrası']
  },
  {
    id: 'reels-3',
    hookTitle: '3. "1 Tonluk Seramiği 5. Kata Çıkarmak Kaç Saat Sürer?"',
    targetFocus: 'both',
    duration: '18 Saniye',
    musicSuggestion: 'Tik-Tok Saat Sesi / Hızlı Ritim',
    estimatedReach: '20.000 - 50.000 İzlenme',
    hookVisual: 'Ekranda bölünmüş video (Split screen): Solda merdivenden yorulup kan ter içinde kalan ameleler (Kırmızı X). Sağda tek hamlede 5. kata palet uzatan Manitou (Yeşil Tik).',
    hookVoiceover: '"İnsan gücüyle taşırsan 6 saat sürer, yarısı kırılır. Şahin Manitou ile çalışırsan 12 dakikada şantiyedesin!"',
    bodyVisual: 'Çatalların paleti alıp doğrudan balkondaki ustaya milimetrik yaklaşması. Ustanın memnuniyetle başparmak kaldırması.',
    bodyVoiceover: '"İşçilikten tasarruf edin, şantiyeniz günlerce malzeme beklemesin."',
    ctaVisual: 'Büyük ve net telefon numarası: "0531 436 29 04 | Saatlik & Günlük Kiralık"',
    ctaVoiceover: '"Avrupa Yakası tüm şantiyeler için hemen arayın."',
    caption: `Zaman para demektir! ⏳💰

1 tonluk seramik ve harç paletlerini merdivenlerden insan gücüyle çıkarmak hem saatler alır hem de malzeme zayiatına yol açar. Şahin Manitou ile dakikalar içinde güvenle katlardasınız!

🚜 Kiralık Manitou Şantiye Hattı: 0531 436 29 04
🏗️ Müteahhitlik & Kentsel Dönüşüm: @embayyapi`,
    hashtags: ['#manitou', '#işmakinesi', '#şantiyelojistiği', '#kiralıkmanitou', '#güngören', '#bağcılar', '#bakırköy', '#zamandantasarruf']
  }
];

export function ViralSocialEngine() {
  const [selectedScript, setSelectedScript] = useState<ViralReelsScript>(REELS_SCRIPTS[0]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-pink-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-semibold border border-pink-500/30 mb-2">
              <Flame className="w-3.5 h-3.5" />
              Instagram Keşfet & Viral Reels Motoru
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              @embayyapi İçin Şantiyeden Müşteri Yağdıran Reels Kurguları
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              İnşaat videoları Instagram Keşfet algoritmasının en çok sevdiği içeriklerdir. Telefonunuzu elinize alıp şantiyede 15 saniye video çekin; aşağıdaki hazır kancayı (hook), ses metnini ve etiketleri yapıştırıp paylaşın.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://instagram.com/embayyapi"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition"
            >
              <Instagram className="w-4 h-4" />
              <span>@embayyapi Profilini Aç</span>
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol Menü: Senaryo Listesi */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Çekilecek Hazır Viral Senaryolar
          </span>

          {REELS_SCRIPTS.map(script => (
            <button
              key={script.id}
              onClick={() => setSelectedScript(script)}
              className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                selectedScript.id === script.id
                  ? 'bg-pink-950/30 border-pink-500 shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{script.hookTitle}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {script.duration}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="text-emerald-400 font-semibold">{script.estimatedReach}</span>
                <span>•</span>
                <span className="text-slate-300 capitalize">{script.targetFocus === 'manitou' ? '🚜 Manitou' : script.targetFocus === 'insaat' ? '🏗️ İnşaat' : '🚜🏗️ Her İkisi'}</span>
              </div>
            </button>
          ))}

          {/* Hızlı İpucu Kartı */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs text-slate-300">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              💡 Çekim Yaparken 3 Altın Kural:
            </span>
            <ul className="space-y-1 list-disc pl-4 text-slate-400">
              <li>İlk 3 saniye çok önemlidir: Makine veya yıkım anı hemen başlamalı, yavaş giriş yapılmamalıdır.</li>
              <li>Telefonu dik tutun (9:16 formatı).</li>
              <li>Videonun üstüne büyük sarı veya beyaz harflerle kancayı yazın.</li>
            </ul>
          </div>
        </div>

        {/* Sağ Panel: Çekim Yönergesi & Metinler */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">Seçili Reels Planı</span>
              <h3 className="text-xl font-black text-white mt-1">{selectedScript.hookTitle}</h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-pink-400" />
                <span>{selectedScript.musicSuggestion}</span>
              </p>
            </div>
          </div>

          {/* 3 Adımlı Sahne Planı */}
          <div className="space-y-3">
            {/* Sahne 1: Kanca (0-3 sn) */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-red-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-red-400 uppercase tracking-wider">1. Adım: İlk 3 Saniye (Kanca / Hook)</span>
                <span className="font-mono text-slate-500">00:00 - 00:03</span>
              </div>
              <p className="text-xs text-white"><strong className="text-slate-400">Görüntü:</strong> {selectedScript.hookVisual}</p>
              <p className="text-xs text-amber-300"><strong className="text-slate-400">Konuşma / Ses:</strong> {selectedScript.hookVoiceover}</p>
            </div>

            {/* Sahne 2: Gövde (3-18 sn) */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-blue-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-400 uppercase tracking-wider">2. Adım: Ana Çözüm & Şantiye İşi</span>
                <span className="font-mono text-slate-500">00:03 - 00:18</span>
              </div>
              <p className="text-xs text-white"><strong className="text-slate-400">Görüntü:</strong> {selectedScript.bodyVisual}</p>
              <p className="text-xs text-amber-300"><strong className="text-slate-400">Konuşma / Ses:</strong> {selectedScript.bodyVoiceover}</p>
            </div>

            {/* Sahne 3: Çağrı (18-25 sn) */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 uppercase tracking-wider">3. Adım: Arama & WhatsApp Çağrısı</span>
                <span className="font-mono text-slate-500">00:18 - 00:25</span>
              </div>
              <p className="text-xs text-white"><strong className="text-slate-400">Görüntü:</strong> {selectedScript.ctaVisual}</p>
              <p className="text-xs text-amber-300"><strong className="text-slate-400">Konuşma / Ses:</strong> {selectedScript.ctaVoiceover}</p>
            </div>
          </div>

          {/* Paylaşılacak Açıklama & Etiketler */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Instagram Açıklama Metni (Caption)</span>
              <button
                onClick={() => copyText(`${selectedScript.caption}\n\n${selectedScript.hashtags.join(' ')}`, 'caption')}
                className="px-3 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedField === 'caption' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedField === 'caption' ? 'Kopyalandı!' : 'Metni & Etiketleri Kopyala'}
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {selectedScript.caption}

              {selectedScript.hashtags.join(' ')}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
