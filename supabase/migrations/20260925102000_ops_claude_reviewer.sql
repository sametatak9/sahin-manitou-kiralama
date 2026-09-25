-- EMBAY AI OPS — Günlük Claude denetimi: öneriyi kimin yaptığı + görevin Claude inceleme sonucu. Additive.
alter table public.skill_improvements add column if not exists reviewer text not null default 'ai-coach';
alter table public.bot_missions add column if not exists claude_review jsonb;
comment on column public.skill_improvements.reviewer is 'Öneriyi kim yaptı: ai-coach (görev sonu otomatik koç) veya claude (günlük Claude denetimi)';
comment on column public.bot_missions.claude_review is 'Günlük Claude denetimi: {reviewed_at, verified, fake, off_topic, notes}';
