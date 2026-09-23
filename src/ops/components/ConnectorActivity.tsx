// Uygulama aktivite günlüğü: bu uygulamada botların / hesapların yaptığı her işlem (connector_activity) + sağlık özeti + gelen olaylar.
import { Activity, Inbox } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime, relTime } from '../lib/format';
import { Pill, StateView } from '../ui';

interface ActivityRow { id: number; at: string; action: string; status: 'ok' | 'failed' | 'skipped' | 'pending'; summary: string | null; error: string | null; external_url: string | null; bot_id: string | null }
interface Health { connector_key: string; last_ok_at: string | null; last_failed_at: string | null; last_error: string | null; ok_24h: number; failed_24h: number; posts_7d: number; events_7d: number }
interface EventRow { id: number; received_at: string; event_type: string; status: string }

export const ACTIVITY_LABEL: Record<string, string> = {
  connect: 'Bağlantı', disconnect: 'Çıkış', token_refresh: 'Oturum yenileme', verify: 'Bilgi testi', publish: 'Paylaşım', metrics_sync: 'İstatistik',
  manual_share: 'Elle paylaşım', message_send: 'Mesaj', webhook: 'Gelen olay', rate_limit: 'Sınır aşıldı', error: 'Hata',
};
const TONE = { ok: 'go', failed: 'stop', skipped: 'wait', pending: 'info' } as const;
const STATUS = { ok: 'Başarılı', failed: 'Hata', skipped: 'Bekliyor', pending: 'Sürüyor' } as const;
const EVENT_LABEL: Record<string, string> = { comments: 'Yorum', messages: 'Mesaj', mentions: 'Bahsetme', feed: 'Sayfa akışı' };

export function ConnectorActivity({ connectorKey, botNames }: { connectorKey: string; botNames: Record<string, string> }) {
  const q = useQuery(async () => {
    const s = db();
    const [act, health, events] = await Promise.all([
      s.from('connector_activity').select('id,at,action,status,summary,error,external_url,bot_id').eq('connector_key', connectorKey).order('at', { ascending: false }).limit(20),
      s.from('connector_health').select('*').eq('connector_key', connectorKey).maybeSingle(),
      s.from('connector_events').select('id,received_at,event_type,status').eq('connector_key', connectorKey).order('received_at', { ascending: false }).limit(5),
    ]);
    return { act: unwrap(act) as ActivityRow[], health: (health.data ?? null) as Health | null, events: unwrap(events) as EventRow[] };
  }, { act: [] as ActivityRow[], health: null as Health | null, events: [] as EventRow[] }, [connectorKey], ['connector_activity']);
  const h = q.data.health;

  return (
    <section className="space-y-2">
      <h4 className="font-display font-semibold text-ink-100 flex items-center gap-2"><Activity className="w-4 h-4 text-brand-green" /> Aktivite günlüğü</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="rounded-xl bg-ink-800 p-2.5"><div className="text-[10px] font-mono text-ink-500">SON BAŞARI</div><div className="text-ink-100">{h?.last_ok_at ? relTime(h.last_ok_at) : '—'}</div></div>
        <div className="rounded-xl bg-ink-800 p-2.5"><div className="text-[10px] font-mono text-ink-500">SON HATA</div><div className={h?.last_failed_at ? 'text-rose-700' : 'text-ink-100'}>{h?.last_failed_at ? relTime(h.last_failed_at) : '—'}</div></div>
        <div className="rounded-xl bg-ink-800 p-2.5"><div className="text-[10px] font-mono text-ink-500">24 SAAT</div><div className="text-ink-100">{h?.ok_24h ?? 0} başarılı · {h?.failed_24h ?? 0} hata</div></div>
        <div className="rounded-xl bg-ink-800 p-2.5"><div className="text-[10px] font-mono text-ink-500">7 GÜN</div><div className="text-ink-100">{h?.posts_7d ?? 0} paylaşım · {h?.events_7d ?? 0} gelen olay</div></div>
      </div>
      {h?.last_error && <p className="text-[11px] text-rose-700 break-words">Son hata: {h.last_error}</p>}
      {q.loading && !q.data.act.length ? <StateView kind="loading" compact /> : q.error ? <StateView kind="error" message={q.error} compact /> : !q.data.act.length ? (
        <StateView kind="empty" compact title="Veri bulunamadı" message="Bu uygulamada henüz bir işlem kaydı yok. Bağlantı, paylaşım, istatistik ve hatalar burada tarih sırasıyla görünecek." />
      ) : (
        <ul className="space-y-1.5">
          {q.data.act.map((a) => (
            <li key={a.id} className="rounded-lg bg-ink-850 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={TONE[a.status]}>{STATUS[a.status]}</Pill>
                <span className="font-semibold text-ink-100">{ACTIVITY_LABEL[a.action] ?? a.action}</span>
                {a.bot_id && botNames[a.bot_id] && <span className="text-[10px] text-ink-400">· {botNames[a.bot_id]}</span>}
                <span className="ml-auto text-[10px] font-mono text-ink-500">{fmtDateTime(a.at)}</span>
              </div>
              {(a.summary || a.error) && <div className={a.status === 'failed' ? 'text-rose-700 mt-0.5 break-words' : 'text-ink-300 mt-0.5 break-words'}>{a.error ?? a.summary}</div>}
              {a.external_url && <a href={a.external_url} target="_blank" rel="noreferrer" className="text-[10px] text-brand-green underline break-all">{a.external_url}</a>}
            </li>
          ))}
        </ul>
      )}
      {q.data.events.length > 0 && (
        <div className="rounded-xl ring-1 ring-ink-700 p-2.5 text-xs">
          <div className="font-semibold text-ink-100 flex items-center gap-1.5 mb-1"><Inbox className="w-3.5 h-3.5" /> Son gelen olaylar</div>
          {q.data.events.map((e) => <div key={e.id} className="flex justify-between text-ink-300"><span>{EVENT_LABEL[e.event_type] ?? e.event_type}</span><span className="text-[10px] font-mono text-ink-500">{fmtDateTime(e.received_at)}</span></div>)}
        </div>
      )}
    </section>
  );
}
