import { useState, useEffect } from 'react';
import { SupabaseAuthGate } from './components/SupabaseAuthGate';
import { Header } from './components/Header';
import { MobileQuickActions } from './components/MobileQuickActions';
import { SocialIntelligenceCockpit } from './components/SocialIntelligenceCockpit';
import { ClientInvestorCrm } from './components/ClientInvestorCrm';
import { GbpSeoSection } from './components/GbpSeoSection';
import { ParcelFeasibilityStudio } from './components/ParcelFeasibilityStudio';
import { LegalContractStudio } from './components/LegalContractStudio';
import { CustomerLeadHub } from './components/CustomerLeadHub';
import { CreativeBrandStudio } from './components/CreativeBrandStudio';
import { ExecutiveCommandCenter } from './components/ExecutiveCommandCenter';
import { ProjectHunterHub } from './components/ProjectHunterHub';
import { ViralSocialEngine } from './components/ViralSocialEngine';
import { QuickQuoteCalculator } from './components/QuickQuoteCalculator';
import { TwoPageSiteKit } from './components/TwoPageSiteKit';
import { DistrictPagesSection } from './components/DistrictPagesSection';
import { SocialSection } from './components/SocialSection';
import { SocialOperationsHub } from './components/SocialOperationsHub';
import { WeeklyPlanSection } from './components/WeeklyPlanSection';
import { SiteSeoSection } from './components/SiteSeoSection';
import { QuickFieldGenerator } from './components/QuickFieldGenerator';
import { RoleMatrixSection } from './components/RoleMatrixSection';
import { AdminWorkspacePicker } from './components/AdminWorkspacePicker';
import { MapPin, ShieldCheck, ChevronRight, LogOut, Lock } from 'lucide-react';
import { BUSINESS_INFO } from './data/marketingData';
import { supabase } from './lib/supabase';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const session = localStorage.getItem('embay_auth_session_v1');
      return Boolean(session);
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('social-planner');

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    localStorage.removeItem('embay_auth_session_v1');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <SupabaseAuthGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-emerald-50/60 text-slate-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-950 pb-16 sm:pb-0">
      {/* Yönetici Yetkili Üst Bar */}
      <aside aria-label="Yönetim Çubuğu" className="bg-white text-slate-800 text-xs py-2 px-4 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>EMBAY İÇ YÖNETİM PANELİ (GİZLİ / NOINDEX)</span>
          </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
            İç Araçlar: Parsel/İmar, Sözleşme, Kreatif, CRM & Komuta Merkezi
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500 hidden sm:inline">Yetkili: <strong>Samet Bey</strong></span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-slate-500 hover:text-rose-500 transition cursor-pointer font-semibold"
            title="Güvenli Çıkış Yap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        <MobileQuickActions />
        <AdminWorkspacePicker activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-2.5 rounded-xl border border-emerald-100 w-fit">
          <span className="text-emerald-700 font-semibold">Aktif çalışma alanı:</span>
          <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />
          <span className="text-slate-800 font-medium capitalize">
            {activeTab === 'intelligence' && 'Sosyal Medya İstihbaratı, Gönderi Etiket Analizi, Pazarlama Maliyeti & Müşteri Avcısı'}
            {activeTab === 'investors' && 'Müşteri & Sermaye Portföyü, Yatırım Planı, Kâr Analizi & Otomatik Reklam Stratejisi (Supabase)'}
            {activeTab === 'feasibility' && 'Ada / Parsel İmar Hesaplama, Simülasyon & Temsili 3D Mimari Proje Kartı'}
            {activeTab === 'contracts' && 'Şantiye İSG & İş Makinesi Kiralama Sözleşmesi / Kentsel Dönüşüm Ön Protokolü'}
            {activeTab === 'creative' && 'Esprili Şantiye Mizahı (Meme), Sıfır Atık & Özel Gün Duyarlılığı'}
            {activeTab === 'executive' && 'Yönetici Komuta Merkezi, Günlük Bülten & AI Bot Paylaşım Çizelgesi'}
            {activeTab === 'leads' && 'Şantiye & Sıcak Müşteri Takip Kokpiti (CRM) & KVKK Onaylı Portföy'}
            {activeTab === 'hunter' && 'Sıcak Şantiye Avcısı & İnşaat & Manitou İş Bulma Motoru'}
            {activeTab === 'reels' && 'Instagram Keşfet & Viral Reels Kurguları'}
            {activeTab === 'gbp' && 'Google İşletme Profili (GBP), Hizmetler & Yerel SEO'}
            {activeTab === 'quote' && '30 Saniyede Anlık Şantiye Teklifi & WhatsApp Sözleşme Kartı'}
            {activeTab === 'twopage' && '2-Sayfalı Site Mimarisi, Search Console & Instagram Embed'}
            {activeTab === 'districts' && 'İstanbul İlçe İlçe Manitou & İnşaat Sayfaları'}
            {activeTab === 'instagram' && 'Instagram Keşfet, Reels Kancaları & @embayyapi'}
            {activeTab === 'social-planner' && 'Sosyal Portföy, Uygulama Önizlemesi, Arşiv & Etiketli Metrikler'}
            {activeTab === 'calendar' && '7 Günlük İnteraktif Yayın & Aksiyon Çizelgesi'}
            {activeTab === 'website' && 'Web Sitesi Meta Etiketleri & JSON-LD Yapısal Verisi'}
            {activeTab === 'generator' && 'Şantiye İşinden Anında 3 Platformlu İçerik Üretici'}
            {activeTab === 'boundaries' && 'Görev Paylaşımı: AI Çıktıları vs. Saha Eylemleri'}
          </span>
        </div>

        {activeTab === 'intelligence' && <SocialIntelligenceCockpit />}
        {activeTab === 'investors' && <ClientInvestorCrm />}
        {activeTab === 'feasibility' && <ParcelFeasibilityStudio />}
        {activeTab === 'contracts' && <LegalContractStudio />}
        {activeTab === 'creative' && <CreativeBrandStudio />}
        {activeTab === 'executive' && <ExecutiveCommandCenter />}
        {activeTab === 'leads' && <CustomerLeadHub />}
        {activeTab === 'hunter' && <ProjectHunterHub />}
        {activeTab === 'reels' && <ViralSocialEngine />}
        {activeTab === 'gbp' && <GbpSeoSection />}
        {activeTab === 'quote' && <QuickQuoteCalculator />}
        {activeTab === 'twopage' && <TwoPageSiteKit />}
        {activeTab === 'districts' && <DistrictPagesSection />}
        {activeTab === 'instagram' && <SocialSection />}
        {activeTab === 'social-planner' && <SocialOperationsHub />}
        {activeTab === 'calendar' && <WeeklyPlanSection />}
        {activeTab === 'website' && <SiteSeoSection />}
        {activeTab === 'generator' && <QuickFieldGenerator />}
        {activeTab === 'boundaries' && <RoleMatrixSection />}
      </main>

      <footer className="border-t border-emerald-100 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <img src="/embay-mark.svg" alt="Embay marka logosu" className="w-7 h-7 rounded-lg" />
              <span>Embay Yapı & Kiralık İş Makineleri</span>
            </div>
            <span className="hidden sm:inline text-emerald-200">|</span>
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{BUSINESS_INFO.address}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Yetkili İç Panel</span>
            <span>•</span>
            <span>Noindex (SEO Koruma)</span>
            <span>•</span>
            <span>KVKK Uyumlu</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
