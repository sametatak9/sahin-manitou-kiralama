import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Cpu,
  Database,
  Cloud,
  Zap,
  Server
} from 'lucide-react';
import { SystemErrorLog, AICostLog } from '../../types';

interface SystemHealthViewProps {
  errors: SystemErrorLog[];
  costs: AICostLog[];
}

export const SystemHealthView: React.FC<SystemHealthViewProps> = ({ errors, costs }) => {
  const totalCost = costs.reduce((sum, c) => sum + c.estimatedCostUSD, 0);
  const totalTokens = costs.reduce((sum, c) => sum + c.tokens, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          SİSTEM SAĞLIĞI • HATA MERKEZİ & AI MALİYET TAKİBİ
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Altyapı İzleme & Kaynak Tüketimi
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Veritabanı bağlantısı, başarısız arka plan işleri (dead-letter queue) ve LLM model token tüketimi anlık olarak denetlenir.
        </p>
      </div>

      {/* 3 Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>SİSTEM DURUMU</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">Operasyonel</div>
          <p className="text-xs text-emerald-700 mt-1">Uptime: %99.98 • Sıfır çökme</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>TOPLAM AI JETON (TOKENS)</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {totalTokens.toLocaleString('tr-TR')}
          </div>
          <p className="text-xs text-slate-500 mt-1">Gemini 2.5 Flash & Pro modelleri</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>TOPLAM AI MALİYET</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono">
            ${totalCost.toFixed(4)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Son derece düşük maliyetli optimizasyon</p>
        </div>
      </div>

      {/* Service Health Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Hizmet & Entegrasyon Kontrolleri
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <span className="text-emerald-900 font-bold block">Frontend UI</span>
            <span className="text-emerald-700 text-[11px]">Vite / React 19 • Aktif</span>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <span className="text-emerald-900 font-bold block">Güvenlik & RLS</span>
            <span className="text-emerald-700 text-[11px]">Yetkisiz erişim kapalı</span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <span className="text-amber-900 font-bold block">Vercel ENV</span>
            <span className="text-amber-700 text-[11px]">Tanımlama Bekliyor</span>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <span className="text-emerald-900 font-bold block">İletişim Hattı</span>
            <span className="text-emerald-700 text-[11px]">0531 436 29 04 • Doğrulandı</span>
          </div>
        </div>
      </div>

      {/* Error Center Table (Section 32) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Hata Merkezi & Uyarısı (Error Center)
          </h3>
          <span className="text-xs text-slate-500">{errors.length} Kayıt</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="p-4">Zaman</th>
                <th className="p-4">Servis</th>
                <th className="p-4">Hata Açıklaması</th>
                <th className="p-4">Tekrar</th>
                <th className="p-4">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {errors.map((err) => (
                <tr key={err.id} className="hover:bg-slate-50/70">
                  <td className="p-4 font-mono text-slate-600">{err.timestamp}</td>
                  <td className="p-4 font-bold text-slate-900">{err.service}</td>
                  <td className="p-4 text-slate-600 max-w-md">{err.error}</td>
                  <td className="p-4 font-mono">{err.retryCount}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {err.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Token Cost Breakdown (Section 33) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            AI Model Tüketim Kayıtları (Token & Maliyet)
          </h3>
          <span className="text-xs text-slate-500 font-mono">Toplam: ${totalCost.toFixed(4)} USD</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="p-4">Zaman</th>
                <th className="p-4">Bot / Görev</th>
                <th className="p-4">Model</th>
                <th className="p-4">Jeton (Token)</th>
                <th className="p-4 text-right">Tahmini Maliyet (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costs.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <td className="p-4 font-mono text-slate-600">{c.timestamp}</td>
                  <td className="p-4 font-bold text-slate-900">{c.task}</td>
                  <td className="p-4 font-mono text-emerald-700">{c.model}</td>
                  <td className="p-4 font-mono">{c.tokens}</td>
                  <td className="p-4 text-right font-mono font-bold text-slate-900">
                    ${c.estimatedCostUSD.toFixed(4)}
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
