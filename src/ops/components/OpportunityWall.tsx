// İş fırsatları duvarı: iş bulma botlarının son 7 gündeki bulguları tek yerde, kartvizit olarak (tekrarlar ayıklanır, uygunluğa göre sıralanır).
import { useMemo, useState } from 'react';
import { db, unwrap, useQuery } from '../lib/hooks';
import type { Mission, MissionFinding } from '../lib/types';
import { FindingCard } from './FindingCard';
import { cx, StateView } from '../ui';

const BOTS: Record<string, string> = { 'insaat-is-bulucu': 'İnşaat', 'manitou-is-bulucu': 'Manitou', 'market-intel-bot': 'İhale' };

export function OpportunityWall() {
  const q = useQuery(async () => {
    const bots = unwrap(await db().from('automation_bots').select('id,slug').in('slug', Object.keys(BOTS))) as Array<{ id: string; slug: string }>;
    if (!bots.length) return { rows: [] as Array<{ f: MissionFinding; m: Mission; tag: string }> };
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const ms = unwrap(await db().from('bot_missions').select('id,bot_id,search_for,findings,created_at,claude_review').in('bot_id', bots.map((b) => b.id)).gte('created_at', since).order('created_at', { ascending: false }).limit(60)) as Array<Mission & { claude_review?: unknown }>;
    const tagOf = new Map(bots.map((b) => [b.id, BOTS[b.slug]]));
    const seen = new Set<string>(); const rows: Array<{ f: MissionFinding; m: Mission; tag: string }> = [];
    for (const m of ms) for (const f of m.findings ?? []) {
      const key = f.url.replace(/[?#].*$/, '').replace(/\/$/, '');
      if (f.verdict === 'rejected' || seen.has(key) || /Kural tabanlı ön eleme/.test(f.fit ?? '') && (f.relevance ?? 0) < 7) continue;
      seen.add(key); rows.push({ f, m, tag: tagOf.get(m.bot_id ?? '') ?? '' });
    }
    rows.sort((a, b) => (b.f.relevance ?? 0) - (a.f.relevance ?? 0));
    return { rows };
  }, { rows: [] as Array<{ f: MissionFinding; m: Mission; tag: string }> }, [], ['bot_missions']);
  const [tag, setTag] = useState<string>('all');
  const rows = useMemo(() => q.data.rows.filter((r) => tag === 'all' || r.tag === tag), [q.data.rows, tag]);

  if (q.loading && !q.data.rows.length) return <StateView kind="loading" compact />;
  if (!q.data.rows.length) return <StateView kind="empty" title="Son 7 günde fırsat yok" message="İş bulma botları çalıştıkça uygun bulgular burada kartvizit olarak birikir." />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {['all', ...Object.values(BOTS)].map((t) => (
          <button key={t} type="button" onClick={() => setTag(t)} className={cx('rounded-full px-3 py-1.5 text-xs font-semibold ring-1', tag === t ? 'bg-[#262A6B] text-white ring-[#262A6B]' : 'bg-white ring-ink-700 text-ink-300')}>
            {t === 'all' ? `Tümü (${q.data.rows.length})` : `${t} (${q.data.rows.filter((r) => r.tag === t).length})`}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
        {rows.slice(0, 60).map((r, i) => <FindingCard key={`${r.m.id}-${i}`} f={r.f} i={i} m={r.m} />)}
      </ul>
    </div>
  );
}
