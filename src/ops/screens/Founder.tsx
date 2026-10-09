import { AlertTriangle, Crown, RefreshCw, UserPlus } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { relTime } from '../lib/format';
import { useClient } from '../client';
import { useRouter, useSession } from '../session';
import { Button, Panel, Pill, StateView, cx } from '../ui';

interface Member { user_id: string; role: string; status: string; email: string | null; display_name: string | null; last_sign_in_at: string | null }
interface ClientRow { id: string; name: string; sector: string | null; region: string | null; status: string; color: string | null; missions_30d: number; drafts_open: number; published_30d: number; accounts_connected: number }
interface Workspace { id: string; name: string; slug: string; plan_code: string | null; status: string; members: Member[]; clients: ClientRow[] }
interface Overview { totals: { ai_cost_30d: number; missions_30d: number; published_30d: number; members: number; clients: number }; workspaces: Workspace[] }

const ROLE: Record<string, string> = { owner: 'Sahip', admin: 'Yönetici', member: 'Ekip', viewer: 'İzleyici' };

export function FounderScreen() {
  const session = useSession();
  const { go } = useRouter();
  const { setClientId } = useClient();
  const q = useQuery(async () => unwrap(await db().rpc('founder_overview')) as Overview, null as Overview | null, []);

  if (session.role !== 'admin') return <StateView kind="permission" title="Yalnız kurucu yönetici" />;
  if (q.error) return <StateView kind="error" message={q.error} />;
  if (!q.data) return <StateView kind="loading" />;
  const t = q.data.totals;
  const clientPublished = q.data.workspaces.reduce((n, w) => n + w.clients.reduce((m, c) => m + c.published_30d, 0), 0);
  const unassigned = Math.max(0, Number(t.published_30d) - clientPublished);
  const open = (id: string) => { setClientId(id); go('home'); };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-100 inline-flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" />Kurucu Paneli</h2>
          <p className="text-xs text-ink-400">Platformdaki tüm hesaplar, üyeler ve müşteriler · son 30 gün</p>
        </div>
        <Button variant="ghost" onClick={() => q.reload()} icon={<RefreshCw className={cx('w-4 h-4', q.loading && 'animate-spin')} />}>Yenile</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {([['Müşteri', t.clients], ['Üye', t.members], ['Bot görevi', t.missions_30d], ['Yayın', t.published_30d], ['AI maliyeti', `$${Number(t.ai_cost_30d).toFixed(2)}`]] as const).map(([l, v]) => (
          <div key={l} className="ops-card p-3"><div className="text-[11px] text-ink-400">{l}</div><div className="text-lg font-bold tabular-nums text-ink-100">{v}</div></div>
        ))}
      </div>

      {unassigned > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Son 30 gündeki {unassigned} yayın hiçbir müşteriye bağlı değil; müşteri bazlı sayılarda görünmüyor.</span>
        </div>
      )}

      {q.data.workspaces.map((w) => (
        <Panel key={w.id} title={<span className="inline-flex items-center gap-2">{w.name}<Pill tone={w.status === 'active' ? 'go' : 'wait'}>{w.plan_code ?? w.status}</Pill></span>}>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5"><div className="text-[11px] font-semibold text-ink-300">Müşteriler ({w.clients.length})</div><Button variant="subtle" onClick={() => go('clients')}>Yönet</Button></div>
              <ul className="space-y-1.5">{w.clients.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => open(c.id)} className="w-full flex items-center gap-3 rounded-xl ring-1 ring-ink-800 px-3 py-2.5 text-left hover:bg-ink-900/60">
                    <span className="w-2.5 h-9 rounded-full shrink-0" style={{ background: c.color ?? '#1E5BC6' }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink-100 truncate">{c.name}</div>
                      <div className="text-[11px] text-ink-400 truncate">{[c.sector, c.region].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-ink-400">
                      <div><div className="text-sm font-bold text-ink-100 tabular-nums">{c.missions_30d}</div>görev</div>
                      <div><div className="text-sm font-bold text-ink-100 tabular-nums">{c.drafts_open}</div>taslak</div>
                      <div><div className="text-sm font-bold text-ink-100 tabular-nums">{c.published_30d}</div>yayın</div>
                      <div><div className={cx('text-sm font-bold tabular-nums', c.accounts_connected ? 'text-ink-100' : 'text-rose-600')}>{c.accounts_connected}</div>hesap</div>
                    </div>
                  </button>
                </li>
              ))}</ul>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5"><div className="text-[11px] font-semibold text-ink-300">Üyeler ({w.members.length})</div><Button variant="subtle" icon={<UserPlus className="w-4 h-4" />} onClick={() => go('settings', null, { tab: 'team' })}>Davet et</Button></div>
              <ul className="space-y-1.5">{w.members.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 rounded-xl ring-1 ring-ink-800 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink-100 truncate">{m.display_name || m.email || '—'}</div>
                    <div className="text-[11px] text-ink-400 truncate">{m.email}{m.last_sign_in_at ? ` · son giriş ${relTime(m.last_sign_in_at)}` : ' · henüz giriş yapmadı'}</div>
                  </div>
                  <Pill tone={m.status === 'active' ? 'go' : 'wait'}>{ROLE[m.role] ?? m.role}</Pill>
                </li>
              ))}</ul>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}
