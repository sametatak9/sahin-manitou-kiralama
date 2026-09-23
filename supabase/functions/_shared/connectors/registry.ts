// Connector kayıt defteri. implemented=false olanlar UI'da "YAPILANDIRMA GEREKLİ / ENTEGRASYON BEKLİYOR" görünür.
import { facebookMetrics, facebookPublish, instagramMetrics, instagramPublish } from './meta.ts';
import { youtubePublish } from './youtube.ts';
import type { ConnectorDef } from './types.ts';

const cap = (publish: boolean, metrics: boolean, messaging = false, design = false) => ({ publish, metrics, messaging, design });

export const CONNECTORS: ConnectorDef[] = [
  // ── SocialConnector ──
  { key: 'instagram', name: 'Instagram', category: 'social', authType: 'oauth', officialApi: true, implemented: true, requiredEnv: ['META_APP_ID', 'META_APP_SECRET'], capabilities: cap(true, true),
    docsUrl: 'https://developers.facebook.com/docs/instagram-platform/content-publishing', note: 'Instagram Business/Creator hesabı bir Facebook Sayfasına bağlı olmalı. Canlı modda instagram_content_publish için Meta App Review gerekir; geliştirme modunda uygulama rolündeki test hesaplarıyla çalışır.',
    publish: instagramPublish, fetchMetrics: instagramMetrics },
  { key: 'facebook', name: 'Facebook Sayfası', category: 'social', authType: 'oauth', officialApi: true, implemented: true, requiredEnv: ['META_APP_ID', 'META_APP_SECRET'], capabilities: cap(true, true),
    docsUrl: 'https://developers.facebook.com/docs/pages-api/posts', note: 'Sayfa yöneticisi olan hesapla bağlanır; pages_manage_posts izni gerekir.',
    publish: facebookPublish, fetchMetrics: facebookMetrics },
  { key: 'linkedin', name: 'LinkedIn', category: 'social', authType: 'oauth', officialApi: true, implemented: false, requiredEnv: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'], capabilities: cap(true, false),
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api', note: 'Şirket sayfası paylaşımı için Community Management API erişim onayı gerekir.' },
  { key: 'x', name: 'X', category: 'social', authType: 'oauth', officialApi: true, implemented: false, requiredEnv: ['X_CLIENT_ID', 'X_CLIENT_SECRET'], capabilities: cap(true, false),
    docsUrl: 'https://docs.x.com/x-api/posts/creation-of-a-post', note: 'X API ücretli erişim paketi gerektirir.' },
  { key: 'tiktok', name: 'TikTok', category: 'social', authType: 'oauth', officialApi: true, implemented: false, requiredEnv: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'], capabilities: cap(true, false),
    docsUrl: 'https://developers.tiktok.com/doc/content-posting-api-get-started', note: 'Content Posting API için uygulama denetimi gerekir; yalnızca video.' },
  { key: 'youtube', name: 'YouTube', category: 'social', authType: 'oauth', officialApi: true, implemented: true, requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], capabilities: cap(true, false),
    docsUrl: 'https://developers.google.com/youtube/v3/docs/videos/insert', note: 'Google hesabıyla (OAuth) bağlanır; video ve Shorts resmi YouTube Data API ile yüklenir. Google doğrulaması tamamlanmamış uygulamada yüklenen videolar gizli kalabilir.',
    publish: youtubePublish },
  // ── ListingConnector ──
  { key: 'sahibinden', name: 'Sahibinden', category: 'listing', authType: 'manual', officialApi: false, implemented: false, requiredEnv: [], capabilities: cap(false, false),
    docsUrl: 'https://www.sahibinden.com/', note: 'Herkese açık resmi yayın API’si yok. Bot ilan metnini hazırlar, yayın manuel ve onaylıdır.' },
  { key: 'armut', name: 'Armut', category: 'listing', authType: 'manual', officialApi: false, implemented: false, requiredEnv: [], capabilities: cap(false, false),
    docsUrl: 'https://armut.com/', note: 'Herkese açık resmi API yok. Profil ve teklif metinleri manuel kullanılır.' },
  // ── SearchConnector ──
  { key: 'google_business', name: 'Google Business Profile', category: 'search', authType: 'oauth', officialApi: true, implemented: false, requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], capabilities: cap(true, true),
    docsUrl: 'https://developers.google.com/my-business', note: 'Business Profile API erişimi Google’a başvuru ile açılır.' },
  { key: 'google_search_console', name: 'Google Search Console', category: 'search', authType: 'oauth', officialApi: true, implemented: false, requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], capabilities: cap(false, true),
    docsUrl: 'https://developers.google.com/webmaster-tools', note: 'Site sahipliği doğrulanmalı.' },
  { key: 'yandex_webmaster', name: 'Yandex Webmaster', category: 'search', authType: 'oauth', officialApi: true, implemented: false, requiredEnv: ['YANDEX_CLIENT_ID', 'YANDEX_CLIENT_SECRET'], capabilities: cap(false, true),
    docsUrl: 'https://yandex.com/dev/webmaster/', note: 'Site Yandex Webmaster’da doğrulanmalı.' },
  { key: 'website', name: 'Web Sitesi (teknik SEO)', category: 'search', authType: 'none', officialApi: true, implemented: true, requiredEnv: [], capabilities: cap(false, true),
    docsUrl: 'https://sahin-manitou-kiralama.vercel.app/', note: 'Herkese açık site HTTP ile denetlenir; hesap gerekmez.' },
  // ── CommunicationConnector ──
  { key: 'email', name: 'E-posta (Resend)', category: 'communication', authType: 'api_key', officialApi: true, implemented: true, requiredEnv: ['RESEND_API_KEY', 'EMAIL_FROM'], capabilities: cap(false, false, true),
    docsUrl: 'https://resend.com/docs/api-reference/emails/send-email', note: 'Gönderen alan adı Resend’de doğrulanmalı.' },
  { key: 'whatsapp', name: 'WhatsApp Cloud API', category: 'communication', authType: 'api_key', officialApi: true, implemented: true, requiredEnv: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'], capabilities: cap(false, false, true),
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api', note: 'Serbest metin yalnızca 24 saatlik pencerede; ilk temas için onaylı şablon gerekir. Yoksa wa.me bağlantısıyla manuel gönderim.' },
  { key: 'telegram', name: 'Telegram Bot', category: 'communication', authType: 'api_key', officialApi: true, implemented: true, requiredEnv: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'], capabilities: cap(false, false, true),
    docsUrl: 'https://core.telegram.org/bots/api#sendmessage', note: 'Gün sonu raporları yönetici sohbetine gönderilir.' },
  // ── Design ──
  { key: 'canva', name: 'Canva', category: 'design', authType: 'oauth', officialApi: true, implemented: true, requiredEnv: ['CANVA_CLIENT_ID', 'CANVA_CLIENT_SECRET'], capabilities: cap(false, false, false, true),
    docsUrl: 'https://www.canva.dev/docs/connect/', note: 'Canva Connect API: tasarım oluşturma, düzenleme bağlantısı ve PNG dışa aktarma. Marka şablonu autofill yalnızca Canva Enterprise.' },
];

export const connectorByKey = (key: string | null | undefined) => CONNECTORS.find((c) => c.key === key);

export function publicConnectorInfo(def: ConnectorDef) {
  const { publish: _p, fetchMetrics: _m, ...rest } = def;
  return rest;
}
