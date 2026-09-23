import React from 'react';
import {
  Phone,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
  Sliders,
  Eye,
  CheckCircle2,
  BellRing
} from 'lucide-react';

interface HeaderProps {
  currentView: 'panel' | 'website';
  setCurrentView: (view: 'panel' | 'website') => void;
  pendingApprovalsCount: number;
  onOpenApprovals: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  pendingApprovalsCount,
  onOpenApprovals
}) => {
  const PHONE_NUMBER = '0531 436 29 04';
  const PHONE_CLEAN = '05314362904';
  const WHATSAPP_URL = `https://wa.me/90${PHONE_CLEAN}?text=${encodeURIComponent('Merhaba Embay Yapı & Şahin Manitou, bilgi ve teklif almak istiyorum.')}`;

  return (
    <header className="bg-white border-b border-emerald-100 shadow-xs sticky top-0 z-50">
      {/* Top Banner */}
      <div className="bg-emerald-50 border-b border-emerald-100/80 px-4 py-1.5 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-emerald-950">Embay Yapı & Şahin Manitou Operasyon Ağı</span>
          <span className="text-emerald-400">•</span>
          <span className="text-emerald-700">Güngören Tozkoparan & İstanbul Geneli</span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${PHONE_CLEAN}`}
            className="flex items-center gap-1 text-emerald-800 font-medium hover:text-emerald-950 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>{PHONE_NUMBER}</span>
          </a>
          <span className="text-emerald-300">|</span>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-emerald-800 font-medium hover:text-emerald-950 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md shadow-emerald-600/20">
            E
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                EMBAY YAPI
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Şahin Manitou
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Operasyon & Dijital İş Geliştirme Merkezi</p>
          </div>
        </div>

        {/* View Switcher and Action buttons */}
        <div className="flex items-center gap-3">
          {/* Dual mode selector */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setCurrentView('panel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'panel'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Operasyon Paneli</span>
            </button>
            <button
              onClick={() => setCurrentView('website')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'website'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Canlı Vitrin Sitesi</span>
            </button>
          </div>

          {/* Pending Approvals quick badge */}
          {pendingApprovalsCount > 0 && (
            <button
              onClick={onOpenApprovals}
              className="hidden sm:flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors animate-pulse"
              title="Samet Bey onayını bekleyen işlem"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-700" />
              <span>{pendingApprovalsCount} Onay Bekliyor</span>
            </button>
          )}

          {/* User profile indicator */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center font-bold text-xs text-emerald-800">
              SB
            </div>
            <div className="text-left text-xs">
              <span className="font-bold text-slate-800 block leading-tight">Samet Bey</span>
              <span className="text-[10px] text-emerald-600 font-medium">Sistem Yöneticisi</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
