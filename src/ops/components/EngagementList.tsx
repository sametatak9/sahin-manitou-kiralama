// Günlük etkileşim listesi (ELLE): Sosyal Büyüme botunun bulduğu inşaat gönderileri (beğen + yorum) ve işletme hesapları (takip).
// Otomatik beğeni/takip YOK (Meta kuralları). Her satırda: Aç · Yorumu kopyala · Yaptım ✓ (bu cihazda işaretlenir).
import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Heart, MessageCircle, UserPlus } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import type { Mission, MissionFinding } from '../lib/types';
import { cx, StateView } from '../ui';

const DONE_KEY = 'embay-engagement-done';
const FALLBACK = [
  'Emeğinize sağlık, çok temiz bir iş 👏',
  'Hayırlı olsun, ellerinize sağlık 👷‍♂️',
  'İlerleme harika görünüyor, başarılar dileriz 🏗️',
  'Detaylar çok özenli, tebrikler 👌',
  'Güzel bir proje olmuş, hayırlı uğurlu olsun 🏡',
];
function loadDone(): Record<string, boolean> { try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}'); } catch { return {}; } }
function saveDone(v: Record<string, boolean>) { try { localStorage.setItem(DONE_KEY, JSON.stringify(v)); } catch { /* gizli mod */ } }

type Kind = 'post' | 'account';
function kindOf(url: string): Kind | null {
  if (/facebook\.com\/groups|\/popular\/|\/explore\//.test(url)) return null;
  if (/instagram\.com\/(p|reel)\//.test(url) || /facebook\.com\/.+\/(videos|posts)\//.test(url)) return 'post';
  if (/instagram\.com\/[^/?#]+\/?(\?|$)/.test(url) || /facebook\.com\/[^/?#]+\/?$/.test(url)) return 'account';
  return null;
}
function commentOf(f: MissionFinding, i: number) {
  const m = `${f.fit ?? ''} ${f.detail ?? ''}`.match(/Yorum önerisi:\s*["“](.+?)["”]/);
  return m ? m[1] : FALLBACK[i % FALLBACK.length];
}
const handleOf = (url: string) => url.match(/instagram\.com\/([^/?#]+)/)?.[1];

export function EngagementList() {
  const q = useQuery(async () => {
    const { data: bot } = await db().from('automation_bots').select('id').eq('slug', 'sosyal-buyume').maybeSingle();
    if (!bot) return [] as Mission[];
    return unwrap(await db().from('bot_missions').select('id,title,created_at,finished_at,status,findings').eq('bot_id', bot.id).in('status', ['completed', 'stopped', 'finalizing']).order('created_at', { ascending: false }).limit(12)) as Mission[];
  }, [] as Mission[], [], ['bot_missions']);
  const lists = q.data.filter((m) => (m.findings ?? []).some((f) => kindOf(f.url)));
  const [sel, setSel] = useState<string | null>(null);
  const cur = lists.find((m) => m.id === sel) ?? lists[0];
  const [done, setDone] = useState<Record<string, boolean>>(loadDone);
  const [copied, setCopied] = useState<string | null>(null);
  const rows = useMemo(() => {
    const seen = new Set<string>();
    return (cur?.findings ?? []).map((f, i) => ({ f, i, kind: kindOf(f.url) })).filter((r) => r.kind && !seen.has(r.f.url) && seen.add(r.f.url)) as Array<{ f: MissionFinding; i: number; kind: Kind }>;
  }, [cur]);
  const posts = rows.filter((r) => r.kind === 'post'); const accounts = rows.filter((r) => r.kind === 'account');
  const doneCount = rows.filter((r) => done[r.f.url]).length;
  const toggle = (url: string) => { const n = { ...done, [url]: !done[url] }; setDone(n); saveDone(n); };
  const copy = async (text: string, url: string) => { try { await navigator.clipboard.writeText(text); setCopied(url); setTimeout(() => setCopied(null), 1500); } catch { /* izin yok */ } };

  if (q.loading && !q.data.length) return <StateView kind="loading" compact />;
  if (!cur) return <StateView kind="empty" title="Henüz etkileşim listesi yok" message="Sosyal Büyüme botu her gün 10:00’da listeyi hazırlar (Otopilot → “Botları başlat” ile hemen de çalışır)." />;

  const Row = ({ f, i, kind }: { f: MissionFinding; i: number; kind: Kind }) => {
    const c = commentOf(f, i); const isDone = done[f.url]; const h = handleOf(f.url);
    const title = f.title.replace(/^💬 Beğen \+ yorum:\s*|^💬 Beğen:\s*|^➕ Takip et:\s*/, '');
    return (
      <li className={cx('rounded-2xl bg-white ring-1 p-3 transition', isDone ? 'ring-emerald-300 opacity-70' : 'ring-ink-700/70 shadow-sm')}>
        <div className="flex items-start gap-3">
          <span className={cx('shrink-0 w-10 h-10 rounded-xl grid place-items-center text-white', kind === 'post' ? 'bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400' : 'bg-gradient-to-br from-[#262A6B] to-[#1E3FA0]')}>
            {kind === 'post' ? <Heart className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-ink-100 line-clamp-2">{title}</div>
            <div className="text-[11px] text-ink-400 truncate">{h ? `@${h}` : f.url.replace(/^https?:\/\/(www\.)?/, '')}</div>
            {kind === 'post' && (
              <div className="mt-2 rounded-xl bg-ink-900/60 ring-1 ring-ink-800 px-2.5 py-1.5 text-[12px] text-ink-200 flex items-start gap-2">
                <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-green" /><span className="flex-1">{c}</span>
              </div>
            )}
            {kind === 'account' && f.fit && !/Kural tabanlı/.test(f.fit) && <div className="mt-1 text-[11px] text-emerald-800">🎯 {f.fit}</div>}
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <a href={f.url} target="_blank" rel="noreferrer" className="ops-chip"><ExternalLink className="w-3.5 h-3.5" />{kind === 'post' ? 'Gönderiyi aç' : 'Profili aç'}</a>
          {kind === 'post' && <button type="button" onClick={() => copy(c, f.url)} className="ops-chip"><Copy className="w-3.5 h-3.5" />{copied === f.url ? 'Kopyalandı ✓' : 'Yorumu kopyala'}</button>}
          <button type="button" onClick={() => toggle(f.url)} className={cx('ops-chip', isDone && '!bg-emerald-600 !text-white !ring-emerald-600')}><Check className="w-3.5 h-3.5" />{isDone ? 'Yapıldı' : kind === 'post' ? 'Beğendim + yorumladım' : 'Takip ettim'}</button>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#262A6B] via-[#1E3FA0] to-[#262A6B] text-white p-4">
        <div className="text-[10px] font-mono tracking-widest text-[#CFE4FA]">TAKİPÇİ BÜYÜTME · ELLE ETKİLEŞİM</div>
        <div className="font-display text-lg font-semibold mt-0.5">Bugünün listesi: {posts.length} gönderi · {accounts.length} hesap</div>
        <p className="text-[12px] text-[#DCE9FB] mt-1">Instagram’da açın → beğenin → hazır yorumu yapıştırın (kişiselleştirin) → “Yaptım” deyin. Günde 15–20 dakika yeter. Otomatik beğeni/takip hesabı kapattırır; bu yöntem güvenli.</p>
        <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-[#8FC6F2] transition-all" style={{ width: `${rows.length ? (doneCount / rows.length) * 100 : 0}%` }} /></div>
        <div className="mt-1 text-[11px] text-[#CFE4FA]">{doneCount}/{rows.length} tamamlandı</div>
      </div>
      {lists.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto ops-scroll pb-1">
          {lists.map((m) => <button key={m.id} type="button" onClick={() => setSel(m.id)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1', m.id === cur.id ? 'bg-brand-green text-white ring-brand-green' : 'bg-white ring-ink-700 text-ink-300')}>{fmtDateTime(m.created_at)}</button>)}
        </div>
      )}
      {posts.length > 0 && <section className="space-y-2"><h3 className="text-sm font-semibold text-ink-100 inline-flex items-center gap-1.5"><Heart className="w-4 h-4 text-rose-500" />Beğen + yorum yap</h3><ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">{posts.map((r) => <Row key={r.f.url} {...r} />)}</ul></section>}
      {accounts.length > 0 && <section className="space-y-2"><h3 className="text-sm font-semibold text-ink-100 inline-flex items-center gap-1.5"><UserPlus className="w-4 h-4 text-[#1E3FA0]" />Takip et</h3><ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">{accounts.map((r) => <Row key={r.f.url} {...r} />)}</ul></section>}
    </div>
  );
}
