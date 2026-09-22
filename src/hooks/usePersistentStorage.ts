import { useState, useEffect } from 'react';

// Tip tanımları
export interface InternalTask {
  id: string;
  title: string;
  assignee: 'Operatör (Manitou)' | 'Kalfa / Şantiye Şefi' | 'Yönetici (Samet Bey)';
  deadline: string;
  status: 'bekliyor' | 'yapiliyor' | 'tamamlandi';
  priority: 'acil' | 'normal';
  createdAt: string;
}

export interface InternalLead {
  id: string;
  name: string;
  phone: string;
  serviceType: 'manitou' | 'kentsel_donusum';
  siteAddress: string;
  notes: string;
  status: 'yeni' | 'arandi' | 'teklif_verildi' | 'anlasildi' | 'reddedildi';
  // KVKK Açık Rıza Zorunluluğu
  kvkkConsentGiven: boolean;
  kvkkConsentDate: string; // ISO String
  createdAt: string;
}

export interface InternalParcelQuery {
  id: string;
  district: string;
  neighborhood: string;
  ada: string;
  parsel: string;
  landArea: number;
  officialZoningDocumentProvided: boolean; // Belediye İmar Durum Belgesi Varlığı
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
  PARCELS: 'embay_internal_parcels_v1',
  SOCIAL_DRAFTS: 'embay_internal_social_drafts_v1',
  OFFLINE_QUEUE: 'embay_supabase_sync_queue_v1',
  AUTH_SESSION: 'embay_auth_session_v1',
};

// Supabase REST Mock/Live Entegrasyonu
export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  isConfigured: boolean;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey)
  };
};

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
        },
        {
          id: 'task-2',
          title: 'Manitou 1840 Yağ, Filtre ve İSG Halat Periyodik Kontrolü',
          assignee: 'Operatör (Manitou)',
          deadline: 'Cuma 17:00',
          status: 'bekliyor',
          priority: 'normal',
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
      return stored ? JSON.parse(stored) : [
        {
          id: 'lead-1',
          name: 'Tozkoparan Blok Yöneticisi Mehmet Bey',
          phone: '0532 555 10 20',
          serviceType: 'kentsel_donusum',
          siteAddress: 'Tozkoparan Mah. Cevat Açıkalın Cad. No: 18 Güngören',
          notes: '12 daireli bina, C35 betonlu teklif sunumu istendi.',
          status: 'teklif_verildi',
          kvkkConsentGiven: true,
          kvkkConsentDate: '2026-09-20T10:00:00.000Z',
          createdAt: '2026-09-20T10:00:00.000Z'
        }
      ];
    } catch {
      return [];
    }
  });

  const [parcels, setParcels] = useState<InternalParcelQuery[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PARCELS);
      return stored ? JSON.parse(stored) : [
        {
          id: 'parcel-1',
          district: 'Güngören',
          neighborhood: 'Tozkoparan Mah.',
          ada: '1240',
          parsel: '8',
          landArea: 450,
          officialZoningDocumentProvided: true,
          officialKaks: 2.20,
          officialTaks: 0.40,
          maxFloors: 5,
          notes: 'Belediyeden şifahi alınan kentsel dönüşüm emsali. Resmi durum belgesi bekleniyor.',
          contactName: 'Mehmet Bey',
          contactPhone: '0532 555 10 20',
          kvkkConsentGiven: true,
          kvkkConsentDate: '2026-09-20T10:00:00.000Z',
          createdAt: '2026-09-20T10:00:00.000Z'
        }
      ];
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

  // LocalStorage Senkronizasyonu (Çevrimdışı Önbellek)
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

  // KVKK Uyumlu Fonksiyonlar: Ekleme (Açık Rıza Şart), Silme ve Dışa Aktarma (JSON)
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

  const exportAllDataKvkk = () => {
    const exportPackage = {
      exportedAt: new Date().toISOString(),
      institution: 'Embay Yapı & Şahin Manitou Kiralama',
      dataSubject: 'İç Yönetim Kayıtları (Görevler, KVKK Rızalı Leadler ve Parsel Ön İncelemeleri)',
      leads,
      tasks,
      parcels
    };

    const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `embay_veri_disa_aktarma_${new Date().toISOString().slice(0, 10)}.json`;
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

  // Sosyal Medya Taslak Akışı (Taslak -> Onay -> Zamanlama)
  const addSocialDraft = (platform: SocialDraftPost['platform'], contentType: SocialDraftPost['contentType'], caption: string, mediaNote: string) => {
    const newDraft: SocialDraftPost = {
      id: 'draft-' + Date.now(),
      platform,
      contentType,
      caption,
      mediaNote,
      status: 'taslak',
      createdAt: new Date().toISOString()
    };
    setSocialDrafts(prev => [newDraft, ...prev]);
    return newDraft;
  };

  const approveSocialDraft = (draftId: string) => {
    setSocialDrafts(prev => prev.map(d => d.id === draftId ? { ...d, status: 'yonetici_onayladi' } : d));
  };

  const scheduleSocialDraft = (draftId: string, scheduledFor: string) => {
    setSocialDrafts(prev => prev.map(d => d.id === draftId ? { ...d, status: 'zamanlandi', scheduledFor } : d));
  };

  const deleteSocialDraft = (draftId: string) => {
    setSocialDrafts(prev => prev.filter(d => d.id !== draftId));
  };

  return {
    tasks,
    leads,
    parcels,
    socialDrafts,
    addTask,
    toggleTaskStatus,
    deleteTask,
    addLeadWithConsent,
    deleteLeadKvkk,
    saveParcelQuery,
    deleteParcelQuery,
    exportAllDataKvkk,
    addSocialDraft,
    approveSocialDraft,
    scheduleSocialDraft,
    deleteSocialDraft
  };
}
