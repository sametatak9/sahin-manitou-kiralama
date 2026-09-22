import { useState, useEffect } from 'react';
import { PhoneCall, Plus, MapPin, Trash2, TrendingUp } from 'lucide-react';
import { BUSINESS_INFO } from '../data/marketingData';
import { supabase } from '../lib/supabase';

interface LeadItem {
  id: string;
  clientName: string;
  phone: string;
  district: string;
  serviceType: 'manitou' | 'insaat';
  offerAmount: string;
  status: 'new' | 'quoted' | 'won' | 'completed';
  notes: string;
  date: string;
}

type DbLead = {
  id: string;
  full_name: string | null;
  phone: string | null;
  district: string | null;
  service: 'manitou' | 'insaat' | 'kentsel_donusum' | 'diger' | null;
  stage: 'yeni' | 'arandi' | 'teklif' | 'kazanildi' | 'kaybedildi';
  note: string | null;
  created_at: string;
};

const toLeadItem = (lead: DbLead): LeadItem => ({
  id: lead.id,
  clientName: lead.full_name || 'İsimsiz lead',
  phone: lead.phone || 'Belirtilmedi',
  district: lead.district || 'Belirtilmedi',
  serviceType: lead.service === 'manitou' ? 'manitou' : 'insaat',
  offerAmount: lead.stage === 'teklif' ? 'Teklif Aşaması' : 'Teklif Verilecek',
  status: lead.stage === 'kazanildi' ? 'won' : lead.stage === 'teklif' ? 'quoted' : lead.stage === 'arandi' ? 'completed' : 'new',
  notes: lead.note || '',
  date: new Date(lead.created_at).toLocaleDateString('tr-TR'),
});

const toDbStage = (status: LeadItem['status']): DbLead['stage'] => ({
  new: 'yeni',
  quoted: 'teklif',
  won: 'kazanildi',
  completed: 'arandi',
}[status] as DbLead['stage']);

export function CustomerLeadHub() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loadError, setLoadError] = useState('');

  const [activeSubTab, setActiveSubTab] = useState<'leads' | 'ads_kit'>('leads');

  // New Lead Form State
  const [newClient, setNewClient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDistrict, setNewDistrict] = useState('Güngören');
  const [newService, setNewService] = useState<'manitou' | 'insaat'>('manitou');
  const [newAmount, setNewAmount] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadLeads = async () => {
      if (!supabase) {
        setLoadError('Supabase bağlantısı yapılandırılmamış.');
        return;
      }
      const { data, error } = await supabase.from('leads').select('id,full_name,phone,district,service,stage,note,created_at').order('created_at', { ascending: false }).limit(100);
      if (!mounted) return;
      if (error) setLoadError('Lead kayıtları yüklenemedi. RLS veya oturum yetkisini kontrol edin.');
      else setLeads((data as DbLead[]).map(toLeadItem));
    };
    loadLeads();
    return () => { mounted = false; };
  }, []);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.trim() || !consentGiven || !supabase) return;
    const { data, error } = await supabase.from('leads').insert({
      full_name: newClient.trim(), phone: newPhone || null, district: newDistrict,
      service: newService, source: 'manual', note: newNotes || null,
      stage: 'yeni', consent_given: true, consent_text: 'Yetkili panelden manuel kayıt',
    }).select('id,full_name,phone,district,service,stage,note,created_at').single();
    if (error || !data) {
      setLoadError('Lead kaydedilemedi. Zorunlu alanları ve RLS yetkisini kontrol edin.');
      return;
    }
    setLeads(current => [toLeadItem(data as DbLead), ...current]);
    setNewClient('');
    setNewPhone('');
    setNewAmount('');
    setNewNotes('');
    setConsentGiven(false);
    setIsAdding(false);
  };

  const updateStatus = async (id: string, status: LeadItem['status']) => {
    if (!supabase) return;
    const { error } = await supabase.from('leads').update({ stage: toDbStage(status) }).eq('id', id);
    if (error) {
      setLoadError('Lead durumu güncellenemedi.');
      return;
    }
    setLeads(current => current.map(lead => lead.id === id ? { ...lead, status } : lead));
  };

  const deleteLead = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      setLoadError('Lead silinemedi.');
      return;
    }
    setLeads(current => current.filter(lead => lead.id !== id));
  };

  const openWhatsAppQuote = (lead: LeadItem) => {
    const text = encodeURIComponent(
      `Sayın ${lead.clientName},\n\nŞahin Manitou Kiralama & Embay Yapı olarak ${lead.district} şantiyeniz için teklif detaylarımız:\n` +
      `🚜 Hizmet: ${lead.serviceType === 'manitou' ? 'Teleskopik Yükleyici (Manitou)' : 'Konut İnşaatı / Taahhüt'}\n` +
      `💰 Teklif: ${lead.offerAmount}\n` +
      `📞 İletişim: ${BUSINESS_INFO.phone}\n\n` +
      `İş makinemiz ve operatörümüz randevu saatinde sahanızda olmaya hazırdır. Hayırlı çalışmalar dileriz!`
    );
    window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  const openWhatsAppReview = (lead: LeadItem) => {
    const text = encodeURIComponent(
      `Selamünaleyküm ${lead.clientName}, bugünkü çalışmamızı kazasız tamamladık. Şahin Manitou & Embay Yapı olarak bizi tercih ettiğiniz için teşekkür ederiz.\n\n` +
      `Google Haritalar profilimize kısa bir 5 yıldızlı değerlendirme bırakmanız bizi çok mutlu eder:\n` +
      `👉 https://sahin-manitou-kiralama.vercel.app/\n\n` +
      `Yeni şantiyelerinizde görüşmek üzere: ${BUSINESS_INFO.phone}`
    );
    window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30 mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              İş Bağlama & Ciro Artırma Motoru
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Sıcak Müşteri Takip Kokpiti (CRM) & Google Ads Reklam Kiti
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Google aramalardan ve telefonla gelen müteahhit taleplerini anında kaydedin, WhatsApp'tan tek dokunuşla kurumsal teklif atın ve iş bitince otomatik 5 yıldızlı yorum isteyerek Google'da 1. sıraya tırmanın.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveSubTab('leads')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeSubTab === 'leads' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📞 Gelen İş Talepleri ({leads.length})
            </button>
            <button
              onClick={() => setActiveSubTab('ads_kit')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeSubTab === 'ads_kit' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🎯 Google Ads Reklam Kiti
            </button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-200">
          {loadError}
        </div>
      )}

      {activeSubTab === 'leads' ? (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-xs text-slate-400">Toplam Takip</span>
              <p className="text-xl font-black text-white mt-1">{leads.length}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 text-center">
              <span className="text-xs text-amber-400">Teklif Verilen</span>
              <p className="text-xl font-black text-amber-400 mt-1">
                {leads.filter(l => l.status === 'quoted').length}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-center">
              <span className="text-xs text-emerald-400">Bağlanan & Çalışan</span>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {leads.filter(l => l.status === 'won').length}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-blue-500/30 text-center">
              <span className="text-xs text-blue-400">Yorum Alınan</span>
              <p className="text-xl font-black text-blue-400 mt-1">
                {leads.filter(l => l.status === 'completed').length}
              </p>
            </div>
          </div>

          {/* Add Lead Toggle */}
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              Şantiye & Müşteri Görüşme Listesi
            </h3>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Yeni Şantiye / Arayan Ekle
            </button>
          </div>

          {/* Add Form */}
          {isAdding && (
            <form onSubmit={handleAddLead} className="p-5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-4">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Arayan Müşteri / Şantiye Bilgileri</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Müteahhit / Şantiye Adı (Örn: Tozkoparan Güneş Sitesi)"
                  value={newClient}
                  onChange={e => setNewClient(e.target.value)}
                  className="px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:border-emerald-500 outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Telefon Numarası (Örn: 0532 123 45 67)"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:border-emerald-500 outline-none"
                />
                <select
                  value={newDistrict}
                  onChange={e => setNewDistrict(e.target.value)}
                  className="px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:border-emerald-500 outline-none"
                >
                  <option value="Güngören">Güngören / Tozkoparan</option>
                  <option value="Bağcılar">Bağcılar / Güneşli</option>
                  <option value="Bakırköy">Bakırköy / Florya / Ataköy</option>
                  <option value="Zeytinburnu">Zeytinburnu / Merter</option>
                  <option value="Başakşehir">Başakşehir / İkitelli OSB</option>
                  <option value="Bahçelievler">Bahçelievler / Yenibosna</option>
                  <option value="Diğer">Diğer Avrupa Yakası</option>
                </select>
                <div className="flex gap-2">
                  <select
                    value={newService}
                    onChange={e => setNewService(e.target.value as any)}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:border-emerald-500 outline-none"
                  >
                    <option value="manitou">Kiralık Manitou</option>
                    <option value="insaat">Konut İnşaatı (Embay Yapı)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Tutar (Örn: 7500)"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-28 px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <textarea
                placeholder="Özel Not (Kaçıncı kata palet verilecek, dar sokak mı, ne zaman başlanacak?)"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:border-emerald-500 outline-none"
              />
              <label className="flex items-start gap-2 text-[11px] text-slate-400">
                <input type="checkbox" checked={consentGiven} onChange={e => setConsentGiven(e.target.checked)} required className="mt-0.5 accent-emerald-500" />
                <span>Bu kaydı oluşturmak için ilgili kişinin iletişim bilgilerinin şirket içi CRM’de işlenmesine dair onay alındığını doğruluyorum.</span>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  Kaydet ve Listeye Al
                </button>
              </div>
            </form>
          )}

          {/* Lead Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leads.map(lead => (
              <div
                key={lead.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm sm:text-base">{lead.clientName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          lead.serviceType === 'manitou' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}>
                          {lead.serviceType === 'manitou' ? 'Manitou' : 'İnşaat'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-500" /> {lead.district}</span>
                        <span className="flex items-center gap-1"><PhoneCall className="w-3 h-3 text-slate-500" /> {lead.phone}</span>
                        <span className="text-slate-500">{lead.date}</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      {lead.offerAmount}
                    </span>
                  </div>

                  {lead.notes && (
                    <p className="text-xs text-slate-300 mt-2.5 p-2 rounded bg-slate-950/80 border border-slate-800/80 leading-relaxed">
                      📝 {lead.notes}
                    </p>
                  )}
                </div>

                {/* Actions & Status */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Durum:</span>
                    <select
                      value={lead.status}
                      onChange={e => updateStatus(lead.id, e.target.value as any)}
                      className={`text-xs font-bold px-2 py-1 rounded bg-slate-950 border outline-none cursor-pointer ${
                        lead.status === 'won' ? 'text-emerald-400 border-emerald-500/40' :
                        lead.status === 'quoted' ? 'text-amber-400 border-amber-500/40' :
                        lead.status === 'completed' ? 'text-blue-400 border-blue-500/40' :
                        'text-slate-300 border-slate-700'
                      }`}
                    >
                      <option value="new">Yeni Arayan</option>
                      <option value="quoted">Teklif Verildi</option>
                      <option value="won">İş Alındı / Sahada</option>
                      <option value="completed">Tamamlandı & Yorum İstendi</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openWhatsAppQuote(lead)}
                      title="WhatsApp ile Hızlı Teklif Gönder"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      💬 Teklif At
                    </button>
                    <button
                      onClick={() => openWhatsAppReview(lead)}
                      title="5 Yıldızlı Google Yorumu İste"
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      ⭐ Yorum İste
                    </button>
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="p-1 text-slate-600 hover:text-red-400 transition cursor-pointer"
                      title="Kaydı Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* GOOGLE ADS KAMPANYA REHBERİ */
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Google Arama Ağı Reklamları</span>
            <h3 className="text-base font-bold text-white">Yarın Sabah Telefonun Çalmasını Sağlayan Google Ads Kiti</h3>
            <p className="text-xs text-slate-300 mt-1">
              Google Ads'te (ads.google.com) "Kiralık Manitou" kelimesine reklam açtığınızda doğrudan en tepeye çıkarsınız. Aşağıdaki hazır başlık, açıklama ve negatif kelimeleri kopyalayıp kullanın:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400">Reklam Başlıkları (30 Karakter Sınırı)</span>
              <ul className="text-xs font-mono text-slate-300 space-y-1">
                <li className="p-1.5 rounded bg-slate-900 border border-slate-800">1. Kiralık Manitou İstanbul</li>
                <li className="p-1.5 rounded bg-slate-900 border border-slate-800">2. Güngören & Çevre Şantiyeler</li>
                <li className="p-1.5 rounded bg-slate-900 border border-slate-800">3. Katlara Hızlı Palet Verme</li>
                <li className="p-1.5 rounded bg-slate-900 border border-slate-800">4. Şahin Manitou & Embay Yapı</li>
                <li className="p-1.5 rounded bg-slate-900 border border-slate-800">5. Hemen Ara: 0531 436 29 04</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400">Reklam Açıklamaları (90 Karakter Sınırı)</span>
              <ul className="text-xs font-mono text-slate-300 space-y-1">
                <li className="p-2 rounded bg-slate-900 border border-slate-800">
                  Tırdan palet indirme ve katlara malzeme verme. Saatlik & günlük kiralık teleskopik yükleyici.
                </li>
                <li className="p-2 rounded bg-slate-900 border border-slate-800">
                  Dar sokaklara uygun teleskopik yükleyici. Randevu ve net teklif: 0531 436 29 04.
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 space-y-2">
            <span className="text-xs font-bold text-red-400">🚨 Negatif Anahtar Kelimeler (Boşa Tıklama Olmasın Diye Kampanyaya Ekleyin)</span>
            <p className="text-xs text-slate-300">
              `satılık, ikinci el, maketi, oyuncak, operatör maaşları, ehliyet sınavı, sahibinden satılık, makine tamiri`
            </p>
            <p className="text-[11px] text-slate-400">
              Bu kelimeleri negatif listeye eklediğinizde sadece şantiyesine kiralık makine arayan gerçek müteahhitler tıklar, bütçeniz %100 işe dönüşür.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
