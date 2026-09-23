-- EMBAY AI OPS — canlı operasyon ekranı için Realtime yayını (RLS yine uygulanır)
do $$
declare t text;
begin
  foreach t in array array['social_bot_runs','automation_tasks','approval_requests','social_drafts','social_publications','construction_customers','rental_customers','lead_inbox'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
