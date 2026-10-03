-- Başarısız istatistik denemelerini 6 saat kısmak için hızlı arama (additive)
create index if not exists connector_activity_ref_action_at_idx on public.connector_activity (ref_id, action, status, at desc);
