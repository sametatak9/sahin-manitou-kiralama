// İÇERİK KONTROLÜ: içerikçi botun ürettiği her taslağı yayından önce tam kontrol listesinden geçirir.
// Telefon · marka adı · metin · etiket · rakam/vaat · KVKK · medya · video kalitesi · tekrar · takvim · hesap bağlantısı.
// Kırmızı (hata) olan içerik otomatik paylaşılmaz; "Bot düzeltsin" metni kurallara göre onarır (uydurma yok).
import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, RefreshCw, ShieldCheck, Wand2, XCircle } from 'lucide-react';
import { useQuery } from '../lib/hooks';
import { callOps, errorText } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { Button, cx, Notice, PlatformBadge, StateView } from '../ui';

type Level = 'ok' | 'warn' | 'error';
interface Item { key: string; label: string; level: Level; detail: string; fixable?: boolean }
interface Row { id: string; level: Level; score: number; items: Item[]; title: string | null; platform: string | null; format: string | null; scheduled_at: string | null; status: string; thumb: string | null; video: string | null }
interface Res { checked: number; errors: number; warnings: number; items: Row[] }

const ICON: Record<Level, ReactNode> = {
  ok: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, warn: <AlertTriangle className="w-4 h-4 text-amber-500" />, error: <XCircle className="w-4 h-4 text-rose-600" />,
};
const TONE: Record<Level, string> = { ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200', warn: 'bg-amber-50 text-amber-800 ring-amber-200', error: 'bg-rose-50 text-rose-800 ring-rose-200' };
const STATUS: Record<string, string> = { draft: 'Havuzda', pending_approval: 'Onay bekliyor', approved: 'Onaylandı', scheduled: 'Planlandı' };

export function ContentCheckPanel() {
  const q = useQuery(() => callOps<Res>('content_check'), { checked: 0, errors: 0, warnings: 0, items: [] } as Res, []);
  const [f, setF] = useState<'all' | Level>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const rows = useMemo(() => q.data.items.filter((r) => f === 'all' || r.level === f).sort((a, b) => ({ error: 0, warn: 1, ok: 2 }[a.level] - { error: 0, warn: 1, ok: 2 }[b.level])), [q.data.items, f]);
  const fix = async (r: Row) => {
    setBusy(r.id); setMsg(null);
    try {
      const out = await callOps<{ changed: boolean; message?: string; after?: Level }>('content_fix', { id: r.id });
      setMsg({ tone: 'ok', text: out.changed ? `Bot metni düzeltti — yeni durum: ${out.after === 'ok' ? 'tümü geçti ✓' : out.after === 'warn' ? 'yalnızca uyarı kaldı' : 'hâlâ hata var, elle bakın'}. Önceki metin taslağın notlarında saklandı.` : out.message ?? 'Değişiklik gerekmedi' });
      await q.reload();
    } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const ok = q.data.checked - q.data.errors - q.data.warnings;

  return (
    <div className="space-y-4">
      <section className="ops-hero">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="ops-kicker">İÇERİK KONTROLÜ</div>
            <h2 className="ops-hero-title inline-flex items-center gap-2"><ShieldCheck className="w-5 h-5" />Paylaşılmadan önce her içerik kontrol edilir</h2>
            <p className="ops-hero-text">Telefon (yalnızca 0531 436 29 04), marka adı, metin, etiketler, fiyat/süre vaadi, kişisel veri, görsel/video, video kalitesi, tekrar paylaşım, takvim ve hesap bağlantısı. Kırmızı olanlar otomatik paylaşılmaz.</p>
          </div>
          <button type="button" className="ops-hero-btn" onClick={() => q.reload()}><RefreshCw className={cx('w-4 h-4', q.loading && 'animate-spin')} />Yeniden kontrol et</button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {([[q.data.errors, 'hata (paylaşılmaz)', 'error'], [q.data.warnings, 'uyarı', 'warn'], [ok, 'tümü geçti', 'ok']] as const).map(([n, l, k]) => (
            <button key={k} type="button" onClick={() => setF(f === k ? 'all' : k)} className={cx('ops-hero-stat text-left', f === k && 'ring-2 ring-white')}><div className="text-xl font-bold tabular-nums">{n}</div><div className="text-[11px] opacity-90">{l}</div></button>
          ))}
        </div>
      </section>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {q.error && <Notice tone="error">{q.error}</Notice>}
      {q.loading && !q.data.items.length ? <StateView kind="loading" compact /> : !rows.length ? <StateView kind="empty" title={f === 'all' ? 'Kontrol edilecek içerik yok' : 'Bu filtrede içerik yok'} /> : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const bad = r.items.filter((i) => i.level !== 'ok');
            const fixable = bad.some((i) => i.fixable);
            return (
              <li key={r.id} className="ops-card">
                <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="w-full flex items-center gap-3 p-2.5 text-left">
                  <div className="w-11 h-14 rounded-lg overflow-hidden bg-[#0E1E46] shrink-0">
                    {r.thumb && !/\.(mp4|mov)/i.test(r.thumb) ? <img src={r.thumb} alt="" className="w-full h-full object-cover" /> : r.video ? <video src={`${r.video}#t=1`} preload="metadata" muted className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap"><PlatformBadge platform={r.platform} /><span className="text-[13px] font-semibold text-ink-100 truncate">{r.title || 'İçerik'}</span></div>
                    <div className="text-[11px] text-ink-400 mt-0.5">{STATUS[r.status] ?? r.status}{r.scheduled_at ? ` · ${fmtDateTime(r.scheduled_at)}` : ''} · {(r.format || '').replace('reel', 'Reels')}</div>
                    {bad.length > 0 && <div className="text-[11px] mt-0.5 text-ink-300 line-clamp-1">{bad.map((b) => b.label).join(' · ')}</div>}
                  </div>
                  <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold ring-1', TONE[r.level])}>{r.level === 'ok' ? 'Geçti' : r.level === 'warn' ? 'Uyarı' : 'Hata'} · %{r.score}</span>
                  <ChevronDown className={cx('w-4 h-4 text-ink-400 transition', open === r.id && 'rotate-180')} />
                </button>
                {open === r.id && (
                  <div className="border-t border-ink-700/60 p-3 space-y-3">
                    <ul className="grid sm:grid-cols-2 gap-1.5">
                      {r.items.map((i) => (
                        <li key={i.key} className="flex items-start gap-2 text-[12px]">{ICON[i.level]}<span><b className="text-ink-200">{i.label}:</b> <span className="text-ink-400">{i.detail}</span></span></li>
                      ))}
                    </ul>
                    {fixable && <Button variant="primary" icon={<Wand2 className="w-4 h-4" />} loading={busy === r.id} onClick={() => fix(r)}>Bot düzeltsin</Button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
