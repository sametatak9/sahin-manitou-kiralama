// Bulgu kartviziti: bot bulgularını düz yazı yerine kartvizit görünümünde gösterir
// (firma baş harfi / platform rozeti, uygunluk puanı, konum-tarih, iletişim düğmeleri, portföye arşivle).
import { useState } from 'react';
import { Archive, CalendarDays, ChevronDown, ExternalLink, Globe, Mail, MapPin, MessageCircle, Phone, Target } from 'lucide-react';
import { db } from '../lib/hooks';
import { relTime } from '../lib/format';
import type { Mission, MissionFinding } from '../lib/types';
import { cx } from '../ui';

/** Türkiye numarasını wa.me biçimine çevirir (905xxxxxxxxx). Geçersizse null. */
export function waNumber(phone?: string | null) {
  const d = (phone || '').replace(/\D/g, '');
  if (/^90\d{10}$/.test(d)) return d;
  if (/^0\d{10}$/.test(d)) return `9${d}`;
  if (/^\d{10}$/.test(d)) return `90${d}`;
  return null;
}
const WA_TEXT = (f: MissionFinding) => `Merhaba${f.company ? ` ${f.company}` : ''}, "${f.title.slice(0, 80)}" ilanınızı gördük. Embay Yapı & Şahin Manitou olarak operatörlü Manitou / teleskopik yükleyici kiralama ve inşaat hizmetlerimizle destek olabiliriz. Bilgi almak ister misiniz? 0531 436 29 04`;

function platformOf(url: string): { key: 'instagram' | 'facebook' | 'web'; handle: string | null } {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean)[0] ?? null;
    if (u.hostname.includes('instagram.com')) return { key: 'instagram', handle: seg && !['p', 'reel', 'explore', 'popular'].includes(seg) ? `@${seg}` : null };
    if (u.hostname.includes('facebook.com')) return { key: 'facebook', handle: null };
    return { key: 'web', handle: u.hostname.replace(/^www\./, '') };
  } catch { return { key: 'web', handle: null }; }
}

/** Başlıktan kartvizitte görünecek ad: "Kılıç İnşaat (@kilicinsaattr)" → "Kılıç İnşaat". */
function displayName(f: MissionFinding) {
  if (f.company) return f.company;
  return f.title.replace(/\s*\(@[^)]+\)\s*/g, ' ').replace(/\s+[—–-]\s+.*$/, '').trim() || f.title;
}

const VERDICT: Record<string, { label: string; cls: string }> = {
  verified: { label: '✓ Doğrulandı', cls: 'bg-emerald-400/20 text-emerald-100 ring-emerald-300/40' },
  suspicious: { label: '⚠ Kontrol edin', cls: 'bg-amber-400/20 text-amber-100 ring-amber-300/40' },
  rejected: { label: '✕ Elendi', cls: 'bg-rose-400/20 text-rose-100 ring-rose-300/40' },
};

export function FindingCard({ f, i, m }: { f: MissionFinding; i: number; m: Pick<Mission, 'bot_id' | 'search_for'> }) {
  const [archived, setArchived] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const wa = waNumber(f.phone);
  const pf = platformOf(f.url);
  const name = displayName(f);
  const subtitle = name === f.title ? null : f.title;
  const initial = name.replace(/^[^\p{L}\p{N}]+/u, '').charAt(0).toLocaleUpperCase('tr-TR') || '•';
  const score = typeof f.relevance === 'number' ? Math.max(0, Math.min(10, f.relevance)) : null;
  const archive = async () => {
    const { data, error } = await db().rpc('portfolio_upsert_company', { p: { firm_name: name.slice(0, 160), source_url: f.url, public_phone: f.phone ?? null, public_email: f.email ?? null, website: f.website ?? null, ilce: f.location ?? null,
      ai_notes: `${f.title} — ${f.detail}`.slice(0, 1500), source: 'bot_mission', need: m.search_for ?? null }, p_bot_id: m.bot_id, p_run_id: null, p_finding_id: null });
    setArchived(error ? `Hata: ${error.message}` : (data as { action: string }).action === 'merged' ? 'Mevcut kayıtla birleşti' : 'Portföye eklendi');
  };

  return (
    <li className="list-none rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-ink-700/70 flex flex-col">
      {/* Kartvizit başlığı */}
      <div className="relative bg-gradient-to-br from-[#262A6B] via-[#1E3FA0] to-[#262A6B] text-white px-4 pt-3.5 pb-3">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
        <div className="relative flex items-start gap-3">
          <div className={cx('shrink-0 w-12 h-12 rounded-xl grid place-items-center text-lg font-bold ring-2 ring-white/40',
            pf.key === 'instagram' ? 'bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400' : pf.key === 'facebook' ? 'bg-[#1877F2]' : 'bg-[#8FC6F2] text-[#1B1F52]')}>{initial}</div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold text-[15px] leading-tight line-clamp-2">{name}</div>
            <div className="text-[11px] text-[#CFE4FA] mt-0.5 truncate">{pf.handle ?? (pf.key === 'facebook' ? 'Facebook' : '')}{f.posted ? ` · ${f.posted}` : ''}</div>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-white/60">#{i + 1}</span>
        </div>
        <div className="relative flex flex-wrap items-center gap-1.5 mt-2.5">
          {f.verdict && <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', VERDICT[f.verdict]?.cls)}>{VERDICT[f.verdict]?.label}</span>}
          {score !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
              Uygunluk
              <span className="inline-flex gap-0.5">{Array.from({ length: 5 }, (_, k) => <span key={k} className={cx('w-1.5 h-1.5 rounded-full', k < Math.round(score / 2) ? 'bg-[#8FC6F2]' : 'bg-white/25')} />)}</span>
              {score}/10
            </span>
          )}
        </div>
      </div>

      {/* Gövde */}
      <div className="px-4 py-3 space-y-2 flex-1">
        {subtitle && <div className="text-[13px] font-semibold text-ink-100 leading-snug">{subtitle}</div>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
          {f.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{f.location}</span>}
          {f.posted && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" />{f.posted}</span>}
          <span>{relTime(f.at)} bulundu</span>
        </div>
        {f.fit && <div className="flex gap-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-2.5 py-1.5 text-[12px] text-emerald-900"><Target className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{f.fit}</span></div>}
        {f.detail && (
          <div>
            <p className={cx('text-[12px] text-ink-300 whitespace-pre-line', !more && 'line-clamp-3')}>{f.detail}</p>
            {f.detail.length > 160 && <button type="button" onClick={() => setMore(!more)} className="text-[11px] text-brand-green inline-flex items-center gap-0.5">{more ? 'Daha az' : 'Devamı'}<ChevronDown className={cx('w-3 h-3 transition', more && 'rotate-180')} /></button>}
          </div>
        )}
      </div>

      {/* İletişim şeridi */}
      <div className="border-t border-ink-800 bg-ink-900/40 px-3 py-2.5 flex flex-wrap gap-1.5">
        <a href={f.url} target="_blank" rel="noreferrer" className="ops-chip"><ExternalLink className="w-3.5 h-3.5" />{pf.key === 'instagram' ? 'Profili aç' : pf.key === 'facebook' ? 'Sayfayı aç' : 'Kaynağa git'}</a>
        {f.phone && <a href={`tel:${f.phone.replace(/[^\d+]/g, '')}`} className="ops-chip"><Phone className="w-3.5 h-3.5" />{f.phone}</a>}
        {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(WA_TEXT(f))}`} target="_blank" rel="noreferrer" className="ops-chip !bg-emerald-600 !text-white !ring-emerald-600"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</a>}
        {f.email && <a href={`mailto:${f.email}`} className="ops-chip"><Mail className="w-3.5 h-3.5" />E-posta</a>}
        {f.website && <a href={f.website} target="_blank" rel="noreferrer" className="ops-chip"><Globe className="w-3.5 h-3.5" />Web</a>}
        {archived ? <span className="text-[11px] font-semibold text-emerald-700 self-center">{archived}</span>
          : <button type="button" onClick={archive} className="ops-chip"><Archive className="w-3.5 h-3.5" />Portföye ekle</button>}
      </div>
    </li>
  );
}
