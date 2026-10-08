-- Instagram yorum senkronu için ayrı activity aksiyonu.
-- Eski aksiyonları korur; yalnızca yeni gözlem türünü ekler.
alter table public.connector_activity
  drop constraint if exists connector_activity_action_check;

alter table public.connector_activity
  add constraint connector_activity_action_check
  check (action in ('connect', 'disconnect', 'token_refresh', 'verify', 'publish', 'metrics_sync', 'inbox_sync', 'manual_share', 'message_send', 'webhook', 'rate_limit', 'error'));
