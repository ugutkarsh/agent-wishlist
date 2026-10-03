-- Agent Wishlist schema. Paste this whole file into the Supabase SQL Editor and run it once.

create table if not exists clusters (
  id uuid primary key default gen_random_uuid(),
  title text,
  summary text,
  category text check (category in ('tool', 'permission', 'data', 'other')),
  wish_count int not null default 0,
  score numeric not null default 0,
  status text not null default 'open' check (status in ('open', 'planned', 'shipped')),
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
  created_at timestamptz not null default now()
);

alter table clusters enable row level security;
alter table wishes enable row level security;

drop policy if exists "anon can read clusters" on clusters;
create policy "anon can read clusters"
  on clusters
  for select
  to anon
  using (true);

drop policy if exists "anon can read wishes" on wishes;
create policy "anon can read wishes"
  on wishes
  for select
  to anon
  using (true);

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
