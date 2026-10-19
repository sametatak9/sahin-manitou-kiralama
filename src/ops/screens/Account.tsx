import { useState } from 'react';
import { LogOut, Save, ShieldCheck, UserRound } from 'lucide-react';
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

  const initial = name.trim().slice(0, 1).toLocaleUpperCase('tr-TR') || 'Ü';

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-darkgreen">Kişisel alan</p>
        <h2 className="font-display text-2xl font-bold text-ink-100 mt-1">Hesabım</h2>
        <p className="text-sm text-ink-400 mt-1">Profiliniz, erişim rolünüz ve üyesi olduğunuz çalışma alanları.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)] gap-4 items-start">
        <Panel title="Profil bilgileri" kicker="KİŞİSEL PROFİL" className="space-y-4">
          <div className="agency-profile-hero flex items-center gap-4">
            <div className="agency-avatar w-14 h-14 text-lg rounded-[18px]">{initial}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">EMBAY Agency üyesi</div>
              <div className="font-display text-lg font-bold text-ink-100 truncate mt-0.5">{session.displayName}</div>
              <div className="text-xs text-ink-400 truncate mt-0.5">{session.email}</div>
            </div>
            <UserRound className="hidden sm:block w-5 h-5 text-brand-green" />
          </div>
          <Field label="E-posta" hint="Giriş için kullanılan adres; bu ekrandan değiştirilemez."><input className="ops-input" value={session.email} readOnly /></Field>
          <Field label="Görünen ad" hint="Menüde ve üye profilinizde gösterilir."><input className="ops-input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-800 pt-4">
            <span className="inline-flex items-center gap-2 text-ink-500"><ShieldCheck className="w-4 h-4 text-brand-green" /><Pill tone={session.role === 'admin' ? 'info' : 'idle'}>{session.role === 'admin' ? 'Kurucu yönetici' : 'Ekip üyesi'}</Pill></span>
            <Button variant="primary" loading={busy} disabled={!name.trim() || name.trim() === session.displayName} onClick={save} icon={<Save className="w-4 h-4" />}>Profili kaydet</Button>
          </div>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        </Panel>

        <Panel title="Çalışma alanları" kicker="ÜYELİKLER">
          {ws.loading && !ws.data.length ? <StateView kind="loading" compact /> : ws.error ? <StateView kind="error" message={ws.error} compact /> : !ws.data.length ? (
            <StateView kind="empty" compact title="Henüz üyelik yok" message="Bir yönetici sizi çalışma alanına davet ettiğinde üyeliğiniz burada görünür." />
          ) : (
            <ul className="space-y-2.5">{ws.data.map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-ink-700 bg-white px-3.5 py-3 shadow-sm shadow-slate-900/[0.03]">
                <div className="min-w-0"><div className="text-sm font-semibold text-ink-100 truncate">{m.agency_workspaces?.name ?? 'Çalışma alanı'}</div><div className="text-[11px] text-ink-500 mt-1">Paket: {m.agency_workspaces?.plan_code ?? '—'} · Rol: {ROLE[m.role] ?? m.role}</div></div>
                <Pill tone={m.status === 'active' ? 'go' : 'wait'}>{m.status === 'active' ? 'ETKİN' : m.status.toLocaleUpperCase('tr-TR')}</Pill>
              </li>
            ))}</ul>
          )}
        </Panel>
      </div>

      <div className="border-t border-ink-700 pt-3">
        <Button variant="ghost" className="!text-rose-700" icon={<LogOut className="w-4 h-4" />} onClick={() => void supabase?.auth.signOut()}>Oturumu kapat</Button>
      </div>
    </div>
  );
}
