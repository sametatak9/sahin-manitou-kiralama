import {
  Company,
  Project,
  Opportunity,
  Lead,
  PlatformConnection,
  ContentItem,
  BotTask,
  SEORun,
  TrendItem,
  EmailMessage,
  SystemErrorLog,
  AICostLog
} from '../types';

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-1',
    name: 'Tozkoparan Konut Yapı Kooperatifi',
    city: 'İstanbul',
    district: 'Güngören',
    sector: 'Konut İnşaatı / Kentsel Dönüşüm',
    phone: '0212 555 12 34',
    email: 'info@tozkoparanyapi.org',
    address: 'Tozkoparan Mah. Park Cad. No: 14 Güngören / İstanbul',
    createdAt: '2026-08-10',
    enrichmentHistory: [
      {
        date: '2026-08-10',
        source: 'Google Business & İhale Bülteni',
        addedFields: ['phone', 'district', 'address']
      },
      {
        date: '2026-09-18',
        source: 'Saha Keşif & Webhook',
        addedFields: ['sector', 'taxNumber']
      }
    ]
  },
  {
    id: 'comp-2',
    name: 'Marmara Çelik & Endüstriyel Montaj Ltd.',
    city: 'İstanbul',
    district: 'Esenyurt / Kıraç',
    sector: 'Çelik Konstrüksiyon & Fabrika',
    phone: '0212 886 44 20',
    email: 'operasyon@marmaracelik.com.tr',
    address: 'Kıraç Sanayi Bölgesi 4. Sok. No: 8 Esenyurt',
    createdAt: '2026-09-02',
    enrichmentHistory: [
      {
        date: '2026-09-02',
        source: 'Facebook İş Makineleri Grubu',
        addedFields: ['phone', 'name']
      }
    ]
  },
  {
    id: 'comp-3',
    name: 'Atlas Prefabrik & Lojistik Yapı',
    city: 'Tekirdağ',
    district: 'Çorlu',
    sector: 'Depo & Lojistik Tesis',
    phone: '0282 650 90 80',
    email: 'santiye@atlasprefabrik.com',
    createdAt: '2026-09-14',
    enrichmentHistory: [
      {
        date: '2026-09-14',
        source: 'İnşaat Dünyası Haber',
        addedFields: ['phone', 'city']
      }
    ]
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    companyId: 'comp-1',
    companyName: 'Tozkoparan Konut Yapı Kooperatifi',
    title: 'Güngören Tozkoparan 8 Bloklu Kentsel Yenileme',
    location: 'Güngören / İstanbul',
    projectType: 'KENTSEL_DONUSUM',
    estimatedDurationMonths: 18,
    stage: 'KABA_YAPI',
    notes: 'Deprem yönetmeliğine uygun C35 radye temel tamamlandı, kat kolonları dikiliyor.'
  },
  {
    id: 'proj-2',
    companyId: 'comp-2',
    companyName: 'Marmara Çelik & Endüstriyel Montaj Ltd.',
    title: 'Hadımköy 12.000m² Lojistik Depo Çatı ve Cephe Panel Montajı',
    location: 'Arnavutköy / İstanbul',
    projectType: 'CEPHE_MONTAJ',
    estimatedDurationMonths: 4,
    stage: 'INCE_YAPI',
    notes: 'Sandviç panel montajı için 18 metre bom uzanımlı teleskopik yükleyici ihtiyacı var.'
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
      evidenceSnippet: 'Hadımköy lojistik depo projemizde 1.5 ay çalışacak operatörlü 18 metre Manitou teleskopik vinç aranıyor. Fatura kesilecek.',
      confidenceScore: 94,
      botName: 'Facebook Group Lead Radar Bot',
      query: '18m manitou kiralık şantiye istanbul'
    }
  },
  {
    id: 'opp-2',
    companyId: 'comp-1',
    projectId: 'proj-1',
    companyName: 'Tozkoparan Konut Yapı Kooperatifi',
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
      evidenceSnippet: 'Tozkoparan Mahallesinde 24 daireli riskli binamız için kat karşılığı Embay Yapı ile görüşmek istiyoruz.',
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
    opportunitySummary: 'Hadımköy Çatı/Cephe için 18 Metre Manitou MT-X 1840 (45 Gün Operatörlü)',
    requiresHumanApproval: true,
    approvalAction: 'SEND_WHATSAPP',
    sourceEvidence: {
      url: 'https://facebook.com/groups/is.makineleri.turkiye/permalink/918237192',
      domain: 'facebook.com',
      sourceType: 'FACEBOOK_GROUP',
      title: 'Hadımköy şantiyemize 18m sepetli/çatallı Manitou arıyoruz',
      discoveredAt: '2026-09-20 14:15',
      evidenceSnippet: '18 metre Manitou teleskopik vinç aranıyor. Fiyat ve operatör bilgisi rica ederiz.',
      confidenceScore: 94,
      botName: 'Facebook Group Lead Radar Bot',
      query: '18m manitou kiralık istanbul'
    },
    history: [
      {
        status: 'DISCOVERED',
        changedAt: '2026-09-20 14:15',
        note: 'Facebook İş Makineleri grubundan sinyal tespit edildi.'
      },
      {
        status: 'QUALIFIED',
        changedAt: '2026-09-20 15:30',
        note: 'Şantiye Hadımköyde ve iş süresi 45 gün olarak teyit edildi.'
      },
      {
        status: 'OFFER',
        changedAt: '2026-09-21 10:00',
        note: 'Günlük çalışma saatleri ve mazot şartları ile PDF teklif taslağı hazırlandı. Samet Bey onayı bekleniyor.'
      }
    ]
  },
  {
    id: 'lead-2',
    name: 'Mehmet Salih Kaya',
    companyName: 'Güngören Kat Malikleri Temsilcisi',
    phone: '0532 918 22 14',
    status: 'CONTACTABLE',
    opportunitySummary: 'Tozkoparan 5 Katlı Bina Kentsel Dönüşüm & Güçlendirme Keşfi',
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
        note: 'Lokasyon Güngören merkezde ve mülk sahiplerinin %75 onayı hazır.'
      }
    ]
  }
];

export const INITIAL_PLATFORMS: PlatformConnection[] = [
  {
    platform: 'INSTAGRAM',
    accountName: '@sahinmanitou_kiralama',
    status: 'DISCONNECTED',
    lastSyncAt: null,
    capabilities: {
      connect: true,
      publish: false,
      readMetrics: false,
      readComments: false,
      readMessages: false
    },
    authRequiredAction: 'Meta Graph API OAuth izni ve Instagram Business hesabı bağlantısı gereklidir.'
  },
  {
    platform: 'FACEBOOK',
    accountName: 'Şahin Manitou & Embay Yapı',
    status: 'DISCONNECTED',
    lastSyncAt: null,
    capabilities: {
      connect: true,
      publish: false,
      readMetrics: false,
      readComments: false,
      readMessages: false
    },
    authRequiredAction: 'Facebook Page Access Token bekleniyor.'
  },
  {
    platform: 'GOOGLE_BUSINESS',
    accountName: 'Embay Yapı & Şahin Manitou (Güngören)',
    status: 'DISCONNECTED',
    lastSyncAt: null,
    capabilities: {
      connect: true,
      publish: false,
      readMetrics: false,
      readComments: false,
      readMessages: false
    },
    authRequiredAction: 'Google Business Profile API kimlik doğrulaması gereklidir.'
  },
  {
    platform: 'WHATSAPP_BUSINESS',
    accountName: '+90 531 436 29 04 (Canlı Hat)',
    status: 'CONNECTED',
    lastSyncAt: '2026-09-23 06:00',
    capabilities: {
      connect: true,
      publish: true,
      readMetrics: true,
      readComments: false,
      readMessages: true
    },
    metrics: {
      reach: 142,
      engagementRate: '94%'
    }
  },
  {
    platform: 'X',
    accountName: '@sahinmanitou',
    status: 'DISCONNECTED',
    lastSyncAt: null,
    capabilities: {
      connect: true,
      publish: false,
      readMetrics: false,
      readComments: false,
      readMessages: false
    },
    authRequiredAction: 'X Developer API v2 Bearer Token gereklidir.'
  }
];

export const INITIAL_BOT_TASKS: BotTask[] = [
  {
    id: 'b-1',
    name: 'SEO Bot → Tozkoparan & Manitou',
    category: 'SEO',
    status: 'TAMAMLANDI',
    schedule: 'Her gün 06:00',
    lastRunAt: '2026-09-23 06:04',
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
    lastRunAt: '2026-09-23 07:15',
    duration: '1.2 sn',
    report: 'Web form ve WhatsApp senkronizasyonu aktif. 1 yeni kentsel dönüşüm talebi CRM havuzuna eklendi.',
    findingsCount: 1,
    model: 'Edge Webhook Engine'
  },
  {
    id: 'b-3',
    name: 'Facebook Group Lead Radar',
    category: 'LEAD_RADAR',
    status: 'TAMAMLANDI',
    schedule: 'Günde 3 kez (08:00, 14:00, 20:00)',
    lastRunAt: '2026-09-23 08:00',
    duration: '2.4 sn',
    report: 'İş makineleri gruplarından 1 adet 18m teleskopik vinç talebi doğrulandı ve kanıt URL ile bağlandı.',
    findingsCount: 1,
    model: 'Gemini 2.5 Flash Parser'
  },
  {
    id: 'b-4',
    name: '30 Günlük AI İçerik Motoru',
    category: 'CONTENT',
    status: 'PLANLANDI',
    schedule: 'İsteğe bağlı / Aylık',
    lastRunAt: '2026-09-22 18:00',
    duration: 'Bekliyor',
    report: 'İçerik takviminde 30 adet çoklu platform taslağı hazır. Samet Bey onayı bekleniyor.',
    findingsCount: 30,
    model: 'Gemini 2.5 Flash'
  },
  {
    id: 'b-5',
    name: 'Fiyat & Teklif Botu (CRM)',
    category: 'CRM',
    status: 'PLANLANDI',
    schedule: 'Tetikleme bazlı',
    lastRunAt: '2026-09-22 17:30',
    duration: 'Bekliyor',
    report: 'Hadımköy projesi için PDF formatında kiralama sözleşmesi ve fiyat teklifi oluşturuldu.',
    findingsCount: 1,
    model: 'PDF Engine & CRM Calculator'
  },
  {
    id: 'b-6',
    name: 'Saha & Filo Bakım Takipçisi',
    category: 'FLEET',
    status: 'TAMAMLANDI',
    schedule: 'Haftalık',
    lastRunAt: '2026-09-23 08:30',
    duration: '1.8 sn',
    report: 'MT-X 1840 (Makine 02) çalışma saati 1.240 saate ulaştı. 250 saatlik periyodik filtre bakım uyarısı oluşturuldu.',
    findingsCount: 1,
    model: 'Fleet Telemetry Worker'
  }
];

export const INITIAL_CONTENT_ITEMS: ContentItem[] = [
  {
    id: 'c-1',
    platform: 'INSTAGRAM',
    account: '@sahinmanitou_kiralama',
    plannedAt: '2026-09-24 10:30',
    timezone: 'Europe/Istanbul',
    title: 'Şantiye Verimliliğinde 18 Metre Manitou Gücü',
    caption: 'Hadımköy ve Trakya genelindeki sanayi yapılarında 18 metre MT-X 1840 telehandler modelimizle hızlı, güvenli ve operatörlü çözümler sunuyoruz. 4 tona kadar kaldırma kapasitesiyle çatı ve cephe panelleriniz zamanında yerinde.',
    hashtags: ['#manitou', '#işmakineleri', '#telehandler', '#kiralıkmanitou', '#şantiye', '#embayyapi'],
    cta: 'Şantiyenize en uygun makine ve fiyat teklifi için: 0531 436 29 04',
    mediaType: 'CAROUSEL',
    bot: 'Gemini AI Content Engine',
    campaign: 'Eylül 2026 Filo Tanıtımı',
    approvalStatus: 'PENDING_APPROVAL',
    publishStatus: 'SCHEDULED'
  },
  {
    id: 'c-2',
    platform: 'GOOGLE_BUSINESS',
    account: 'Embay Yapı & Şahin Manitou (Güngören)',
    plannedAt: '2026-09-25 14:00',
    timezone: 'Europe/Istanbul',
    title: 'Güngören Tozkoparan’da Depreme Karşı Güvenli Konutlar',
    caption: 'Embay Yapı olarak Tozkoparan bölgesindeki kentsel dönüşüm projelerimizde radye temel ve C35 beton standartlarından ödün vermiyoruz. Hak sahipleri için şeffaf süreç, zamanında anahtar teslim.',
    hashtags: ['#kentseldönüşüm', '#güngören', '#tozkoparan', '#depremgüvenliği', '#embayyapi'],
    cta: 'Ücretsiz yerinde bina zemin ve karot keşfi için arayın: 0531 436 29 04',
    mediaType: 'IMAGE',
    bot: 'SEO & Local Presence Bot',
    campaign: 'Güngören Kentsel Dönüşüm Bilinirliği',
    approvalStatus: 'APPROVED',
    publishStatus: 'SCHEDULED'
  },
  {
    id: 'c-3',
    platform: 'FACEBOOK',
    account: 'Şahin Manitou & Embay Yapı',
    plannedAt: '2026-09-26 11:15',
    timezone: 'Europe/Istanbul',
    title: 'Operatörlü & Operatörsüz Teleskopik Forklift Kiralama',
    caption: 'Yüksek irtifa montajları, çelik çatı yerleşimleri ve şantiye içi yük taşıma işleriniz için bakımlı, sigortalı Manitou filomuz hizmetinizde. İstanbul içi hızlı şantiye sevkiyatı.',
    hashtags: ['#forklift', '#manitoukiralama', '#istanbulşantiye', '#teleskopikforklift'],
    cta: 'WhatsApp Bilgi Hattımız: 0531 436 29 04',
    mediaType: 'VIDEO',
    bot: 'Gemini AI Content Engine',
    campaign: 'Kiralama Hızlı Aksiyon',
    approvalStatus: 'PENDING_APPROVAL',
    publishStatus: 'DRAFT'
  }
];

export const INITIAL_SEO_REPORT: SEORun = {
  id: 'seo-1',
  url: 'https://sahin-manitou-kiralama.vercel.app/',
  analyzedAt: '2026-09-23 06:04',
  h1: 'Deprem Yönetmeliğine Uygun Modern Konut İnşaatı & Kentsel Dönüşüm',
  metaTitle: 'Embay Yapı & Şahin Manitou | Güngören Kentsel Dönüşüm & Manitou Kiralama',
  metaDescription: 'Güngören Tozkoparan depreme dayanıklı kentsel dönüşüm projeleri ve İstanbul geneli 14m-18m Manitou teleskopik yükleyici kiralama.',
  score: 96,
  schemaCheck: true,
  sitemapFound: true,
  robotsTxtFound: true,
  recommendations: [
    'Canonical URL etiketi güncellenmeli (tou-kiralama.vercel.app ve sahin-manitou-kiralama.vercel.app için 301 yönlendirmesi).',
    'OpenGraph görseline 18m Manitou şantiye aksiyonu eklenerek sosyal tıklanma oranı %30 artırılabilir.',
    'Google Haritalar (Güngören şube) için haftalık 2 adet post paylaşımı yapılmalı.'
  ],
  opportunities: [
    '"güngören kentsel dönüşüm müteahhit" aramasında ilk 3 sıraya yükselme potansiyeli yüksek.',
    '"hadımköy kiralık manitou" bölgesel aramasında doğrudan birinci sıraya yerleşme şansı.',
    '"18 metre manitou günlük kiralama fiyatı" için zengin snippet soru-cevap schema eklenmeli.'
  ]
};

export const INITIAL_TRENDS: TrendItem[] = [
  {
    id: 'tr-1',
    topic: 'İstanbul Kentsel Dönüşüm Yeni Kira Yardımı & Yarısı Bizden Kampanyası',
    relevanceScore: 95,
    brandFit: 'YÜKSEK',
    riskScore: 'GÜVENLİ',
    suggestedAngle: 'Tozkoparan ve Güngören sakinlerine devlet destekli dönüşümde Embay Yapı’nın sunduğu avantajları anlatan bilgilendirici infografik.',
    targetPlatform: 'INSTAGRAM',
    status: 'NEW'
  },
  {
    id: 'tr-2',
    topic: 'Büyük Şantiyelerde İş Güvenliği: Sepetli Telehandler Kullanımı Zorunluluğu',
    relevanceScore: 88,
    brandFit: 'YÜKSEK',
    riskScore: 'GÜVENLİ',
    suggestedAngle: 'İskele yerine 18m Manitou MT-X kullanımının hem iş güvenliği sertifikasyonuna hem de montaj hızına katkısı.',
    targetPlatform: 'FACEBOOK',
    status: 'APPROVED'
  }
];

export const INITIAL_EMAILS: EmailMessage[] = [
  {
    id: 'em-1',
    from: 'satinalma@marmaracelik.com.tr',
    subject: 'Hadımköy Şantiyesi 18m Manitou Teklif Talebi',
    receivedAt: '2026-09-22 16:45',
    category: 'PROPOSAL_REQUEST',
    summary: 'Marmara Çelik Hadımköy şantiyesine 45 gün süreyle 18 metre sepetli Manitou telehandler fiyat teklifi istemiştir.',
    matchedCompany: 'Marmara Çelik & Endüstriyel Montaj Ltd.',
    suggestedAction: 'Hazırlanan PDF teklifinin operatör ve nakliye şartları eklenerek yanıtlanması.',
    draftReply: 'Sayın Yetkili, Hadımköy şantiyeniz için talep ettiğiniz 18m Manitou MT-X 1840 makinemiz müsait olup günlük çalışma ve operatörlü kiralama şartlarımız ekteki teklifimizde bilgilerinize sunulmuştur. Detaylar için 0531 436 29 04 üzerinden görüşebiliriz.',
    status: 'NEEDS_APPROVAL'
  }
];

export const INITIAL_SYSTEM_ERRORS: SystemErrorLog[] = [
  {
    id: 'err-1',
    service: 'Vercel Environment Sync',
    bot: 'System Health Checker',
    timestamp: '2026-09-23 07:41',
    error: 'Vercel projesinde Environment Variables henüz tanımlanmamış. Production için SUPABASE_URL, GEMINI_API_KEY ve WHATSAPP_TOKEN tanımlanmalıdır.',
    retryCount: 0,
    status: 'PENDING'
  }
];

export const INITIAL_AI_COSTS: AICostLog[] = [
  {
    id: 'cst-1',
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
    task: '30 Günlük İçerik Planı Üretimi',
    tokens: 4200,
    estimatedCostUSD: 0.0018,
    bot: 'Gemini AI Content Engine',
    timestamp: '2026-09-22 18:00'
  },
  {
    id: 'cst-2',
    provider: 'GEMINI',
    model: 'gemini-2.5-pro',
    task: 'Güngören & Tozkoparan SEO Kod & Schema Analizi',
    tokens: 6800,
    estimatedCostUSD: 0.0082,
    bot: 'SEO Bot',
    timestamp: '2026-09-23 06:04'
  }
];
