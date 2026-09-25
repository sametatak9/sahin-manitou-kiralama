-- Takip listesi upsert'i için (platform, handle) benzersiz indeksi (PostgREST onConflict). Additive.
create unique index if not exists social_prospects_platform_handle_key on public.social_prospects (platform, handle);
