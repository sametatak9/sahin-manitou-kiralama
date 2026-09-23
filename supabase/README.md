# Supabase — EMBAY AI Operations Center

Proje: `utngxnqlcayfjkknaysx` (sahin-embay-panel, eu-central-1)

## Migration'lar
`20260922210743` … `20260923010840` (10 adet) önceki oturumlarda doğrudan projeye uygulanmıştır; bu klasörde yalnızca
yeni, **additive** migration'lar bulunur (tablo/kolon/veri DROP yok; yalnızca CHECK kısıtları süperset olarak genişletildi):

| Dosya | İçerik |
|---|---|
| `20260923100000_ops_security_audit` | `team_role()`, RESTRICTIVE ekip politikaları, `audit_log` + `log_audit()` trigger'ları |
| `20260923100100_ops_ai_bot_engine` | `ai_agents`, `ai_generations`, `automation_tools`, `automation_bots`, bot↔skill↔tool eşlemeleri, `automation_run_logs`, görev scheduler alanları, `claim_due_tasks` (SKIP LOCKED + lease) |
| `20260923100200_ops_approvals` | `approval_requests` (9 durum), `decide_approval()` |
| `20260923100300_ops_content_design_publish` | `content_campaigns`, `brand_kits`, `design_templates`, `designs`, `social_publications`, `social_post_metrics`, connector alanları, `oauth_states`, Vault token sarmalayıcıları, `design-exports` bucket |
| `20260923100400_ops_customers_leads` | `construction_customers`, `rental_customers`, `customer_activities`, normalize + `find_customer_duplicates()` |
| `20260923100500_ops_seed_catalog` | 3 AI agent, 16 tool, 18 skill, 14 bot, 2 marka kiti, 11 format, 7 varsayılan görev |
| `20260923100600_ops_scheduler_worker` | Vault worker secret, `verify_worker_secret`, `retry_approval`, `requeue_task`, pg_net + `embay-ops-worker` pg_cron (her dakika) |
| `20260923100700_ops_realtime` | Canlı ekran için realtime yayını |

## Edge function
`functions/ops` (verify_jwt=false; kendi doğrulaması var):
- `POST /ops/worker` — yalnızca pg_cron (Vault'taki `x-worker-secret`)
- `POST /ops/api` — panel; kullanıcı JWT + `team_members` rolü
- `GET /ops/oauth/callback` — Meta / Canva OAuth dönüşü

`_shared/pure/*` bağımlılıksızdır; hem Deno hem panel (Vite) tarafından kullanılır ve `npm test` ile test edilir.

Deploy: Supabase MCP `deploy_edge_function` (entrypoint `ops/index.ts`) veya `supabase functions deploy ops --no-verify-jwt`.
