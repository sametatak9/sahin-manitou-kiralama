import React, { useState } from 'react';
import {
  FileText,
  Printer,
  X,
  CheckCircle2,
  Building2,
  Calendar,
  DollarSign,
  Phone,
  ShieldCheck,
  Truck
} from 'lucide-react';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCustomerName?: string;
  defaultPhone?: string;
  defaultService?: string;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({
  isOpen,
  onClose,
  defaultCustomerName = 'Örnek İnşaat Taahhüt Ltd. Şti.',
  defaultPhone = '0532 ...',
  defaultService = '18 Metre Manitou MT-X 1840 Teleskopik Yükleyici Kiralama'
}) => {
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [phone, setPhone] = useState(defaultPhone);
  const [service, setService] = useState(defaultService);
  const [duration, setDuration] = useState('1 Ay (Operatörlü & Yakıt Hariç)');
  const [siteLocation, setSiteLocation] = useState('Hadımköy / İstanbul');
  const [priceTRY, setPriceTRY] = useState(240000);
  const [kdvRate, setKdvRate] = useState(20);
  const [proposalNo] = useState(`TEK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [proposalDate] = useState(new Date().toLocaleDateString('tr-TR'));

  if (!isOpen) return null;

  const kdvAmount = (priceTRY * kdvRate) / 100;
  const totalAmount = priceTRY + kdvAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Resmi Proforma Fiyat Teklifi & Şantiye Sözleşmesi
              </h2>
              <p className="text-xs text-slate-500">Teklif No: {proposalNo} • Tarih: {proposalDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Yazdır / PDF Olarak Kaydet
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white space-y-6 print:border-none print:p-0">
          {/* Header with Embay Yapı & Şahin Manitou branding */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-emerald-600 pb-5">
            <div>
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
                ŞAHİN MANİTOU & EMBAY YAPI İNŞAAT
              </div>
              <h1 className="text-2xl font-black text-slate-900 mt-1">
                FİYAT TEKLİF FORMU
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Güngören Tozkoparan Mah. İstanbul • Tel: <strong>0531 436 29 04</strong>
              </p>
            </div>

            <div className="text-right text-xs space-y-1">
              <div className="font-mono font-bold text-slate-900">{proposalNo}</div>
              <div className="text-slate-500">Düzenleme Tarihi: {proposalDate}</div>
              <div className="text-emerald-700 font-semibold">Geçerlilik: 7 İş Günü</div>
            </div>
          </div>

          {/* Customer & Project Info Editable/Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                Sayın Müşteri / Firma:
              </span>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-600 focus:outline-none"
              />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                Şantiye / Teslimat Lokasyonu:
              </span>
              <input
                type="text"
                value={siteLocation}
                onChange={(e) => setSiteLocation(e.target.value)}
                className="w-full font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-600 focus:outline-none"
              />
              <span className="text-[11px] text-emerald-800 font-semibold block">
                Lowbed Nakliye: İstanbul içi anında sevk
              </span>
            </div>
          </div>

          {/* Proposal Item Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3">Hizmet / Makine Tanımı</th>
                  <th className="p-3">Kiralama Süresi</th>
                  <th className="p-3 text-right">Birim Fiyat (TL)</th>
                  <th className="p-3 text-right">Toplam (TL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3">
                    <input
                      type="text"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      18m Bom Uzanımı, 4.000 kg Taşıma Kapasitesi, Çatal ve Sepet Ataşmanlı, Sertifikalı Operatörlü
                    </span>
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full text-slate-700 bg-transparent focus:outline-none"
                    />
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    <input
                      type="number"
                      value={priceTRY}
                      onChange={(e) => setPriceTRY(Number(e.target.value))}
                      className="w-24 text-right font-mono font-bold text-slate-900 bg-transparent focus:outline-none border-b border-slate-200"
                    />
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    {priceTRY.toLocaleString('tr-TR')} ₺
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Price Totals Calculation */}
          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Ara Toplam:</span>
                <span className="font-mono font-bold">{priceTRY.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>KDV (%{kdvRate}):</span>
                <span className="font-mono font-bold">{kdvAmount.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                <span>Genel Toplam:</span>
                <span className="font-mono text-emerald-700">{totalAmount.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-[11px] text-slate-700 space-y-1">
            <span className="font-bold text-emerald-900 block">Şantiye ve Kiralama Koşulları:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              <li>Makinelerimizin tüm periyodik 250 saatlik bakımları ve iş güvenliği muayeneleri eksiksizdir.</li>
              <li>Operatör SGK, bareti ve iş güvenlik sertifikaları firmamız sorumluluğundadır.</li>
              <li>Akaryakıt şantiye tarafından temin edilir; nakliye (lowbed) gidiş-dönüş olarak sözleşmede kararlaştırılır.</li>
              <li>Ödeme şartları: Şantiyeye teslimatta %50 peşin, bakiye ay sonunda fatura karşılığı kapatılır.</li>
            </ul>
          </div>

          {/* Signature Boxes */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-slate-300 pt-2">
              <span className="font-bold text-slate-900 block">TEKLİF VEREN</span>
              <p className="text-slate-500 text-[11px]">Şahin Manitou & Embay Yapı</p>
              <p className="font-bold text-emerald-800 text-[11px] mt-1">Yetkili: Samet Bey (0531 436 29 04)</p>
            </div>

            <div className="border-t border-slate-300 pt-2">
              <span className="font-bold text-slate-900 block">MÜŞTERİ ONAY & KAŞE</span>
              <p className="text-slate-500 text-[11px]">{customerName}</p>
              <p className="text-slate-400 text-[10px] mt-1">İmza / Tarih / Kaşe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
