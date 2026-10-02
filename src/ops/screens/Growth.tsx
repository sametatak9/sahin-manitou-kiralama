// BÜYÜME MERKEZİ (eski "Takipçi botu"): seçili müşterinin GERÇEK takipçi grafiği + günlük elle etkileşim kartları.
// Kartlar Instagram'ın resmi etiket aramasından gelir (villa / müstakil ev / ev yaptırma ilgisi olan güncel gönderiler).
// Meta kuralı: otomatik takip / beğeni / yorum yapılmaz — kart, yöneticinin 20 saniyede yapacağı etkileşimi hazırlar.
import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Hash, Heart, MessageCircle, Radar, RefreshCw, SkipForward, Sparkles, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { callOps } from '../lib/api';
import { useClient } from '../client';
import { useRouter } from '../session';
import { cx, Notice, StateView } from '../ui';

interface Snap { day: string; platform: string; followers: number | null; media_count: number | null }
interface Card { id: string; permalink: string; hashtag: string | null; category: string; caption: string | null; like_count: number | null; comments_count: number | null; posted_at: string | null; score: number; suggested_comment: string | null; done_at: string | null; skipped_at: string | null }

const CAT: Record<string, { label: string; cls: string; why: string }> = {
  ev_yaptiran: { label: 'Ev yaptırıyor', cls: 'bg-emerald-100 text-emerald-800', why: 'Kendi evini yaptıran biri — en sıcak kitle. Tebrik yorumu bırakın, profilinize bakar.' },
  rakip_talepli: { label: 'Talep toplayan gönderi', cls: 'bg-amber-100 text-amber-800', why: 'Yorumlarında fiyat soran insanlar var. Yorum yapanların profillerine göz atın; bu gönderiye yorum yazmayın.' },
  arsa: { label: 'Arsa sahibi', cls: 'bg-sky-100 text-sky-800', why: 'Arsası olan kişi yakında ev yaptırabilir.' },
  hayalperest: { label: 'Ev hayali kuruyor', cls: 'bg-violet-100 text-violet-800', why: 'Bahçeli ev / villa beğenen kitle; samimi bir yorum görünürlük kazandırır.' },
  kitle: { label: 'Genel kitle', cls: 'bg-ink-900 text-ink-300', why: 'Etikette öne çıkan gönderi.' },
};
const DAILY_GOAL = 15;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
const ago = (iso: string | null) => { if (!iso) return ''; const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); return d <= 0 ? 'bugün' : `${d} gün önce`; };

/** Takipçi çizgisi: tek seri, 2px çizgi, üzerine gelince gün + değer ipucu */
function FollowerChart({ points }: { points: Array<{ day: string; v: number }> }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <div className="h-28 grid place-items-center text-[12px] text-[#C8D1E3]">Grafik için en az 2 günlük ölçüm gerekir — bot her gün otomatik ölçer.</div>;
  const W = 600, H = 120, P = 6;
  const vs = points.map((p) => p.v); const min = Math.min(...vs), max = Math.max(...vs); const span = Math.max(1, max - min);
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const h = hover != null ? points[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" role="img" aria-label="Takipçi sayısı grafiği"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const rel = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(points.length - 1, Math.round(((rel - P) / (W - 2 * P)) * (points.length - 1))))); }}>
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="rgba(255,255,255,.15)" strokeWidth="1" />
        <path d={`${d} L${x(points.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill="rgba(226,201,143,.12)" />
        <path d={d} fill="none" stroke="#E2C98F" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {h && hover != null && <>
          <line x1={x(hover)} x2={x(hover)} y1={P} y2={H - P} stroke="rgba(255,255,255,.35)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <circle cx={x(hover)} cy={y(h.v)} r="5" fill="#E2C98F" stroke="#0F1A33" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </>}
      </svg>
      {h && hover != null && (
        <div className="pointer-events-none absolute -top-1 rounded-lg bg-white text-[#0F1A33] px-2 py-1 text-[11px] font-semibold shadow" style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% - 50px), calc(100% - 100px))` }}>
          {new Date(h.day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} · {h.v.toLocaleString('tr-TR')} takipçi
        </div>
      )}
    </div>
  );
}

export function GrowthScreen() {
  const { client } = useClient();
  const { go } = useRouter();
  const cid = client?.id ?? '00000000-0000-0000-0000-000000000000';
  const snaps = useQuery(async () => unwrap(await db().from('growth_snapshots').select('day,platform,followers,media_count').eq('client_id', cid).order('day').limit(400)) as Snap[], [] as Snap[], [cid], ['growth_snapshots']);
  const cards = useQuery(async () => unwrap(await db().from('audience_radar').select('*').eq('client_id', cid).is('archived_at', null)
    .gte('posted_at', new Date(Date.now() - 60 * 86400000).toISOString()).order('score', { ascending: false }).limit(400)) as Card[], [] as Card[], [cid], ['audience_radar']);
  const inbox = useQuery(async () => {
    const r = await db().from('social_inbox').select('id', { count: 'exact', head: true }).eq('client_id', cid).eq('replied', false).in('intent', ['price', 'info', 'location']).is('archived_at', null);
    return r.count ?? 0;
  }, 0, [cid], ['social_inbox']);
  const [platform, setPlatform] = useState<'instagram' | 'facebook'>('instagram');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const series = useMemo(() => snaps.data.filter((s) => s.platform === platform && s.followers != null).map((s) => ({ day: s.day, v: s.followers as number })), [snaps.data, platform]);
  const last = series[series.length - 1]?.v ?? null;
  const weekAgo = series.length ? (series.find((p) => new Date(p.day).getTime() >= Date.now() - 7.5 * 86400000)?.v ?? series[0].v) : null;
  const delta = last != null && weekAgo != null ? last - weekAgo : null;

  const t = today();
  const doneToday = cards.data.filter((c) => c.done_at && c.done_at.slice(0, 10) === t).length;
  const open = cards.data.filter((c) => !c.done_at && !c.skipped_at);
  const todays = open.slice(0, Math.max(0, DAILY_GOAL - doneToday));
  const tagStats = useMemo(() => {
    const m = new Map<string, { n: number; hot: number }>();
    for (const c of cards.data) { const k = c.hashtag ?? '—'; const e = m.get(k) ?? { n: 0, hot: 0 }; e.n++; if (c.category === 'ev_yaptiran' || c.category === 'rakip_talepli') e.hot++; m.set(k, e); }
    return [...m.entries()].sort((a, b) => b[1].hot - a[1].hot || b[1].n - a[1].n).slice(0, 12);
  }, [cards.data]);

  const mark = async (c: Card, field: 'done_at' | 'skipped_at') => {
    cards.setData((list) => list.map((x) => (x.id === c.id ? { ...x, [field]: new Date().toISOString() } : x)));
    const { error } = await db().from('audience_radar').update({ [field]: new Date().toISOString() }).eq('id', c.id);
    if (error) { setMsg({ tone: 'error', text: error.message }); await cards.reload(); }
  };
  const copy = async (c: Card) => { try { await navigator.clipboard.writeText(c.suggested_comment ?? ''); setCopied(c.id); setTimeout(() => setCopied(null), 1500); } catch { /* izin yok */ } };
  const run = async (action: 'radar_sync' | 'growth_sync') => {
    setBusy(action); setMsg(null);
    try {
      const r = await callOps<Array<Record<string, unknown>> | null>(action);
      const mine = (r ?? []).filter((x) => x.client === client?.slug);
      if (action === 'radar_sync') {
        const added = mine.reduce((a, x) => a + Number(x.added ?? 0), 0); const skip = mine.find((x) => x.skipped)?.skipped as string | undefined;
        setMsg(skip ? { tone: 'info', text: `Tarama yapılamadı: ${skip}.` } : { tone: 'ok', text: `Radar tarandı: ${added} yeni gönderi bulundu.` });
      } else setMsg({ tone: 'ok', text: 'Takipçi sayısı ölçüldü.' });
      await Promise.all([cards.reload(), snaps.reload()]);
    } catch (e) { setMsg({ tone: 'error', text: (e as Error).message }); } finally { setBusy(null); }
  };

  if (!client) return <StateView kind="empty" title="Müşteri yok" message="Önce Ajans → Müşteriler ekranından bir işletme ekleyin." />;
  const tags = client.growth_tags?.length ? client.growth_tags : [];

  return (
    <div className="space-y-4">
      {/* Kahraman: gerçek takipçi sayısı + grafik */}
      <section className="rounded-3xl overflow-hidden text-white p-4 sm:p-5" style={{ background: `linear-gradient(135deg, ${client.color || '#0F1A33'} 0%, #1B2B55 60%, #0F1A33 100%)` }}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono tracking-[0.2em] text-[#E2C98F]">BÜYÜME MERKEZİ · {client.name.toLocaleUpperCase('tr-TR')}</div>
            <div className="mt-1 flex items-end gap-3 flex-wrap">
              <div className="font-display text-4xl font-bold tabular-nums">{last != null ? last.toLocaleString('tr-TR') : '—'}</div>
              <div className="pb-1 text-[13px] text-[#C8D1E3]">{platform === 'instagram' ? 'Instagram' : 'Facebook'} takipçi</div>
              {delta != null && series.length > 1 && (
                <span className={cx('mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold', delta >= 0 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-rose-400/20 text-rose-200')}>
                  {delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}{delta >= 0 ? '+' : ''}{delta} / 7 gün
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1.5">
            {(['instagram', 'facebook'] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPlatform(p)} className={cx('rounded-full px-3 py-1 text-[12px] font-semibold ring-1', platform === p ? 'bg-white text-[#0F1A33] ring-white' : 'ring-white/30 text-white/80')}>{p === 'instagram' ? 'Instagram' : 'Facebook'}</button>
            ))}
          </div>
        </div>
        <div className="mt-3"><FollowerChart points={series} /></div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { k: 'Bugünkü etkileşim', v: `${doneToday}/${DAILY_GOAL}`, icon: Heart },
            { k: 'Bekleyen kart', v: open.length, icon: Radar },
            { k: 'Yanıt bekleyen soru', v: inbox.data, icon: MessageCircle, go: true },
            { k: 'Takip edilen etiket', v: tags.length, icon: Hash },
          ].map((s) => (
            <button key={s.k} type="button" disabled={!s.go} onClick={() => s.go && go('reports', null, { view: 'inbox' })} className="text-left rounded-2xl bg-white/10 ring-1 ring-white/10 px-3 py-2 disabled:cursor-default enabled:hover:bg-white/15">
              <div className="flex items-center gap-1.5 text-[11px] text-[#C8D1E3]"><s.icon className="w-3.5 h-3.5" />{s.k}</div>
              <div className="text-xl font-bold tabular-nums">{s.v}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#E2C98F] transition-all" style={{ width: `${Math.min(100, (doneToday / DAILY_GOAL) * 100)}%` }} /></div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => run('radar_sync')} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full bg-[#C9A45C] text-[#0A1226] px-3 py-1.5 text-[12px] font-bold"><RefreshCw className={cx('w-3.5 h-3.5', busy === 'radar_sync' && 'animate-spin')} />Radarı şimdi tara</button>
          <button type="button" onClick={() => run('growth_sync')} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/25 px-3 py-1.5 text-[12px] font-semibold"><Users className="w-3.5 h-3.5" />Takipçiyi ölç</button>
        </div>
      </section>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        {/* Günün etkileşim kartları */}
        <section>
          <div className="flex items-end justify-between mb-2">
            <div>
              <h2 className="font-display text-base font-semibold text-ink-100">Bugünün etkileşim kartları</h2>
              <p className="text-[11px] text-ink-400">Gönderiyi açın → hazır yorumu kopyalayıp yapıştırın → “Yaptım”. Günde {DAILY_GOAL} kart ≈ 10 dakika.</p>
            </div>
          </div>
          {cards.loading && !cards.data.length ? <StateView kind="loading" compact /> : !todays.length ? (
            <StateView kind="empty" title={doneToday >= DAILY_GOAL ? 'Bugünün hedefi tamam 🎉' : 'Kart yok'} message={doneToday >= DAILY_GOAL ? 'Yarın sabah yeni kartlar hazır olacak.' : 'Radar her sabah 08:00’den sonra tarar. Instagram + Facebook bağlı ve büyüme etiketleri girili olmalı.'} />
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {todays.map((c) => {
                const cat = CAT[c.category] ?? CAT.kitle;
                return (
                  <li key={c.id} className="rounded-2xl bg-white ring-1 ring-ink-700/70 p-3.5 shadow-sm flex flex-col">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold', cat.cls)}>{cat.label}</span>
                      {c.hashtag && <span className="text-[10px] font-mono text-ink-400">#{c.hashtag}</span>}
                      <span className="ml-auto text-[10px] text-ink-400">{ago(c.posted_at)}</span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-ink-200 line-clamp-3">{c.caption || 'Açıklamasız gönderi'}</p>
                    <div className="mt-1 flex gap-3 text-[11px] text-ink-400"><span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" />{c.like_count ?? 0}</span><span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" />{c.comments_count ?? 0}</span><span className="font-mono">puan {c.score}</span></div>
                    <p className="mt-1.5 text-[11px] text-ink-400 italic">{cat.why}</p>
                    {c.suggested_comment && (
                      <button type="button" onClick={() => copy(c)} className="mt-2 text-left rounded-xl bg-[#F6F1E4] ring-1 ring-[#E2C98F] px-2.5 py-2 text-[12px] text-[#3B2F14] hover:bg-[#F1E8D2]">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#8A6A2B] mb-0.5">{copied === c.id ? <><Check className="w-3 h-3" />KOPYALANDI</> : <><Copy className="w-3 h-3" />ÖNERİLEN YORUM · dokun, kopyala</>}</span>
                        {c.suggested_comment}
                      </button>
                    )}
                    <div className="mt-auto pt-2.5 flex flex-wrap gap-1.5">
                      <a href={c.permalink} target="_blank" rel="noreferrer" className="ops-chip !bg-[#0F1A33] !text-white !ring-transparent"><ExternalLink className="w-3.5 h-3.5" />Gönderiyi aç</a>
                      <button type="button" onClick={() => mark(c, 'done_at')} className="ops-chip !bg-emerald-600 !text-white !ring-transparent"><Check className="w-3.5 h-3.5" />Yaptım</button>
                      <button type="button" onClick={() => mark(c, 'skipped_at')} className="ops-chip"><SkipForward className="w-3.5 h-3.5" />Geç</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Yan sütun: etiket verimi + nasıl çalışır */}
        <aside className="space-y-3">
          <div className="rounded-2xl bg-white ring-1 ring-ink-700/70 p-3.5">
            <div className="text-[13px] font-semibold text-ink-100 flex items-center gap-1.5"><Hash className="w-4 h-4 text-brand-green" />Etiket verimi</div>
            <p className="text-[11px] text-ink-400 mb-2">Hangi etikette sıcak kitle (ev yaptıran / talep toplayan) çıkıyor.</p>
            {!tagStats.length ? <p className="text-[12px] text-ink-400">Henüz tarama yok.</p> : (
              <ul className="space-y-1">
                {tagStats.map(([tag, s]) => (
                  <li key={tag} className="flex items-center gap-2 text-[12px]">
                    <span className="font-mono text-ink-200 truncate flex-1">#{tag}</span>
                    <span className="text-ink-400 tabular-nums">{s.n}</span>
                    <span className="w-14 h-1.5 rounded-full bg-ink-900 overflow-hidden"><span className="block h-full bg-emerald-500" style={{ width: `${s.n ? (s.hot / s.n) * 100 : 0}%` }} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl bg-white ring-1 ring-ink-700/70 p-3.5 text-[12px] text-ink-300 space-y-1.5">
            <div className="text-[13px] font-semibold text-ink-100 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-500" />Bot nasıl çalışır?</div>
            <p>1. Her sabah müşterinin etiketlerinde (ör. #müstakilev, #çelikvilla) son 60 günün gönderilerini <b>Instagram’ın resmi aramasıyla</b> tarar.</p>
            <p>2. Ev yaptıran, arsa sahibi, talep toplayan gönderileri puanlar ve kart hazırlar.</p>
            <p>3. Kendi gönderilerimize gelen fiyat/bilgi sorularına 10 dk içinde kibar yanıt verir.</p>
            <p>4. Takipçi sayısını her gün ölçer — sonuç grafikte görünür.</p>
            <p className="text-[11px] text-ink-400">Otomatik takip/beğeni yapılmaz: Meta bunu yasaklar ve hesabı kısıtlar. Kartlar elle etkileşimi 20 saniyeye indirir.</p>
            <button type="button" onClick={() => go('clients')} className="ops-chip mt-1">Etiketleri düzenle</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
