-- Agent Wishlist schema. Paste this whole file into the Supabase SQL Editor and run it once.

create table if not exists clusters (
  id uuid primary key default gen_random_uuid(),
  title text,
  summary text,
  category text check (category in ('tool', 'permission', 'data', 'other')),
  wish_count int not null default 0,
  score numeric not null default 0,
  status text not null default 'open' check (status in ('open', 'planned', 'shipped')),
  user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wishes (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  category text not null check (category in ('tool', 'permission', 'data', 'other')),
  title text not null,
  description text not null,
  task_context text,
  workaround text,
  severity int check (severity between 1 and 5),
  cluster_id uuid references clusters (id) on delete set null,
  user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table clusters enable row level security;
alter table wishes enable row level security;

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

alter table clusters replica identity full;
alter table wishes replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clusters'
  ) then
    alter publication supabase_realtime add table clusters;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wishes'
  ) then
    alter publication supabase_realtime add table wishes;
  end if;
end $$;

create or replace function recompute_cluster_stats(cluster uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update clusters
  set
    wish_count = (
      select count(*)::int
      from wishes
      where wishes.cluster_id = recompute_cluster_stats.cluster
    ),
    score = coalesce((
      select sum(severity)
      from wishes
      where wishes.cluster_id = recompute_cluster_stats.cluster
    ), 0),
    updated_at = now()
  where clusters.id = recompute_cluster_stats.cluster;
end;
$$;

revoke all on function recompute_cluster_stats(uuid) from public;
revoke all on function recompute_cluster_stats(uuid) from anon;
revoke all on function recompute_cluster_stats(uuid) from authenticated;
grant execute on function recompute_cluster_stats(uuid) to service_role;

create index if not exists clusters_user_id_idx on clusters (user_id);
create index if not exists wishes_user_id_idx on wishes (user_id);

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
