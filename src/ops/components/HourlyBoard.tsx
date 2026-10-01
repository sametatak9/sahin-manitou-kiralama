import { useMemo, useState } from 'react';
import { Clock, Moon, Sun, Radio, CheckCircle2, XCircle, Loader2, Bot } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import type { Bot as BotRow } from '../lib/types';
import { cx, StateView } from '../ui';

type MissionLite = {
  id: string;
  bot_id: string | null;
  title: string;
  status: string;
  summary: string | null;
  findings: unknown[] | null;
  created_at: string;
  finished_at: string | null;
  step_count: number | null;
};

function istanbulParts(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  const hour = Number(
    d.toLocaleTimeString('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false }).slice(0, 2),
  );
  const label = d.toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date, hour, label };
}

function statusMeta(s: string) {
  if (s === 'running' || s === 'finalizing') return { label: 'ÇALIŞIYOR', tone: 'bg-sky-500 text-white', icon: Loader2 };
  if (s === 'completed') return { label: 'TAMAM', tone: 'bg-emerald-500 text-white', icon: CheckCircle2 };
  if (s === 'failed') return { label: 'HATA', tone: 'bg-rose-500 text-white', icon: XCircle };
  if (s === 'stopped') return { label: 'DURDU', tone: 'bg-amber-500 text-white', icon: Radio };
  return { label: s, tone: 'bg-ink-600 text-white', icon: Radio };
}

function MissionCard({ m, botName }: { m: MissionLite; botName: string }) {
  const n = Array.isArray(m.findings) ? m.findings.length : 0;
  const st = statusMeta(m.status);
  const Icon = st.icon;
  const { label } = istanbulParts(m.created_at);
  const initial = botName.replace(/[^\p{L}]/gu, '').slice(0, 2).toLocaleUpperCase('tr-TR') || 'BT';
  return (
    <article className="rounded-2xl bg-white ring-1 ring-ink-700/70 shadow-sm overflow-hidden flex">
      <div className="w-1.5 shrink-0 bg-gradient-to-b from-[#262A6B] to-brand-green" />
      <div className="flex-1 min-w-0 p-3">
        <div className="flex items-start gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#262A6B] to-[#1E3FA0] text-white grid place-items-center text-[11px] font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-ink-400 truncate">{botName}</span>
              <span className={cx('rounded-full px-2 py-0.5 text-[9px] font-bold', st.tone)}>
                <span className="inline-flex items-center gap-0.5"><Icon className={cx('w-3 h-3', m.status === 'running' && 'animate-spin')} />{st.label}</span>
              </span>
            </div>
            <h4 className="text-[13px] font-semibold text-ink-100 mt-0.5 line-clamp-2 leading-snug">{m.title}</h4>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono text-ink-400">
              <span>{label}</span>
              <span>{n} bulgu</span>
              {m.step_count != null && <span>{m.step_count} adım</span>}
            </div>
            {m.summary && <p className="text-[12px] text-ink-300 mt-1.5 line-clamp-3 leading-relaxed">{m.summary}</p>}
          </div>
        </div>
      </div>
    </article>
  );
}

type Range = '24h' | '48h' | '7d';

export function HourlyBoard() {
  const [range, setRange] = useState<Range>('48h');
  const since = useMemo(() => {
    const h = range === '24h' ? 24 : range === '48h' ? 48 : 24 * 7;
    return new Date(Date.now() - h * 3600_000).toISOString();
  }, [range]);

  const bots = useQuery(
    async () => unwrap(await db().from('automation_bots').select('id,name,slug,status').order('name')) as Pick<BotRow, 'id' | 'name' | 'slug' | 'status'>[],
    [] as Pick<BotRow, 'id' | 'name' | 'slug' | 'status'>[],
    [],
    ['automation_bots'],
  );

  const missions = useQuery(
    async () =>
      unwrap(
        await db()
          .from('bot_missions')
          .select('id,bot_id,title,status,summary,findings,created_at,finished_at,step_count')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(200),
      ) as MissionLite[],
    [] as MissionLite[],
    [since],
    ['bot_missions'],
  );

  const botName = (id: string | null) => bots.data.find((b) => b.id === id)?.name ?? 'Genel araştırma';

  const grouped = useMemo(() => {
    const map = new Map<string, { date: string; hour: number; items: MissionLite[] }>();
    for (const m of missions.data) {
      const { date, hour } = istanbulParts(m.created_at);
      const key = `${date}|${hour}`;
      if (!map.has(key)) map.set(key, { date, hour, items: [] });
      map.get(key)!.items.push(m);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.hour - a.hour;
    });
  }, [missions.data]);

  const night = missions.data.filter((m) => {
    const h = istanbulParts(m.created_at).hour;
    return h >= 22 || h < 6;
  });
  const day = missions.data.filter((m) => {
    const h = istanbulParts(m.created_at).hour;
    return h >= 6 && h < 22;
  });
  const live = missions.data.filter((m) => m.status === 'running' || m.status === 'finalizing').length;
  const done = missions.data.filter((m) => m.status === 'completed').length;
  const findings = missions.data.reduce((a, m) => a + (Array.isArray(m.findings) ? m.findings.length : 0), 0);

  if (bots.loading || missions.loading) return <StateView kind="loading" />;
  if (missions.error) return <StateView kind="empty" title="Rapor yüklenemedi" message={String(missions.error)} />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#134e4a] text-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-sky-200/80">Toplu operasyon raporu</div>
            <h3 className="font-display text-lg font-semibold mt-0.5">Saat saat ne yapıldı?</h3>
            <p className="text-[12px] text-sky-100/80 mt-1 max-w-xl">
              Tüm botların görevleri kartvizit listelenir. Gece ve gündüz ayrılır; her saat bloğunda o saatteki işler görünür.
            </p>
          </div>
          <div className="flex gap-1.5">
            {([['24h', '24 sa'], ['48h', '48 sa'], ['7d', '7 gün']] as const).map(([id, lab]) => (
              <button key={id} type="button" onClick={() => setRange(id)}
                className={cx('rounded-full px-3 py-1 text-[11px] font-bold ring-1',
                  range === id ? 'bg-white text-slate-900 ring-white' : 'bg-white/10 text-white ring-white/30')}>
                {lab}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
          {[
            { l: 'Görev', v: missions.data.length, icon: Bot },
            { l: 'Canlı', v: live, icon: Radio },
            { l: 'Tamam', v: done, icon: CheckCircle2 },
            { l: 'Bulgu', v: findings, icon: Clock },
            { l: 'Gece işi', v: night.length, icon: Moon },
          ].map((x) => (
            <div key={x.l} className="rounded-xl bg-white/10 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] text-sky-100/80"><x.icon className="w-3.5 h-3.5" />{x.l}</div>
              <div className="text-xl font-bold tabular-nums mt-0.5">{x.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-900 text-white p-4 ring-1 ring-slate-700">
          <div className="flex items-center gap-2 text-sm font-semibold"><Moon className="w-4 h-4 text-indigo-300" /> Gece (22:00–06:00)</div>
          <p className="text-2xl font-bold tabular-nums mt-2">{night.length} görev</p>
          <p className="text-[11px] text-slate-300 mt-1">{night.length === 0 ? 'Bu aralıkta görev yok.' : `${night.reduce((a, m) => a + (Array.isArray(m.findings) ? m.findings.length : 0), 0)} bulgu`}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 text-amber-950 p-4 ring-1 ring-amber-200">
          <div className="flex items-center gap-2 text-sm font-semibold"><Sun className="w-4 h-4 text-amber-600" /> Gündüz (06:00–22:00)</div>
          <p className="text-2xl font-bold tabular-nums mt-2">{day.length} görev</p>
          <p className="text-[11px] text-amber-800/80 mt-1">{day.length === 0 ? 'Gündüz görevi yok.' : `${day.reduce((a, m) => a + (Array.isArray(m.findings) ? m.findings.length : 0), 0)} bulgu`}</p>
        </div>
      </div>

      {grouped.length === 0 ? (
        <StateView kind="empty" title="Henüz saatlik kayıt yok" message="Botlar çalışınca burada saat saat kartvizit raporlar oluşur." />
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => {
            const isNight = g.hour >= 22 || g.hour < 6;
            const dateTr = new Date(g.date + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
            return (
              <section key={`${g.date}-${g.hour}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cx('w-14 h-10 rounded-xl grid place-items-center font-mono text-sm font-bold',
                    isNight ? 'bg-slate-900 text-indigo-200' : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200')}>
                    {String(g.hour).padStart(2, '0')}:00
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-ink-100">{dateTr} · {g.items.length} görev</div>
                    <div className="text-[10px] text-ink-400">{isNight ? 'Gece dilimi' : 'Gündüz dilimi'}</div>
                  </div>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {g.items.map((m) => (
                    <li key={m.id}><MissionCard m={m} botName={botName(m.bot_id)} /></li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
