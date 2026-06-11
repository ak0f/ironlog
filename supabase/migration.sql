-- ============================================================
-- IronLog Leaderboard — Supabase schema
-- Run this in the Supabase SQL editor (once, in order).
-- ============================================================

-- --------------------------------------------------------
-- 1. profiles
-- --------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,
  display_name  text,
  gym_location  text,
  avatar_url    text,
  is_public     boolean not null default false,
  friend_code   text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- anyone can read public profiles
create policy "profiles_select" on public.profiles
  for select using (is_public = true or auth.uid() = id);

-- owner can insert/update their own row
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- --------------------------------------------------------
-- 2. leaderboard_snapshots
-- --------------------------------------------------------
create table if not exists public.leaderboard_snapshots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles(id) on delete cascade,
  xp_total        integer not null default 0,
  pr_bench_kg     numeric,
  pr_squat_kg     numeric,
  pr_deadlift_kg  numeric,
  pr_ohp_kg       numeric,
  recomp_score    numeric not null default 0,
  workout_count   integer not null default 0,
  current_streak  integer not null default 0,
  updated_at      timestamptz not null default now()
);

alter table public.leaderboard_snapshots enable row level security;

-- readable if profile is public
create policy "snapshots_select" on public.leaderboard_snapshots
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = user_id and (p.is_public = true or p.id = auth.uid())
    )
  );

create policy "snapshots_upsert" on public.leaderboard_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --------------------------------------------------------
-- 3. friendships
-- --------------------------------------------------------
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at    timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "friendships_select" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships_insert" on public.friendships
  for insert with check (auth.uid() = requester_id);

create policy "friendships_update" on public.friendships
  for update using (auth.uid() = addressee_id);

create policy "friendships_delete" on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- --------------------------------------------------------
-- 4. synced_workouts
-- --------------------------------------------------------
create table if not exists public.synced_workouts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  local_id          text not null,
  date              bigint not null,
  title             text not null,
  duration_sec      integer,
  total_volume_kg   numeric not null default 0,
  synced_at         timestamptz not null default now(),
  unique (user_id, local_id)
);

alter table public.synced_workouts enable row level security;

create policy "synced_workouts_all" on public.synced_workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --------------------------------------------------------
-- 5. synced_prs
-- --------------------------------------------------------
create table if not exists public.synced_prs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  local_id       text not null,
  exercise_name  text not null,
  type           text not null,
  value          numeric not null,
  weight_kg      numeric not null,
  reps           integer not null,
  date           bigint not null,
  synced_at      timestamptz not null default now(),
  unique (user_id, local_id)
);

alter table public.synced_prs enable row level security;

create policy "synced_prs_all" on public.synced_prs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --------------------------------------------------------
-- 6. synced_bodyweight
-- --------------------------------------------------------
create table if not exists public.synced_bodyweight (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  local_id   text not null,
  date       bigint not null,
  weight_kg  numeric not null,
  synced_at  timestamptz not null default now(),
  unique (user_id, local_id)
);

alter table public.synced_bodyweight enable row level security;

create policy "synced_bodyweight_all" on public.synced_bodyweight
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --------------------------------------------------------
-- 7. Storage bucket for avatars
-- --------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- --------------------------------------------------------
-- 8. Auto-generate friend code on profile insert
-- --------------------------------------------------------
create or replace function public.generate_friend_code()
returns trigger language plpgsql as $$
declare
  code text;
  exists_count int;
begin
  loop
    code := upper(substring(md5(random()::text) from 1 for 8));
    select count(*) into exists_count from public.profiles where friend_code = code;
    exit when exists_count = 0;
  end loop;
  new.friend_code := code;
  return new;
end;
$$;

create trigger before_profile_insert
  before insert on public.profiles
  for each row
  when (new.friend_code is null or new.friend_code = '')
  execute function public.generate_friend_code();

-- --------------------------------------------------------
-- 9. Update updated_at on profile changes
-- --------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
