// Yapay zekâ harcama freni: günlük / aylık / görev başı dolar sınırı. Sınır dolunca botlar yeni AI çağrısı yapmaz.
import { useEffect, useState } from 'react';
import { Gauge, Save } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { errorText } from '../lib/api';
import { useSession } from '../session';
import { Button, Field, Notice, Panel, SavedStamp, StateView } from '../ui';

interface Spend { enabled: boolean; daily_usd: number; monthly_usd: number; per_mission_usd: number; today_usd: number; month_usd: number; updated_at: string }

function Bar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-ink-300"><span>{label}</span><span className="font-mono">${used.toFixed(2)} / ${limit.toFixed(2)}</span></div>
      <div className="h-2 rounded-full bg-ink-800 overflow-hidden mt-1"><div className={`h-full ${tone}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function AiBudgetPanel() {
  const session = useSession();
  const q = useQuery<Spend | null>(async () => unwrap(await db().rpc('ai_spend_status')) as Spend, null, []);
  const [f, setF] = useState({ enabled: true, daily: '0.50', monthly: '5.00', mission: '0.30' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  useEffect(() => { if (q.data) setF({ enabled: q.data.enabled, daily: String(q.data.daily_usd), monthly: String(q.data.monthly_usd), mission: String(q.data.per_mission_usd) }); }, [q.data]);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const n = (v: string) => { const x = Number(v.replace(',', '.')); if (!Number.isFinite(x) || x < 0) throw new Error('Geçerli bir tutar girin'); return x; };
      unwrap(await db().rpc('set_ai_budget', { p_enabled: f.enabled, p_daily: n(f.daily), p_monthly: n(f.monthly), p_per_mission: n(f.mission) }));
      setMsg({ tone: 'ok', text: 'Harcama sınırı kaydedildi.' }); await q.reload();
    } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(false); }
  };

  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Gauge className="w-4 h-4 text-brand-green" />Harcama sınırı (bütçe freni)</span>}>
      {q.loading && !q.data ? <StateView kind="loading" compact /> : q.error ? <StateView kind="error" message={q.error} compact /> : q.data && (
        <div className="space-y-3">
          <p className="text-xs text-ink-400">Botların yapay zekâ harcaması burada sınırlanır. Sınır dolunca bot yeni çağrı yapmaz, görev elindeki bulgularla raporlanır. Tutarlar tahminidir (token + web araması), dolar cinsindendir.</p>
          <Bar label="Bugün" used={Number(q.data.today_usd)} limit={Number(q.data.daily_usd)} />
          <Bar label="Bu ay" used={Number(q.data.month_usd)} limit={Number(q.data.monthly_usd)} />
          {session.role === 'admin' && (<>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Günlük $"><input className="ops-input w-full" inputMode="decimal" value={f.daily} onChange={(e) => setF({ ...f, daily: e.target.value })} /></Field>
              <Field label="Aylık $"><input className="ops-input w-full" inputMode="decimal" value={f.monthly} onChange={(e) => setF({ ...f, monthly: e.target.value })} /></Field>
              <Field label="Görev başı $"><input className="ops-input w-full" inputMode="decimal" value={f.mission} onChange={(e) => setF({ ...f, mission: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-200"><input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />Harcama freni açık</label>
            <div className="flex items-center justify-between gap-2"><SavedStamp at={q.data.updated_at} /><Button variant="primary" loading={busy} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet</Button></div>
          </>)}
          {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : 'error'}>{msg.text}</Notice>}
        </div>
      )}
    </Panel>
  );
}
