// Botların öğrenme günlüğü: Claude denetimi, sektör kıyası, performans ve eğitim notları. Botların kalıcı "hafızası".
import { ExternalLink } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import type { Bot } from '../lib/types';
import { Pill, StateView } from '../ui';

interface Row { id: string; bot_id: string | null; client_id: string | null; source: string; lesson: string; evidence: Array<{ url?: string; note?: string }>; applied: boolean; created_at: string }
interface Client { id: string; name: string }
const SOURCE: Record<string, string> = { claude_audit: 'Claude denetimi', benchmark: 'Sektör kıyası', performance: 'Yayın performansı', admin_note: 'Yönetici notu', training: 'Eğitim' };

export function LearningLog({ bots }: { bots: Bot[] }) {
  const q = useQuery(async () => {
    const [rows, clients] = await Promise.all([
      db().from('bot_learning_log').select('*').order('created_at', { ascending: false }).limit(200),
      db().from('agency_clients').select('id,name').is('archived_at', null),
    ]);
    return { rows: unwrap(rows) as Row[], clients: unwrap(clients) as Client[] };
  }, { rows: [] as Row[], clients: [] as Client[] }, [], ['bot_learning_log']);
  const botName = new Map(bots.map((b) => [b.id, b.name]));
  const clientName = new Map(q.data.clients.map((c) => [c.id, c.name]));
  if (q.loading && !q.data.rows.length) return <StateView kind="loading" compact />;
  if (q.error) return <StateView kind="error" message={q.error} compact />;
  if (!q.data.rows.length) return <StateView kind="empty" compact title="Henüz ders yok" message="Günlük Claude denetimi ve kıyaslar burada birikir." />;
  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-400">Botlar her gün buradan öğrenir: denetim sonuçları yeteneklere yeni sürüm olarak işlenir, kıyas ve eğitim notları bot talimatına eklenir.</p>
      {q.data.rows.map((r) => (
        <div key={r.id} className="ops-panel !rounded-2xl p-3.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Pill tone={r.source === 'claude_audit' ? 'wait' : r.source === 'benchmark' ? 'run' : 'go'}>{SOURCE[r.source] ?? r.source}</Pill>
            <b className="text-ink-100">{botName.get(r.bot_id ?? '') ?? 'Ajans geneli'}</b>
            {r.client_id && <span className="text-ink-400">· {clientName.get(r.client_id) ?? ''}</span>}
            <span className="flex-1" />
            <span className="font-mono text-ink-500">{fmtDateTime(r.created_at)}</span>
            {r.applied && <span className="text-emerald-600 font-semibold">✓ uygulandı</span>}
          </div>
          <p className="text-[13px] text-ink-200 mt-1.5 whitespace-pre-wrap">{r.lesson}</p>
          {!!r.evidence?.length && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {r.evidence.filter((e) => e.url).map((e, i) => (
                <a key={i} href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-brand-green hover:underline"><ExternalLink className="w-3 h-3" />{e.note || new URL(e.url!).hostname}</a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
