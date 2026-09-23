// EMBAY bot görev (mission) edge function:
//   POST /missions/worker            → pg_cron (x-worker-secret): çalışan görevlerin bir sonraki adımı / raporu
//   POST /missions/api {action,...}  → panel (kullanıcı JWT + ekip rolü): mission_start · mission_stop · skill_create
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';
import { finalizeMission, runDueMissions, stepMission, type MissionRow } from '../_shared/mission.ts';

type Db = SupabaseClient;
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-worker-secret',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
class HttpError extends Error { constructor(public status: number, message: string, public code = 'ERROR') { super(message); } }

const db = (): Db => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

async function requireUser(c: Db, req: Request, minRole: 'staff' | 'admin' = 'staff') {
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) throw new HttpError(401, 'Oturum gerekli', 'UNAUTHENTICATED');
  const { data, error } = await c.auth.getUser(jwt);
  if (error || !data.user) throw new HttpError(401, 'Geçersiz oturum', 'UNAUTHENTICATED');
  const { data: member } = await c.from('team_members').select('role').eq('user_id', data.user.id).maybeSingle();
  if (!member) throw new HttpError(403, 'Ekip üyesi değilsiniz', 'PERMISSION_DENIED');
  if (minRole === 'admin' && member.role !== 'admin') throw new HttpError(403, 'Bu işlem yönetici yetkisi gerektirir', 'PERMISSION_DENIED');
  return { userId: data.user.id, role: member.role as string };
}
const audit = (c: Db, actor: string, action: string, entityType: string, entityId: string, summary: string) =>
  c.rpc('write_audit_service', { p_actor: actor, p_action: action, p_entity_type: entityType, p_entity_id: entityId, p_summary: summary });

function background(p: Promise<unknown>) {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) { rt.waitUntil(p); return Promise.resolve(); }
  return p;
}

async function api(c: Db, req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  switch (action) {
    case 'mission_start': {
      const u = await requireUser(c, req);
      const title = String(body.title || '').trim(); const goal = String(body.goal || '').trim();
      if (title.length < 2 || goal.length < 3) throw new HttpError(400, 'Görev başlığı ve açıklaması gerekli');
      const target = String(body.target_url || '').trim();
      if (target && !/^https?:\/\//i.test(target)) throw new HttpError(400, 'Hedef link http(s):// ile başlamalı');
      const minutes = Math.min(240, Math.max(1, Math.round(Number(body.duration_minutes) || 10)));
      if (body.bot_id) {
        const { data: bot } = await c.from('automation_bots').select('status').eq('id', body.bot_id).maybeSingle();
        if (!bot) throw new HttpError(404, 'Bot bulunamadı');
        if (bot.status === 'archived' || bot.status === 'paused') throw new HttpError(409, `Bot ${bot.status === 'paused' ? 'duraklatılmış' : 'arşivlenmiş'}`);
      }
      const now = Date.now();
      const { data: m, error } = await c.from('bot_missions').insert({
        bot_id: body.bot_id || null, title: title.slice(0, 200), goal: goal.slice(0, 4000), target_url: target || null,
        search_for: String(body.search_for || '').trim().slice(0, 1000) || null, report_spec: String(body.report_spec || '').trim().slice(0, 1000) || null,
        stop_condition: String(body.stop_condition || '').trim().slice(0, 1000) || null, duration_minutes: minutes,
        max_steps: Math.min(60, Math.max(1, minutes)), deadline_at: new Date(now + minutes * 60_000).toISOString(), created_by: u.userId,
        locked_until: new Date(now + 150_000).toISOString(),
      }).select('*').single();
      if (error) throw error;
      await audit(c, u.userId, 'mission_start', 'bot_missions', m.id, `Görev başlatıldı: ${m.title}`);
      // İlk adım hemen (arka planda) başlar; sonraki adımlar her dakika pg_cron worker ile devam eder.
      await background(stepMission(c, m as MissionRow).catch((e) => c.from('bot_missions').update({ locked_until: null, error: String(e).slice(0, 500) }).eq('id', m.id)));
      return { mission_id: m.id, deadline_at: m.deadline_at };
    }

    case 'mission_stop': {
      const u = await requireUser(c, req);
      const { data: m } = await c.from('bot_missions').select('*').eq('id', body.mission_id).maybeSingle();
      if (!m) throw new HttpError(404, 'Görev bulunamadı');
      if (!['running', 'finalizing'].includes(m.status)) throw new HttpError(409, 'Görev zaten bitmiş');
      await c.from('bot_missions').update({ status: 'finalizing', finish_reason: 'admin_stop', stopped_by: u.userId, next_step_at: new Date().toISOString() }).eq('id', m.id);
      await audit(c, u.userId, 'mission_stop', 'bot_missions', m.id, 'Görev yönetici tarafından durduruldu');
      return finalizeMission(c, { ...(m as MissionRow), status: 'finalizing' }, 'admin_stop');
    }

    case 'skill_create': {
      const u = await requireUser(c, req, 'admin');
      const name = String(body.name || '').trim(); const prompt = String(body.prompt || '').trim();
      if (name.length < 2 || prompt.length < 10) throw new HttpError(400, 'Yetenek adı ve en az 10 karakterlik tanım (prompt) gerekli');
      const base = name.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'yetenek';
      const { data: existing } = await c.from('automation_skills').select('id').eq('skill_key', base).maybeSingle();
      const skillKey = existing ? `${base}_${Date.now().toString(36)}` : base;
      const { data: sk, error } = await c.from('automation_skills').insert({
        skill_key: skillKey, display_name: name.slice(0, 80), description: String(body.description || prompt).slice(0, 300), category: String(body.category || 'ozel').slice(0, 40),
        icon: 'sparkles', instructions: prompt.slice(0, 6000), execution_mode: 'agent', pipeline: [], approval_required: true, enabled: true, allowed_actions: ['research', 'report'],
      }).select('id,skill_key').single();
      if (error) throw error;
      if (body.bot_id) {
        const { count } = await c.from('automation_bot_skills').select('bot_id', { count: 'exact', head: true }).eq('bot_id', body.bot_id);
        const { error: le } = await c.from('automation_bot_skills').insert({ bot_id: body.bot_id, skill_id: sk.id, position: count ?? 0 });
        if (le) throw le;
      }
      await audit(c, u.userId, 'skill_create', 'automation_skills', sk.id, `Yetenek tanımlandı: ${name}`);
      return { skill_id: sk.id, skill_key: sk.skill_key };
    }

    case 'ai_status': {
      await requireUser(c, req);
      return { anthropic: Boolean(Deno.env.get('ANTHROPIC_API_KEY')), gemini: Boolean(Deno.env.get('GEMINI_API_KEY')), openai: Boolean(Deno.env.get('OPENAI_API_KEY')) };
    }

    default: throw new HttpError(400, `Bilinmeyen işlem: ${action}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const path = new URL(req.url).pathname.replace(/^\/functions\/v1/, '').replace(/^\/missions/, '') || '/';
  const c = db();
  try {
    if (path.startsWith('/worker') && req.method === 'POST') {
      const { data: ok } = await c.rpc('verify_worker_secret', { p_secret: req.headers.get('x-worker-secret') || '' });
      if (!ok) return json({ error: 'forbidden' }, 403);
      return json({ missions: await runDueMissions(c) });
    }
    if (path.startsWith('/api') && req.method === 'POST') return json(await api(c, req));
    return json({ error: 'not found' }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
    const err = e as Error & { code?: string };
    return json({ error: String(err.message || e), code: err.code || 'ERROR' }, 500);
  }
});
