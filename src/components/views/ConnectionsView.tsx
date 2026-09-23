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
  Lock
} from 'lucide-react';
import { PlatformConnection } from '../../types';

interface ConnectionsViewProps {
  platforms: PlatformConnection[];
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({ platforms }) => {
  const [copiedKey, setCopiedKey] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          BAĞLANTI MERKEZİ & PLATFORM YETENEK MATRİSİ
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          API Entegrasyonları & Canlı Yetenekler
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Sistem sadece bağlı gibi gösteren sahte başarılar üretmez. Gerçek API doğrulaması yoksa "Veri bulunamadı" ibaresiyle eksik adımlar şeffafça listelenir.
        </p>
      </div>

      {/* CRITICAL: Vercel Environment Variables Diagnosis (Addresses User's Question directly) */}
      <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Vercel Environment Variables Teşhisi (Kritik Gereksinim)
              </h3>
              <p className="text-xs text-amber-900 mt-0.5">
                Vercel panelinizde ("No Environment Variables Added") ENV değerleri boş olduğu için canlıdaki botlar Supabase ve AI motoruna erişemez.
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

        <p className="text-[11px] text-amber-900 leading-relaxed">
          <strong>Nasıl Eklenir?</strong> Vercel.com &rarr; <code>sametatak9s...</code> projeniz &rarr; <strong>Settings &rarr; Environment Variables</strong> sekmesine gidin, yukarıdaki değerleri yapıştırıp <strong>Save</strong> butonuna basın ve ardından <strong>Redeploy</strong> edin.
        </p>
      </div>

      {/* Platform Capability Matrix (Table per Section 30) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Platform Yetenek Matrisi (Platform Capability Matrix)
          </h2>
          <span className="text-xs text-slate-500">5 Platform İzleniyor</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="p-4">Platform / Hesap</th>
                <th className="p-4">Durum</th>
                <th className="p-4 text-center">Bağlantı</th>
                <th className="p-4 text-center">Otomatik Yayın</th>
                <th className="p-4 text-center">Metrik Okuma</th>
                <th className="p-4 text-center">Gelen Mesaj</th>
                <th className="p-4">Analitik Verisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {platforms.map((p) => (
                <tr key={p.platform} className="hover:bg-slate-50/70">
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

                  {/* Analytics Metric or Honest "Veri bulunamadı" */}
                  <td className="p-4">
                    {p.metrics ? (
                      <span className="text-emerald-800 font-semibold font-mono text-[11px]">
                        Erişim: {p.metrics.reach} • Etkileşim: {p.metrics.engagementRate}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">
                        Veri bulunamadı (API yetkisi bekleniyor)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
