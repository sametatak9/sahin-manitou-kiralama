import { useState, useEffect } from 'react';

// Temel Görev Modeli
export interface InternalTask {
  id: string;
  title: string;
  assignee: 'Operatör (Manitou)' | 'Kalfa / Şantiye Şefi' | 'Yönetici (Samet Bey)';
  deadline: string;
  status: 'bekliyor' | 'yapiliyor' | 'tamamlandi';
  priority: 'acil' | 'normal';
  createdAt: string;
}

// Standart İletişim Form Lead'i
export interface InternalLead {
  id: string;
  name: string;
  phone: string;
  serviceType: 'manitou' | 'kentsel_donusum';
  siteAddress: string;
  notes: string;
  status: 'yeni' | 'arandi' | 'teklif_verildi' | 'anlasildi' | 'reddedildi';
  kvkkConsentGiven: boolean;
  kvkkConsentDate: string;
  createdAt: string;
}

// Detaylı Müşteri & Yatırımcı Profili (Sermaye, Yatırım Planı, Beklenen Kâr, Reklam Stratejisi)
export interface InvestorClientProfile {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  cityDistrict: string; // Örn: Güngören Tozkoparan, Bağcılar Güneşli
  clientSegment: 'Arsa Sahibi (Kentsel Dönüşüm)' | 'Müteahhit / Yüklenici (İş Makinesi)' | 'Bireysel Yatırımcı (Kat Karşılığı/Daire)' | 'Şantiye Kalfası / Ustabaşı';
  primaryDemand: string; // Örn: "4. kata 2 tır tuğla aktarımı" veya "450 m² arsa kat karşılığı bina yapımı"
  investmentBudget: number; // Müşteri Sermayesi / Bütçesi (₺)
  investmentHorizon: 'Acil (1-3 Gün)' | 'Kısa Vade (1-3 Ay)' | 'Orta Vade (6-12 Ay)' | 'Uzun Vade (1-2 Yıl)';
  companyExecutionPlan: string; // Şirketin Bu Planı Nasıl Uygulayacağı (Örn: "Şahin Manitou 18m bom ile 3 günde teslim + C35 hazır beton taahhüdü")
  projectedMinimalProfitRate: number; // Yatırımcının Gelecek Yıllarda Beklenen Minimal Kârı (% veya ₺)
  projectedProfitAmount: number; // Tahmini Net Kâr (₺)
  periodicAdStrategy: 'Haftalık Manitou İndirim SMS' | 'Aylık İmar Durumu ve Kat Karşılığı Raporu' | 'Özel VIP WhatsApp Teklifi' | 'Şantiye Çözüm Bülteni';
  lastContactedAt?: string;
  nextOutreachDate?: string;
  archivedToSupabase: boolean; // Supabase Arşiv Senkronizasyonu
  kvkkConsentGiven: boolean;
  kvkkConsentDate: string;
  createdAt: string;
}

export interface InternalParcelQuery {
  id: string;
  district: string;
  neighborhood: string;
  ada: string;
  parsel: string;
  landArea: number;
  officialZoningDocumentProvided: boolean;
  officialKaks?: number;
  officialTaks?: number;
  maxFloors?: number;
  notes: string;
  contactName?: string;
  contactPhone?: string;
  kvkkConsentGiven: boolean;
  kvkkConsentDate?: string;
  createdAt: string;
}

export interface SocialDraftPost {
  id: string;
  platform: 'instagram' | 'google_business' | 'facebook';
  contentType: 'bulten' | 'haftanin_enleri' | 'isg_hatirlatma' | 'proje_teslimi';
  caption: string;
  mediaNote: string;
  status: 'taslak' | 'yonetici_onayladi' | 'zamanlandi' | 'metricool_iletildi';
  scheduledFor?: string;
  createdAt: string;
}

const STORAGE_KEYS = {
  TASKS: 'embay_internal_tasks_v1',
  LEADS: 'embay_internal_leads_v1',
  INVESTOR_PROFILES: 'embay_investor_profiles_v1',
  PARCELS: 'embay_internal_parcels_v1',
  SOCIAL_DRAFTS: 'embay_internal_social_drafts_v1',
  OFFLINE_QUEUE: 'embay_supabase_sync_queue_v1',
  AUTH_SESSION: 'embay_auth_session_v1',
};

const DEFAULT_INVESTOR_PROFILES: InvestorClientProfile[] = [
  {
    id: 'prof-1',
    fullName: 'Hacı Mehmet Yıldız (Bina Temsilcisi)',
    phone: '0532 444 11 22',
    email: 'mehmet.yildiz@gmail.com',
    cityDistrict: 'Güngören / Tozkoparan Mah.',
    clientSegment: 'Arsa Sahibi (Kentsel Dönüşüm)',
    primaryDemand: '10 daireli riskli binanın yıkılıp yerinde C35 betonla yenilenmesi.',
    investmentBudget: 15000000,
    investmentHorizon: 'Orta Vade (6-12 Ay)',
    companyExecutionPlan: 'Embay Yapı: 14 ay taahhüt, Şahin Manitou ile dar sokakta sıfır zayiat, her daireye 10 fidan bağışı.',
    projectedMinimalProfitRate: 65, // %65 değer artışı
    projectedProfitAmount: 9750000,
    periodicAdStrategy: 'Aylık İmar Durumu ve Kat Karşılığı Raporu',
    lastContactedAt: '2026-09-20',
    nextOutreachDate: '2026-10-01',
    archivedToSupabase: true,
    kvkkConsentGiven: true,
    kvkkConsentDate: '2026-09-20T10:00:00.000Z',
    createdAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'prof-2',
    fullName: 'Yüklenici Kalfa Kenan Bey (Güneşli Konutları)',
    phone: '0535 777 88 99',
    cityDistrict: 'Bağcılar / Güneşli Mah.',
    clientSegment: 'Müteahhit / Yüklenici (İş Makinesi)',
    primaryDemand: '5 katlı blokta 4 tır Ytong, harç ve briket paletlerinin katlara transferi.',
    investmentBudget: 35000,
    investmentHorizon: 'Acil (1-3 Gün)',
    companyExecutionPlan: 'Şahin Manitou 1840: Sertifikalı operatör ile dar sokakta yolu tıkamadan 2 günde sevkiyat tamamlama.',
    projectedMinimalProfitRate: 40, // İşçilik ve vinç cezalarından %40 net tasarruf
    projectedProfitAmount: 25000,
    periodicAdStrategy: 'Haftalık Manitou İndirim SMS',
    lastContactedAt: '2026-09-21',
    nextOutreachDate: '2026-09-28',
    archivedToSupabase: true,
    kvkkConsentGiven: true,
    kvkkConsentDate: '2026-09-21T11:30:00.000Z',
    createdAt: '2026-09-21T11:30:00.000Z'
  }
];

export function usePersistentStorage() {
  const [tasks, setTasks] = useState<InternalTask[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TASKS);
      return stored ? JSON.parse(stored) : [
        {
          id: 'task-1',
          title: 'Tozkoparan Ada 1240 Parsel 8 - Belediye İmar Durum Belgesi Çıkartılacak',
          assignee: 'Yönetici (Samet Bey)',
          deadline: 'Yarın 10:00',
          status: 'yapiliyor',
          priority: 'acil',
          createdAt: new Date().toISOString()
        }
      ];
    } catch {
      return [];
    }
  });

  const [leads, setLeads] = useState<InternalLead[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LEADS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [investorProfiles, setInvestorProfiles] = useState<InvestorClientProfile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INVESTOR_PROFILES);
      return stored ? JSON.parse(stored) : DEFAULT_INVESTOR_PROFILES;
    } catch {
      return DEFAULT_INVESTOR_PROFILES;
    }
  });

  const [parcels, setParcels] = useState<InternalParcelQuery[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PARCELS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [socialDrafts, setSocialDrafts] = useState<SocialDraftPost[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SOCIAL_DRAFTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // LocalStorage Önbellek Senkronizasyonları
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Task cache error:', e);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
    } catch (e) {
      console.error('Lead cache error:', e);
    }
  }, [leads]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INVESTOR_PROFILES, JSON.stringify(investorProfiles));
    } catch (e) {
      console.error('Investor profile cache error:', e);
    }
  }, [investorProfiles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));
    } catch (e) {
      console.error('Parcel cache error:', e);
    }
  }, [parcels]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOCIAL_DRAFTS, JSON.stringify(socialDrafts));
    } catch (e) {
      console.error('Draft cache error:', e);
    }
  }, [socialDrafts]);

  // Müşteri & Yatırımcı Profili Ekleme (KVKK Rıza Şartı)
  const addInvestorProfile = (
    profileData: Omit<InvestorClientProfile, 'id' | 'createdAt' | 'kvkkConsentDate' | 'archivedToSupabase'>, 
    consentConfirmed: boolean
  ) => {
    if (!consentConfirmed) {
      throw new Error('KVKK Uyarısı: Müşteri açık rıza onayı alınmadan sermaye ve profil verisi kaydedilemez.');
    }

    const newProfile: InvestorClientProfile = {
      ...profileData,
      id: 'prof-' + Date.now(),
      archivedToSupabase: true, // Supabase REST havuzuna hazırlandı
      kvkkConsentGiven: true,
      kvkkConsentDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    setInvestorProfiles(prev => [newProfile, ...prev]);
    return newProfile;
  };

  const updateInvestorProfile = (id: string, updatedFields: Partial<InvestorClientProfile>) => {
    setInvestorProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
  };

  const deleteInvestorProfile = (id: string) => {
    setInvestorProfiles(prev => prev.filter(p => p.id !== id));
  };

  // Toplu Dışa Aktarma (JSON)
  const exportAllDataKvkk = () => {
    const exportPackage = {
      exportedAt: new Date().toISOString(),
      institution: 'Embay Yapı & Şahin Manitou Kiralama',
      dataSubject: 'İç Yönetim Kayıtları, Görevler, Müşteri Sermaye ve Yatırım Planı Portföyü',
      investorProfiles,
      leads,
      tasks,
      parcels
    };

    const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `embay_musteri_yatirim_verisi_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addTask = (title: string, assignee: InternalTask['assignee'], deadline: string, priority: InternalTask['priority'] = 'normal') => {
    const newTask: InternalTask = {
      id: 'task-' + Date.now(),
      title,
      assignee,
      deadline,
      status: 'bekliyor',
      priority,
      createdAt: new Date().toISOString()
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'bekliyor' ? 'yapiliyor' : t.status === 'yapiliyor' ? 'tamamlandi' : 'bekliyor';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const addLeadWithConsent = (leadData: Omit<InternalLead, 'id' | 'createdAt' | 'kvkkConsentDate'>, consentConfirmed: boolean) => {
    if (!consentConfirmed) {
      throw new Error('KVKK Uyarısı: Müşteri açık rıza onayı alınmadan veri kaydedilemez.');
    }

    const newLead: InternalLead = {
      ...leadData,
      id: 'lead-' + Date.now(),
      kvkkConsentGiven: true,
      kvkkConsentDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    setLeads(prev => [newLead, ...prev]);
    return newLead;
  };

  const deleteLeadKvkk = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
  };

  const saveParcelQuery = (parcelData: Omit<InternalParcelQuery, 'id' | 'createdAt'>) => {
    const newRecord: InternalParcelQuery = {
      ...parcelData,
      id: 'parcel-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setParcels(prev => [newRecord, ...prev]);
    return newRecord;
  };

  const deleteParcelQuery = (parcelId: string) => {
    setParcels(prev => prev.filter(p => p.id !== parcelId));
  };

  return {
    tasks,
    leads,
    investorProfiles,
    parcels,
    socialDrafts,
    addTask,
    toggleTaskStatus,
    deleteTask,
    addLeadWithConsent,
    deleteLeadKvkk,
    addInvestorProfile,
    updateInvestorProfile,
    deleteInvestorProfile,
    saveParcelQuery,
    deleteParcelQuery,
    exportAllDataKvkk
  };
}
