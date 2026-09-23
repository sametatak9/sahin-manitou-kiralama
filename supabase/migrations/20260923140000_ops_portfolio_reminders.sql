-- EMBAY AI OPS — Firma arşivi + periyodik hatırlatma (additive; DROP yok)
-- Bulunan kurumlar portföyde arşivlenir; her firmanın takip periyodu vardır. Her sabah 09:00 (İstanbul) zamanı gelen
-- firmalar için Onay Merkezi'ne hazır bir hatırlatma mesajı düşer. Mesaj insan onayı olmadan gönderilmez; içinde
-- ret (opt-out) seçeneği vardır ve "iletişim istemiyor" işaretli firmalara hiç hatırlatma oluşturulmaz.

alter table public.companies add column if not exists follow_up_days int not null default 30;
alter table public.companies add column if not exists last_reminded_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'companies_follow_up_days_check') then
    alter table public.companies add constraint companies_follow_up_days_check check (follow_up_days between 3 and 365);
  end if;
end $$;

create or replace function public.queue_portfolio_reminders(p_limit int default 25) returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_owner uuid; v_n int := 0; v_msg text; v_phone text;
begin
  select user_id into v_owner from public.team_members where role = 'admin' order by created_at limit 1;
  for r in
    select c.* from public.companies c
     where c.archived_at is null and c.merged_into is null and coalesce(c.opt_out, false) = false
       and c.lifecycle_stage not in ('WON', 'LOST')
       and coalesce(c.next_action_at, coalesce(c.last_reminded_at, c.first_seen_at) + make_interval(days => c.follow_up_days)) <= now()
       and not exists (select 1 from public.approval_requests a where a.entity_type = 'message' and a.entity_id = c.id and a.status in ('pending_approval', 'approved', 'scheduled') and a.created_at > now() - interval '3 days')
     order by coalesce(c.priority_score, 0) desc, c.first_seen_at
     limit greatest(1, least(p_limit, 100))
  loop
    v_phone := public.normalize_phone(r.public_phone);
    v_msg := format('Merhaba %s yetkilisi, Embay Yapı & Şahin Manitou olarak şantiyeleriniz için operatörlü Manitou / teleskopik yükleyici kiralama ve inşaat hizmetlerimizi hatırlatmak isteriz. İhtiyacınız olursa 0531 436 29 04 numarasından bize ulaşabilirsiniz. Bu tür bilgilendirmeleri almak istemezseniz "RET" yazmanız yeterli.', r.firm_name);
    insert into public.approval_requests (entity_type, entity_id, title, summary, payload, status, priority, requested_by)
    values ('message', r.id, 'Takip hatırlatması · ' || r.firm_name,
      concat_ws(' · ', nullif(r.ilce, ''), r.lifecycle_stage, case when v_phone is null then 'kurumsal telefon yok — e-posta/web üzerinden' end),
      jsonb_build_object('reminder', true, 'company_id', r.id, 'firm_name', r.firm_name, 'channel', case when v_phone is not null then 'whatsapp' else 'manual' end,
        'message', v_msg, 'phone', r.public_phone, 'email', r.public_email, 'website', r.website, 'source_url', r.source_url,
        'wa_link', case when v_phone is not null then 'https://wa.me/90' || v_phone || '?text=' || replace(replace(replace(v_msg, ' ', '%20'), '"', '%22'), '&', '%26') end),
      'pending_approval', case when coalesce(r.priority_score, 0) >= 70 then 'high' else 'normal' end, v_owner);
    update public.companies set last_reminded_at = now(), next_action_at = now() + make_interval(days => follow_up_days),
      next_action = coalesce(next_action, 'Periyodik hatırlatma') where id = r.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.queue_portfolio_reminders(int) from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'embay-portfolio-reminders') then
    perform cron.schedule('embay-portfolio-reminders', '0 6 * * *', 'select public.queue_portfolio_reminders(25)');
  end if;
end $$;
