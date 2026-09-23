import { db, unwrap, useQuery } from '../lib/hooks';
import type { Bot } from '../lib/types';
import { MissionList } from '../components/Missions';
import { ErrorState } from '../ui';

/** Tüm botların görevleri ve raporları (Pazar araştırması, profil analizi, rakip takibi…). */
export function ReportsScreen() {
  const q = useQuery(async () => unwrap(await db().from('automation_bots').select('*').order('name')) as Bot[], [] as Bot[], []);
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-100">Bot Raporları & Araştırma</h2>
        <p className="text-xs text-ink-400">Botlara verilen tüm görevler, canlı adımları ve sonuç raporları. Her rapor HTML belge olarak indirilebilir veya yazdırılabilir.</p>
      </div>
      <MissionList bots={q.data} />
    </div>
  );
}
