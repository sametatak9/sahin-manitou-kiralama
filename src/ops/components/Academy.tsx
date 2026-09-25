// AKADEMİ: yeteneklerin eğitildiği ve test edildiği alan.
// Akış: Taslak → "Test et" (gerçek kısa görev + denetim) → puan → yönetici "Onayla" → yalnızca onaylı yetenekler görevlerde kullanılır.
// Denetimden sonra koç, yeteneğin eksiğini teşhis edip öneri bırakır; "Uygula" deyince yetenek güncellenir (sürüm +1).
import { useState } from 'react';
import { CheckCircle2, FlaskConical, GraduationCap, Lightbulb, Pencil, Play, Save, XCircle } from 'lucide-react';
import { callMissions, errorText } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { db, unwrap, useQuery } from '../lib/hooks';
import type { Bot } from '../lib/types';
import { useSession } from '../session';
import { Button, Field, Modal, Notice, Pill, StateView } from '../ui';
import { MissionDetail } from './Missions';

interface AcademySkill {
  id: string; skill_key: string; display_name: string; description: string; category: string; instructions: string; enabled: boolean;
  lifecycle: 'draft' | 'testing' | 'approved' | 'retired'; version: number; search_terms: string[]; sources: string[];
  good_examples: string | null; bad_examples: string | null; test_goal: string | null; test_score: number | null; test_findings: number | null;
  last_tested_at: string | null; last_test_mission_id: string | null; approved_at: string | null;
}
interface Improvement { id: string; skill_id: string; mission_id: string | null; diagnosis: string; instructions_add: string | null; search_terms_add: string[]; search_terms_remove: string[]; sources_add: string[]; status: string; created_at: string; reviewer?: string }

const LIFE: Record<AcademySkill['lifecycle'], { label: string; tone: 'idle' | 'wait' | 'go' | 'stop' }> = {
  draft: { label: 'TASLAK', tone: 'idle' }, testing: { label: 'TESTTE', tone: 'wait' }, approved: { label: 'ONAYLI · GÖREVDE', tone: 'go' }, retired: { label: 'EMEKLİ', tone: 'stop' },
};
const RESEARCH = new Set(['arastirma', 'crm', 'intel']);

export function Academy({ bots }: { bots: Bot[] }) {
  const session = useSession();
  const isAdmin = session.role === 'admin';
  const [editing, setEditing] = useState<AcademySkill | null>(null);
  const [openMission, setOpenMission] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const q = useQuery(async () => {
    const [s, i] = await Promise.all([
      db().from('automation_skills').select('id,skill_key,display_name,description,category,instructions,enabled,lifecycle,version,search_terms,sources,good_examples,bad_examples,test_goal,test_score,test_findings,last_tested_at,last_test_mission_id,approved_at')
        .is('archived_at', null).order('display_name'),
      db().from('skill_improvements').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(100),
    ]);
    return { skills: unwrap(s) as AcademySkill[], imps: unwrap(i) as Improvement[] };
  }, { skills: [] as AcademySkill[], imps: [] as Improvement[] }, [], ['automation_skills', 'skill_improvements']);

  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ tone: 'ok', text: ok }); q.reload(); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const test = (s: AcademySkill) => act(`t:${s.id}`, async () => { const r = await callMissions<{ mission_id: string }>('skill_test', { skill_id: s.id, minutes: 10 }); setOpenMission(r.mission_id); }, `“${s.display_name}” test görevine çıktı (≈10 dk). Bitince denetim puanı buraya yazılır.`);
  const life = (s: AcademySkill, l: AcademySkill['lifecycle']) => act(`l:${s.id}`, async () => { const { error } = await db().rpc('set_skill_lifecycle', { p_skill: s.id, p_lifecycle: l }); if (error) throw error; }, `“${s.display_name}”: ${LIFE[l].label}`);
  const apply = (i: Improvement) => act(`i:${i.id}`, async () => { const { error } = await db().rpc('apply_skill_improvement', { p_id: i.id }); if (error) throw error; }, 'Öneri uygulandı — yetenek yeni sürüme geçti. Tekrar test edebilirsiniz.');
  const dismiss = (i: Improvement) => act(`i:${i.id}`, async () => { const { error } = await db().from('skill_improvements').update({ status: 'dismissed', decided_at: new Date().toISOString() }).eq('id', i.id); if (error) throw error; }, 'Öneri reddedildi.');

  const sorted = [...q.data.skills].sort((a, b) => {
    const r = (s: AcademySkill) => (RESEARCH.has(s.category) || s.test_goal ? 0 : 1) * 10 + ({ testing: 0, draft: 1, approved: 2, retired: 3 }[s.lifecycle]);
    return r(a) - r(b);
  });

  return (
    <div className="space-y-4">
      <div className="ops-panel p-4">
        <div className="flex items-start gap-3">
          <GraduationCap className="w-6 h-6 text-brand-green shrink-0" />
          <div className="text-xs text-ink-300 space-y-1">
            <div className="font-display text-base font-semibold text-ink-100">Akademi — yetenek eğitimi, testi ve onayı</div>
            <p><b>1. Eğit:</b> Yeteneğin talimatını, arama terimlerini, kaynaklarını ve iyi/kötü örneklerini yazın. <b>2. Test et:</b> Yetenek 10 dakikalık gerçek bir göreve çıkar; getirdiği her bilgi <b>denetçi</b> tarafından kaynağında kontrol edilir ve doğruluk puanı çıkar. <b>3. Onayla:</b> Yalnızca <b>onaylı</b> yetenekler botların gerçek görevlerinde kullanılır.</p>
            <p><b>Claude denetimi:</b> Her sabah görevler bittikten sonra (≈10:00) Claude raporları açar, bulguların kaynağına bakarak gerçek/sahte/alakasız ayırır ve yeteneği kendisi geliştirir (yeni sürüm); özeti Telegram’a gönderir. <b>Koç önerileri:</b> Her görevden sonra koç, botun eksiklerini teşhis eder (ör. yanlış arama terimi, zayıf kaynak) ve somut düzeltme önerir. “Uygula” deyince yetenek bir üst sürüme geçer.</p>
          </div>
        </div>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {q.loading && !q.data.skills.length ? <StateView kind="loading" /> : q.error ? <StateView kind="error" title="Akademi okunamadı" message={q.error} /> : !sorted.length ? <StateView kind="empty" title="Veri bulunamadı" /> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {sorted.map((s) => {
            const imps = q.data.imps.filter((i) => i.skill_id === s.id);
            const score = s.test_score == null ? null : Number(s.test_score);
            return (
              <div key={s.id} className="ops-panel p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="font-semibold text-ink-100">{s.display_name} <span className="text-[10px] font-mono text-ink-500">v{s.version}</span></div>
                    <div className="text-[10px] font-mono text-ink-500">{s.skill_key} · {s.category}</div></div>
                  <Pill tone={LIFE[s.lifecycle].tone}>{LIFE[s.lifecycle].label}</Pill>
                </div>
                {s.test_goal && <p className="text-xs text-ink-300 line-clamp-3"><b>Test amacı:</b> {s.test_goal}</p>}
                {s.search_terms?.length > 0 && <div className="flex flex-wrap gap-1">{s.search_terms.slice(0, 12).map((t) => <span key={t} className="text-[10px] rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">{t}</span>)}</div>}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-400">
                  {score == null ? <span>Henüz test edilmedi</span> : <span>Son test: <b className={score >= 60 ? 'text-emerald-700' : score >= 30 ? 'text-amber-700' : 'text-rose-700'}>%{score} doğruluk</b> · {s.test_findings ?? 0} doğrulanmış bulgu · {fmtDateTime(s.last_tested_at)}</span>}
                  {s.last_test_mission_id && <button className="underline text-brand-green" onClick={() => setOpenMission(s.last_test_mission_id)}>test raporu</button>}
                </div>
                {isAdmin && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Button variant="subtle" onClick={() => setEditing(s)} icon={<Pencil className="w-4 h-4" />}>Eğit / düzenle</Button>
                    {s.lifecycle !== 'retired' && <Button variant="subtle" loading={busy === `t:${s.id}`} onClick={() => test(s)} icon={<FlaskConical className="w-4 h-4" />}>Test et</Button>}
                    {s.lifecycle !== 'approved' && s.lifecycle !== 'retired' && <Button variant="primary" loading={busy === `l:${s.id}`} onClick={() => life(s, 'approved')} icon={<CheckCircle2 className="w-4 h-4" />}>Onayla (görevde kullan)</Button>}
                    {s.lifecycle === 'approved' && <Button variant="ghost" loading={busy === `l:${s.id}`} onClick={() => life(s, 'testing')} icon={<Play className="w-4 h-4" />}>Teste geri al</Button>}
                    {s.lifecycle !== 'retired' && <Button variant="ghost" loading={busy === `l:${s.id}`} onClick={() => life(s, 'retired')} icon={<XCircle className="w-4 h-4" />}>Emekliye ayır</Button>}
                  </div>
                )}
                {imps.length > 0 && (
                  <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3 space-y-2">
                    <div className="text-xs font-semibold text-amber-800 inline-flex items-center gap-1"><Lightbulb className="w-4 h-4" />Koç önerisi ({imps.length})</div>
                    {imps.slice(0, 3).map((i) => (
                      <div key={i.id} className="text-[11px] text-ink-200 space-y-1 border-t border-amber-200 pt-2 first:border-0 first:pt-0">
                        <p><span className={i.reviewer === 'claude' ? 'mr-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-800' : 'mr-1 rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-bold text-ink-300'}>{i.reviewer === 'claude' ? 'CLAUDE DENETİMİ' : 'OTOMATİK KOÇ'}</span><b>Teşhis:</b> {i.diagnosis}</p>
                        {i.instructions_add && <p><b>Talimata eklenecek:</b> {i.instructions_add}</p>}
                        {i.search_terms_add.length > 0 && <p><b>Yeni arama terimleri:</b> {i.search_terms_add.join(', ')}</p>}
                        {i.search_terms_remove.length > 0 && <p><b>Çıkarılacak terimler:</b> {i.search_terms_remove.join(', ')}</p>}
                        {i.sources_add.length > 0 && <p><b>Yeni kaynaklar:</b> {i.sources_add.join(', ')}</p>}
                        <div className="flex gap-2 items-center"><span className="text-ink-500">{fmtDateTime(i.created_at)}</span>
                          {i.mission_id && <button className="underline text-brand-green" onClick={() => setOpenMission(i.mission_id)}>kaynak görev</button>}
                          {isAdmin && <><Button variant="primary" loading={busy === `i:${i.id}`} onClick={() => apply(i)}>Uygula</Button><Button variant="ghost" loading={busy === `i:${i.id}`} onClick={() => dismiss(i)}>Reddet</Button></>}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {editing && <TrainModal skill={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); q.reload(); setMsg({ tone: 'ok', text: 'Yetenek kaydedildi. Değişiklikten sonra “Test et” ile doğrulayın.' }); }} />}
      {openMission && <MissionDetail id={openMission} bots={bots} onClose={() => setOpenMission(null)} />}
    </div>
  );
}

function TrainModal({ skill, onClose, onSaved }: { skill: AcademySkill; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    display_name: skill.display_name, instructions: skill.instructions ?? '', test_goal: skill.test_goal ?? '', search_terms: (skill.search_terms ?? []).join(', '),
    sources: (skill.sources ?? []).join(', '), good_examples: skill.good_examples ?? '', bad_examples: skill.bad_examples ?? '',
  });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const list = (v: string) => v.split(/[,\n]/).map((x) => x.trim()).filter((x) => x.length > 1).slice(0, 30);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const { error } = await db().from('automation_skills').update({
        display_name: f.display_name.trim().slice(0, 80), instructions: f.instructions.trim().slice(0, 8000), test_goal: f.test_goal.trim().slice(0, 4000) || null,
        search_terms: list(f.search_terms), sources: list(f.sources).map((x) => x.replace(/^https?:\/\//, '').replace(/\/.*$/, '')),
        good_examples: f.good_examples.trim().slice(0, 3000) || null, bad_examples: f.bad_examples.trim().slice(0, 3000) || null,
        version: skill.version + 1, ...(skill.lifecycle === 'approved' ? {} : { lifecycle: skill.lifecycle }),
      }).eq('id', skill.id);
      if (error) throw error;
      onSaved();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open wide onClose={onClose} title={`Eğit · ${skill.display_name}`} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet (v{skill.version + 1})</Button></>}>
      <div className="grid grid-cols-1 gap-3">
        <Field label="Ad"><input className="ops-input" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} /></Field>
        <Field label="Talimat (bot bu yeteneği kullanırken neye dikkat etsin)"><textarea className="ops-input min-h-[110px]" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></Field>
        <Field label="Test amacı" hint="Test görevinde botun ne bulması gerektiği"><textarea className="ops-input min-h-[70px]" value={f.test_goal} onChange={(e) => setF({ ...f, test_goal: e.target.value })} /></Field>
        <Field label="Arama terimleri" hint="Virgülle; insanların/firmaların gerçekten yazacağı ifadeler"><textarea className="ops-input min-h-[60px]" value={f.search_terms} onChange={(e) => setF({ ...f, search_terms: e.target.value })} /></Field>
        <Field label="Tercih edilen kaynaklar" hint="Virgülle alan adları (ör. ilan.gov.tr, emlakkulisi.com)"><input className="ops-input" value={f.sources} onChange={(e) => setF({ ...f, sources: e.target.value })} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="✔ İyi bulgu örnekleri"><textarea className="ops-input min-h-[80px]" value={f.good_examples} onChange={(e) => setF({ ...f, good_examples: e.target.value })} /></Field>
          <Field label="✘ Elenecek örnekler"><textarea className="ops-input min-h-[80px]" value={f.bad_examples} onChange={(e) => setF({ ...f, bad_examples: e.target.value })} /></Field>
        </div>
      </div>
      {err && <div className="mt-3"><Notice tone="error">{err}</Notice></div>}
    </Modal>
  );
}
