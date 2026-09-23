// Types for Embay Yapı & Şahin Manitou Operations Center

export type LeadStatus =
  | 'DISCOVERED'
  | 'QUALIFIED'
  | 'CONTACTABLE'
  | 'CONTACTED'
  | 'RESPONSE'
  | 'MEETING'
  | 'OFFER'
  | 'WON'
  | 'LOST';

export interface SourceEvidence {
  url: string;
  domain: string;
  sourceType: 'WEB_NEWS' | 'FACEBOOK_GROUP' | 'GOOGLE_SEARCH' | 'SECTOR_PORTAL' | 'INBOUND_FORM';
  title: string;
  discoveredAt: string;
  evidenceSnippet: string;
  confidenceScore: number; // 0 - 100
  botName: string;
  query: string;
}

export interface Company {
  id: string;
  name: string;
  taxNumber?: string;
  city: string;
  district: string;
  sector: string;
  phone: string;
  email: string;
  address?: string;
  createdAt: string;
  enrichmentHistory: {
    date: string;
    source: string;
    addedFields: string[];
  }[];
}

export interface Project {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  location: string;
  projectType: 'KENTSEL_DONUSUM' | 'KONUT_INSAATI' | 'SANAYI_TESISI' | 'CEPHE_MONTAJ' | 'LOJISTIK_DEPO';
  estimatedDurationMonths: number;
  stage: 'PLANLAMA' | 'HAFRIYAT' | 'KABA_YAPI' | 'INCE_YAPI' | 'TESLIM';
  notes?: string;
}

export interface Opportunity {
  id: string;
  companyId: string;
  projectId: string;
  companyName: string;
  projectTitle: string;
  machineRequirement: 'MANITOU_18M' | 'MANITOU_14M' | 'FORKLIFT' | 'KULE_VINC' | 'YAPIM_TAAHHUT';
  durationDays: number;
  estimatedValueTRY: number;
  status: 'DISCOVERY' | 'OFFER_PREPARED' | 'OFFER_SENT' | 'ACCEPTED' | 'REJECTED';
  sourceEvidence?: SourceEvidence;
  assignedOperator: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  companyId?: string;
  name: string;
  companyName: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  sourceEvidence: SourceEvidence;
  opportunitySummary: string;
  history: {
    status: LeadStatus;
    changedAt: string;
    note: string;
  }[];
  requiresHumanApproval: boolean;
  approvalAction?: 'SEND_WHATSAPP' | 'SEND_EMAIL' | 'CREATE_OFFER';
}

export type PlatformType = 'INSTAGRAM' | 'FACEBOOK' | 'X' | 'GOOGLE_BUSINESS' | 'WHATSAPP_BUSINESS' | 'TIKTOK' | 'LINKEDIN' | 'SAHIBINDEN' | 'WEBHOOK' | 'CUSTOM';

export interface PlatformConnection {
  platform: PlatformType;
  accountName: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'TOKEN_EXPIRED';
  lastSyncAt: string | null;
  capabilities: {
    connect: boolean;
    publish: boolean;
    readMetrics: boolean;
    readComments: boolean;
    readMessages: boolean;
  };
  metrics?: {
    followers?: number;
    reach?: number;
    engagementRate?: string;
  };
  authRequiredAction?: string;
  credentials?: {
    username?: string;
    embeddedPassword?: string;
    isAutoStarted?: boolean;
    directAppUrl?: string;
    apiKey?: string;
  };
}

export interface ContentItem {
  id: string;
  platform: PlatformType;
  account: string;
  plannedAt: string;
  timezone: string;
  title: string;
  caption: string;
  hashtags: string[];
  cta: string;
  mediaType: 'IMAGE' | 'CAROUSEL' | 'VIDEO' | 'STORY';
  mediaUrl?: string;
  bot: string;
  campaign: string;
  campaignTitle?: string; // örn: "Fuar Paylaşımları", "Tozkoparan Kentsel Dönüşüm"
  alarmSet?: boolean;
  alarmNote?: string;
  recipientPhone?: string;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  publishStatus: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
  publishedAt?: string;
  externalPostId?: string;
  externalUrl?: string;
}

export interface BotTask {
  id: string;
  name: string;
  category: 'SEO' | 'LEAD_RADAR' | 'CONTENT' | 'FLEET' | 'CRM' | 'SERVICE';
  status: 'TAMAMLANDI' | 'ÇALIŞIYOR' | 'PLANLANDI' | 'BEKLEMEDE' | 'HATA';
  schedule: string;
  lastRunAt: string;
  duration: string;
  report: string;
  findingsCount: number;
  model: string;
  targetUrl?: string;
  targetJobDescription?: string;
  maxRunDurationMinutes?: number;
  finishThreshold?: string; // örn: "İlk 3 müşteri talebini bulunca dur" veya "Tüm sayfaları tara"
  skills?: string[]; // örn: ['WEB_SCRAPING', 'SEO_AUDIT', 'WHATSAPP_DISPATCH', 'PHONE_EXTRACTOR', 'PRICE_ANALYSIS']
  permissions?: {
    canBrowseWeb: boolean;
    canWriteSupabase: boolean;
    canSendWhatsApp: boolean;
    canDraftOffer: boolean;
  };
  systemTrainingPrompt?: string; // Botun çalışma kuralları ve şirket bilgisi eğitimi
  lastRunOutcome?: 'SUCCESS_WITH_LEAD' | 'EMPTY_BUT_COMPLETED' | 'ERROR';
  executionHistory?: {
    runAt: string;
    duration: string;
    outcome: 'BULGU_VAR' | 'TEMIZ_BOS_DONDU' | 'HATA';
    summary: string;
    targetScanned: string;
    details?: string;
  }[];
}

export interface SEORun {
  id: string;
  url: string;
  analyzedAt: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  score: number;
  schemaCheck: boolean;
  sitemapFound: boolean;
  robotsTxtFound: boolean;
  recommendations: string[];
  opportunities: string[];
}

export interface TrendItem {
  id: string;
  topic: string;
  relevanceScore: number; // 0 - 100
  brandFit: 'YÜKSEK' | 'ORTA' | 'DÜŞÜK';
  riskScore: 'GÜVENLİ' | 'DİKKAT' | 'RİSKLİ';
  suggestedAngle: string;
  targetPlatform: PlatformType;
  status: 'NEW' | 'APPROVED' | 'DISMISSED';
}

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  category: 'LEAD' | 'PROPOSAL_REQUEST' | 'INVOICE' | 'SPAM' | 'URGENT';
  summary: string;
  matchedCompany?: string;
  suggestedAction: string;
  draftReply?: string;
  status: 'DRAFT' | 'NEEDS_APPROVAL' | 'SENT';
}

export interface SystemErrorLog {
  id: string;
  service: string;
  bot: string;
  timestamp: string;
  error: string;
  retryCount: number;
  status: 'RESOLVED' | 'PENDING';
}

export interface AICostLog {
  id: string;
  provider: 'GEMINI' | 'OPENAI' | 'CLAUDE';
  model: string;
  task: string;
  tokens: number;
  estimatedCostUSD: number;
  bot: string;
  timestamp: string;
}
