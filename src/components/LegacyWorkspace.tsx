import { useState } from 'react';
import { Header } from './Header';
import { SocialIntelligenceCockpit } from './SocialIntelligenceCockpit';
import { ClientInvestorCrm } from './ClientInvestorCrm';
import { GbpSeoSection } from './GbpSeoSection';
import { ParcelFeasibilityStudio } from './ParcelFeasibilityStudio';
import { LegalContractStudio } from './LegalContractStudio';
import { CustomerLeadHub } from './CustomerLeadHub';
import { CreativeBrandStudio } from './CreativeBrandStudio';
import { ExecutiveCommandCenter } from './ExecutiveCommandCenter';
import { ProjectHunterHub } from './ProjectHunterHub';
import { ViralSocialEngine } from './ViralSocialEngine';
import { QuickQuoteCalculator } from './QuickQuoteCalculator';
import { TwoPageSiteKit } from './TwoPageSiteKit';
import { DistrictPagesSection } from './DistrictPagesSection';
import { SocialSection } from './SocialSection';
import { SocialOperationsHub } from './SocialOperationsHub';
import { WeeklyPlanSection } from './WeeklyPlanSection';
import { SiteSeoSection } from './SiteSeoSection';
import { QuickFieldGenerator } from './QuickFieldGenerator';
import { RoleMatrixSection } from './RoleMatrixSection';
import { AdminWorkspacePicker } from './AdminWorkspacePicker';
import { ChevronRight } from 'lucide-react';

/** Önceki çalışma alanları (klasik araçlar). Ops Center içinde "Klasik Araçlar" altında korunur. */
export function LegacyWorkspace() {
  const [activeTab, setActiveTab] = useState<string>('social-planner');
  return (
    <div className="rounded-3xl bg-emerald-50/70 text-slate-900 font-sans overflow-hidden ring-1 ring-ink-700">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
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
    </div>
  );
}
