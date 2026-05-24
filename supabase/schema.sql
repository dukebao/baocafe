create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  requested_at timestamptz null,
  status text not null default 'pending' check (status in ('pending', 'done')),
  items jsonb not null default '[]'::jsonb,
  order_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists orders_status_requested_at_idx
  on public.orders (status, requested_at, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;

create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

alter table public.orders enable row level security;

drop policy if exists "Anyone can place orders" on public.orders;
create policy "Anyone can place orders"
on public.orders
for insert
to anon
with check (status = 'pending');

drop policy if exists "Anyone can read orders" on public.orders;
create policy "Anyone can read orders"
on public.orders
for select
to anon
using (true);

drop policy if exists "Anyone can complete orders" on public.orders;
create policy "Anyone can complete orders"
on public.orders
for update
to anon
using (true)
with check (status in ('pending', 'done'));
