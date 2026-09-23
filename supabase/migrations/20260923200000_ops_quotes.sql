-- EMBAY AI OPS — Teklifler: müşteri kartından kalemli teklif, otomatik numara (TKL-2026-0001), KDV, geçerlilik,
-- logolu PDF (panelde üretilir) ve WhatsApp ile gönderim. Additive; DROP yok.

create sequence if not exists public.quote_no_seq;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_no text not null unique default ('TKL-' || to_char(now() at time zone 'Europe/Istanbul', 'YYYY') || '-' || lpad(nextval('public.quote_no_seq')::text, 4, '0')),
  customer_module text not null check (customer_module in ('construction', 'rental')),
  customer_id uuid not null,
  customer_name text not null check (length(btrim(customer_name)) >= 2),
  customer_phone text, customer_email text,
  brand text not null default 'Şahin Manitou' check (brand in ('Şahin Manitou', 'Embay Yapı')),
  title text not null check (length(btrim(title)) >= 2),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),   -- [{desc, qty, unit, price}]
  vat_rate numeric(5,2) not null default 20 check (vat_rate between 0 and 100),
  subtotal numeric(14,2) not null default 0,
  vat_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  currency text not null default 'TRY' check (currency in ('TRY', 'USD', 'EUR')),
  valid_until date,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  sent_at timestamptz, decided_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quotes_customer_idx on public.quotes (customer_module, customer_id, created_at desc);

-- Tutarlar her zaman sunucuda kalemlerden hesaplanır (istemci ne gönderirse göndersin)
create or replace function public.quotes_compute_totals() returns trigger language plpgsql as $$
declare v_sub numeric(14,2);
begin
  select coalesce(sum(round(coalesce((i->>'qty')::numeric, 0) * coalesce((i->>'price')::numeric, 0), 2)), 0) into v_sub from jsonb_array_elements(new.items) i;
  new.subtotal := v_sub;
  new.vat_amount := round(v_sub * new.vat_rate / 100, 2);
  new.total := new.subtotal + new.vat_amount;
  if new.status = 'sent' and new.sent_at is null then new.sent_at := now(); end if;
  if new.status in ('accepted', 'rejected') and new.decided_at is null then new.decided_at := now(); end if;
  return new;
end $$;

alter table public.quotes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'quotes' and policyname = 'quotes_team_select') then
    create policy quotes_team_select on public.quotes for select to authenticated using (public.is_team_member());
    create policy quotes_team_insert on public.quotes for insert to authenticated with check (public.is_team_member());
    create policy quotes_team_update on public.quotes for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
    create policy quotes_admin_delete on public.quotes for delete to authenticated using (public.is_team_admin());
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'quotes_totals') then
    create trigger quotes_totals before insert or update on public.quotes for each row execute function public.quotes_compute_totals();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'quotes_updated') then
    create trigger quotes_updated before update on public.quotes for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'quotes_audit') then
    create trigger quotes_audit after insert or update or delete on public.quotes for each row execute function public.log_audit();
  end if;
end $$;
grant usage on sequence public.quote_no_seq to authenticated;
