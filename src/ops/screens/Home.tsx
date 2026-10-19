// ANA SAYFA: işletme sahibinin 30 saniyede göreceği şeyler — büyüme, sıradaki paylaşımlar, yapılacaklar, sıcak müşteri adayları,
// son paylaşımların sonucu, botların bulduğu fırsatlar. Teknik ayrıntı (bot zaman çizelgesi, otopilot) alt sayfalarda / katlanır bölümde.
import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, Bot, CalendarClock, ChevronRight, Facebook, FileText, Heart, Instagram, MessageCircle, Settings2, TrendingDown, TrendingUp } from 'lucide-react';
import { callOps } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { dayKey, istanbulHour, relTime, timeOf } from '../lib/format';
import type { OpsStatus } from '../lib/types';
import { useRouter, useSession } from '../session';
import { SECTORS, useClient } from '../client';
import { cx, ErrorState, PlatformBadge, StateView } from '../ui';
import { OwnerTodos } from '../components/OwnerTodos';
import { Prospects } from '../components/Prospects';
import { AutopilotCard } from '../components/AutopilotCard';

interface Snap { platform: string; day: string; followers: number | null }
interface NextPost { id: string; format: string | null; headline: string | null; title: string | null; scheduled_at: string; primary_platform: string | null; design_url: string | null; media_urls: string[] | null; video_url: string | null }
interface Pub { id: string; platform: string; published_at: string | null; external_url: string | null; content_id: string | null }
interface Metric { publication_id: string; likes: number | null; comments: number | null; fetched_at: string }
interface Mission { id: string; title: string; summary: string | null; finished_at: string | null; status: string }
interface Account { id: string; platform: string; account_name: string | null; external_account_name: string | null; handle: string | null; connection_status: string | null }

const isVid = (u?: string | null) => !!u && /\.(mp4|mov|m4v)(\?|$)/i.test(u);
const FMT: Record<string, string> = { reel: 'Reels', carousel: 'Kaydırmalı', banner: 'Banner', post: 'Gönderi', story: 'Hikâye' };

async function loadHome(clientId: string) {
  const s = db();
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [snaps, next, pubs, askers, accounts, missions, failedDrafts, titles, bots] = await Promise.all([
    s.from('growth_snapshots').select('platform,day,followers').eq('client_id', clientId).gte('day', dayKey(new Date(Date.now() - 10 * 86400_000))).order('day', { ascending: true }).limit(200),
    s.from('social_drafts').select('id,format,headline,title,scheduled_at,primary_platform,design_url,media_urls,video_url').eq('client_id', clientId).in('workflow_status', ['scheduled', 'approved'])
      .is('archived_at', null).gt('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(12),
    s.from('social_publications').select('id,platform,published_at,external_url,content_id').eq('client_id', clientId).eq('status', 'published').order('published_at', { ascending: false }).limit(8),
    s.from('social_inbox').select('id', { count: 'exact', head: true }).eq('client_id', clientId).in('intent', ['price', 'location', 'info']).eq('follow_stage', 'yeni').is('archived_at', null),
    s.from('social_accounts').select('id,platform,account_name,external_account_name,handle,connection_status').eq('client_id', clientId).order('created_at', { ascending: false }).limit(20),
    s.from('bot_missions').select('id,title,summary,finished_at,status').eq('client_id', clientId).eq('status', 'completed').not('summary', 'is', null).order('finished_at', { ascending: false }).limit(3),
    s.from('social_drafts').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('workflow_status', 'failed').is('archived_at', null).gte('scheduled_at', weekAgo),
    s.from('social_drafts').select('id,headline,title,design_url,media_urls,video_url,format').eq('client_id', clientId).eq('workflow_status', 'published').gte('scheduled_at', new Date(Date.now() - 21 * 86400_000).toISOString()).limit(200),
    s.from('automation_bots').select('id').eq('client_id', clientId),
  ]);
  const botIds = (unwrap(bots) as Array<{ id: string }>).map((bot) => bot.id);
  const failedTasks = botIds.length ? unwrap(await s.from('automation_tasks').select('id,title,last_error').in('bot_id', botIds).in('status', ['dead_letter', 'failed']).is('archived_at', null).limit(3)) as Array<{ id: string; title: string | null; last_error: string | null }> : [];
  const pubList = unwrap(pubs) as Pub[];
  const met = pubList.length ? unwrap(await s.from('social_post_metrics').select('publication_id,likes,comments,fetched_at').in('publication_id', pubList.map((p) => p.id)).order('fetched_at', { ascending: false })) as Metric[] : [];
  const weekPubs = await s.from('social_publications').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'published').gte('published_at', weekAgo);
  return {
    snaps: unwrap(snaps) as Snap[], next: unwrap(next) as NextPost[], pubs: pubList, metrics: met, askers: askers.count ?? 0,
    accounts: unwrap(accounts) as Account[], missions: unwrap(missions) as Mission[], failedDrafts: failedDrafts.count ?? 0,
    failedTasks, weekPubs: weekPubs.count ?? 0,
    drafts: unwrap(titles) as Array<{ id: string; headline: string | null; title: string | null; design_url: string | null; media_urls: string[] | null; video_url: string | null; format: string | null }>,
  };
}
type HomeData = Awaited<ReturnType<typeof loadHome>>;
const EMPTY: HomeData = { snaps: [], next: [], pubs: [], metrics: [], askers: 0, accounts: [], missions: [], failedDrafts: 0, failedTasks: [], weekPubs: 0, drafts: [] };

export function HomeScreen() {
  const { go } = useRouter();
  const session = useSession();
  const { client } = useClient();
  const clientId = client?.id ?? '00000000-0000-0000-0000-000000000000';
  const q = useQuery(() => loadHome(clientId), EMPTY, [clientId], ['social_drafts', 'social_publications', 'social_inbox', 'social_accounts', 'growth_snapshots', 'bot_missions', 'automation_bots', 'automation_tasks']);
  const status = useQuery<OpsStatus | null>(() => callOps<OpsStatus>('status'), null, []);
  const d = q.data;

  const growth = useMemo(() => {
    const out: Record<string, { now: number | null; delta: number | null }> = {};
    for (const p of ['instagram', 'facebook']) {
      const rows = d.snaps.filter((r) => r.platform === p && r.followers != null);
      const last = rows[rows.length - 1]; const base = rows.find((r) => new Date(r.day).getTime() >= Date.now() - 8 * 86400_000) ?? rows[0];
      out[p] = { now: last?.followers ?? null, delta: last && base && last !== base ? (last.followers ?? 0) - (base.followers ?? 0) : null };
    }
    return out;
  }, [d.snaps]);
  // Instagram + Facebook ikizleri tek kart
  const upcoming = useMemo(() => {
    const m = new Map<string, NextPost[]>();
    for (const p of d.next) { const k = `${p.format}|${p.video_url || p.media_urls?.[0] || p.headline}|${p.scheduled_at}`; m.set(k, [...(m.get(k) ?? []), p]); }
    return [...m.values()].slice(0, 4);
  }, [d.next]);
  const lastPubs = useMemo(() => {
    const byContent = new Map(d.drafts.map((x) => [x.id, x]));
    return d.pubs.map((p) => {
      const m = d.metrics.find((x) => x.publication_id === p.id);
      const c = p.content_id ? byContent.get(p.content_id) : undefined;
      return { p, m, c };
    }).slice(0, 6);
  }, [d.pubs, d.metrics, d.drafts]);
  const alerts: Array<{ text: string; action: () => void }> = [];
  if (d.failedDrafts) alerts.push({ text: `${d.failedDrafts} paylaşım hata verdi (son 7 gün)`, action: () => go('queue') });
  d.failedTasks.forEach((t) => alerts.push({ text: `Bot görevi durdu: ${t.title ?? ''} — ${(t.last_error ?? '').slice(0, 80)}`, action: () => go('bots') }));
  d.accounts.filter((a) => a.connection_status === 'expired' || a.connection_status === 'error').forEach((a) => alerts.push({ text: `${a.external_account_name ?? a.account_name ?? a.platform} bağlantısı kontrol edilmeli`, action: () => go('connections') }));

  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  const h = istanbulHour(new Date());
  const hello = h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  const ig = growth.instagram;
  const fb = growth.facebook;

  return (
    <div className="space-y-4">
      <section className="agency-home-hero">
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="agency-eyebrow">Ajans operasyonu</span>
              {client?.sector && <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-ink-400 ring-1 ring-ink-700">{SECTORS[client.sector] ?? client.sector}</span>}
            </div>
            <div className="text-[11px] text-ink-400 mt-3">{new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', weekday: 'long', day: 'numeric', month: 'long' })} · {client?.name ?? 'Ajans çalışma alanı'}{client?.region ? ` · ${client.region}` : ''}</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-100 mt-1">{hello}, {session.displayName}.</h2>
            <p className="text-[13px] text-ink-400 mt-1 max-w-2xl">
              {q.loading ? 'Seçili müşterinin güncel durumu yükleniyor.' : d.askers ? <>Bugün öncelik: <b className="text-ink-100">{d.askers} açık müşteri sorusu</b>, geri dönüş bekliyor.</> : 'Yeni fiyat, konum veya bilgi sorusu görünmüyor.'}
              {upcoming[0] && <> Sıradaki paylaşım <b className="text-ink-100">{timeOf(upcoming[0][0].scheduled_at)}</b>’de: {upcoming[0][0].headline || upcoming[0][0].title}.</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button type="button" onClick={() => go('bots')} className="agency-home-action agency-home-action-primary"><Bot className="w-4 h-4" />Bot Merkezi</button>
            <button type="button" onClick={() => go('queue')} className="agency-home-action agency-home-action-secondary"><CalendarClock className="w-4 h-4" />Yayın takvimi</button>
          </div>
        </div>
      </section>

      <section aria-label="Seçili müşterinin güncel metrikleri" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <HeroStat icon={<Instagram className="w-5 h-5" />} label="Instagram takipçi" value={q.loading ? '—' : ig?.now != null ? ig.now.toLocaleString('tr-TR') : '—'}
          sub={q.loading ? 'Ölçüm verisi yükleniyor' : ig?.delta != null ? <span className={cx('inline-flex items-center gap-1', ig.delta > 0 ? 'text-emerald-700' : ig.delta < 0 ? 'text-rose-700' : 'text-ink-500')}>{ig.delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}{ig.delta > 0 ? '+' : ''}{ig.delta} · 7 gün</span> : ig?.now != null ? '7 günlük değişim hesaplanamadı' : 'Henüz ölçüm verisi yok'} onClick={() => go('growth')} />
        <HeroStat icon={<Facebook className="w-5 h-5" />} label="Facebook takipçi" value={q.loading ? '—' : fb?.now != null ? fb.now.toLocaleString('tr-TR') : '—'}
          sub={q.loading ? 'Ölçüm verisi yükleniyor' : fb?.delta != null ? <span className={cx('inline-flex items-center gap-1', fb.delta > 0 ? 'text-emerald-700' : fb.delta < 0 ? 'text-rose-700' : 'text-ink-500')}>{fb.delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}{fb.delta > 0 ? '+' : ''}{fb.delta} · 7 gün</span> : fb?.now != null ? '7 günlük değişim hesaplanamadı' : 'Henüz ölçüm verisi yok'} onClick={() => go('growth')} />
        <HeroStat icon={<CalendarClock className="w-5 h-5" />} label="Son 7 günde yayınlandı" value={q.loading ? '—' : d.weekPubs} sub="Seçili müşterinin sosyal kanalları" onClick={() => go('queue', null, { tab: 'done' })} />
        <HeroStat icon={<MessageCircle className="w-5 h-5" />} label="Açık bilgi talepleri" value={q.loading ? '—' : d.askers} sub="Yeni fiyat / konum / bilgi" hot={d.askers > 0} onClick={() => go('leads')} />
      </section>

      <section aria-label="Seçili müşterinin hesap ve görev motoru durumu" className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">Hesap bağlantıları</span>
        {q.loading ? <span className="text-[11px] text-ink-400">Hesaplar yükleniyor</span> : d.accounts.length ? d.accounts.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-300 ring-1 ring-ink-700"><PlatformBadge platform={a.platform} /><span className="max-w-40 truncate">{a.external_account_name ?? a.account_name ?? a.handle ?? a.platform}</span><span className={cx('rounded-full px-1.5 py-0.5', a.connection_status === 'connected' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>{a.connection_status === 'connected' ? 'Bağlı' : 'Bağlı değil'}</span></span>
        )) : <span className="text-[11px] text-ink-400">Bu müşteriye ait hesap kaydı yok</span>}
        {status.data?.worker_last_seen && <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-lightbg px-2.5 py-1 text-[10px] font-semibold text-ink-300"><span className="w-1.5 h-1.5 rounded-full bg-sky-500" />Görev motoru · son sinyal {relTime(status.data.worker_last_seen)}</span>}
      </section>

      {alerts.length > 0 && (
        <section className="rounded-2xl ring-1 ring-rose-200 bg-rose-50 p-3 space-y-1">
          {alerts.slice(0, 4).map((a, i) => (
            <button key={i} type="button" onClick={a.action} className="w-full flex items-center gap-2 text-left text-[12px] text-rose-800 hover:underline"><AlertTriangle className="w-4 h-4 shrink-0" />{a.text}<ChevronRight className="w-3.5 h-3.5 ml-auto" /></button>
          ))}
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        {/* SIRADAKİ PAYLAŞIMLAR */}
        <Card title="Sıradaki paylaşımlar" icon={<CalendarClock className="w-5 h-5 text-[#1E3FA0]" />} action={<LinkBtn onClick={() => go('queue')}>Yayın Merkezi</LinkBtn>}>
          {q.loading && !d.next.length ? <StateView kind="loading" compact /> : !upcoming.length ? <StateView kind="empty" compact title="Planlı paylaşım yok" /> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {upcoming.map((g) => {
                const p = g[0]; const img = p.design_url || p.media_urls?.[0] || p.video_url;
                const today = dayKey(p.scheduled_at) === dayKey(new Date());
                return (
                  <button key={p.id} type="button" onClick={() => go('queue')} className="text-left rounded-xl overflow-hidden ring-1 ring-ink-700/60 bg-white hover:ring-[#1E3FA0]">
                    <div className="relative aspect-[4/5] bg-ink-900">
                      {img && (isVid(img) ? <video src={`${img}#t=0.1`} muted playsInline preload="metadata" className="w-full h-full object-cover" /> : <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />)}
                      <span className="absolute top-1.5 left-1.5 rounded-full bg-[#262A6B] text-white text-[10px] font-bold px-2 py-0.5">{FMT[p.format ?? ''] ?? p.format}</span>
                    </div>
                    <div className="p-2">
                      <div className="text-[11px] font-mono text-ink-400">{today ? 'Bugün' : new Date(p.scheduled_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short' })} · {timeOf(p.scheduled_at)}</div>
                      <div className="text-[12px] font-semibold text-ink-100 line-clamp-2">{p.headline || p.title}</div>
                      <div className="flex gap-1 mt-1">{g.map((x) => <PlatformBadge key={x.id} platform={x.primary_platform} />)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
        <OwnerTodos />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        {/* FİYAT SORANLAR */}
        <Card title="Fiyat soranlar — dönüş bekleyenler" icon={<MessageCircle className="w-5 h-5 text-[#1E3FA0]" />} action={<LinkBtn onClick={() => go('leads')}>Tümü</LinkBtn>}>
          <Prospects compact />
        </Card>
        {/* SON PAYLAŞIMLAR */}
        <Card title="Son paylaşımlar" icon={<Heart className="w-5 h-5 text-[#1E3FA0]" />} action={<LinkBtn onClick={() => go('growth')}>Büyüme</LinkBtn>}>
          {!lastPubs.length ? <StateView kind="empty" compact title="Henüz paylaşım yok" /> : (
            <ul className="space-y-1.5">
              {lastPubs.map(({ p, m, c }) => {
                const img = c?.design_url || c?.media_urls?.[0];
                return (
                  <li key={p.id} className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-ink-900 shrink-0">{img && !isVid(img) && <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-ink-100 line-clamp-1">{c?.headline || c?.title || 'Paylaşım'}</div>
                      <div className="flex items-center gap-2 text-[11px] text-ink-400"><PlatformBadge platform={p.platform} />{p.published_at ? relTime(p.published_at) : ''}</div>
                    </div>
                    <div className="text-[11px] text-ink-300 font-mono tabular-nums text-right shrink-0">
                      {m ? <><span className="inline-flex items-center gap-0.5"><Heart className="w-3 h-3" />{m.likes ?? '–'}</span> <span className="inline-flex items-center gap-0.5 ml-1"><MessageCircle className="w-3 h-3" />{m.comments ?? '–'}</span></> : <span className="text-ink-500">ölçülüyor</span>}
                    </div>
                    {p.external_url && <a href={p.external_url} target="_blank" rel="noreferrer" className="text-[#1E3FA0]"><ArrowRight className="w-4 h-4" /></a>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* BOTLARIN BULDUKLARI */}
      <Card title="Botların son buldukları" icon={<FileText className="w-5 h-5 text-[#1E3FA0]" />} action={<LinkBtn onClick={() => go('reports')}>Bot sonuçları</LinkBtn>}>
        {!d.missions.length ? <StateView kind="empty" compact title="Henüz rapor yok" /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {d.missions.map((m) => (
              <button key={m.id} type="button" onClick={() => go('reports', m.id)} className="text-left rounded-xl ring-1 ring-ink-700/60 bg-white p-3 hover:ring-[#1E3FA0]">
                <div className="text-[11px] text-ink-400">{m.finished_at ? relTime(m.finished_at) : ''}</div>
                <div className="text-[13px] font-semibold text-ink-100 line-clamp-2">{m.title}</div>
                <div className="text-[12px] text-ink-300 line-clamp-3 mt-1">{m.summary}</div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <details className="ops-panel p-3">
        <summary className="cursor-pointer text-[12px] font-semibold text-ink-300 inline-flex items-center gap-2"><Settings2 className="w-4 h-4" />Otopilot ve bot ayarları</summary>
        <div className="mt-3"><AutopilotCard /></div>
      </details>
    </div>
  );
}

function HeroStat({ icon, label, value, sub, onClick, hot = false }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; onClick?: () => void; hot?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cx('agency-home-stat', hot && 'border-amber-300 bg-amber-50/70')}>
      <span className="agency-home-stat-icon">{icon}</span>
      <span className="min-w-0">
        <span className="agency-home-stat-label block">{label}</span>
        <span className="agency-home-stat-value block">{value}</span>
        {sub && <span className="agency-home-stat-sub block">{sub}</span>}
      </span>
    </button>
  );
}

function Card({ title, icon, action, children }: { title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ops-panel p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">{icon}<h3 className="font-display text-base font-semibold text-ink-100">{title}</h3><span className="ml-auto">{action}</span></div>
      {children}
    </section>
  );
}

function LinkBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1E3FA0] hover:underline">{children}<ChevronRight className="w-3.5 h-3.5" /></button>;
}
