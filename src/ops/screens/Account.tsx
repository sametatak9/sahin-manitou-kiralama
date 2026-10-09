import { useState } from 'react';
import { LogOut, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { db, unwrap, useQuery } from '../lib/hooks';
import { errorText } from '../lib/api';
import { useSession } from '../session';
import { Button, Field, Notice, Panel, Pill, StateView } from '../ui';

interface Membership { role: string; status: string; agency_workspaces: { name: string; plan_code: string | null } | null }

const ROLE: Record<string, string> = { owner: 'Sahip', admin: 'Yönetici', member: 'Ekip', viewer: 'İzleyici' };

export function AccountScreen() {
  const session = useSession();
  const [name, setName] = useState(session.displayName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const ws = useQuery(async () => unwrap(await db().from('agency_workspace_members').select('role,status,agency_workspaces(name,plan_code)').eq('user_id', session.userId)) as unknown as Membership[], [] as Membership[], []);

  const save = async () => {
    setBusy(true); setMsg(null);
    try { unwrap(await db().rpc('update_my_profile', { p_display_name: name })); setMsg({ tone: 'ok', text: 'Profil kaydedildi. Menüdeki ad bir sonraki girişte güncellenir.' }); }
    catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-100">Hesabım</h2>
        <p className="text-xs text-ink-400">Profiliniz, rolünüz ve üyesi olduğunuz çalışma alanları.</p>
      </div>
      <Panel title="Profil">
        <div className="space-y-3">
          <Field label="E-posta"><input className="ops-input" value={session.email} readOnly /></Field>
          <Field label="Görünen ad"><input className="ops-input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="flex items-center justify-between gap-2">
            <Pill tone={session.role === 'admin' ? 'go' : 'idle'}>{session.role === 'admin' ? 'Kurucu yönetici' : 'Ekip üyesi'}</Pill>
            <Button variant="primary" loading={busy} disabled={!name.trim() || name.trim() === session.displayName} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet</Button>
          </div>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        </div>
      </Panel>
      <Panel title="Çalışma alanları">
        {ws.loading && !ws.data.length ? <StateView kind="loading" compact /> : ws.error ? <StateView kind="error" message={ws.error} compact /> : !ws.data.length ? (
          <p className="text-xs text-ink-400">Henüz bir çalışma alanına üye değilsiniz; yöneticiniz sizi davet ettiğinde burada görünür.</p>
        ) : (
          <ul className="space-y-2">{ws.data.map((m, i) => (
            <li key={i} className="flex items-center justify-between gap-2 rounded-xl ring-1 ring-ink-800 px-3 py-2.5">
              <div className="min-w-0"><div className="text-sm font-semibold text-ink-100 truncate">{m.agency_workspaces?.name ?? 'Çalışma alanı'}</div><div className="text-[11px] text-ink-400">Paket: {m.agency_workspaces?.plan_code ?? '—'}</div></div>
              <Pill tone={m.status === 'active' ? 'go' : 'wait'}>{ROLE[m.role] ?? m.role}</Pill>
            </li>
          ))}</ul>
        )}
      </Panel>
      <Button variant="ghost" className="!text-rose-700" icon={<LogOut className="w-4 h-4" />} onClick={() => void supabase?.auth.signOut()}>Çıkış yap</Button>
    </div>
  );
}
