import { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import type { Skill, Tool } from '../lib/types';
import { useSession } from '../session';
import { Button, cx, DynIcon, ErrorState, Field, Modal, Notice, Pill, StateView, Tabs } from '../ui';

export function SkillsScreen() {
  const session = useSession();
  const isAdmin = session.role === 'admin';
  const [tab, setTab] = useState<'skills' | 'tools'>('skills');
  const [editing, setEditing] = useState<Skill | 'new' | null>(null);
  const [cat, setCat] = useState('all');
  const q = useQuery(async () => {
    const [s, t] = await Promise.all([db().from('automation_skills').select('*, automation_skill_tools(tool_id)').order('display_name'), db().from('automation_tools').select('*').order('category')]);
    return { skills: unwrap(s) as Skill[], tools: unwrap(t) as Tool[] };
  }, { skills: [] as Skill[], tools: [] as Tool[] }, []);
  const cats = ['all', ...new Set(q.data.skills.map((s) => s.category))];
  const toggleTool = async (t: Tool, patch: Partial<Tool>) => { await db().from('automation_tools').update(patch).eq('id', t.id); q.reload(); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div><h2 className="font-display text-xl font-semibold text-ink-100">Skill Market & Tool Registry</h2><p className="text-xs text-ink-400">Botlar yalnızca skill’lerine bağlı, registry’de aktif tool’ları çalıştırabilir. Sınırsız kod çalıştırma yok.</p></div>
        <div className="flex gap-2"><Tabs value={tab} onChange={setTab} items={[{ id: 'skills', label: 'Skill’ler', count: q.data.skills.length }, { id: 'tools', label: 'Tool’lar', count: q.data.tools.length }]} />
          {tab === 'skills' && isAdmin && <Button variant="primary" onClick={() => setEditing('new')} icon={<Plus className="w-4 h-4" />}>Skill</Button>}</div>
      </div>
      {q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : q.loading ? <StateView kind="loading" /> : tab === 'skills' ? (
        <>
          <div className="flex flex-wrap gap-1.5">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={cx('rounded-full px-3 py-1 text-[11px] font-semibold ring-1', cat === c ? 'ring-brand-green bg-ink-750 text-ink-100' : 'ring-ink-700 text-ink-400')}>{c === 'all' ? 'Tümü' : c}</button>)}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {q.data.skills.filter((s) => cat === 'all' || s.category === cat).map((s) => {
              const tools = (s.automation_skill_tools || []).map((l) => q.data.tools.find((t) => t.id === l.tool_id)).filter(Boolean) as Tool[];
              return (
                <button key={s.id} onClick={() => isAdmin && setEditing(s)} className="ops-panel text-left p-4 hover:ring-1 hover:ring-brand-green/40">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-ink-800 text-brand-green flex items-center justify-center"><DynIcon name={s.icon} className="w-5 h-5" /></span>
                    <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-ink-100">{s.display_name}</span>{!s.enabled && <Pill tone="idle">PASİF</Pill>}</div>
                      <div className="text-[10px] font-mono text-ink-500">{s.skill_key} · {s.category}</div></div>
                  </div>
                  <p className="text-xs text-ink-400 mt-2 line-clamp-2">{s.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2"><Pill tone={s.execution_mode === 'pipeline' ? 'go' : 'info'} dot={false}>{s.execution_mode === 'pipeline' ? 'PIPELINE (AI’sız)' : 'AI AGENT'}</Pill>{s.approval_required && <Pill tone="wait" dot={false}>ONAY</Pill>}</div>
                  <div className="flex flex-wrap gap-1 mt-2">{tools.map((t) => <span key={t.id} className="text-[10px] font-mono rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">{t.tool_key}</span>)}</div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="ops-panel overflow-x-auto ops-scroll">
          <table className="w-full text-xs min-w-[860px]">
            <thead><tr className="text-left text-[10px] font-mono uppercase tracking-wider text-ink-500 border-b border-ink-800"><th className="p-3">Tool</th><th className="p-3">Kategori</th><th className="p-3">Açıklama</th><th className="p-3">Min. rol</th><th className="p-3">Onay</th><th className="p-3">Aktif</th></tr></thead>
            <tbody>{q.data.tools.map((t) => (
              <tr key={t.id} className="border-b border-ink-800/60">
                <td className="p-3"><div className="font-semibold text-ink-100">{t.name}</div><div className="font-mono text-[10px] text-ink-500">{t.tool_key}</div></td>
                <td className="p-3 text-ink-300">{t.category}</td><td className="p-3 text-ink-400 max-w-sm">{t.description}</td>
                <td className="p-3">{isAdmin ? <select className="ops-input !py-1 !w-auto" value={t.min_role} onChange={(e) => toggleTool(t, { min_role: e.target.value as Tool['min_role'] })}><option value="staff">staff</option><option value="admin">admin</option></select> : t.min_role}</td>
                <td className="p-3"><button disabled={!isAdmin} onClick={() => toggleTool(t, { approval_required: !t.approval_required })}><Pill tone={t.approval_required ? 'wait' : 'idle'}>{t.approval_required ? 'GEREKLİ' : 'YOK'}</Pill></button></td>
                <td className="p-3"><button disabled={!isAdmin} onClick={() => toggleTool(t, { active: !t.active })}><Pill tone={t.active ? 'go' : 'idle'}>{t.active ? 'AKTİF' : 'PASİF'}</Pill></button></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      {editing && <SkillEditor skill={editing === 'new' ? null : editing} tools={q.data.tools} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); q.reload(); }} />}
    </div>
  );
}

function SkillEditor({ skill, tools, onClose, onSaved }: { skill: Skill | null; tools: Tool[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    skill_key: skill?.skill_key ?? '', display_name: skill?.display_name ?? '', description: skill?.description ?? '', category: skill?.category ?? 'content', icon: skill?.icon ?? 'sparkles',
    instructions: skill?.instructions ?? '', execution_mode: skill?.execution_mode ?? 'agent', pipeline: (skill?.pipeline ?? []).join(','), approval_required: skill?.approval_required ?? true, enabled: skill?.enabled ?? true,
    tools: (skill?.automation_skill_tools ?? []).map((l) => l.tool_id),
  });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const row = { skill_key: f.skill_key, display_name: f.display_name, description: f.description, category: f.category, icon: f.icon, instructions: f.instructions, execution_mode: f.execution_mode,
        pipeline: f.pipeline.split(',').map((x) => x.trim()).filter(Boolean), approval_required: f.approval_required, enabled: f.enabled, allowed_actions: skill?.allowed_actions ?? [] };
      let id = skill?.id;
      if (skill) { const { error } = await db().from('automation_skills').update(row).eq('id', skill.id); if (error) throw error; }
      else { const { data, error } = await db().from('automation_skills').insert(row).select('id').single(); if (error) throw error; id = data.id; }
      await db().from('automation_skill_tools').delete().eq('skill_id', id!);
      if (f.tools.length) { const { error } = await db().from('automation_skill_tools').insert(f.tools.map((t) => ({ skill_id: id, tool_id: t }))); if (error) throw error; }
      onSaved();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open wide onClose={onClose} title={skill ? `Skill · ${skill.display_name}` : 'Yeni skill'} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet</Button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Anahtar"><input className="ops-input font-mono" disabled={Boolean(skill)} value={f.skill_key} onChange={(e) => setF({ ...f, skill_key: e.target.value.replace(/[^a-z0-9_]/g, '') })} /></Field>
        <Field label="Ad"><input className="ops-input" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} /></Field>
        <Field label="Kategori"><input className="ops-input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></Field>
        <Field label="Çalışma modu"><select className="ops-input" value={f.execution_mode} onChange={(e) => setF({ ...f, execution_mode: e.target.value as 'agent' | 'pipeline' })}><option value="agent">AI agent (tool-use)</option><option value="pipeline">Pipeline (sıralı tool, AI’sız)</option></select></Field>
        <Field label="Açıklama" className="sm:col-span-2"><input className="ops-input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Talimat" className="sm:col-span-2"><textarea className="ops-input min-h-[80px]" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></Field>
        {f.execution_mode === 'pipeline' && <Field label="Pipeline sırası" hint="Virgülle tool anahtarları" className="sm:col-span-2"><input className="ops-input font-mono" value={f.pipeline} onChange={(e) => setF({ ...f, pipeline: e.target.value })} /></Field>}
        <Field label="Tool’lar" className="sm:col-span-2"><div className="flex flex-wrap gap-1.5">{tools.map((t) => <button key={t.id} type="button" onClick={() => setF({ ...f, tools: f.tools.includes(t.id) ? f.tools.filter((x) => x !== t.id) : [...f.tools, t.id] })} className={cx('rounded-lg px-2 py-1 text-[11px] font-mono ring-1', f.tools.includes(t.id) ? 'ring-brand-green bg-ink-750 text-ink-100' : 'ring-ink-700 text-ink-400')}>{t.tool_key}</button>)}</div></Field>
        <label className="flex items-center gap-2 text-xs text-ink-200"><input type="checkbox" checked={f.approval_required} onChange={(e) => setF({ ...f, approval_required: e.target.checked })} /> Çıktılar onay gerektirir</label>
        <label className="flex items-center gap-2 text-xs text-ink-200"><input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} /> Aktif</label>
      </div>
      {err && <div className="mt-3"><Notice tone="error">{err}</Notice></div>}
    </Modal>
  );
}
