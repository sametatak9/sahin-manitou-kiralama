import { useState } from 'react';
import { 
  Briefcase, 
  MapPin, 
  Building2, 
  Send, 
  Copy, 
  Check, 
  PhoneCall, 
  Truck, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowUpRight,
  TrendingUp,
  FileText,
  Users
} from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

interface HotDistrictProject {
  id: string;
  district: string;
  zone: string;
  opportunityType: 'kentsel_donusum' | 'sanayi_lojistik' | 'konut_guclendirme';
  whyHot: string;
  manitouNeed: string;
  constructionOpportunity: string;
  fieldTactic: string;
}

const HOT_ZONES: HotDistrictProject[] = [
  {
    id: 'tozkoparan',
    district: 'Güngören',
    zone: 'Tozkoparan & Mehmet Nesih Özmen',
    opportunityType: 'kentsel_donusum',
    whyHot: 'İstanbul’un en yoğun kentsel dönüşüm ve ada bazlı bina yenileme bölgesi. Sokaklar son derece dar, mobil vinçler trafiği tıkadığı için zabıta izin vermiyor.',
    manitouNeed: 'Tırdan gelen ytong/tuğla paletlerini dar sokakta trafiği aksatmadan alıp 3-4-5. kat tabliyesine vermek için biçilmiş kaftan.',
    constructionOpportunity: 'Embay Yapı için eski bina sakinleri ve ada temsilcileriyle kat karşılığı ya da taahhütlü kentsel dönüşüm sözleşmesi bağlama potansiyeli çok yüksek.',
    fieldTactic: 'Tozkoparan’da yıkımı bitmiş temel veya kaba inşaat aşamasındaki 5 şantiyeye uğranıp şantiye şefine kartvizit + Manitou broşürü bırakılır.'
  },
  {
    id: 'merter',
    district: 'Güngören / Merter',
    zone: 'Merter Tekstil & Sanayi Bölgesi',
    opportunityType: 'sanayi_lojistik',
    whyHot: 'Tekstil atölyeleri, kumaş depoları, çatı tadilatları ve dükkan cephe yenilemeleri sürekli forklift ve sepetli platform arıyor.',
    manitouNeed: 'Ağır kumaş rulolarını, havalandırma motorlarını veya çatı makaslarını dar avlulardan içeri sokmak.',
    constructionOpportunity: 'Ticari bina güçlendirme, çelik konstrüksiyon ara kat ve cephe kompozit yenileme taahhütleri.',
    fieldTactic: 'Kumaş depoları ve sanayi siteleri yönetimine "Merter yerelinde nöbetçi teleskopik yükleyici" kartı verilir.'
  },
  {
    id: 'bagcilar',
    district: 'Bağcılar',
    zone: 'Güneşli, Mahmutbey & Basın Ekspres Yanı',
    opportunityType: 'kentsel_donusum',
    whyHot: 'Kentsel dönüşümün hızlandığı ve yüksek katlı konut şantiyelerinin yoğun olduğu ana arter.',
    manitouNeed: 'Günlük 2-3 tır malzeme boşaltma, seramik ve kaba malzeme kat sevkiyatı.',
    constructionOpportunity: 'Yık-yap projelerinde müteahhitlik ve kaba inşaat taşeronluğu.',
    fieldTactic: 'Güneşli meydan ve ara sokaklardaki kentsel dönüşüm ofislerine Embay Yapı referansları sunulur.'
  },
  {
    id: 'bakirkoy',
    district: 'Bakırköy',
    zone: 'Zuhuratbaba, Kartaltepe, Osmaniye',
    opportunityType: 'konut_guclendirme',
    whyHot: 'Eski ve yaşlı bina stoğu nedeniyle bina güçlendirme ve yerinde dönüşüm projeleri tavan yapmış durumda.',
    manitouNeed: 'Güçlendirme için gereken çelik profil, torbalı hazır beton ve harçları binaların arka bahçelerine uzatmak.',
    constructionOpportunity: 'Statik güçlendirme (karbon elyaf, çelik manto, betonarme manto) işleri.',
    fieldTactic: 'Apartman yöneticilerine ve güçlendirme yapan taşeron firmalara doğrudan ulaşılır.'
  },
  {
    id: 'ikitelli',
    district: 'Başakşehir',
    zone: 'İkitelli OSB & İstoç Çevresi',
    opportunityType: 'sanayi_lojistik',
    whyHot: 'Sanayi sitelerinde fabrika içi revizyonlar, çatı güneş paneli (GES) montajları ve makine taşımaları.',
    manitouNeed: 'Fabrika içine girip tavan vinçlerinin yetişmediği yerlere ağır pres/makine ve malzeme kaldırma.',
    constructionOpportunity: 'Fabrika saha betonu, çelik sundurma ve çatı izolasyon taahhütleri.',
    fieldTactic: 'İkitelli OSB site yönetim panolarına ve fabrika müdürlerine haftalık teklif geçilir.'
  }
];

export function ProjectHunterHub() {
  const [selectedZone, setSelectedZone] = useState<HotDistrictProject>(HOT_ZONES[0]);
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'zones' | 'field_script' | 'proposal_pitch'>('zones');

  // Sahada kalfa ve şantiyeciye söylenecek birebir konuşma taktiği
  const fieldPitchScript = `Ustam selamünaleyküm, hayırlı işler!
Yan sokaktaki binanın tuğlalarını kata veriyoruz, Şahin Manitou & Embay Yapı bizim firmamız. Merkezimiz hemen şurada Güngören Tozkoparan'da.

Gördüm ki sizin de tır yanaşmış / katlara malzeme çıkacak:
👉 Dar sokakta vinç çağırsanız yolu kapatır, saatlerce beklersiniz.
👉 Ameleye taşıtsanız hem günlerce sürer hem yarısı kırılır.
Bizim teleskopik makine hazırda Tozkoparan'da bekliyor; 15 dakikada kapınızda oluruz. Tırdan alır doğrudan 4. kata veririz, sıfır zayiatla 2 saatte işiniz biter.

Numaramı kaydedin ustam: 0531 436 29 04 (Şahin Manitou & Embay Yapı). Bir dahaki tır gelmeden arayın, makineyi hemen bağlayalım.`;

  // Müteahhide WhatsApp üzerinden atılacak B2B Çözüm Ortaklığı Yazısı
  const b2bPartnershipPitch = `Sayın Proje Yetkilisi / Şantiye Şefi,

İstanbul Avrupa Yakası şantiyelerinizde malzeme indirme, kat tabliyelerine palet verme ve kentsel dönüşüm süreçlerinizde çözüm ortağınız olmak isteriz.

🏗️ Şahin Manitou Kiralama & Embay Yapı olarak avantajlarımız:
1. Dar Sokaklarda Hızlı Çözüm: Mobil vinçlerin trafiği kapattığı Tozkoparan, Güngören ve Bağcılar gibi sokaklarda 4 tekerden yönlendirmeli makinelerimizle dakikalar içinde sahadayız.
2. Sıfır Malzeme Firesi: Tuğla, ytong, seramik ve çimento paletlerini yere indirmeden doğrudan kat balkonlarına uzatıyoruz.
3. Kendi İnşaat Gücümüz: Embay Yapı güvencesiyle kaba yapı, taahhüt ve kentsel dönüşümde güçlü makine parkımızla anahtar teslim destek veriyoruz.

📍 Merkez: Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul
📞 7/24 Şantiye Sevkiyatı: ${BUSINESS_INFO.phone}
🌐 Detaylı İnceleme: https://sahin-manitou-kiralama.vercel.app/

Mevcut projenizde ihtiyaç duyduğunuz iş makinesi veya inşaat taahhüt işleri için görüşmekten memnuniyet duyarız.`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30 mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Sıcak Şantiye Avcısı & Proje Pazarlama Motoru
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Şantiyelere İş Bağlama & Manitou Kiralama Pazar Stratejisi
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              İş makinesinin boşta yatmaması ve Embay Yapı'nın yeni kentsel dönüşüm projeleri alması için İstanbul'un en sıcak dönüşüm akslarını ve müteahhit bağlama taktiklerini buradan yönetin.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('zones')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'zones' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-300'
              }`}
            >
              🗺️ Sıcak Proje Bölgeleri
            </button>
            <button
              onClick={() => setActiveTab('field_script')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'field_script' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-300'
              }`}
            >
              🗣️ Sahada Şantiye Bağlama Sözleri
            </button>
            <button
              onClick={() => setActiveTab('proposal_pitch')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'proposal_pitch' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-300'
              }`}
            >
              📄 Müteahhide B2B WhatsApp Teklifi
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: SICAK ŞANTİYE BÖLGELERİ */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sol: Bölge Seçici */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              1. En Yüksek İş Potansiyeline Sahip 5 Bölge
            </span>

            {HOT_ZONES.map(zone => (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone)}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                  selectedZone.id === zone.id
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-md'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{zone.district} ({zone.zone})</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    zone.opportunityType === 'kentsel_donusum'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : zone.opportunityType === 'sanayi_lojistik'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}>
                    {zone.opportunityType === 'kentsel_donusum' ? 'Kentsel Dönüşüm' : zone.opportunityType === 'sanayi_lojistik' ? 'Sanayi / Lojistik' : 'Bina Güçlendirme'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{zone.whyHot}</p>
              </button>
            ))}
          </div>

          {/* Sağ: Seçili Bölgenin Aksiyon Kartı */}
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                <MapPin className="w-4 h-4" />
                <span>{selectedZone.district} — {selectedZone.zone}</span>
              </div>
              <h3 className="text-xl font-black text-white">Bu Bölgede İş Nasıl Alınır?</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{selectedZone.whyHot}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1.5">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Truck className="w-4 h-4" />
                  Manitou İş Fırsatı
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedZone.manitouNeed}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1.5">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  Embay Yapı Proje Fırsatı
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedZone.constructionOpportunity}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                🎯 Sahada Uygulanacak Av Taktikleri
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedZone.fieldTactic}</p>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(b2bPartnershipPitch)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Send className="w-3.5 h-3.5" />
                Bu Bölgedeki Müteahhide WhatsApp Mesajı At
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAHADA ŞANTİYE ŞEFİNİ BAĞLAMA SÖZLERİ */}
      {activeTab === 'field_script' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Operatör & Saha Sorumlusu İçin</span>
            <h3 className="text-lg font-black text-white mt-1">İnşaat Kalfası ve Şantiye Şefini 1 Dakikada İkna Eden Sözler</h3>
            <p className="text-xs text-slate-300 mt-1">
              Makineniz bir sokakta çalışırken 100 metre yanınızdaki inşaatın kalfasının yanına gidip bu konuşmayı yapın. Haftada en az 3 yeni şantiye işi bağlarsınız:
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
            {fieldPitchScript}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(fieldPitchScript)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition"
            >
              {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedScript ? 'Kopyalandı!' : 'Konuşma Metnini Telefona Kopyala'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: B2B WHATSAPP TANITIM VE ORTAKLIK METNİ */}
      {activeTab === 'proposal_pitch' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">B2B Kurumsal Müteahhit İletişimi</span>
            <h3 className="text-lg font-black text-white mt-1">Müteahhit ve Taşeronlara Gönderilecek Hazır WhatsApp Tanıtım Kartı</h3>
            <p className="text-xs text-slate-300 mt-1">
              Bölgenizdeki inşaat firmalarının WhatsApp hatlarına tek tıkla gönderebileceğiniz, hem kiralık makineyi hem Embay Yapı'yı tanıtan kurumsal metin:
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
            {b2bPartnershipPitch}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(b2bPartnershipPitch)}`}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition"
            >
              <Send className="w-4 h-4" />
              WhatsApp'ta Paylaş
            </a>
            <button
              onClick={() => copyToClipboard(b2bPartnershipPitch)}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-2 cursor-pointer transition border border-slate-700"
            >
              {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copiedScript ? 'Kopyalandı!' : 'Metni Kopyala'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
