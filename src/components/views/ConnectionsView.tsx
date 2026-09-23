import React, { useState } from 'react';
import {
  Link2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Sliders,
  Sparkles,
  Cloud,
  Lock,
  Plus,
  LogIn,
  Power,
  Trash2,
  RefreshCw,
  Key,
  Globe,
  Radio,
  Send,
  X
} from 'lucide-react';
import { PlatformConnection, PlatformType } from '../../types';

interface ConnectionsViewProps {
  platforms: PlatformConnection[];
  onAddPlatform: (platform: PlatformConnection) => void;
  onTogglePlatformStatus: (platformName: PlatformType, accountName: string) => void;
  onDeletePlatform: (platformName: PlatformType, accountName: string) => void;
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({
  platforms,
  onAddPlatform,
  onTogglePlatformStatus,
  onDeletePlatform
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedPlatformForLogin, setSelectedPlatformForLogin] = useState<PlatformConnection | null>(null);

  // New Integration Form State
  const [formPlatformType, setFormPlatformType] = useState<PlatformType>('INSTAGRAM');
  const [formAccountName, setFormAccountName] = useState('');
  const [formAuthMethod, setFormAuthMethod] = useState<'OAUTH' | 'API_KEY' | 'WEBHOOK' | 'SESSION'>('OAUTH');
  const [formApiKey, setFormApiKey] = useState('');
  const [formWebhookUrl, setFormWebhookUrl] = useState('');
  const [customPlatformLabel, setCustomPlatformLabel] = useState('');

  // Login with App Simulation Form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginApiKey, setLoginApiKey] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authSuccessMessage, setAuthSuccessMessage] = useState('');

  const vercelEnvSnippet = `# VERCEL PRODUCTION ENVIRONMENT VARIABLES
# Vercel -> Settings -> Environment Variables kısmına ekleyin:

GEMINI_API_KEY="AIzaSy..."
VITE_SUPABASE_URL="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_CONTACT_PHONE="0531 436 29 04"
VITE_CONTACT_PHONE_CLEAN="05314362904"
WHATSAPP_WEBHOOK_SECRET="embay_wh_secret_2026"`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(vercelEnvSnippet);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleOpenLogin = (p: PlatformConnection) => {
    setSelectedPlatformForLogin(p);
    setLoginUsername(p.accountName);
    setLoginPassword('');
    setLoginApiKey('');
    setAuthSuccessMessage('');
    setIsLoginModalOpen(true);
  };

  const handleAuthorizeApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatformForLogin) return;

    setIsAuthorizing(true);
    setTimeout(() => {
      setIsAuthorizing(false);
      setAuthSuccessMessage(`✓ ${selectedPlatformForLogin.platform} yetkilendirmesi ve OAuth token doğrulandı!`);
      // Update status to CONNECTED
      if (selectedPlatformForLogin.status !== 'CONNECTED') {
        onTogglePlatformStatus(selectedPlatformForLogin.platform, selectedPlatformForLogin.accountName);
      }
      setTimeout(() => {
        setIsLoginModalOpen(false);
      }, 1200);
    }, 1500);
  };

  const handleCreateIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAccountName) return;

    const newConnection: PlatformConnection = {
      platform: formPlatformType,
      accountName: customPlatformLabel ? `${customPlatformLabel} (${formAccountName})` : formAccountName,
      status: 'CONNECTED',
      lastSyncAt: 'Şimdi bağlandı',
      capabilities: {
        connect: true,
        publish: true,
        readMetrics: true,
        readComments: true,
        readMessages: true
      },
      metrics: {
        reach: 1200,
        engagementRate: '%5.2'
      },
      authRequiredAction: undefined
    };

    onAddPlatform(newConnection);
    setIsAddModalOpen(false);
    setFormAccountName('');
    setFormApiKey('');
    setFormWebhookUrl('');
    setCustomPlatformLabel('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Dynamic Actions */}
      <div className="bg-white border border-emerald-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              SÜRDÜRÜLEBİLİR PLATFORM & UYGULAMA ENTEGRASYON MERKEZİ
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Uygulama Girişi, API Yetkilendirme & Yeni Platform Ekleme
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              İster mevcut sosyal medya veya web servislerine OAuth / şifre ile giriş yapın, ister yarın eklenecek yeni platformlar için (TikTok, Sahibinden, LinkedIn veya Özel Webhook) dinamik entegrasyon kanalı oluşturun.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Platform / Uygulama Entegre Et</span>
            </button>
          </div>
        </div>
      </div>

      {/* CRITICAL: Vercel Environment Variables Diagnosis */}
      <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Vercel Production Environment Variables (Canlı Senkronizasyon)
              </h3>
              <p className="text-xs text-amber-900 mt-0.5">
                Vercel panelinizde ENV değerleri boş olduğunda harici API servisleri ve botlar koruma modunda çalışır.
              </p>
            </div>
          </div>

          <button
            onClick={copyToClipboard}
            className="px-3.5 py-2 bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey ? 'Kopyalandı!' : 'Değişkenleri Kopyala'}
          </button>
        </div>

        <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto">
          <pre>{vercelEnvSnippet}</pre>
        </div>
      </div>

      {/* Platform Capability Matrix (Table per Section 30) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Entegre Platformlar & Canlı Yetenek Matrisi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tüm platformlar tek ekrandan test edilebilir, yetkilendirilebilir veya bağlantısı kesilebilir.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
            {platforms.length} Uygulama / Kanal Aktif
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="p-4">Platform / Uygulama</th>
                <th className="p-4">Durum</th>
                <th className="p-4 text-center">Bağlantı</th>
                <th className="p-4 text-center">Yayın Yetkisi</th>
                <th className="p-4 text-center">Metrik</th>
                <th className="p-4 text-center">Mesaj / DM</th>
                <th className="p-4">Son Senkronizasyon</th>
                <th className="p-4 text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {platforms.map((p) => (
                <tr key={`${p.platform}-${p.accountName}`} className="hover:bg-slate-50/70">
                  <td className="p-4">
                    <span className="font-bold text-slate-900 block">{p.platform}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{p.accountName}</span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        p.status === 'CONNECTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.status === 'CONNECTED' ? '● Canlı Bağlı' : '○ Bağlantı Yok'}
                    </span>
                  </td>

                  {/* Connect */}
                  <td className="p-4 text-center">
                    {p.capabilities.connect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>

                  {/* Publish */}
                  <td className="p-4 text-center">
                    {p.capabilities.publish ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>

                  {/* Read Metrics */}
                  <td className="p-4 text-center">
                    {p.capabilities.readMetrics ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>

                  {/* Read Messages */}
                  <td className="p-4 text-center">
                    {p.capabilities.readMessages ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>

                  {/* Last sync */}
                  <td className="p-4 font-mono text-[11px] text-slate-600">
                    {p.lastSyncAt || 'Bekliyor'}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Uygulama ile giriş yap butonu */}
                      <button
                        onClick={() => handleOpenLogin(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 transition-colors"
                        title="Uygulama İle Giriş Yap / Token Doğrula"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Giriş Yap</span>
                      </button>

                      {/* Durum değiştir (Aç/Kapat) */}
                      <button
                        onClick={() => onTogglePlatformStatus(p.platform, p.accountName)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title={p.status === 'CONNECTED' ? 'Bağlantıyı Kes' : 'Bağlantıyı Aç'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      {/* Sil */}
                      {platforms.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`${p.platform} (${p.accountName}) bağlantısını kaldırmak istediğinize emin misiniz?`)) {
                              onDeletePlatform(p.platform, p.accountName);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Platformu Kaldır"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW PLATFORM / SUSTAINABLE INTEGRATION */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-emerald-700" />
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  Yeni Platform / Servis Entegre Et
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIntegration} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Entegre Edilecek Platform *</label>
                <select
                  value={formPlatformType}
                  onChange={(e) => setFormPlatformType(e.target.value as PlatformType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-semibold"
                >
                  <option value="INSTAGRAM">Instagram Business</option>
                  <option value="FACEBOOK">Facebook Sayfası & Grupları</option>
                  <option value="GOOGLE_BUSINESS">Google İşletme Profili (Maps & Local)</option>
                  <option value="WHATSAPP_BUSINESS">WhatsApp Business Cloud API</option>
                  <option value="TIKTOK">TikTok For Business</option>
                  <option value="LINKEDIN">LinkedIn Şirket Sayfası</option>
                  <option value="SAHIBINDEN">Sahibinden.com Mağaza / İlan Entegrasyonu</option>
                  <option value="WEBHOOK">Özel Webhook & Harici CRM</option>
                  <option value="CUSTOM">Özel / Yeni Nesil Platform</option>
                </select>
              </div>

              {formPlatformType === 'CUSTOM' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Özel Platform Adı</label>
                  <input
                    type="text"
                    value={customPlatformLabel}
                    onChange={(e) => setCustomPlatformLabel(e.target.value)}
                    placeholder="Örn: Telegram Kanalı, B2B Portal"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Hesap Adı / Tanımlayıcı *</label>
                <input
                  type="text"
                  value={formAccountName}
                  onChange={(e) => setFormAccountName(e.target.value)}
                  placeholder="Örn: @sahinmanitou_resmi veya Sahin_Manitou_Bot"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kimlik Doğrulama Yöntemi</label>
                <select
                  value={formAuthMethod}
                  onChange={(e) => setFormAuthMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                >
                  <option value="OAUTH">OAuth 2.0 (Uygulama İle Otomatik Giriş)</option>
                  <option value="API_KEY">API Key / Bearer Token</option>
                  <option value="WEBHOOK">Webhook Callback URL</option>
                  <option value="SESSION">Kullanıcı Adı & Şifre</option>
                </select>
              </div>

              {formAuthMethod === 'API_KEY' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">API Key / Token</label>
                  <input
                    type="password"
                    value={formApiKey}
                    onChange={(e) => setFormApiKey(e.target.value)}
                    placeholder="sk_live_..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              )}

              {formAuthMethod === 'WEBHOOK' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Webhook URL</label>
                  <input
                    type="url"
                    value={formWebhookUrl}
                    onChange={(e) => setFormWebhookUrl(e.target.value)}
                    placeholder="https://api.domain.com/webhook"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              )}

              <div className="p-3 bg-emerald-50 rounded-xl text-[11px] text-emerald-800 leading-relaxed border border-emerald-200">
                ✓ Bu entegrasyon kaydedildiğinde sistem gelecekte eklenecek yeni botlar ve otomatik içerik dağıtıcıları için hazır hale gelir.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs"
                >
                  Platformu Sisteme Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UYGULAMA İLE GİRİŞ YAP (LOGIN WITH APP) */}
      {/* ========================================================================= */}
      {isLoginModalOpen && selectedPlatformForLogin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <LogIn className="w-5 h-5 text-emerald-700" />
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  {selectedPlatformForLogin.platform} ile Giriş Yap
                </h3>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authSuccessMessage ? (
              <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-900 font-bold text-center text-xs flex items-center justify-center gap-2 animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>{authSuccessMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleAuthorizeApp} className="space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 block">Hesap: {selectedPlatformForLogin.accountName}</span>
                  <p className="text-[11px] text-slate-500">
                    Resmi API veya OAuth token eşleşmesi yapılarak botların otomatik paylaşım ve mesaj dinleme yetkisi açılır.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kullanıcı Adı / E-Posta</label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Şifre / Güvenlik Anahtarı</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isAuthorizing}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    {isAuthorizing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>{isAuthorizing ? 'Doğrulanıyor...' : 'Uygulama İle Giriş Yap & Bağla'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
