-- ═══════════════════════════════════════
-- GHAR DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════

-- 1. Profiles (auto-created on signup via trigger)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  tutorial_completed boolean default false,
  ramadan_mode boolean default false,
  streak_count integer default 0,
  last_streak_date date,
  weekly_budget numeric,
  notifications_enabled boolean default false,
  install_prompt_dismissed boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- 2. Meals
create table meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  category text default 'Other',
  recipe_url text default '',
  rating integer default 0,
  ingredients text[] default '{}',
  last_cooked date,
  times_cooked integer default 0,
  created_at timestamptz default now()
);

alter table meals enable row level security;
create policy "Users can CRUD own meals" on meals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Weekly Plan
create table weekly_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  day_slot text not null,
  meal_id uuid references meals(id) on delete set null,
  is_leftover boolean default false,
  unique(user_id, day_slot)
);

alter table weekly_plan enable row level security;
create policy "Users can CRUD own plan" on weekly_plan for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Plan Notes
create table plan_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  day text not null,
  note text default '',
  unique(user_id, day)
);

alter table plan_notes enable row level security;
create policy "Users can CRUD own notes" on plan_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Grocery Items
create table grocery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  category text default 'Other',
  checked boolean default false,
  from_plan boolean default false,
  in_pantry boolean default false,
  low_stock boolean default false,
  estimated_cost numeric,
  created_at timestamptz default now()
);

alter table grocery_items enable row level security;
create policy "Users can CRUD own grocery" on grocery_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Pantry Items
create table pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  category text default 'Other',
  low_stock boolean default false
);

alter table pantry_items enable row level security;
create policy "Users can CRUD own pantry" on pantry_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. Chores
create table chores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  type text default 'daily',
  completed boolean default false,
  last_completed date,
  snoozed_until date,
  duration_minutes integer,
  energy_level text default 'medium',
  created_at timestamptz default now()
);

alter table chores enable row level security;
create policy "Users can CRUD own chores" on chores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
