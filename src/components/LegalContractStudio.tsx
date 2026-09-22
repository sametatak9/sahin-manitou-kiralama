import { useState, useId } from 'react';
import { 
  FileText, 
  Download, 
  Send, 
  Copy, 
  Check, 
  Printer, 
  ShieldCheck, 
  Building2, 
  Truck, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  FileCheck
} from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';

interface ContractTemplate {
  id: string;
  type: 'manitou_rental' | 'urban_transformation' | 'subcontractor';
  title: string;
  badge: string;
  summary: string;
}

export function LegalContractStudio() {
  const [selectedContract, setSelectedContract] = useState<'manitou' | 'kentsel_donusum'>('manitou');
  const [copiedContract, setCopiedContract] = useState(false);

  // Form Değişkenleri - Manitou
  const [customerName, setCustomerName] = useState('Örnek İnşaat Taah. Ltd. Şti.');
  const [customerAuthorized, setCustomerAuthorized] = useState('Ahmet Yılmaz (Şantiye Şefi)');
  const [customerPhone, setCustomerPhone] = useState('0532 000 00 00');
  const [siteAddress, setSiteAddress] = useState('Tozkoparan Mah. Cevat Açıkalın Cad. No: 14 Güngören / İstanbul');
  const [operationDate, setOperationDate] = useState('Yarın 08:30');
  const [workDescription, setWorkDescription] = useState('Tırdan 24 palet tuğla ve Ytong indirilerek 3. ve 4. kat tabliyesine sevk edilmesi.');
  const [rentalRate, setRentalRate] = useState('İşe Özel Anlaşılan Sabit Bedel + KDV');
  const [fuelIncluded, setFuelIncluded] = useState(true);
  const [operatorIncluded, setOperatorIncluded] = useState(true);

  // Form Değişkenleri - Kentsel Dönüşüm Ön Protokol
  const [landOwnerName, setLandOwnerName] = useState('Mehmet Kaya (Bina Temsilcisi)');
  const [buildingAdaParsel, setBuildingAdaParsel] = useState('Güngören / Tozkoparan Ada: 1240 Parsel: 8');
  const [flatCount, setFlatCount] = useState('12 Daire / 2 Dükkan');
  const [deliveryMonths, setDeliveryMonths] = useState('14 Ay (Ruhsat Sonrası)');

  const manitouContractId = useId();
  const urbanContractId = useId();

  // 1. MANİTOU ŞANTİYE İŞ MAKİNESİ KİRALAMA & İSG SÖZLEŞMESİ METNİ
  const manitouContractText = `⚠️ TASLAK — AVUKAT VE İSG UZMANI ONAYI OLMADAN İMZALANMAZ ⚠️
[Bu belge bir ön çalışma taslağıdır; şantiye başlangıcında A/B/C sınıfı yetkili İSG Uzmanı ve şirket avukatı onayı esastır.]

İŞ MAKİNESİ KİRALAMA VE İSG UYGULAMA TAAHHÜTNAMESİ (TASLAK)

1. TARAFLAR:
KİRAYA VEREN: Şahin Manitou Kiralama & Embay Yapı (Tel: ${BUSINESS_INFO.phone})
Adres: Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul
KİRALAYAN (MÜŞTERİ): ${customerName}
Yetkili: ${customerAuthorized} | Tel: ${customerPhone}

2. İŞİN KONUSU VE ŞANTİYE YERİ:
Şantiye Adresi: ${siteAddress}
İşin Tanımı: ${workDescription}
Başlama Tarih ve Saati: ${operationDate}

3. MAKİNE VE EKİPMAN BİLGİSİ:
Kiralanan Araç: Manitou Teleskopik Yükleyici (Telescopic Handler)
Operatör Durumu: ${operatorIncluded ? 'Sertifikalı G Sınıfı Ehliyetli Şahin Manitou Operatörü Dahil' : 'Operatörsüz'}
Yakıt Durumu: ${fuelIncluded ? 'Yakıt Kiraya Verene Aittir' : 'Yakıt Kiralayana Aittir'}
Kiralama Bedeli & Şartı: ${rentalRate}

4. İŞ SAĞLIĞI VE GÜVENLİĞİ (İSG) TAAHHÜTNAMESİ (İSG UZMANI ONAYI GEREKİR):
a) Şantiye alanında çalışma bölgesinin emniyet şeritleriyle çevrilmesi, yayaların ve çevre araç trafiğinin güvenliğinin sağlanması KİRALAYAN şantiye sorumluluğundadır.
b) Tır veya kamyondan malzeme alınırken dar sokak trafiğinin yönlendirilmesi için KİRALAYAN sahada en az bir işaretçi/sapancı personel bulunduracaktır.
c) KİRAYA VEREN operatörü, makine kaldırma kapasite tablosunu aşan veya can/mal güvenliğini tehlikeye atan riskli operasyonları durdurma yetkisine sahiptir.
d) Makine periyodik muayenesi ve operatör İSG belgeleri tamdır; sahada görevli İSG Uzmanı çalışma izni verecektir.

5. İMZA VE KABUL:
İşbu taslak taraflarca okunup yetkili hukuk ve İSG onaylarını müteakip yürürlüğe girer.

KİRAYA VEREN                          KİRALAYAN
Şahin Manitou Kiralama                ${customerName}
İmza / Kaşe                           İmza / Kaşe`;

  // 2. EMBAY YAPI KENTSEL DÖNÜŞÜM ÖN PROTOKOLÜ
  const urbanTransformationText = `⚠️ TASLAK — AVUKAT ONAYI OLMADAN İMZALANMAZ ⚠️
[Bu belge ön iyi niyet protokolü taslağıdır; noter huzurunda Kat Karşılığı İnşaat Sözleşmesi yapılmadan bağlayıcı kesin hak doğurmaz.]

KENTSEL DÖNÜŞÜM VE YERİNDE YENİLEME ÖN İLKELER PROTOKOLÜ (TASLAK)

1. TARAFLAR:
YÜKLENİCİ MÜTEAHHİT: Embay Yapı (Tel: ${BUSINESS_INFO.phone})
Adres: Cevat Açıkalın Cad. Tozkoparan Mah. Güngören / İstanbul
HAK SAHİBİ / TEMSİLCİ: ${landOwnerName}

2. TAŞINMAZ BİLGİSİ:
Proje Alanı: ${buildingAdaParsel}
Mevcut Bağımsız Bölüm: ${flatCount}

3. PROJE VE TAAHHÜT İLKELERİ:
a) Yüklenici Embay Yapı, mevcut riskli yapının yerine Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Deprem Yönetmeliği standartlarına tam uyumlu, C35 hazır beton ve nervürlü çelik donatılı modern konut projesi inşa etmeyi taahhüt eder.
b) Mimari projede modern asansör, ısı ve ses yalıtımlı dış cephe mantolaması ve birinci sınıf kaplama malzemeleri kullanılacaktır.
c) Tahmini İnşaat ve Anahtar Teslim Süresi: İnşaat ruhsatının alınmasını müteakip ${deliveryMonths}'dır.
d) Hak sahipleriyle resmi noter sözleşmesi öncesi statik avan proje ve daire paylaşım krokisi karşılıklı mutabakatla kesinleştirilecektir.

4. HUKUKİ NİTELİK:
İşbu belge, resmi noter kat karşılığı veya taahhüt sözleşmesine esas teşkil eden iyi niyet ve prensip protokolü taslağıdır.

YÜKLENİCİ FİRMA                      HAK SAHİBİ / BİNA TEMSİLCİSİ
Embay Yapı İnşaat Taahhüt             ${landOwnerName}
İmza / Kaşe                           İmza`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Üst Banner */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-semibold border border-blue-500/30 mb-2">
              <FileCheck className="w-3.5 h-3.5 text-blue-400" />
              Hukuki Güvence & Şantiye Sözleşme Stüdyosu
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Anında Şantiye Kiralama & Kentsel Dönüşüm Sözleşmesi Üretici
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Şantiyede kaza, gecikme veya ödeme ihtilaflarını sıfıra indirin. Hem Manitou iş makinesi sevkiyatı için <strong>İSG Şantiye Taahhütnamesi</strong>, hem de Embay Yapı için arsa sahiplerine sunulacak <strong>Kentsel Dönüşüm Ön Protokolü</strong> tek tıkla elinizin altında.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedContract('manitou')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
                selectedContract === 'manitou'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>1. Manitou İSG & Kiralama</span>
            </button>
            <button
              onClick={() => setSelectedContract('kentsel_donusum')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
                selectedContract === 'kentsel_donusum'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>2. Kentsel Dönüşüm Protokolü</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SOL PANEL: Canlı Değişkenleri Doldurma Formu */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
              Şantiye & Müşteri Bilgilerini Girin
            </span>
            <span className="text-xs text-slate-400">Yazdığınız an sağdaki sözleşme canlı olarak güncellenir.</span>
          </div>

          {selectedContract === 'manitou' ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Müşteri / Müteahhit Firma Ünvanı</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Yetkili / Şantiye Şefi</label>
                  <input
                    type="text"
                    value={customerAuthorized}
                    onChange={e => setCustomerAuthorized(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Telefon</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Şantiye Açık Adresi</label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={e => setSiteAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Yapılacak İş Tanımı</label>
                <input
                  type="text"
                  value={workDescription}
                  onChange={e => setWorkDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">İşlem Zamanı</label>
                  <input
                    type="text"
                    value={operationDate}
                    onChange={e => setOperationDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Kiralama Bedeli</label>
                  <input
                    type="text"
                    value={rentalRate}
                    onChange={e => setRentalRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={operatorIncluded}
                    onChange={e => setOperatorIncluded(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Operatör Dahil</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fuelIncluded}
                    onChange={e => setFuelIncluded(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Yakıt Dahil</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Bina Temsilcisi / Hak Sahibi Adı</label>
                <input
                  type="text"
                  value={landOwnerName}
                  onChange={e => setLandOwnerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">İlçe / Ada / Parsel Bilgisi</label>
                <input
                  type="text"
                  value={buildingAdaParsel}
                  onChange={e => setBuildingAdaParsel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Mevcut Bağımsız Bölüm</label>
                  <input
                    type="text"
                    value={flatCount}
                    onChange={e => setFlatCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Teslim Süresi</label>
                  <input
                    type="text"
                    value={deliveryMonths}
                    onChange={e => setDeliveryMonths(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 text-xs text-blue-200/90 leading-relaxed">
            🛡️ <strong>İSG & Hukuki Koruma:</strong> Bu sözleşme; dar sokakta olası kaza, park halindeki araç sürtmeleri veya aşırı yükleme taleplerinde işletmenizi yasal olarak tam korur.
          </div>
        </div>

        {/* SAĞ PANEL: Canlı Sözleşme Çıktısı (Yazdırılabilir & Kopyalanabilir) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Hazır Hukuki Belge Metni
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  {selectedContract === 'manitou' ? 'İş Makinesi Kiralama & İSG Protokolü' : 'Embay Yapı Kentsel Dönüşüm Ön Protokolü'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(selectedContract === 'manitou' ? manitouContractText : urbanTransformationText)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedContract ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedContract ? 'Kopyalandı!' : 'Metni Kopyala'}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Yazdır / PDF</span>
                </button>
              </div>
            </div>

            {/* Antetli Sözleşme Önizleme Alanı */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto selection:bg-blue-600">
              {selectedContract === 'manitou' ? manitouContractText : urbanTransformationText}
            </div>
          </div>

          {/* Alt Hızlı Butonlar */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              📱 Müteahhide veya hak sahibine tek tıkla WhatsApp üzerinden gönderin:
            </span>

            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                selectedContract === 'manitou' ? manitouContractText : urbanTransformationText
              )}`}
              target="_blank"
              rel="noreferrer"
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition"
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp İle Müşteriye Fırlat</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
