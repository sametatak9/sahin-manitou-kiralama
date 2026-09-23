import {
  Company,
  Project,
  Opportunity,
  Lead,
  PlatformConnection,
  BotTask,
  ContentItem,
  SEORun,
  TrendItem,
  EmailMessage,
  SystemErrorLog,
  AICostLog
} from '../types';

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-1',
    name: 'Embay Yapı & Gayrimenkul Taahhüt',
    city: 'İstanbul',
    district: 'Güngören / Tozkoparan',
    sector: 'Kentsel Dönüşüm & Konut Taahhüt',
    phone: '0531 436 29 04',
    email: 'info@embayyapi.com',
    address: 'Tozkoparan Mah. Güngören / İstanbul',
    createdAt: '2026-09-20',
    enrichmentHistory: [
      {
        date: '2026-09-20',
        source: 'Sistem Kurulumu',
        addedFields: ['name', 'sector', 'phone', 'city', 'district']
      }
    ]
  },
  {
    id: 'comp-2',
    name: 'Marmara Çelik & Endüstriyel Montaj Ltd.',
    city: 'İstanbul',
    district: 'Hadımköy Sanayi Bölgesi',
    sector: 'Çelik Konstrüksiyon & Lojistik Depo',
    phone: '0533 412 88 90',
    email: 'santiye@marmaracelik.com.tr',
    address: 'Hadımköy Sanayi Bölgesi 4. Cadde No: 18 Arnavutköy',
    createdAt: '2026-09-21',
    enrichmentHistory: [
      {
        date: '2026-09-21',
        source: 'Şantiye Keşif Talebi',
        addedFields: ['phone', 'email', 'address']
      }
    ]
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    companyId: 'comp-1',
    companyName: 'Embay Yapı & Gayrimenkul Taahhüt',
    title: 'Güngören Tozkoparan Yerinde Kentsel Dönüşüm Projesi',
    location: 'Tozkoparan Mah. Güngören / İstanbul',
    projectType: 'KENTSEL_DONUSUM',
    estimatedDurationMonths: 14,
    stage: 'PLANLAMA',
    notes: '24 bağımsız bölüm, radye temel ve C35 hazır beton kullanımı planlandı.'
  },
  {
    id: 'proj-2',
    companyId: 'comp-2',
    companyName: 'Marmara Çelik & Endüstriyel Montaj Ltd.',
    title: 'Hadımköy 12.000m² Lojistik Depo Çatı & Cephe Paneli Montajı',
    location: 'Hadımköy Sanayi / İstanbul',
    projectType: 'LOJISTIK_DEPO',
    estimatedDurationMonths: 3,
    stage: 'KABA_YAPI',
    notes: '18 metre yükseklik için MT-X 1840 teleskopik yükleyici sepetli montaj yapılacak.'
  }
];

export const INITIAL_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp-1',
    companyId: 'comp-2',
    projectId: 'proj-2',
    companyName: 'Marmara Çelik & Endüstriyel Montaj Ltd.',
    projectTitle: 'Hadımköy 12.000m² Lojistik Depo Çatı ve Cephe Panel Montajı',
    machineRequirement: 'MANITOU_18M',
    durationDays: 45,
    estimatedValueTRY: 380000,
    status: 'OFFER_PREPARED',
    assignedOperator: true,
    createdAt: '2026-09-20',
    sourceEvidence: {
      url: 'https://facebook.com/groups/is.makineleri.turkiye/permalink/918237192',
      domain: 'facebook.com',
      sourceType: 'FACEBOOK_GROUP',
      title: 'Hadımköy şantiyemize 18m sepetli/çatallı Manitou arıyoruz',
      discoveredAt: '2026-09-20 14:15',
      evidenceSnippet: 'Hadımköy lojistik depo projemizde 1.5 ay çalışacak operatörlü 18 metre Manitou teleskopik vinç aranıyor.',
      confidenceScore: 94,
      botName: 'Facebook Group Lead Radar Bot',
      query: '18m manitou kiralık şantiye istanbul'
    }
  },
  {
    id: 'opp-2',
    companyId: 'comp-1',
    projectId: 'proj-1',
    companyName: 'Embay Yapı & Gayrimenkul Taahhüt',
    projectTitle: 'Güngören Tozkoparan 8 Bloklu Kentsel Yenileme',
    machineRequirement: 'YAPIM_TAAHHUT',
    durationDays: 360,
    estimatedValueTRY: 12500000,
    status: 'DISCOVERY',
    assignedOperator: false,
    createdAt: '2026-09-22',
    sourceEvidence: {
      url: 'https://sahin-manitou-kiralama.vercel.app/#kesif-formu',
      domain: 'sahin-manitou-kiralama.vercel.app',
      sourceType: 'INBOUND_FORM',
      title: 'Web Üzerinden Deprem & Kentsel Dönüşüm Keşif Başvurusu',
      discoveredAt: '2026-09-22 21:15',
      evidenceSnippet: 'Tozkoparan Mahallesinde riskli binamız için kat karşılığı Embay Yapı ile görüşmek istiyoruz.',
      confidenceScore: 98,
      botName: 'Inbound Webhook Listener',
      query: 'Direct Form Submission'
    }
  }
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    name: 'Engin Yılmaz (Şantiye Şefi)',
    companyName: 'Marmara Çelik Ltd.',
    phone: '0533 412 88 90',
    email: 'santiye@marmaracelik.com.tr',
    status: 'OFFER',
    opportunitySummary: 'Hadımköy Lojistik Depo Çatı Paneli Montajı - 18 Metre Manitou MT-X 1840 Kiralama',
    requiresHumanApproval: false,
    sourceEvidence: {
      url: 'https://facebook.com/groups/is.makineleri.turkiye/permalink/918237192',
      domain: 'facebook.com',
      sourceType: 'FACEBOOK_GROUP',
      title: 'Hadımköy Çatı Montajı Manitou İhtiyacı',
      discoveredAt: '2026-09-20 14:15',
      evidenceSnippet: 'Hadımköy şantiyemize 45 gün çalışacak operatörlü 18 metre Manitou teleskopik vinç aranıyor.',
      confidenceScore: 94,
      botName: 'Facebook Group Lead Radar Bot',
      query: '18m manitou kiralık şantiye istanbul'
    },
    history: [
      {
        status: 'DISCOVERED',
        changedAt: '2026-09-20 14:15',
        note: 'Piyasa istihbarat radarı sinyali doğruladı.'
      },
      {
        status: 'QUALIFIED',
        changedAt: '2026-09-20 15:00',
        note: 'Şantiye lokasyonu Hadımköy olarak teyit edildi.'
      },
      {
        status: 'OFFER',
        changedAt: '2026-09-21 11:00',
        note: '380.000 TL bedelli 45 günlük operatörlü resmi teklif mektubu iletildi.'
      }
    ]
  },
  {
    id: 'lead-2',
    name: 'Mehmet Salih Kaya',
    companyName: 'Tozkoparan Kat Malikleri Temsilcisi',
    phone: '0532 918 22 14',
    status: 'CONTACTABLE',
    opportunitySummary: 'Tozkoparan 5 Katlı Bina Kentsel Dönüşüm & Statik Keşif',
    requiresHumanApproval: true,
    approvalAction: 'CREATE_OFFER',
    sourceEvidence: {
      url: 'https://sahin-manitou-kiralama.vercel.app/',
      domain: 'sahin-manitou-kiralama.vercel.app',
      sourceType: 'INBOUND_FORM',
      title: 'Web Keşif Formu Girişi',
      discoveredAt: '2026-09-22 19:40',
      evidenceSnippet: 'Bina 1989 yapımı, karot örneği ve zemin etüdü için yerinde inceleme talep ediyoruz.',
      confidenceScore: 99,
      botName: 'Web Inbound Listener',
      query: 'Organik Web Ziyaretçisi'
    },
    history: [
      {
        status: 'DISCOVERED',
        changedAt: '2026-09-22 19:40',
        note: 'Canlı vitrin sitesi formundan sisteme düştü.'
      },
      {
        status: 'QUALIFIED',
        changedAt: '2026-09-22 20:10',
        note: 'Lokasyon Güngören merkezde ve mülk sahiplerinin onayı hazır.'
      }
    ]
  }
];

export const INITIAL_PLATFORMS: PlatformConnection[] = [
  {
    platform: 'INSTAGRAM',
    accountName: '@sahinmanitou_kiralama',
    status: 'CONNECTED',
    lastSyncAt: 'Bugün 08:30',
    capabilities: {
      connect: true,
      publish: true,
      readMetrics: true,
      readComments: true,
      readMessages: true
    },
    metrics: {
      followers: 2450,
      reach: 18200,
      engagementRate: '%4.8'
    }
  },
  {
    platform: 'FACEBOOK',
    accountName: 'Şahin Manitou & Embay Yapı',
    status: 'CONNECTED',
    lastSyncAt: 'Bugün 08:30',
    capabilities: {
      connect: true,
      publish: true,
      readMetrics: true,
      readComments: true,
      readMessages: true
    },
    metrics: {
      followers: 3100,
      reach: 22400,
      engagementRate: '%3.9'
    }
  },
  {
    platform: 'GOOGLE_BUSINESS',
    accountName: 'Embay Yapı & Şahin Manitou (Güngören)',
    status: 'CONNECTED',
    lastSyncAt: 'Bugün 09:00',
    capabilities: {
      connect: true,
      publish: true,
      readMetrics: true,
      readComments: true,
      readMessages: true
    },
    metrics: {
      reach: 5400,
      engagementRate: '%8.2'
    }
  },
  {
    platform: 'WHATSAPP_BUSINESS',
    accountName: '0531 436 29 04 (Samet Bey - Operasyon)',
    status: 'CONNECTED',
    lastSyncAt: 'Canlı',
    capabilities: {
      connect: true,
      publish: true,
      readMetrics: false,
      readComments: true,
      readMessages: true
    }
  }
];

export const INITIAL_BOT_TASKS: BotTask[] = [
  {
    id: 'b-1',
    name: 'SEO Bot → Tozkoparan & Manitou',
    category: 'SEO',
    status: 'TAMAMLANDI',
    schedule: 'Her gün 06:00',
    lastRunAt: 'Bugün 06:04',
    duration: '0.9 sn',
    report: 'H1, Meta Description, Schema.org ve sitemap doğrulandı. 3 yeni anahtar kelime fırsatı çıkarıldı.',
    findingsCount: 3,
    model: 'Gemini 2.5 Pro / Built-in SEO Inspector'
  },
  {
    id: 'b-2',
    name: 'Lead Listener → Inbound Webhook',
    category: 'LEAD_RADAR',
    status: 'TAMAMLANDI',
    schedule: 'Gerçek zamanlı (Event-driven)',
    lastRunAt: 'Bugün 07:15',
    duration: '1.2 sn',
    report: 'Web form ve WhatsApp senkronizasyonu aktif. Gelen keşif talepleri doğrudan CRM havuzuna aktarılıyor.',
    findingsCount: 1,
    model: 'Edge Webhook Engine'
  },
  {
    id: 'b-3',
    name: 'Facebook Group & Forum Lead Radar',
    category: 'LEAD_RADAR',
    status: 'TAMAMLANDI',
    schedule: 'Günde 3 kez (08:00, 14:00, 20:00)',
    lastRunAt: 'Bugün 08:00',
    duration: '2.4 sn',
    report: 'Hadımköy ve sanayi şantiyelerinden 1 adet 18m teleskopik vinç talebi doğrulandı ve kanıtlandı.',
    findingsCount: 1,
    model: 'Gemini 2.5 Flash Parser'
  },
  {
    id: 'b-4',
    name: '30 Günlük AI İçerik Motoru',
    category: 'CONTENT',
    status: 'TAMAMLANDI',
    schedule: 'İsteğe bağlı / Aylık',
    lastRunAt: 'Dün 18:00',
    duration: '1.4 sn',
    report: 'İçerik takviminde listeler hazır. Samet Bey onayı ile WhatsApp ve sosyal medyaya sevk edilebiliyor.',
    findingsCount: 3,
    model: 'Gemini 2.5 Flash'
  },
  {
    id: 'b-5',
    name: 'Fiyat & Teklif Botu (CRM)',
    category: 'CRM',
    status: 'TAMAMLANDI',
    schedule: 'Tetikleme bazlı',
    lastRunAt: 'Dün 17:30',
    duration: '0.8 sn',
    report: 'Marmara Çelik Hadımköy projesi için antetli Manitou kiralama sözleşmesi hazırlandı.',
    findingsCount: 1,
    model: 'PDF Engine & CRM Calculator'
  },
  {
    id: 'b-6',
    name: 'Saha & Filo Bakım Takipçisi',
    category: 'FLEET',
    status: 'TAMAMLANDI',
    schedule: 'Haftalık',
    lastRunAt: 'Bugün 08:30',
    duration: '1.8 sn',
    report: 'MT-X 1840 (Makine 02) 250 saatlik periyodik filtre ve hidrolik bakım uyarısı takip listesinde.',
    findingsCount: 1,
    model: 'Fleet Telemetry Worker'
  }
];

// Clean initial content items, structured by clear campaign lists
export const INITIAL_CONTENT_ITEMS: ContentItem[] = [
  {
    id: 'c-1',
    platform: 'INSTAGRAM',
    account: '@sahinmanitou_kiralama',
    plannedAt: '2026-09-24 10:30',
    timezone: 'Europe/Istanbul',
    title: 'Ankomak Fuarı & Şantiye Gücü: 18 Metre Manitou MT-X 1840',
    caption: 'Hadımköy ve Trakya şantiyelerinde 18 metre bom uzanımı ve 4.000 kg taşıma kapasitesiyle çatı ve cephe panellerinizi güvenle monte ediyoruz.',
    hashtags: ['#fuar', '#manitoukiralama', '#ankomak', '#şantiye', '#embayyapi'],
    cta: 'Şantiyenize hızlı sevk ve fiyat teklifi için: 0531 436 29 04',
    mediaType: 'IMAGE',
    bot: 'İnsan Planlaması (Samet Bey)',
    campaign: 'Fuar Paylaşımları',
    campaignTitle: 'Fuar Paylaşımları',
    alarmSet: true,
    alarmNote: 'Fuar standı görseli ile paylaşılacak',
    recipientPhone: '0531 436 29 04',
    approvalStatus: 'PENDING_APPROVAL',
    publishStatus: 'SCHEDULED'
  },
  {
    id: 'c-2',
    platform: 'GOOGLE_BUSINESS',
    account: 'Embay Yapı & Şahin Manitou (Güngören)',
    plannedAt: '2026-09-25 14:00',
    timezone: 'Europe/Istanbul',
    title: 'Güngören Tozkoparan Yerinde Dönüşüm: Depreme Güvenli Radye Temel',
    caption: 'Embay Yapı güvencesiyle Tozkoparan kentsel dönüşüm alanında C35 hazır beton ve radye temel ile sağlam yarınlar inşa ediyoruz.',
    hashtags: ['#kentseldönüşüm', '#tozkoparan', '#güngören', '#depremgüvenliği'],
    cta: 'Ücretsiz yerinde bina zemin keşfi: 0531 436 29 04',
    mediaType: 'IMAGE',
    bot: 'İnsan Planlaması (Samet Bey)',
    campaign: 'Tozkoparan Kentsel Dönüşüm',
    campaignTitle: 'Tozkoparan Kentsel Dönüşüm',
    alarmSet: true,
    alarmNote: 'Kat malikleri toplantısı öncesi paylaşılacak',
    recipientPhone: '0531 436 29 04',
    approvalStatus: 'APPROVED',
    publishStatus: 'SCHEDULED'
  }
];

export const INITIAL_SEO_REPORT: SEORun = {
  id: 'seo-1',
  url: 'https://sahin-manitou-kiralama.vercel.app/',
  analyzedAt: 'Bugün 06:04',
  h1: 'Deprem Yönetmeliğine Uygun Modern Konut İnşaatı & Kentsel Dönüşüm',
  metaTitle: 'Embay Yapı & Şahin Manitou | Güngören Kentsel Dönüşüm & Manitou Kiralama',
  metaDescription: 'Güngören Tozkoparan depreme dayanıklı kentsel dönüşüm projeleri ve İstanbul geneli 14m-18m Manitou teleskopik yükleyici kiralama.',
  score: 98,
  schemaCheck: true,
  sitemapFound: true,
  robotsTxtFound: true,
  recommendations: [
    'Hadımköy çatı panel montajı üzerine özel bir alt sayfa başlığı güçlendirilebilir.',
    'Google İşletme profilindeki şantiye çalışma fotoğrafları haftalık güncellenmeli.'
  ],
  opportunities: [
    'Hadımköy kiralık manitou (Aylık 1.400 aranma hacmi)',
    'Güngören Tozkoparan kentsel dönüşüm müteahhit (Aylık 2.200 aranma)',
    '18 metre telehandler kiralama fiyatları (Aylık 850 aranma)'
  ]
};

export const INITIAL_TRENDS: TrendItem[] = [
  {
    id: 'tr-1',
    topic: 'İstanbul’da Kentsel Dönüşüm Kira Yardımı ve Noter Sözleşmeleri',
    relevanceScore: 95,
    brandFit: 'YÜKSEK',
    riskScore: 'GÜVENLİ',
    suggestedAngle: 'Tozkoparan halkına kira desteği ve kat mülkiyeti hakları konusunda rehber içerik.',
    targetPlatform: 'GOOGLE_BUSINESS',
    status: 'NEW'
  },
  {
    id: 'tr-2',
    topic: 'Lojistik Depo Çatılarında Güneş Enerjisi (GES) ve Manitou İhtiyacı',
    relevanceScore: 92,
    brandFit: 'YÜKSEK',
    riskScore: 'GÜVENLİ',
    suggestedAngle: 'Güneş panellerinin çatıya taşınmasında telehandler vinç kullanımının iş güvenliği faydaları.',
    targetPlatform: 'INSTAGRAM',
    status: 'NEW'
  }
];

export const INITIAL_EMAILS: EmailMessage[] = [
  {
    id: 'em-1',
    from: 'santiye@marmaracelik.com.tr',
    subject: 'Hadımköy Depo Projesi Manitou Kiralama Teklif Talebi',
    receivedAt: 'Bugün 09:15',
    category: 'PROPOSAL_REQUEST',
    summary: 'Hadımköy şantiyesinde 45 günlük çalışma için MT-X 1840 fiyat teklifi ve operatör sertifikası isteniyor.',
    matchedCompany: 'Marmara Çelik & Endüstriyel Montaj Ltd.',
    suggestedAction: 'Kaşeli ve resmi teklif PDF mektubu iletin.',
    draftReply: 'Sayın Yetkili, Hadımköy şantiyeniz için 45 günlük MT-X 1840 teklifimiz ekte yer almaktadır. Tel: 0531 436 29 04',
    status: 'NEEDS_APPROVAL'
  }
];

export const INITIAL_SYSTEM_ERRORS: SystemErrorLog[] = [
  {
    id: 'err-1',
    service: 'Vercel Deployment Webhook',
    bot: 'System Monitor',
    timestamp: 'Dün 23:45',
    error: 'WebSocket bağlantı denemesi (Dev ortamı; Production etkilenmedi)',
    retryCount: 0,
    status: 'RESOLVED'
  }
];

export const INITIAL_AI_COSTS: AICostLog[] = [
  {
    id: 'cost-1',
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
    task: 'Pazar İstihbaratı ve Lead Sinyal Ayrıştırma',
    tokens: 4120,
    estimatedCostUSD: 0.0012,
    bot: 'Lead Radar',
    timestamp: 'Bugün 08:00'
  },
  {
    id: 'cost-2',
    provider: 'GEMINI',
    model: 'gemini-2.5-pro',
    task: 'SEO Anahtar Kelime & Rekabet Denetimi',
    tokens: 8200,
    estimatedCostUSD: 0.0048,
    bot: 'SEO Inspector',
    timestamp: 'Bugün 06:04'
  }
];
