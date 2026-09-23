import { useEffect, useState } from 'react';
import { Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { SupabaseAuthGate } from './components/SupabaseAuthGate';
import { supabase } from './lib/supabase';
import { OpsApp } from './ops/OpsApp';
import type { OpsSession } from './ops/session';

type Phase = { kind: 'checking' } | { kind: 'anon' } | { kind: 'pending'; email: string } | { kind: 'ready'; session: OpsSession } | { kind: 'error'; message: string };

/** Oturum + ekip üyeliği kapısı. Ekip boşsa ilk giriş yapan kullanıcı claim_first_admin ile yönetici olur. */
async function resolveMembership(): Promise<Phase> {
  if (!supabase) return { kind: 'error', message: 'Supabase yapılandırılmamış.' };
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return { kind: 'anon' };
  let { data: member } = await supabase.from('team_members').select('role,display_name').eq('user_id', user.id).maybeSingle();
  if (!member) {
    const { data: claimed } = await supabase.rpc('claim_first_admin');
    if (claimed) ({ data: member } = await supabase.from('team_members').select('role,display_name').eq('user_id', user.id).maybeSingle());
  }
  if (!member) return { kind: 'pending', email: user.email ?? '' };
  return { kind: 'ready', session: { userId: user.id, email: user.email ?? '', role: member.role as OpsSession['role'], displayName: member.display_name || (user.email ?? 'Ekip üyesi').split('@')[0] } };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' });
  useEffect(() => { document.title = 'Embay Operasyon Merkezi'; }, []);

  useEffect(() => {
    let alive = true;
    const refresh = () => resolveMembership().then((p) => alive && setPhase(p)).catch((e) => alive && setPhase({ kind: 'error', message: String(e?.message || e) }));
    refresh();
    const sub = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') refresh();
    });
    return () => { alive = false; sub?.data.subscription.unsubscribe(); };
  }, []);

  const logout = async () => { await supabase?.auth.signOut(); setPhase({ kind: 'anon' }); };

  if (phase.kind === 'checking') {
    return <div className="ops-root min-h-screen flex items-center justify-center text-ink-300 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Operasyon merkezi hazırlanıyor…</div>;
  }
  if (phase.kind === 'anon') return <SupabaseAuthGate onAuthenticated={() => resolveMembership().then(setPhase)} />;
  if (phase.kind === 'pending' || phase.kind === 'error') {
    return (
      <div className="ops-root min-h-screen flex items-center justify-center p-4">
        <div className="ops-panel max-w-md w-full p-7 text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-amber-700 mx-auto" />
          <h1 className="font-display text-lg font-semibold text-ink-100">{phase.kind === 'pending' ? 'Yetki bekleniyor' : 'Bağlantı hatası'}</h1>
          <p className="text-sm text-ink-300">{phase.kind === 'pending' ? `${phase.email} hesabı giriş yaptı ancak ekip üyesi değil. Yöneticiniz sizi Ayarlar → Ekip bölümünden eklemeli.` : phase.message}</p>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold ring-1 ring-ink-600 text-ink-200 hover:bg-ink-800"><LogOut className="w-4 h-4" /> Çıkış yap</button>
        </div>
      </div>
    );
  }
  return <OpsApp session={phase.session} onLogout={logout} />;
}
