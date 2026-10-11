-- Güvenlik denetimi: anon'un çağırmaması gereken SECURITY DEFINER fonksiyonlar ve sabitlenmemiş search_path.
revoke execute on function public.can_access_client(uuid) from anon;
revoke execute on function public.team_member_workspace_sync() from public, anon, authenticated;

alter function public.normalize_firm_name set search_path = public;
alter function public.lifecycle_rank set search_path = public;
alter function public.guard_lifecycle_stage set search_path = public;
alter function public.lifecycle_transition_error set search_path = public;
alter function public.quotes_compute_totals set search_path = public;
alter function public.app_credential_format_error set search_path = public;
alter function public.bot_missions_inherit_client set search_path = public;
alter function public.embay_single_phone set search_path = public;
