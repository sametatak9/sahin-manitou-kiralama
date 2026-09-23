import React, { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  Inbox,
  AlertCircle,
  Building,
  FileText
} from 'lucide-react';
import { EmailMessage } from '../../types';

interface EmailCenterViewProps {
  emails: EmailMessage[];
  onApproveAndSend: (id: string) => void;
}

export const EmailCenterView: React.FC<EmailCenterViewProps> = ({ emails, onApproveAndSend }) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage>(emails[0]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          E-POSTA MERKEZİ & OTOMATİK TEKLİF YANITLAYICI
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Akıllı Gelen Kutusu & CRM Sınıflandırma
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Gelen kurumsal talepler AI tarafından müşteri, teklif, acil durum olarak sınıflandırılır. Samet Bey onayı olmadan hiçbir e-posta otomatik gönderilmez (Draft → Approval → Send).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Email List (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Gelen Mesajlar ({emails.length})
            </h3>
            <span className="text-[11px] text-emerald-700 font-semibold">Tümü Sınıflandırıldı</span>
          </div>

          <div className="space-y-2">
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedEmail?.id === email.id
                    ? 'bg-emerald-50/70 border-emerald-400 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-slate-800 truncate max-w-[180px]">{email.from}</span>
                  <span className="text-slate-400 font-mono">{email.receivedAt.split(' ')[1]}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">{email.subject}</h4>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {email.category === 'PROPOSAL_REQUEST' ? 'Teklif Talebi' : email.category}
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {email.status === 'NEEDS_APPROVAL' ? 'Onay Bekliyor' : 'Gönderildi'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Email & AI Draft Reply (7 Cols) */}
        {selectedEmail && (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Kimden: <strong className="text-slate-800">{selectedEmail.from}</strong></span>
                <span className="font-mono">{selectedEmail.receivedAt}</span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900">{selectedEmail.subject}</h2>
              {selectedEmail.matchedCompany && (
                <p className="text-xs text-emerald-800 mt-1 flex items-center gap-1 font-semibold">
                  <Building className="w-3.5 h-3.5 text-emerald-600" />
                  Eşleşen Müşteri: {selectedEmail.matchedCompany}
                </p>
              )}
            </div>

            {/* AI Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-700">Yapay Zeka Özeti & Analizi:</span>
              <p className="text-slate-600 leading-relaxed">{selectedEmail.summary}</p>
              <p className="text-emerald-800 font-semibold pt-1">
                Önerilen Sonraki Aksiyon: {selectedEmail.suggestedAction}
              </p>
            </div>

            {/* AI Draft Response */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Hazırlanan Yanıt Taslağı (Samet Bey Onayına Tabidir):
                </span>
                <span className="text-[10px] text-emerald-700">Korumalı Mod</span>
              </div>

              <textarea
                defaultValue={selectedEmail.draftReply}
                rows={5}
                className="w-full p-3 bg-white text-slate-800 border border-emerald-300 rounded-xl text-xs leading-relaxed focus:outline-none focus:border-emerald-600 font-sans"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Resmi hat: <strong>0531 436 29 04</strong> eklenmiştir.
                </span>

                <button
                  onClick={() => onApproveAndSend(selectedEmail.id)}
                  disabled={selectedEmail.status === 'SENT'}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                    selectedEmail.status === 'SENT'
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {selectedEmail.status === 'SENT' ? 'Gönderildi' : 'Onayla ve Yanıtı Gönder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
