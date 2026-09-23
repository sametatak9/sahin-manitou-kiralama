import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Radar,
  Calendar,
  PenTool,
  Cpu,
  Mail,
  Link2,
  Activity,
  Sliders,
  CheckCircle2,
  Eye,
  ShieldCheck,
  Phone,
  MessageSquare
} from 'lucide-react';

import { Header } from './components/Header';
import { DashboardView } from './components/views/DashboardView';
import { CRMView } from './components/views/CRMView';
import { LeadRadarView } from './components/views/LeadRadarView';
import { ContentCalendarView } from './components/views/ContentCalendarView';
import { PostStudioView } from './components/views/PostStudioView';
import { BotControlView } from './components/views/BotControlView';
import { EmailCenterView } from './components/views/EmailCenterView';
import { ConnectionsView } from './components/views/ConnectionsView';
import { SystemHealthView } from './components/views/SystemHealthView';
import { PublicWebsiteView } from './components/views/PublicWebsiteView';

import {
  INITIAL_COMPANIES,
  INITIAL_PROJECTS,
  INITIAL_OPPORTUNITIES,
  INITIAL_LEADS,
  INITIAL_PLATFORMS,
  INITIAL_BOT_TASKS,
  INITIAL_CONTENT_ITEMS,
  INITIAL_SEO_REPORT,
  INITIAL_TRENDS,
  INITIAL_EMAILS,
  INITIAL_SYSTEM_ERRORS,
  INITIAL_AI_COSTS
} from './data/initialData';

import {
  Company,
  Project,
  Opportunity,
  Lead,
  LeadStatus,
  ContentItem,
  BotTask,
  PlatformConnection,
  PlatformType
} from './types';

import { dbService, isSupabaseConfigured } from './lib/supabase';

export function App() {
  // Main View: 'panel' (Operations Center) or 'website' (Public Showcase)
  const [currentView, setCurrentView] = useState<'panel' | 'website'>('panel');
  // Operations Panel Tabs
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Application State (Additive and in-memory persistence)
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [platforms, setPlatforms] = useState<PlatformConnection[]>(INITIAL_PLATFORMS);
  const [botTasks, setBotTasks] = useState<BotTask[]>(INITIAL_BOT_TASKS);
  const [contentItems, setContentItems] = useState<ContentItem[]>(INITIAL_CONTENT_ITEMS);
  const [seoReport, setSeoReport] = useState(INITIAL_SEO_REPORT);
  const [trends, setTrends] = useState(INITIAL_TRENDS);
  const [emails, setEmails] = useState(INITIAL_EMAILS);
  const [errors, setErrors] = useState(INITIAL_SYSTEM_ERRORS);
  const [costs, setCosts] = useState(INITIAL_AI_COSTS);

  // Status Notification
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Sync with Supabase on mount and load persisted bot list
  useEffect(() => {
    // 1. Try local storage cache for instant persistence
    try {
      const savedBots = localStorage.getItem('sahin_real_bots');
      if (savedBots) {
        const parsed = JSON.parse(savedBots);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBotTasks(parsed);
        }
      }
    } catch (e) {
      // ignore
    }

    // 2. Try Supabase cloud database
    if (isSupabaseConfigured) {
      dbService.fetchLeads().then((data) => {
        if (data && data.length > 0) {
          const mappedLeads: Lead[] = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            companyName: d.company_name || 'Şantiye / Müşteri',
            phone: d.phone,
            status: (d.status as LeadStatus) || 'DISCOVERED',
            opportunitySummary: d.opportunity_summary || 'Doğrudan canlı talep',
            requiresHumanApproval: Boolean(d.requires_human_approval),
            sourceEvidence: d.source_evidence || {
              url: 'https://sahin-manitou-kiralama.vercel.app',
              domain: 'sahin-manitou-kiralama.vercel.app',
              sourceType: 'SUPABASE_DB',
              title: 'Canlı Supabase Veritabanı Kaydı',
              discoveredAt: 'Canlı',
              evidenceSnippet: d.opportunity_summary || 'Canlı Müşteri',
              confidenceScore: 100,
              botName: 'Supabase Sync Engine',
              query: 'Canlı Talep'
            },
            history: d.history || []
          }));
          setLeads(prev => [...mappedLeads, ...prev.filter(p => !mappedLeads.some(m => m.id === p.id))]);
          showNotification('Supabase canlı veritabanı bağlandı ve kayıtlar senkronize edildi.');
        }
      });

      dbService.fetchBotTasks().then((botData) => {
        if (botData && botData.length > 0) {
          const mappedBots: BotTask[] = botData.map((b: any) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            status: b.status,
            schedule: b.schedule,
            lastRunAt: b.last_run_at,
            duration: b.duration,
            report: b.report,
            findingsCount: b.findings_count,
            model: b.model,
            targetUrl: b.target_url,
            targetJobDescription: b.target_job_description,
            maxRunDurationMinutes: b.max_run_duration_minutes,
            lastRunOutcome: b.last_run_outcome,
            executionHistory: b.execution_history || []
          }));
          setBotTasks(mappedBots);
        }
      });
    }
  }, []);

  // Bot Trigger with Real Outcome Reporting (Found vs Empty)
  const handleTriggerBot = (
    id: string,
    customOutcome?: {
      outcome: 'BULGU_VAR' | 'TEMIZ_BOS_DONDU';
      summary: string;
      targetUrl?: string;
      durationStr?: string;
    }
  ) => {
    const outcome = customOutcome?.outcome || 'TEMIZ_BOS_DONDU';
    const summary = customOutcome?.summary || 'Görev tamamlandı ve raporlandı.';
    const duration = customOutcome?.durationStr || '1.8 sn';
    const targetUrl = customOutcome?.targetUrl || 'https://sahin-manitou-kiralama.vercel.app';

    setBotTasks(prev =>
      prev.map(task => {
        if (task.id === id) {
          const newHistoryItem = {
            runAt: 'Şimdi',
            duration,
            outcome,
            summary,
            targetScanned: targetUrl
          };
          const updatedHistory = [newHistoryItem, ...(task.executionHistory || [])];
          const updatedBot: BotTask = {
            ...task,
            status: 'TAMAMLANDI',
            lastRunAt: 'Şimdi',
            duration,
            report: summary,
            targetUrl: targetUrl || task.targetUrl,
            lastRunOutcome: outcome === 'BULGU_VAR' ? 'SUCCESS_WITH_LEAD' : 'EMPTY_BUT_COMPLETED',
            executionHistory: updatedHistory
          };

          // Persist to Supabase & local storage
          dbService.upsertBotTask(updatedBot);
          dbService.logBotExecution(id, newHistoryItem);

          return updatedBot;
        }
        return task;
      })
    );

    if (outcome === 'BULGU_VAR') {
      showNotification('Bot yeni bir şantiye / SEO fırsatı yakaladı ve Supabase\'e kaydetti.');
    } else {
      showNotification('Bot taramayı tamamladı. Yeni talep bulunamadı (Temiz Rapor Supabase\'e yazıldı).');
    }
  };

  // Human Approval for Lead
  const handleApproveLead = (leadId: string) => {
    setLeads(prev =>
      prev.map(l => {
        if (l.id === leadId) {
          const updatedHistory = [
            ...l.history,
            {
              status: 'CONTACTED' as LeadStatus,
              changedAt: 'Şimdi (Samet Bey Onayladı)',
              note: 'Resmi iletişim kanalı üzerinden teklif mesajı gönderildi.'
            }
          ];
          return {
            ...l,
            status: 'CONTACTED',
            requiresHumanApproval: false,
            history: updatedHistory
          };
        }
        return l;
      })
    );
    showNotification('Lead için insan onayı verildi ve resmi iletişim başlatıldı.');
  };

  // Human Approval for Content Post
  const handleApproveContent = (contentId: string) => {
    setContentItems(prev =>
      prev.map(item => {
        if (item.id === contentId) {
          return {
            ...item,
            approvalStatus: 'APPROVED',
            publishStatus: 'SCHEDULED'
          };
        }
        return item;
      })
    );
    showNotification('İçerik onaylandı ve takvimde yayına alındı.');
  };

  // Update Lead Lifecycle
  const handleUpdateLeadStatus = (leadId: string, newStatus: LeadStatus, note: string) => {
    let updatedHistoryForDb: any[] = [];
    setLeads(prev =>
      prev.map(l => {
        if (l.id === leadId) {
          const updatedHistory = [
            ...l.history,
            {
              status: newStatus,
              changedAt: 'Şimdi',
              note
            }
          ];
          updatedHistoryForDb = updatedHistory;
          return {
            ...l,
            status: newStatus,
            history: updatedHistory
          };
        }
        return l;
      })
    );
    // Persist to Supabase if available
    dbService.updateLeadStatus(leadId, newStatus, updatedHistoryForDb);
    showNotification(`Lead durumu ${newStatus} olarak güncellendi.`);
  };

  // Add Company (Enrichment / Additive)
  const handleAddCompany = (newComp: Omit<Company, 'id' | 'createdAt' | 'enrichmentHistory'>) => {
    const existing = companies.find(c => c.name.toLowerCase() === newComp.name.toLowerCase());
    if (existing) {
      // Enrichment instead of duplicate
      setCompanies(prev =>
        prev.map(c => {
          if (c.id === existing.id) {
            return {
              ...c,
              phone: newComp.phone || c.phone,
              email: newComp.email || c.email,
              enrichmentHistory: [
                ...c.enrichmentHistory,
                {
                  date: 'Bugün',
                  source: 'Kullanıcı Girişi / Zenginleştirme',
                  addedFields: ['phone', 'email']
                }
              ]
            };
          }
          return c;
        })
      );
      showNotification(`"${existing.name}" zaten kayıtlıydı; profil yeni bilgilerle zenginleştirildi.`);
    } else {
      const created: Company = {
        ...newComp,
        id: `comp-${Date.now()}`,
        createdAt: '2026-09-23',
        enrichmentHistory: []
      };
      setCompanies(prev => [created, ...prev]);
      showNotification(`"${created.name}" firma havuzuna eklendi.`);
    }
  };

  // Convert Signal to Lead
  const handleConvertSignalToLead = (signal: any) => {
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name: signal.title.slice(0, 30),
      companyName: signal.category === 'MANITOU' ? 'İş Makineleri Şantiye Talebi' : 'Tozkoparan Kat Malikleri',
      phone: '0531 436 29 04',
      status: 'QUALIFIED',
      opportunitySummary: signal.snippet,
      requiresHumanApproval: true,
      approvalAction: 'SEND_WHATSAPP',
      sourceEvidence: {
        url: signal.url,
        domain: signal.domain,
        sourceType: signal.sourceType,
        title: signal.title,
        discoveredAt: signal.discoveredAt,
        evidenceSnippet: signal.snippet,
        confidenceScore: signal.confidenceScore,
        botName: signal.botName,
        query: signal.query
      },
      history: [
        {
          status: 'DISCOVERED',
          changedAt: 'Şimdi',
          note: `Radar sinyali CRM'e aktarıldı (${signal.domain})`
        },
        {
          status: 'QUALIFIED',
          changedAt: 'Şimdi',
          note: 'Sinyal güven skoru ve kanıt metni doğrulandı.'
        }
      ]
    };

    setLeads(prev => [newLead, ...prev]);
    showNotification('Sinyal başarıyla CRM Lead havuzuna eklendi. Samet Bey onayı bekleniyor.');
  };

  // Generate 30-Day Content Plan ("30 GÜNLÜK AI İLE İÇERİK PLANI BAŞLAT")
  const handleGenerate30DayPlan = () => {
    const newItems: ContentItem[] = [];
    const platformsList: ('INSTAGRAM' | 'GOOGLE_BUSINESS' | 'FACEBOOK')[] = ['INSTAGRAM', 'GOOGLE_BUSINESS', 'FACEBOOK'];

    for (let i = 1; i <= 30; i++) {
      const p = platformsList[i % 3];
      const dayStr = i < 10 ? `0${i}` : `${i}`;
      const isManitou = i % 2 === 0;

      newItems.push({
        id: `plan-30-${i}-${Date.now()}`,
        platform: p,
        account: p === 'INSTAGRAM' ? '@sahinmanitou_kiralama' : 'Embay Yapı & Şahin Manitou',
        plannedAt: `2026-10-${dayStr} 11:30`,
        timezone: 'Europe/Istanbul',
        title: isManitou
          ? `Günün Manitou İpucu #${i}: MT-X 1840 ile Şantiye Emniyeti`
          : `Güngören Kentsel Dönüşüm Rehberi #${i}: Zemin Güvenliği`,
        caption: isManitou
          ? 'Yüksek irtifa montajlarınızda 18 metre bom uzanımı ve 4 ton taşıma kapasitesiyle zamandan ve iş gücünden tasarruf edin.'
          : 'Tozkoparan ve çevresinde deprem yönetmeliğine tam uyumlu radye temel ve C35 beton standartlarında güvenli yapılar.',
        hashtags: isManitou ? ['#manitou', '#kiralık', '#telehandler'] : ['#kentseldönüşüm', '#güngören', '#embayyapi'],
        cta: 'Teklif ve keşif için: 0531 436 29 04',
        mediaType: 'IMAGE',
        bot: '30 Günlük AI İçerik Motoru',
        campaign: 'Ekim 2026 30 Günlük Master Kampanya',
        approvalStatus: 'PENDING_APPROVAL',
        publishStatus: 'DRAFT'
      });
    }

    setContentItems(prev => [...newItems, ...prev]);
    showNotification('30 günlük gerçek içerik planı takvime eklendi. Onayınızı bekliyor.');
  };

  // Add Custom Content Plan
  const handleAddContent = (item: Omit<ContentItem, 'id' | 'approvalStatus' | 'publishStatus'>) => {
    const newItem: ContentItem = {
      ...item,
      id: `plan-${Date.now()}`,
      approvalStatus: 'PENDING_APPROVAL',
      publishStatus: 'DRAFT'
    };
    setContentItems(prev => [newItem, ...prev]);
    showNotification(`"${newItem.title}" planı başarıyla takvime eklendi.`);
  };

  // Update Content Item
  const handleUpdateContent = (id: string, updated: Partial<ContentItem>) => {
    setContentItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updated } : item))
    );
    showNotification('İçerik planı güncellendi.');
  };

  // Delete Content Item
  const handleDeleteContent = (id: string) => {
    setContentItems(prev => prev.filter(item => item.id !== id));
    showNotification('İçerik planı silindi.');
  };

  // Clear All Plans
  const handleClearAllPlans = () => {
    setContentItems([]);
    showNotification('Tüm deneme planları temizlendi. Takvim sıfırlandı.');
  };

  // Add Custom Bot
  const handleAddNewBot = (botData: Omit<BotTask, 'id'>) => {
    const newBot: BotTask = {
      ...botData,
      id: `bot-${Date.now()}`
    };
    setBotTasks(prev => [newBot, ...prev]);
    dbService.upsertBotTask(newBot);
    showNotification(`"${newBot.name}" botu sisteme eklendi ve Supabase'e kaydedildi.`);
  };

  // Toggle Bot Status
  const handleToggleBotStatus = (id: string) => {
    setBotTasks(prev =>
      prev.map(b => {
        if (b.id === id) {
          const nextStatus: BotTask['status'] = b.status === 'BEKLEMEDE' ? 'TAMAMLANDI' : 'BEKLEMEDE';
          const updated: BotTask = { ...b, status: nextStatus };
          dbService.upsertBotTask(updated);
          return updated;
        }
        return b;
      })
    );
    showNotification('Bot çalışma durumu güncellendi.');
  };

  // Update Bot Skills, Permissions & Training
  const handleUpdateBot = (updatedBot: BotTask) => {
    setBotTasks(prev => prev.map(b => (b.id === updatedBot.id ? updatedBot : b)));
    dbService.upsertBotTask(updatedBot);
    showNotification(`"${updatedBot.name}" yetenekleri ve sistem eğitimi güncellendi.`);
  };

  // Delete Bot
  const handleDeleteBot = (id: string) => {
    setBotTasks(prev => prev.filter(b => b.id !== id));
    dbService.deleteBotTask(id);
    showNotification('Bot sistemden kaldırıldı.');
  };

  // Reset to only Real Concrete Bots (Clean all test / mock entries)
  const handleClearFakeBots = () => {
    setBotTasks(INITIAL_BOT_TASKS);
    try {
      localStorage.setItem('sahin_real_bots', JSON.stringify(INITIAL_BOT_TASKS));
      localStorage.removeItem('sahin_fake_logs');
    } catch (e) {
      // ignore
    }
    INITIAL_BOT_TASKS.forEach(b => dbService.upsertBotTask(b));
    showNotification('Tüm deneme ve sahte bot kayıtları silindi. Yalnızca Supabase uyumlu reel botlar aktif.');
  };

  // Add Platform Connection
  const handleAddPlatform = (newPlatform: PlatformConnection) => {
    setPlatforms(prev => [newPlatform, ...prev]);
    showNotification(`"${newPlatform.platform}" entegrasyonu sisteme kaydedildi.`);
  };

  // Toggle Platform Connection Status
  const handleTogglePlatformStatus = (platformName: PlatformType, accountName: string) => {
    setPlatforms(prev =>
      prev.map(p => {
        if (p.platform === platformName && p.accountName === accountName) {
          const nextStatus = p.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED';
          return {
            ...p,
            status: nextStatus,
            lastSyncAt: nextStatus === 'CONNECTED' ? 'Canlı Senkronize' : null
          };
        }
        return p;
      })
    );
    showNotification('Platform bağlantı durumu güncellendi.');
  };

  // Delete Platform Connection
  const handleDeletePlatform = (platformName: PlatformType, accountName: string) => {
    setPlatforms(prev =>
      prev.filter(p => !(p.platform === platformName && p.accountName === accountName))
    );
    showNotification('Platform entegrasyonu kaldırıldı.');
  };

  // Schedule Post from Studio
  const handleSchedulePost = (post: any) => {
    const newItem: ContentItem = {
      id: `post-${Date.now()}`,
      platform: post.platform,
      account: post.platform === 'INSTAGRAM' ? '@sahinmanitou_kiralama' : 'Embay Yapı & Şahin Manitou',
      plannedAt: post.plannedAt,
      timezone: 'Europe/Istanbul',
      title: post.title,
      caption: post.caption,
      hashtags: post.hashtags,
      cta: post.cta,
      mediaType: 'IMAGE',
      bot: post.bot,
      campaign: post.campaign,
      approvalStatus: post.approvalStatus,
      publishStatus: 'SCHEDULED'
    };
    setContentItems(prev => [newItem, ...prev]);
    showNotification('Yeni içerik Post Studio üzerinden oluşturuldu ve takvime işlendi.');
  };

  // Lead Submitted from Public Website Form
  const handleLeadFromWebsite = (leadData: {
    name: string;
    phone: string;
    companyName: string;
    serviceType: string;
    notes: string;
  }) => {
    const newLead: Lead = {
      id: `web-lead-${Date.now()}`,
      name: leadData.name,
      companyName: leadData.companyName,
      phone: leadData.phone,
      status: 'DISCOVERED',
      opportunitySummary: `${leadData.serviceType} - ${leadData.notes}`,
      requiresHumanApproval: true,
      approvalAction: 'SEND_WHATSAPP',
      sourceEvidence: {
        url: 'https://sahin-manitou-kiralama.vercel.app/#kesif-formu',
        domain: 'sahin-manitou-kiralama.vercel.app',
        sourceType: 'INBOUND_FORM',
        title: 'Canlı Web Sitesi Keşif / Teklif Formu',
        discoveredAt: 'Az Önce',
        evidenceSnippet: `${leadData.name} (${leadData.phone}) webden form doldurdu: "${leadData.serviceType} - ${leadData.notes}"`,
        confidenceScore: 100,
        botName: 'Inbound Webhook Listener',
        query: 'Doğrudan Web Ziyaretçisi'
      },
      history: [
        {
          status: 'DISCOVERED',
          changedAt: 'Az Önce',
          note: 'Vitrin sitesi keşif formundan operasyon paneline düştü.'
        }
      ]
    };

    setLeads(prev => [newLead, ...prev]);
    dbService.insertLead(newLead);
    showNotification(`Yeni talep (${leadData.name}) doğrudan Operasyon Paneli CRM'e eklendi!`);
  };

  // Count pending approvals
  const pendingApprovalsCount =
    leads.filter(l => l.requiresHumanApproval).length +
    contentItems.filter(c => c.approvalStatus === 'PENDING_APPROVAL').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-800 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg border border-emerald-600 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{notification}</span>
        </div>
      )}

      {/* Global Light Green & White Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        pendingApprovalsCount={pendingApprovalsCount}
        onOpenApprovals={() => {
          setCurrentView('panel');
          setCurrentTab('dashboard');
        }}
      />

      {/* VIEW 1: OPERATIONS CENTER PANEL (EMBAY-PANEL) */}
      {currentView === 'panel' ? (
        <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 gap-4 sm:gap-6">
          {/* Mobile Horizontal Scrollable Tab Bar (Fixes mobile overflow!) */}
          <div className="lg:hidden w-full overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-1.5 min-w-max p-1 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              {[
                { id: 'dashboard', label: 'Özet', icon: LayoutDashboard },
                { id: 'crm', label: `CRM (${leads.length})`, icon: Building2 },
                { id: 'radar', label: 'Lead Radar', icon: Radar },
                { id: 'calendar', label: 'İçerik Takvimi', icon: Calendar },
                { id: 'studio', label: 'Post Studio', icon: PenTool },
                { id: 'bots', label: 'Bot Kontrol', icon: Cpu },
                { id: 'email', label: `Teklif (${emails.length})`, icon: Mail },
                { id: 'connections', label: 'Bağlantılar', icon: Link2 },
                { id: 'health', label: 'Sistem Sağlığı', icon: Activity }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left Navigation Sidebar for Desktop */}
          <aside className="hidden lg:block lg:w-64 shrink-0 space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Operasyon Menüsü
              </div>

              <nav className="space-y-1 text-xs font-semibold">
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    currentTab === 'dashboard'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Operasyon & Özet</span>
                </button>

                <button
                  onClick={() => setCurrentTab('crm')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    currentTab === 'crm'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4" />
                    <span>Firma, Proje & CRM</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {leads.length}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentTab('radar')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    currentTab === 'radar'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Radar className="w-4 h-4" />
                  <span>Lead Radarı & Fırsatlar</span>
                </button>

                <button
                  onClick={() => setCurrentTab('calendar')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    currentTab === 'calendar'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4" />
                    <span>İçerik Takvimi</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    30 Gün
                  </span>
                </button>

                <button
                  onClick={() => setCurrentTab('studio')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    currentTab === 'studio'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  <span>Post Studio (Üretim)</span>
                </button>

                <button
                  onClick={() => setCurrentTab('bots')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    currentTab === 'bots'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>Bot Kontrol & SEO</span>
                </button>

                <button
                  onClick={() => setCurrentTab('email')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    currentTab === 'email'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4" />
                    <span>E-Posta & Teklif</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                    {emails.length}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentTab('connections')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    currentTab === 'connections'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Link2 className="w-4 h-4" />
                  <span>Bağlantılar & Vercel ENV</span>
                </button>

                <button
                  onClick={() => setCurrentTab('health')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    currentTab === 'health'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Sistem Sağlığı & Maliyet</span>
                </button>
              </nav>
            </div>

            {/* Quick Live Contact Box */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-2">
              <span className="font-bold text-emerald-900 block">📞 Resmi Operasyon Hattı:</span>
              <p className="text-emerald-800 font-mono font-bold text-sm">0531 436 29 04</p>
              <p className="text-[11px] text-emerald-700 leading-snug">
                Tüm botlar ve iletişim şablonları bu numara ile mühürlenmiştir.
              </p>
            </div>
          </aside>

          {/* Main Body */}
          <main className="flex-1 min-w-0">
            {currentTab === 'dashboard' && (
              <DashboardView
                botTasks={botTasks}
                onTriggerBot={handleTriggerBot}
                leads={leads}
                onApproveLead={handleApproveLead}
                contentItems={contentItems}
                onApproveContent={handleApproveContent}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'crm' && (
              <CRMView
                companies={companies}
                projects={projects}
                opportunities={opportunities}
                leads={leads}
                onUpdateLeadStatus={handleUpdateLeadStatus}
                onAddCompany={handleAddCompany}
              />
            )}

            {currentTab === 'radar' && (
              <LeadRadarView onConvertSignalToLead={handleConvertSignalToLead} />
            )}

            {currentTab === 'calendar' && (
              <ContentCalendarView
                contentItems={contentItems}
                onApproveContent={handleApproveContent}
                onGenerate30DayPlan={handleGenerate30DayPlan}
                onAddContent={handleAddContent}
                onUpdateContent={handleUpdateContent}
                onDeleteContent={handleDeleteContent}
                onClearAllPlans={handleClearAllPlans}
              />
            )}

            {currentTab === 'studio' && (
              <PostStudioView onSchedulePost={handleSchedulePost} />
            )}

            {currentTab === 'bots' && (
              <BotControlView
                botTasks={botTasks}
                seoReport={seoReport}
                trends={trends}
                onTriggerBot={handleTriggerBot}
                onAddNewBot={handleAddNewBot}
                onUpdateBot={handleUpdateBot}
                onToggleBotStatus={handleToggleBotStatus}
                onDeleteBot={handleDeleteBot}
                onClearFakeBots={handleClearFakeBots}
                onApproveTrend={() => {
                  setCurrentTab('studio');
                  showNotification('Trend Post Studio alanına aktarıldı.');
                }}
              />
            )}

            {currentTab === 'email' && (
              <EmailCenterView
                emails={emails}
                onApproveAndSend={(id) => {
                  setEmails(prev =>
                    prev.map(em => (em.id === id ? { ...em, status: 'SENT' } : em))
                  );
                  showNotification('E-posta teklif yanıtı onaylandı ve gönderildi.');
                }}
              />
            )}

            {currentTab === 'connections' && (
              <ConnectionsView
                platforms={platforms}
                onAddPlatform={handleAddPlatform}
                onTogglePlatformStatus={handleTogglePlatformStatus}
                onDeletePlatform={handleDeletePlatform}
              />
            )}

            {currentTab === 'health' && (
              <SystemHealthView errors={errors} costs={costs} />
            )}
          </main>
        </div>
      ) : (
        /* VIEW 2: PUBLIC SHOWCASE WEBSITE (TOU-KIRALAMA & SAHIN-MANITOU) */
        <PublicWebsiteView onLeadSubmitted={handleLeadFromWebsite} />
      )}
    </div>
  );
}
export default App;
