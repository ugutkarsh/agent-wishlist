-- Run this once in the Supabase SQL editor if schema.sql was already applied.
-- It scopes wishes and clusters to a signed-in user and issues one MCP key per account.

alter table clusters add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table wishes add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists clusters_user_id_idx on clusters (user_id);
create index if not exists wishes_user_id_idx on wishes (user_id);

drop policy if exists "anon can read clusters" on clusters;
drop policy if exists "anon can read wishes" on wishes;

drop policy if exists "users read own clusters" on clusters;
create policy "users read own clusters"
  on clusters
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users read own wishes" on wishes;
create policy "users read own wishes"
  on wishes
  for select
  to authenticated
  using (user_id = auth.uid());

create table if not exists accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mcp_api_key text not null unique,
  created_at timestamptz not null default now()
);

alter table accounts enable row level security;

drop policy if exists "users read own account" on accounts;
create policy "users read own account"
  on accounts
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (user_id, mcp_api_key)
  values (new.id, 'awl_' || encode(extensions.gen_random_bytes(24), 'hex'))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
