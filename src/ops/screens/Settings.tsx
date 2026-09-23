import { useState } from 'react';
import { Save } from 'lucide-react';
import { callOps, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import type { BrandKit, OpsStatus } from '../lib/types';
import { useSession } from '../session';
import { Button, ErrorState, Field, Notice, Panel, Pill, SavedStamp, StateView, Tabs } from '../ui';
import { AiKeysPanel } from '../components/AiKeys';
import { AiBudgetPanel } from '../components/AiBudget';

interface Agent { id: string; agent_key: string; name: string; provider: 'anthropic' | 'openai' | 'gemini'; model: string; temperature: number; max_tokens: number; system_prompt: string; active: boolean }
interface Member { user_id: string; role: string; display_name: string | null; created_at: string }
interface AuditRow { id: number; at: string; actor: string | null; actor_kind: string; action: string; entity_type: string; entity_id: string | null; summary: string | null; diff: Record<string, unknown> }

export function SettingsScreen() {
  const [tab, setTab] = useState<'brand' | 'ai' | 'team' | 'audit'>(() => (new URLSearchParams(window.location.search).get('tab') === 'ai' ? 'ai' : 'brand'));
  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div><h2 className="font-display text-xl font-semibold text-ink-100">Ayarlar</h2><p className="text-xs text-ink-400">Marka kiti, AI model katmanı, ekip rolleri ve denetim kaydı.</p></div>
        <Tabs value={tab} onChange={setTab} items={[{ id: 'brand', label: 'Marka kiti' }, { id: 'ai', label: 'AI anahtarı & modeller' }, { id: 'team', label: 'Ekip' }, { id: 'audit', label: 'Audit log' }]} />
      </div>
      {tab === 'brand' && <BrandKits />}
      {tab === 'ai' && <div className="space-y-4"><AiBudgetPanel /><AiKeysPanel /><Agents /></div>}
      {tab === 'team' && <Team />}
      {tab === 'audit' && <Audit />}
    </div>
  );
}

function BrandKits() {
  const session = useSession();
  const q = useQuery(async () => unwrap(await db().from('brand_kits').select('*').order('is_default', { ascending: false })) as BrandKit[], [] as BrandKit[], []);
  const [msg, setMsg] = useState<string | null>(null);
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  if (q.loading) return <StateView kind="loading" />;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {msg && <div className="xl:col-span-2"><Notice tone="ok">{msg}</Notice></div>}
      {q.data.map((k) => <BrandCard key={k.id} kit={k} disabled={session.role !== 'admin'} onSaved={() => { setMsg(`${k.name} kaydedildi.`); q.reload(); }} />)}
    </div>
  );
}

function BrandCard({ kit, disabled, onSaved }: { kit: BrandKit; disabled: boolean; onSaved: () => void }) {
  const [f, setF] = useState(kit);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const { id, ...rest } = f;
    const { data, error } = await db().from('brand_kits').update(rest).eq('id', id).select('updated_at').single();
    setBusy(false); if (error) setErr(errorText(error)); else { setSavedAt(data.updated_at); onSaved(); }
  };
  const color = (k: 'primary_color' | 'secondary_color' | 'accent_color' | 'text_color', label: string) => (
    <Field label={label}><div className="flex gap-2"><input type="color" disabled={disabled} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.toUpperCase() })} className="h-10 w-12 rounded-lg bg-transparent" /><input disabled={disabled} className="ops-input font-mono" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div></Field>
  );
  return (
    <Panel kicker={kit.is_default ? 'Varsayılan marka kiti' : 'Marka kiti'} title={kit.name} action={!disabled && <div className="flex flex-col items-end gap-1"><Button variant="primary" loading={busy} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet</Button><SavedStamp at={savedAt} /></div>}>
      <div className="flex gap-2 mb-4">{[f.primary_color, f.secondary_color, f.accent_color, f.text_color].map((c, i) => <span key={i} className="h-10 flex-1 rounded-xl ring-1 ring-ink-700" style={{ background: c }} />)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Şirket adı"><input disabled={disabled} className="ops-input" value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></Field>
        <Field label="Logo URL"><input disabled={disabled} className="ops-input" value={f.logo_url ?? ''} onChange={(e) => setF({ ...f, logo_url: e.target.value })} /></Field>
        {color('primary_color', 'Ana renk')}{color('secondary_color', 'İkincil renk')}{color('accent_color', 'Vurgu rengi')}{color('text_color', 'Metin rengi')}
        <Field label="Başlık fontu"><input disabled={disabled} className="ops-input" value={f.font_heading} onChange={(e) => setF({ ...f, font_heading: e.target.value })} /></Field>
        <Field label="Metin fontu"><input disabled={disabled} className="ops-input" value={f.font_body} onChange={(e) => setF({ ...f, font_body: e.target.value })} /></Field>
        <Field label="Telefon"><input disabled={disabled} className="ops-input" value={f.phone ?? ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Web sitesi"><input disabled={disabled} className="ops-input" value={f.website ?? ''} onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
        <Field label="Instagram"><input disabled={disabled} className="ops-input" value={f.instagram ?? ''} onChange={(e) => setF({ ...f, instagram: e.target.value })} /></Field>
        <Field label="Varsayılan CTA"><input disabled={disabled} className="ops-input" value={f.default_cta ?? ''} onChange={(e) => setF({ ...f, default_cta: e.target.value })} /></Field>
      </div>
      {err && <div className="mt-3"><Notice tone="error">{err}</Notice></div>}
    </Panel>
  );
}

function Agents() {
  const session = useSession();
  const q = useQuery(async () => unwrap(await db().from('ai_agents').select('*').order('agent_key')) as Agent[], [] as Agent[], []);
  const status = useQuery<OpsStatus | null>(() => callOps<OpsStatus>('status'), null, []);
  const gens = useQuery(async () => unwrap(await db().from('ai_generations').select('id,kind,provider,model,status,error,tokens_in,tokens_out,duration_ms,created_at').order('created_at', { ascending: false }).limit(20)) as Array<Record<string, string | number | null>>, [], []);
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  return (
    <div className="space-y-4">
      {status.data && <Notice tone={status.data.ai.anthropic ? 'ok' : 'warn'}>Anthropic: {status.data.ai.anthropic ? 'anahtar tanımlı' : 'ANTHROPIC_API_KEY tanımlı değil'} · OpenAI: {status.data.ai.openai ? 'tanımlı' : 'yok'} · Gemini: {status.data.ai.gemini ? 'tanımlı' : 'yok'}. Anahtarlar yalnızca Supabase Edge Function Secrets’ta tutulur.</Notice>}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">{q.data.map((a) => <AgentCard key={a.id} agent={a} disabled={session.role !== 'admin'} onSaved={q.reload} />)}</div>
      <Panel kicker="ai_generations" title="Son AI üretimleri">
        {gens.data.length === 0 ? <StateView kind="empty" compact title="Henüz AI üretimi yok" /> : (
          <div className="overflow-x-auto ops-scroll"><table className="w-full text-xs min-w-[640px]"><tbody>{gens.data.map((g) => (
            <tr key={String(g.id)} className="border-b border-ink-800/60"><td className="p-2 font-mono text-ink-400">{fmtDateTime(String(g.created_at))}</td><td className="p-2 text-ink-200">{g.kind}</td><td className="p-2 text-ink-400">{g.provider}/{g.model}</td>
              <td className="p-2"><Pill tone={g.status === 'succeeded' ? 'go' : g.status === 'configuration_required' ? 'wait' : 'stop'}>{String(g.status).toUpperCase()}</Pill></td><td className="p-2 font-mono text-ink-400">{g.tokens_in ?? 0}/{g.tokens_out ?? 0}</td><td className="p-2 text-rose-700 max-w-xs truncate">{g.error}</td></tr>))}</tbody></table></div>
        )}
      </Panel>
    </div>
  );
}

function AgentCard({ agent, disabled, onSaved }: { agent: Agent; disabled: boolean; onSaved: () => void }) {
  const [f, setF] = useState(agent);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const save = async () => { setBusy(true); setErr(null); const { id, agent_key: _k, ...rest } = f; const { data, error } = await db().from('ai_agents').update(rest).eq('id', id).select('updated_at').single(); setBusy(false); if (error) setErr(errorText(error)); else { setSavedAt(data.updated_at); onSaved(); } };
  return (
    <Panel kicker={agent.agent_key} title={agent.name} action={!disabled && <div className="flex flex-col items-end gap-1"><Button variant="primary" loading={busy} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet</Button><SavedStamp at={savedAt} /></div>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Sağlayıcı"><select disabled={disabled} className="ops-input" value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value as Agent['provider'] })}><option value="anthropic">Anthropic</option><option value="openai">OpenAI</option><option value="gemini">Gemini</option></select></Field>
          <Field label="Model"><input disabled={disabled} className="ops-input font-mono" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></Field>
          <Field label="Temperature" hint="Opus 5 ailesinde yok sayılır"><input disabled={disabled} type="number" step="0.1" min={0} max={2} className="ops-input" value={f.temperature} onChange={(e) => setF({ ...f, temperature: Number(e.target.value) })} /></Field>
          <Field label="Max tokens"><input disabled={disabled} type="number" className="ops-input" value={f.max_tokens} onChange={(e) => setF({ ...f, max_tokens: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Sistem talimatı"><textarea disabled={disabled} className="ops-input min-h-[110px]" value={f.system_prompt} onChange={(e) => setF({ ...f, system_prompt: e.target.value })} /></Field>
        {err && <Notice tone="error">{err}</Notice>}
      </div>
    </Panel>
  );
}

function Team() {
  const session = useSession();
  const q = useQuery(async () => unwrap(await db().from('team_members').select('*').order('created_at')) as Member[], [] as Member[], []);
  const [f, setF] = useState({ user_id: '', role: 'staff', display_name: '' });
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const add = async () => { const { error } = await db().from('team_members').insert(f); setMsg(error ? { tone: 'error', text: errorText(error) } : { tone: 'ok', text: 'Ekip üyesi eklendi.' }); if (!error) { setF({ user_id: '', role: 'staff', display_name: '' }); q.reload(); } };
  const setRole = async (m: Member, role: string) => { const { error } = await db().from('team_members').update({ role }).eq('user_id', m.user_id); setMsg(error ? { tone: 'error', text: errorText(error) } : { tone: 'ok', text: `${m.display_name ?? 'Üye'} rolü kaydedildi.` }); q.reload(); };
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
      <Panel kicker="team_members · RLS" title="Ekip ve roller">
        {q.data.length === 0 ? <StateView kind="empty" compact /> : (
          <ul className="space-y-2">{q.data.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 rounded-xl bg-ink-900/60 ring-1 ring-ink-800 p-3">
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-ink-100">{m.display_name || '—'}{m.user_id === session.userId && <span className="text-ink-500"> (siz)</span>}</div><div className="text-[10px] font-mono text-ink-500 truncate">{m.user_id}</div></div>
              {session.role === 'admin' && m.user_id !== session.userId ? <select className="ops-input !w-auto !py-1" value={m.role} onChange={(e) => setRole(m, e.target.value)}><option value="staff">staff</option><option value="admin">admin</option></select> : <Pill tone={m.role === 'admin' ? 'info' : 'idle'}>{m.role.toUpperCase()}</Pill>}
            </li>))}</ul>
        )}
      </Panel>
      {session.role === 'admin' && (
        <Panel kicker="Yetkilendirme" title="Üye ekle">
          <p className="text-[11px] text-ink-400 mb-3">Kişi önce Supabase Auth’ta hesap açmalı (Dashboard → Authentication → Invite). Ardından kullanıcı kimliğini (UUID) buraya girin. Staff: içerik, müşteri, görev; Admin: yayın, e-posta, bot/skill yönetimi.</p>
          <div className="space-y-3">
            <Field label="Kullanıcı UUID"><input className="ops-input font-mono" value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value.trim() })} /></Field>
            <Field label="Görünen ad"><input className="ops-input" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} /></Field>
            <Field label="Rol"><select className="ops-input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="staff">staff</option><option value="admin">admin</option></select></Field>
            <Button variant="primary" className="w-full" disabled={!/^[0-9a-f-]{36}$/.test(f.user_id)} onClick={add}>Ekle</Button>
            {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : 'error'}>{msg.text}</Notice>}
          </div>
        </Panel>
      )}
    </div>
  );
}

function Audit() {
  const [entity, setEntity] = useState('all');
  const q = useQuery(async () => {
    let query = db().from('audit_log').select('*').order('at', { ascending: false }).limit(200);
    if (entity !== 'all') query = query.eq('entity_type', entity);
    return unwrap(await query) as AuditRow[];
  }, [] as AuditRow[], [entity]);
  const members = useQuery(async () => unwrap(await db().from('team_members').select('user_id,display_name')) as Array<{ user_id: string; display_name: string | null }>, [], []);
  const who = (id: string | null) => (id ? members.data.find((m) => m.user_id === id)?.display_name ?? id.slice(0, 8) : 'sistem');
  return (
    <Panel kicker="audit_log" title="Kim, neyi, ne zaman yaptı?" action={<select className="ops-input !w-auto !py-1.5 text-xs" value={entity} onChange={(e) => setEntity(e.target.value)}>
      {['all', 'approval_requests', 'automation_tasks', 'automation_bots', 'social_publications', 'social_drafts', 'construction_customers', 'rental_customers', 'social_accounts', 'team_members'].map((e) => <option key={e} value={e}>{e === 'all' ? 'Tümü' : e}</option>)}</select>}>
      {q.error ? <ErrorState error={q.error} /> : q.loading ? <StateView kind="loading" compact /> : q.data.length === 0 ? <StateView kind="empty" compact /> : (
        <div className="overflow-x-auto ops-scroll"><table className="w-full text-xs min-w-[760px]"><tbody>{q.data.map((a) => (
          <tr key={a.id} className="border-b border-ink-800/60 align-top">
            <td className="p-2 font-mono text-ink-400 whitespace-nowrap">{fmtDateTime(a.at)}</td>
            <td className="p-2 text-ink-200 whitespace-nowrap">{who(a.actor)}</td>
            <td className="p-2"><Pill tone={a.action === 'delete' ? 'stop' : a.action === 'insert' ? 'go' : 'info'} dot={false}>{a.action.toUpperCase()}</Pill></td>
            <td className="p-2 text-ink-300 whitespace-nowrap">{a.entity_type}</td>
            <td className="p-2 text-ink-400 font-mono text-[10px] break-all">{a.summary ?? (Object.keys(a.diff || {}).filter((k) => k !== 'new' && k !== 'old').map((k) => `${k}: ${JSON.stringify((a.diff[k] as { to?: unknown })?.to ?? '')}`.slice(0, 80)).join(' · ') || (a.diff.new ? 'kayıt oluşturuldu' : ''))}</td>
          </tr>))}</tbody></table></div>
      )}
    </Panel>
  );
}
