-- EMBAY AI OPS — 7/7: worker kimlik doğrulaması, servis audit, onay "retry", pg_cron → edge worker

-- Worker gizli anahtarı Vault'ta üretilir; kimse elle girmez, frontend'e hiç çıkmaz.
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'embay_worker_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'embay_worker_secret', 'pg_cron → ops edge worker kimlik doğrulaması');
  end if;
end $$;

create or replace function public.verify_worker_secret(p_secret text) returns boolean
language sql stable security definer set search_path = public, vault as $$
  select coalesce(length(p_secret) >= 32 and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'embay_worker_secret'), false);
$$;
revoke execute on function public.verify_worker_secret(text) from public, anon, authenticated;

-- Edge function (service_role) adına, işlemi yapan kullanıcıyı audit'e yazar
create or replace function public.write_audit_service(p_actor uuid, p_action text, p_entity_type text, p_entity_id text, p_summary text, p_data jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log (actor, actor_kind, action, entity_type, entity_id, summary, diff)
  values (p_actor, 'user', p_action, p_entity_type, p_entity_id, p_summary, coalesce(p_data, '{}'::jsonb));
$$;
revoke execute on function public.write_audit_service(uuid, text, text, text, text, jsonb) from public, anon, authenticated;

-- Başarısız onaylı işlemi yeniden denemeye al (yönetici)
create or replace function public.retry_approval(p_id uuid) returns public.approval_requests
language plpgsql security definer set search_path = public as $$
declare r public.approval_requests;
begin
  if not public.is_team_admin() then raise exception 'Yönetici yetkisi gerekli' using errcode = '42501'; end if;
  update public.approval_requests set status = 'approved', executed_at = null, error = null, decided_by = auth.uid(), decided_at = now()
   where id = p_id and status = 'failed' returning * into r;
  if not found then raise exception 'Yalnızca başarısız kayıt yeniden denenebilir'; end if;
  return r;
end $$;
revoke execute on function public.retry_approval(uuid) from public, anon;
grant execute on function public.retry_approval(uuid) to authenticated;

-- Dead-letter görevi yeniden kuyruğa al (yönetici)
create or replace function public.requeue_task(p_id uuid) returns public.automation_tasks
language plpgsql security definer set search_path = public as $$
declare t public.automation_tasks;
begin
  if not public.is_team_member() then raise exception 'permission denied' using errcode = '42501'; end if;
  update public.automation_tasks set status = 'scheduled', attempt = 0, dead_lettered_at = null, last_error = null, next_run_at = now(), locked_by = null, locked_until = null
   where id = p_id and status in ('dead_letter','failed','completed','paused','cancelled') returning * into t;
  if not found then raise exception 'Görev yeniden kuyruğa alınamadı'; end if;
  return t;
end $$;
revoke execute on function public.requeue_task(uuid) from public, anon;
grant execute on function public.requeue_task(uuid) to authenticated;

-- pg_net + dakikalık worker tetikleyici (mevcut outreach/lead-imha cron işlerine dokunulmaz)
create extension if not exists pg_net with schema extensions;

select cron.unschedule('embay-ops-worker') where exists (select 1 from cron.job where jobname = 'embay-ops-worker');
select cron.schedule('embay-ops-worker', '* * * * *', $cron$
  select net.http_post(
    url := 'https://utngxnqlcayfjkknaysx.supabase.co/functions/v1/ops/worker',
    headers := jsonb_build_object('content-type', 'application/json', 'x-worker-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'embay_worker_secret')),
    body := '{"source":"pg_cron"}'::jsonb,
    timeout_milliseconds := 150000
  );
$cron$);
