import React from 'react';
import {
  Phone,
  MessageCircle,
  Sliders,
  Eye,
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
    <header className="bg-white/95 backdrop-blur-md border-b border-emerald-900/10 shadow-xs sticky top-0 z-50">
      {/* Top Banner - Responsive for mobile */}
      <div className="bg-emerald-950 text-white px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping"></span>
          <span className="font-semibold text-emerald-100 truncate">Embay Yapı & Şahin Manitou</span>
          <span className="text-emerald-500 hidden sm:inline">•</span>
          <span className="text-emerald-300 hidden sm:inline">İstanbul & Trakya Şantiye Ağı</span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0 font-medium">
          <a
            href={`tel:${PHONE_CLEAN}`}
            className="flex items-center gap-1 text-emerald-200 hover:text-white transition-colors"
          >
            <Phone className="w-3 h-3 text-emerald-400" />
            <span className="font-mono">{PHONE_NUMBER}</span>
          </a>
          <span className="text-emerald-700 hidden xs:inline">|</span>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xs:flex items-center gap-1 text-emerald-300 hover:text-white transition-colors"
          >
            <MessageCircle className="w-3 h-3 text-emerald-400" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-800 to-emerald-600 text-white flex items-center justify-center font-black text-base sm:text-xl shadow-md shadow-emerald-700/25 shrink-0 ring-2 ring-emerald-500/20">
            E
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-heading font-black text-slate-900 text-sm sm:text-lg tracking-tight truncate">
                EMBAY YAPI
              </span>
              <span className="text-[9px] sm:text-[11px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                Şahin Manitou
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate hidden xs:block">
              Operasyon Merkezi & Canlı Vitrin
            </p>
          </div>
        </div>

        {/* View Switcher and Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Dual mode selector */}
          <div className="bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 flex items-center shadow-inner">
            <button
              onClick={() => setCurrentView('panel')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all ${
                currentView === 'panel'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Operasyon</span> Paneli
            </button>
            <button
              onClick={() => setCurrentView('website')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all ${
                currentView === 'website'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Canlı</span> Vitrin
            </button>
          </div>

          {/* Pending Approvals quick badge */}
          {pendingApprovalsCount > 0 && (
            <button
              onClick={onOpenApprovals}
              className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400 text-amber-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-colors animate-pulse"
              title="Samet Bey onayını bekleyen işlem"
            >
              <BellRing className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-700 shrink-0" />
              <span className="font-mono">{pendingApprovalsCount}</span>
              <span className="hidden sm:inline">Onay</span>
            </button>
          )}

          {/* User profile indicator */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center font-bold text-[11px] text-emerald-800">
              SB
            </div>
            <div className="text-left text-xs">
              <span className="font-bold text-slate-800 block leading-tight">Samet Bey</span>
              <span className="text-[10px] text-emerald-600 font-medium">Yetkili Yönetici</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
