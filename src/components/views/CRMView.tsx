import React, { useState } from 'react';
import {
  Building2,
  HardHat,
  Truck,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { Company, Project, Opportunity, Lead, LeadStatus } from '../../types';
import { ProposalModal } from '../ProposalModal';

interface CRMViewProps {
  companies: Company[];
  projects: Project[];
  opportunities: Opportunity[];
  leads: Lead[];
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus, note: string) => void;
  onAddCompany: (company: Omit<Company, 'id' | 'createdAt' | 'enrichmentHistory'>) => void;
}

const LIFECYCLE_STEPS: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'DISCOVERED', label: '1. Keşfedildi', color: 'bg-slate-100 text-slate-700' },
  { status: 'QUALIFIED', label: '2. Doğrulandı', color: 'bg-blue-100 text-blue-800' },
  { status: 'CONTACTABLE', label: '3. İletişime Uygun', color: 'bg-indigo-100 text-indigo-800' },
  { status: 'CONTACTED', label: '4. İletişim Kuruldu', color: 'bg-purple-100 text-purple-800' },
  { status: 'RESPONSE', label: '5. Yanıt Geldi', color: 'bg-amber-100 text-amber-800' },
  { status: 'MEETING', label: '6. Toplantı / Keşif', color: 'bg-orange-100 text-orange-800' },
  { status: 'OFFER', label: '7. Teklif İletildi', color: 'bg-teal-100 text-teal-800' },
  { status: 'WON', label: '8. Anlaşma Sağlandı', color: 'bg-emerald-100 text-emerald-800' },
  { status: 'LOST', label: '9. İptal / Kaybedildi', color: 'bg-rose-100 text-rose-800' },
];

export const CRMView: React.FC<CRMViewProps> = ({
  companies,
  projects,
  opportunities,
  leads,
  onUpdateLeadStatus,
  onAddCompany
}) => {
  const [subTab, setSubTab] = useState<'firms' | 'projects' | 'opportunities' | 'leads'>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [proposalData, setProposalData] = useState<{
    isOpen: boolean;
    customerName: string;
    phone: string;
    service: string;
  }>({
    isOpen: false,
    customerName: '',
    phone: '',
    service: ''
  });

  // New company form state
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDistrict, setNewCompanyDistrict] = useState('');
  const [newCompanySector, setNewCompanySector] = useState('');
  const [newCompanyPhone, setNewCompanyPhone] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    onAddCompany({
      name: newCompanyName.trim(),
      city: 'İstanbul',
      district: newCompanyDistrict.trim() || 'Güngören',
      sector: newCompanySector.trim() || 'İnşaat / Kentsel Dönüşüm',
      phone: newCompanyPhone.trim(),
      email: newCompanyEmail.trim(),
      address: `${newCompanyDistrict || 'Güngören'} / İstanbul`
    });

    setNewCompanyName('');
    setNewCompanyDistrict('');
    setNewCompanySector('');
    setNewCompanyPhone('');
    setNewCompanyEmail('');
    setShowAddCompanyModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining the 3-Layer separation */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              FİRMA • PROJE • FIRSAT MERKEZİ (CRM)
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              İlişkisel İş Geliştirme & Müşteri Portföyü
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Firma, Proje ve Kiralama Fırsatı tek bir kayda sıkıştırılmaz. Her şantiye ve makine ihtiyacı bağımsız ve şeffaf olarak takip edilir.
            </p>
          </div>

          <button
            onClick={() => setShowAddCompanyModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            Yeni Firma / Müşteri Ekle
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100 mt-4 text-xs font-semibold">
          <button
            onClick={() => setSubTab('leads')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              subTab === 'leads'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            🎯 Lead Yaşam Döngüsü ({leads.length})
          </button>
          <button
            onClick={() => setSubTab('firms')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              subTab === 'firms'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            🏢 Firmalar ({companies.length})
          </button>
          <button
            onClick={() => setSubTab('projects')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              subTab === 'projects'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            🏗️ Projeler & Şantiyeler ({projects.length})
          </button>
          <button
            onClick={() => setSubTab('opportunities')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              subTab === 'opportunities'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            🚜 Makine Kiralama Fırsatları ({opportunities.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: LEAD YAŞAM DÖNGÜSÜ (LEAD LIFECYCLE) */}
      {/* ========================================================================= */}
      {subTab === 'leads' && (
        <div className="space-y-4">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {lead.companyName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{lead.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {lead.companyName} • Tel: <strong className="text-slate-700">{lead.phone}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setProposalData({
                        isOpen: true,
                        customerName: lead.companyName || lead.name,
                        phone: lead.phone,
                        service: lead.opportunitySummary || '18 Metre Teleskopik Manitou MT-X 1840 Kiralama'
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Teklif Hazırla / Yazdır
                  </button>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Mevcut Durum: {lead.status}
                  </span>
                </div>
              </div>

              {/* Opportunity note */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <p className="font-semibold text-slate-900">Talep & İhtiyaç:</p>
                <p className="text-slate-600 mt-0.5">{lead.opportunitySummary}</p>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Kaynak: <a href={lead.sourceEvidence.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">{lead.sourceEvidence.title}</a> ({lead.sourceEvidence.domain}) • Güven Skoru: %{lead.sourceEvidence.confidenceScore}
                </p>
              </div>

              {/* Lifecycle Progress Bar */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Lead Yaşam Döngüsü Aşaması (Tıklayarak Güncelleyin):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
                  {LIFECYCLE_STEPS.map((step) => {
                    const isCurrent = lead.status === step.status;
                    return (
                      <button
                        key={step.status}
                        onClick={() => onUpdateLeadStatus(lead.id, step.status, `Durum ${step.label} olarak güncellendi.`)}
                        className={`text-left p-2 rounded-lg text-xs font-medium border transition-all ${
                          isCurrent
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        <span className="block leading-tight">{step.label}</span>
                        {isCurrent && <span className="text-[10px] opacity-90">● Şu an burada</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* History Timeline */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tarihçe & Aksiyon Kayıtları:</p>
                <div className="space-y-1.5">
                  {lead.history.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px] text-slate-400">{h.changedAt}</span>
                      <span className="font-semibold text-slate-700">[{h.status}]</span>
                      <span className="text-slate-600">{h.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: FİRMALAR */}
      {/* ========================================================================= */}
      {subTab === 'firms' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {companies.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  {c.sector}
                </span>
                <span className="text-xs text-slate-400 font-mono">{c.createdAt}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{c.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {c.district} / {c.city}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{c.phone}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{c.email}</span>
                </p>
              </div>

              {/* Enrichment info */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">Zenginleştirme (Enrichment):</span>
                <p className="mt-0.5">
                  {c.enrichmentHistory.length} kez harici kaynaklardan veri eklendi (Google & Gruplar).
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: PROJELER & ŞANTİYELER */}
      {/* ========================================================================= */}
      {subTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  {p.projectType === 'KENTSEL_DONUSUM' ? 'Kentsel Dönüşüm' : 'Sanayi / Cephe Montaj'}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Aşama: {p.stage}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{p.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Bağlı Firma: <strong className="text-slate-700">{p.companyName}</strong>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {p.location} • Tahmini Süre: {p.estimatedDurationMonths} Ay
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                <span className="font-semibold text-slate-800">Şantiye Detayı: </span>
                {p.notes}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: MAKİNE KİRALAMA FIRSATLARI */}
      {/* ========================================================================= */}
      {subTab === 'opportunities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opportunities.map((opp) => (
            <div key={opp.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900">
                  {opp.machineRequirement === 'MANITOU_18M' ? '18 Metre Teleskopik Manitou' : 'Taahhüt / Genel Makine'}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  {opp.estimatedValueTRY.toLocaleString('tr-TR')} ₺
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{opp.projectTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Firma: <strong className="text-slate-700">{opp.companyName}</strong>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Kiralama Süresi: <strong>{opp.durationDays} Gün</strong> • {opp.assignedOperator ? 'Operatörlü' : 'Operatörsüz'}
                </p>
              </div>

              {opp.sourceEvidence && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                  <span className="font-semibold text-slate-800">Kanıt & Sinyal: </span>
                  {opp.sourceEvidence.evidenceSnippet}
                  <div className="mt-1 font-mono text-[10px] text-slate-400">
                    Bulunduğu Yer: {opp.sourceEvidence.domain} (%{opp.sourceEvidence.confidenceScore} Güven)
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Yeni Firma Ekleme */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Yeni Firma & Müşteri Kaydı</h3>
            <p className="text-xs text-slate-500">
              Girilen firma sistem havuzuna kaydedilir, mevcut isimle eşleşirse zenginleştirme (enrichment) uygulanır.
            </p>

            <form onSubmit={handleCreateCompany} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Firma / Kurum Adı</label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Örn: Özdemir Cephe ve Çelik A.Ş."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">İlçe</label>
                  <input
                    type="text"
                    value={newCompanyDistrict}
                    onChange={(e) => setNewCompanyDistrict(e.target.value)}
                    placeholder="Güngören / Esenyurt"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sektör</label>
                  <input
                    type="text"
                    value={newCompanySector}
                    onChange={(e) => setNewCompanySector(e.target.value)}
                    placeholder="Kentsel Dönüşüm / Montaj"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Telefon Numarası</label>
                <input
                  type="tel"
                  value={newCompanyPhone}
                  onChange={(e) => setNewCompanyPhone(e.target.value)}
                  placeholder="0532 ... veya 0212 ..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">E-Posta Adresi</label>
                <input
                  type="email"
                  value={newCompanyEmail}
                  onChange={(e) => setNewCompanyEmail(e.target.value)}
                  placeholder="info@sirket.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                >
                  Firmayı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proposal & Contract Print Modal */}
      <ProposalModal
        isOpen={proposalData.isOpen}
        onClose={() => setProposalData(prev => ({ ...prev, isOpen: false }))}
        defaultCustomerName={proposalData.customerName}
        defaultPhone={proposalData.phone}
        defaultService={proposalData.service}
      />
    </div>
  );
};
