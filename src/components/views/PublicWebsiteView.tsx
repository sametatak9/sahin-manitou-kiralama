import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Phone,
  MessageCircle,
  Building2,
  Truck,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Clock,
  ArrowRight,
  HardHat,
  Sparkles,
  Award,
  Zap,
  ChevronRight,
  Activity,
  CalendarCheck,
  FileCheck
} from 'lucide-react';

const DEMAND: Record<string, 'manitou_kiralama' | 'kentsel_donusum' | 'konut_insaati' | 'diger'> = {
  '18 Metre Manitou MT-X 1840 Kiralama': 'manitou_kiralama',
  '14 Metre Manitou MT-X 1440 Kiralama': 'manitou_kiralama',
  'Sepetli / Çatallı Yüksek İrtifa Montaj': 'manitou_kiralama',
  'Güngören Tozkoparan Kentsel Dönüşüm Keşfi': 'kentsel_donusum',
  'Anahtar Teslim Müteahhitlik': 'konut_insaati',
};

/** Kurumsal vitrin. Teklif formu KVKK onayıyla doğrudan Supabase lead_inbox tablosuna yazar (anon insert politikası). */
export const PublicWebsiteView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'MANITOU' | 'URBAN'>('ALL');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [serviceType, setServiceType] = useState('18 Metre Manitou MT-X 1840 Kiralama');
  const [notes, setNotes] = useState('');
  const [kvkk, setKvkk] = useState(false);
  const [ticari, setTicari] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const PHONE_DISPLAY = '0531 436 29 04';
  const PHONE_CLEAN = '05314362904';
  const WHATSAPP_URL = `https://wa.me/90${PHONE_CLEAN}?text=${encodeURIComponent('Merhaba Samet Bey, şantiye iş makinesi / kentsel dönüşüm için bilgi almak istiyorum.')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const digits = phone.replace(/\D/g, '');
    if (!fullName.trim() || digits.length < 10 || digits.length > 13) { setFormError('Lütfen ad soyad ve geçerli bir telefon numarası girin.'); return; }
    if (!kvkk) { setFormError('Devam etmek için KVKK aydınlatma metnini onaylayın.'); return; }
    if (!supabase) { setFormError(`Form şu an kullanılamıyor. Lütfen arayın: ${PHONE_DISPLAY}`); return; }
    setSending(true);
    const note = [companyName && `Firma/Şantiye: ${companyName}`, `Hizmet: ${serviceType}`, notes].filter(Boolean).join(' · ');
    const { error } = await supabase.from('lead_inbox').insert({
      full_name: fullName.trim().slice(0, 120), phone: phone.trim(), demand: DEMAND[serviceType] ?? 'diger', note: note.slice(0, 1000),
      kvkk_aydinlatma_onay: true, aydinlatma_version: 'web-2026-09', ticari_ileti_izni: ticari, izin_kanallari: ticari ? ['arama', 'whatsapp'] : [],
      consent_source: 'web_form', page_url: window.location.href.slice(0, 300), user_agent: navigator.userAgent.slice(0, 300),
    });
    setSending(false);
    if (error) { setFormError(`Talebiniz gönderilemedi. Lütfen telefonla ulaşın: ${PHONE_DISPLAY}`); return; }
    setIsSuccess(true);
    setFullName(''); setPhone(''); setCompanyName(''); setNotes(''); setKvkk(false); setTicari(false);
  };

  return (
    <div className="bg-[#0b1311] text-slate-100 min-h-screen pb-24 selection:bg-emerald-500 selection:text-white">
      {/* 1. Industrial Top Ticker */}
      <div className="bg-emerald-950/80 border-b border-emerald-800/40 px-3 sm:px-4 py-2 text-[11px] sm:text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-slate-300">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
            <span className="font-semibold text-emerald-300">İstanbul Şantiye Lojistik & Kentsel Dönüşüm Taahhüdü</span>
            <span className="text-emerald-700 hidden md:inline">|</span>
            <span className="hidden md:inline text-slate-400">Güngören Tozkoparan • Hadımköy • Çorlu • İkitelli</span>
          </div>

          <div className="flex items-center gap-3 shrink-0 font-medium">
            <a
              href={`tel:${PHONE_CLEAN}`}
              className="flex items-center gap-1.5 text-white hover:text-emerald-300 font-bold tracking-wider"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono">{PHONE_DISPLAY}</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Distinctive Dark Emerald Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-emerald-900/30">
        {/* Architectural Grid and Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Mühendislik • Ağır Şantiye Ekipmanı • Deprem Güvencesi</span>
              </div>

              <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.1]">
                Yüksek İrtifa <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-teal-300">Manitou Gücü</span> & Sağlam Dönüşüm.
              </h1>

              <p className="text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl font-normal">
                <strong className="text-white font-bold">Şahin Manitou</strong> ile 14 ve 18 metre bomlu, sertifikalı operatörlü teleskopik yükleyici filosu; <strong className="text-white font-bold">Embay Yapı</strong> güvencesiyle Güngören Tozkoparan ve İstanbul genelinde deprem yönetmeliğine tam uyumlu anahtar teslim inşaat.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={`tel:${PHONE_CLEAN}`}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2.5 transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
                >
                  <Phone className="w-4 h-4" />
                  <span>Şantiyeye Makine İste: {PHONE_DISPLAY}</span>
                </a>

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-2xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 font-bold text-sm flex items-center gap-2 transition-all hover:border-emerald-500"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Canlı Hat</span>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-emerald-900/40 text-xs">
                <div>
                  <div className="font-heading font-extrabold text-white text-base sm:text-xl">18m / 4.000kg</div>
                  <div className="text-slate-400 text-[11px]">MT-X 1840 Kapasite</div>
                </div>
                <div>
                  <div className="font-heading font-extrabold text-emerald-400 text-base sm:text-xl">%100 Sertifikalı</div>
                  <div className="text-slate-400 text-[11px]">Operatör & İSG Onaylı</div>
                </div>
                <div>
                  <div className="font-heading font-extrabold text-white text-base sm:text-xl">Aynı Gün Sevk</div>
                  <div className="text-slate-400 text-[11px]">Lowbed Nakliye İmkanı</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Quick Quote Box */}
            <div className="lg:col-span-5">
              <div className="bg-[#121c18] border border-emerald-700/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
                <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-full shadow-md">
                  Öncelikli Şantiye Çağrısı
                </div>

                <div className="space-y-1 mb-5">
                  <h2 className="font-heading font-extrabold text-xl text-white">
                    Hızlı Keşif & Fiyat Teklifi
                  </h2>
                  <p className="text-xs text-slate-400">
                    Formu doldurun, Samet Bey 15 dakika içinde doğrudan şantiye şartlarıyla dönüş yapsın.
                  </p>
                </div>

                {isSuccess && (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-900/60 border border-emerald-500 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-pulse">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Talebiniz alındı. Ekibimiz en kısa sürede sizi arayacak.</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Yetkili / Ad Soyad *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Adınız ve Soyadınız"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1311] border border-emerald-900/80 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Telefon Numarası *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0532 ... veya 0531 ..."
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1311] border border-emerald-900/80 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Firma / Şantiye</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Örn: Ak Yapı Ltd."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1311] border border-emerald-900/80 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Hizmet Alanı</label>
                      <select
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1311] border border-emerald-900/80 text-white text-xs focus:outline-none focus:border-emerald-500"
                      >
                        <option value="18 Metre Manitou MT-X 1840 Kiralama">18m Manitou MT-X 1840</option>
                        <option value="14 Metre Manitou MT-X 1440 Kiralama">14m Manitou MT-X 1440</option>
                        <option value="Sepetli / Çatallı Yüksek İrtifa Montaj">Sepetli / Çatallı Montaj</option>
                        <option value="Güngören Tozkoparan Kentsel Dönüşüm Keşfi">Tozkoparan Kentsel Dönüşüm</option>
                        <option value="Anahtar Teslim Müteahhitlik">Müteahhitlik & Taahhüt</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Şantiye Lokasyonu ve İhtiyaç</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Örn: Hadımköy cephe paneli montajı için 1 ay operatörlü..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1311] border border-emerald-900/80 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <label className="flex items-start gap-2 text-[11px] text-slate-400"><input type="checkbox" className="mt-0.5" checked={kvkk} onChange={(e) => setKvkk(e.target.checked)} />
                    <span>Kişisel verilerimin talebime dönüş yapılması amacıyla işlenmesine ilişkin aydınlatma metnini okudum ve onaylıyorum. (Veriler 2 yıl saklanır, talep halinde silinir.) *</span></label>
                  <label className="flex items-start gap-2 text-[11px] text-slate-400"><input type="checkbox" className="mt-0.5" checked={ticari} onChange={(e) => setTicari(e.target.checked)} />
                    <span>Kampanya ve bilgilendirme amaçlı arama / WhatsApp mesajı almak istiyorum (isteğe bağlı).</span></label>
                  {formError && <p className="text-xs text-rose-400 font-semibold">{formError}</p>}
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-60"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{sending ? 'Gönderiliyor…' : 'Hemen Teklif İste'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Operational Machine Showcase & Fleet Matrix */}
      <section className="py-14 sm:py-20 border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Section Heading with category filter */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
                SAHA PERFORMANSI & ÇÖZÜMLER
              </div>
              <h2 className="font-heading font-black text-2xl sm:text-4xl text-white">
                Şantiye İhtiyacınıza Göre Özelleştirilmiş Hizmet
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 bg-[#121c18] p-1 rounded-2xl border border-emerald-900/60 self-start md:self-auto">
              <button
                onClick={() => setActiveCategory('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setActiveCategory('MANITOU')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === 'MANITOU'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Şahin Manitou Kiralama
              </button>
              <button
                onClick={() => setActiveCategory('URBAN')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === 'URBAN'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Embay Yapı Kentsel Dönüşüm
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: 18m Manitou */}
            {(activeCategory === 'ALL' || activeCategory === 'MANITOU') && (
              <div className="bg-[#121c18] border border-emerald-800/40 rounded-3xl p-6 sm:p-7 space-y-5 hover:border-emerald-500/60 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-2xl bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                    <Truck className="w-6 h-6" />
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    AĞIR HİZMET
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading font-extrabold text-xl text-white group-hover:text-emerald-300 transition-colors">
                    18 Metre Manitou MT-X 1840
                  </h3>
                  <p className="text-xs text-slate-400">
                    Geniş şantiyeler, çelik konstrüksiyon ve yüksek bina cephe montajı için ideal telehandler.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Maksimum 18 metre kaldırma irtifası</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>4.000 kg (4 Ton) taşıma kapasitesi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Palet çatalı, açılır kepçe ve çalışma sepeti</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Düzenli 250 saatlik periyodik İSG bakımlı</span>
                  </li>
                </ul>

                <div className="pt-3 border-t border-emerald-900/40 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Operatörlü / Operatörsüz
                  </div>
                  <a
                    href={`tel:${PHONE_CLEAN}`}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <span>Fiyat Teklifi Al</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Card 2: 14m Manitou */}
            {(activeCategory === 'ALL' || activeCategory === 'MANITOU') && (
              <div className="bg-[#121c18] border border-emerald-800/40 rounded-3xl p-6 sm:p-7 space-y-5 hover:border-emerald-500/60 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-2xl bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                    <Zap className="w-6 h-6" />
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    KOMPAKT & ÇEVİK
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading font-extrabold text-xl text-white group-hover:text-emerald-300 transition-colors">
                    14 Metre Manitou MT-X 1440
                  </h3>
                  <p className="text-xs text-slate-400">
                    Dar sokaklar, fabrika içi transferler ve orta ölçekli konut projeleri için yüksek manevra kabiliyeti.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>14 metre dikey uzanım ve yanal erişim</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>4.000 kg taşıma kapasitesi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>4x4 arazi çekişi ve 3 farklı dönüş modu</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>İstanbul içi aynı gün lowbed sevkiyatı</span>
                  </li>
                </ul>

                <div className="pt-3 border-t border-emerald-900/40 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Günlük / Haftalık / Aylık
                  </div>
                  <a
                    href={`tel:${PHONE_CLEAN}`}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <span>Fiyat Teklifi Al</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Card 3: Embay Yapı Urban Transformation */}
            {(activeCategory === 'ALL' || activeCategory === 'URBAN') && (
              <div className="bg-[#121c18] border border-emerald-800/40 rounded-3xl p-6 sm:p-7 space-y-5 hover:border-emerald-500/60 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-2xl bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                    <Building2 className="w-6 h-6" />
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    GÜNGÖREN TOZKOPARAN
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading font-extrabold text-xl text-white group-hover:text-emerald-300 transition-colors">
                    Kentsel Dönüşüm & Müteahhitlik
                  </h3>
                  <p className="text-xs text-slate-400">
                    Deprem riski altındaki eski binaların yerinde dönüşümü için şeffaf mühendislik ve taahhüt.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Ücretsiz zemin etüdü ve statik fizibilite</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Radye jeneral temel ve C35 hazır beton</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Noter tasdikli sözleşme ve kira yardımı danışmanlığı</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Zamanında anahtar teslim garantisi</span>
                  </li>
                </ul>

                <div className="pt-3 border-t border-emerald-900/40 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Kat Malikleri Toplantı Desteği
                  </div>
                  <a
                    href={`tel:${PHONE_CLEAN}`}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <span>Keşif Randevusu Al</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Service Coverage Areas */}
      <section className="py-12 bg-[#080e0c] border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Hizmet Bölgelerimiz</span>
              <h3 className="font-heading font-extrabold text-xl text-white mt-0.5">İstanbul & Trakya Şantiye Ağı</h3>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Kendi lowbed filomuz ile makineler şantiyenize tam zamanında ulaştırılır, iş kaybı yaşanmaz.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            {[
              { district: 'Güngören & Tozkoparan', label: 'Merkez Ofis & Dönüşüm' },
              { district: 'Hadımköy Sanayi', label: 'Lojistik Depolar & Çatı' },
              { district: 'Esenyurt & Kıraç', label: 'Sanayi Tesisleri & Fabrika' },
              { district: 'İkitelli OSB & Başakşehir', label: 'Ağır Montaj & Vinç İşleri' },
              { district: 'Çorlu & Çerkezköy', label: 'Trakya Sanayi Bölgesi' },
              { district: 'Tuzla & Gebze Hattı', label: 'Anadolu Yakası Projeler' }
            ].map((loc, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-[#121c18] border border-emerald-900/50 space-y-1">
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{loc.district}</span>
                </div>
                <div className="text-[11px] text-slate-400">{loc.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Footer & Contact Signature */}
      <footer className="pt-12 pb-20 border-t border-emerald-900/40 bg-[#070b0a] text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  E
                </div>
                <span className="font-heading font-black text-lg text-white">EMBAY YAPI & ŞAHİN MANİTOU</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                İstanbul genelinde teleskopik yükleyici (Manitou MT-X 1840 / MT-X 1440) kiralama ve Güngören Tozkoparan kentsel dönüşüm inşaat taahhüt hizmetleri.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Resmi İletişim & Şantiye Sevk</div>
              <p className="text-emerald-400 font-mono font-bold text-sm">📞 0531 436 29 04</p>
              <p className="text-slate-300">Yetkili: Samet Bey</p>
              <p className="text-slate-500 text-[11px]">Adres: Tozkoparan Mah. Güngören / İstanbul</p>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Hızlı Erişim</div>
              <div className="flex flex-col gap-1 text-[11px]">
                <a href={`tel:${PHONE_CLEAN}`} className="hover:text-emerald-300">Telefonla Anında Ara</a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-300">WhatsApp Teklif Hattı</a>
                <a href="#kesif-formu" className="hover:text-emerald-300">Online Şantiye Keşif Formu</a>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <span>© {new Date().getFullYear()} Embay Yapı & Şahin Manitou Kiralama. Tüm hakları saklıdır.</span>
            <span>İş Sağlığı ve Güvenliği Standartlarına Tam Uyum</span>
          </div>
        </div>
      </footer>

      {/* Floating Bottom Action Bar for Mobile Visitors */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f1715]/95 backdrop-blur-md border-t border-emerald-800/40 p-2.5 shadow-2xl flex items-center justify-between max-w-lg mx-auto sm:rounded-t-2xl sm:max-w-xl">
        <a
          href={`tel:${PHONE_CLEAN}`}
          className="flex-1 mr-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-emerald-600/30"
        >
          <Phone className="w-4 h-4" />
          <span>Şantiyeye Ara: {PHONE_DISPLAY}</span>
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>WhatsApp Teklif</span>
        </a>
      </div>
    </div>
  );
};
