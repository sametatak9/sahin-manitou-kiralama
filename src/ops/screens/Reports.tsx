import { useState } from 'react';
import { db, unwrap, useQuery } from '../lib/hooks';
import type { Bot } from '../lib/types';
import { MissionList } from '../components/Missions';
import { SchedulesPanel } from '../components/Schedules';
import { FollowList } from '../components/FollowList';
import { ErrorState, Tabs } from '../ui';

type View = 'all' | 'pending' | 'approved' | 'auto' | 'follow';

/** Tüm botların görevleri ve raporları + yönetici onayından geçmiş sonuçlar. */
export function ReportsScreen() {
  const q = useQuery(async () => unwrap(await db().from('automation_bots').select('*').order('name')) as Bot[], [] as Bot[], []);
  const [view, setView] = useState<View>('all');
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-100">Bot Raporları & Araştırma</h2>
        <p className="text-xs text-ink-400">Botlara verilen tüm görevler, canlı adımları ve sonuç raporları. Biten görevi açıp “Onayla ve kaydet” derseniz sonuç kalıcı listeye alınır.</p>
      </div>
      <Tabs value={view} onChange={setView} items={[{ id: 'all', label: 'Tüm görevler' }, { id: 'pending', label: 'Onay bekleyen sonuçlar' }, { id: 'approved', label: 'Onaylı sonuçlar' }, { id: 'auto', label: 'Otomatik görevler' }, { id: 'follow', label: 'Takip listesi' }]} />
      {view === 'follow' ? <FollowList /> : view === 'auto' ? <SchedulesPanel bots={q.data} /> : <MissionList bots={q.data} review={view === 'all' ? undefined : view} />}
    </div>
  );
}
