import { useState } from 'react';
import { CorporatePublicSite } from './components/CorporatePublicSite';
import { Header } from './components/Header';
import { MobileQuickActions } from './components/MobileQuickActions';
import { GbpSeoSection } from './components/GbpSeoSection';
import { CustomerLeadHub } from './components/CustomerLeadHub';
import { CreativeBrandStudio } from './components/CreativeBrandStudio';
import { ExecutiveCommandCenter } from './components/ExecutiveCommandCenter';
import { ProjectHunterHub } from './components/ProjectHunterHub';
import { ViralSocialEngine } from './components/ViralSocialEngine';
import { QuickQuoteCalculator } from './components/QuickQuoteCalculator';
import { TwoPageSiteKit } from './components/TwoPageSiteKit';
import { DistrictPagesSection } from './components/DistrictPagesSection';
import { SocialSection } from './components/SocialSection';
import { WeeklyPlanSection } from './components/WeeklyPlanSection';
import { SiteSeoSection } from './components/SiteSeoSection';
import { QuickFieldGenerator } from './components/QuickFieldGenerator';
import { RoleMatrixSection } from './components/RoleMatrixSection';
import { Phone, Instagram, Globe, MapPin, ShieldCheck, ChevronRight, Sliders, Globe2 } from 'lucide-react';
import { BUSINESS_INFO } from './data/marketingData';

export default function App() {
  // 'website' -> Public Clean Corporate Site (Green & White, 2 pages: Insaat & Manitou)
  // 'growth_cockpit' -> Backend SEO, Ads & Social Media Management Cockpit
  const [viewMode, setViewMode] = useState<'public_website' | 'growth_cockpit'>('public_website');
  const [activeTab, setActiveTab] = useState<string>('gbp');

  return (
    <div>
      {/* Top Switcher Bar (Always allows toggling between Public Clean Site and Marketing Cockpit) */}
      <aside aria-label="Yönetim Çubuğu" className="bg-slate-900 text-white text-xs py-2 px-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="font-bold text-emerald-400">Görünüm:</span>
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setViewMode('public_website')}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'public_website'
                  ? 'bg-emerald-700 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Canlı Kurumsal Web Sitesi (Yeşil & Beyaz)</span>
            </button>
            <button
              onClick={() => setViewMode('growth_cockpit')}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'growth_cockpit'
                  ? 'bg-slate-800 text-amber-400 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Arama Motoru, Sosyal Medya & İş Bulma Kokpiti</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>📞 {BUSINESS_INFO.phone}</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">📍 Güngören / Tozkoparan</span>
          <span className="hidden sm:inline">•</span>
          <a 
            href={BUSINESS_INFO.instagramUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="text-pink-400 hover:underline"
          >
            {BUSINESS_INFO.instagram}
          </a>
        </div>
      </aside>

      {/* RENDER VIEW: 1. Clean Corporate Site vs 2. Growth Marketing Cockpit */}
      {viewMode === 'public_website' ? (
        <CorporatePublicSite />
      ) : (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 pb-16 sm:pb-0">
          <Header activeTab={activeTab} setActiveTab={setActiveTab} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
            <MobileQuickActions />

            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 w-fit">
              <span className="text-amber-400 font-semibold">Aktif Pazarlama Modülü:</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-white font-medium capitalize">
                {activeTab === 'gbp' && 'Google İşletme Profili (GBP), Hizmetler & Yerel SEO'}
                {activeTab === 'creative' && 'Esprili Şantiye Mizahı (Meme), Sıfır Atık & Özel Gün Duyarlılığı'}
                {activeTab === 'executive' && 'Yönetici Komuta Merkezi, Günlük Bülten & AI Bot Paylaşım Çizelgesi'}
                {activeTab === 'hunter' && 'Sıcak Şantiye Avcısı & İnşaat & Manitou İş Bulma Motoru'}
                {activeTab === 'reels' && 'Instagram Keşfet & Viral Reels Kurguları'}
                {activeTab === 'leads' && 'Şantiye & Sıcak Müşteri Takip Kokpiti (CRM) & Google Ads'}
                {activeTab === 'quote' && '30 Saniyede Anlık Şantiye Teklifi & WhatsApp Sözleşme Kartı'}
                {activeTab === 'twopage' && '2-Sayfalı Site Mimarisi, Search Console & Instagram Embed'}
                {activeTab === 'districts' && 'İstanbul İlçe İlçe Manitou & İnşaat Sayfaları'}
                {activeTab === 'instagram' && 'Instagram Keşfet, Reels Kancaları & @embayyapi'}
                {activeTab === 'calendar' && '7 Günlük İnteraktif Yayın & Aksiyon Çizelgesi'}
                {activeTab === 'website' && 'Web Sitesi Meta Etiketleri & JSON-LD Yapısal Verisi'}
                {activeTab === 'generator' && 'Şantiye İşinden Anında 3 Platformlu İçerik Üretici'}
                {activeTab === 'boundaries' && 'Görev Paylaşımı: AI Çıktıları vs. Saha Eylemleri'}
              </span>
            </div>

            {activeTab === 'gbp' && <GbpSeoSection />}
            {activeTab === 'creative' && <CreativeBrandStudio />}
            {activeTab === 'executive' && <ExecutiveCommandCenter />}
            {activeTab === 'hunter' && <ProjectHunterHub />}
            {activeTab === 'reels' && <ViralSocialEngine />}
            {activeTab === 'leads' && <CustomerLeadHub />}
            {activeTab === 'quote' && <QuickQuoteCalculator />}
            {activeTab === 'twopage' && <TwoPageSiteKit />}
            {activeTab === 'districts' && <DistrictPagesSection />}
            {activeTab === 'instagram' && <SocialSection />}
            {activeTab === 'calendar' && <WeeklyPlanSection />}
            {activeTab === 'website' && <SiteSeoSection />}
            {activeTab === 'generator' && <QuickFieldGenerator />}
            {activeTab === 'boundaries' && <RoleMatrixSection />}
          </main>

          <footer className="border-t border-slate-800/80 bg-slate-900/95 py-6 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span>🚜 Şahin Manitou Kiralama</span>
                  <span className="text-amber-400">&</span>
                  <span>🏗️ Embay Yapı</span>
                </div>
                <span className="hidden sm:inline text-slate-600">|</span>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{BUSINESS_INFO.address}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <a href={`tel:${BUSINESS_INFO.phoneRaw}`} className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{BUSINESS_INFO.phone}</span>
                </a>
                <a href={BUSINESS_INFO.instagramUrl} target="_blank" rel="noreferrer" className="text-pink-400 hover:text-pink-300 font-semibold inline-flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5" />
                  <span>{BUSINESS_INFO.instagram}</span>
                </a>
                <span className="flex items-center gap-1 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Beyaz Şapka Yerel SEO Güvencesi</span>
                </span>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
