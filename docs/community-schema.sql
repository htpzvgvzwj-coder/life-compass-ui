-- Community tab schema for Compass - Future Mirror.
-- Run this once in the Supabase SQL editor for a fresh project.
-- Everything here is additive: it does not touch any table Supabase creates
-- for you (auth.users etc). Community is the only part of the app that uses
-- this database; every other tab keeps its existing local-only storage.

-- ---------------------------------------------------------------------------
-- profiles
-- One row per Supabase Auth user. No email/phone stored here on purpose --
-- Supabase Auth already holds that, and Community only needs the fields
-- below to render squad cards, the wall, and matching.
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  local_user_id text,
  community_trust_snapshot int not null default 0,
  community_mood_snapshot text,
  badges jsonb not null default '[]'::jsonb,
  goal_tags text[] not null default '{}',
  roadmap_stage text check (roadmap_stage in ('starting', 'in-progress', 'closing')),
  accountability_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_authenticated" on profiles
  for select to authenticated using (true);

create policy "profiles_insert_own" on profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- squads
-- Replaces the hardcoded communityGroups array in app.js.
-- ---------------------------------------------------------------------------
create table if not exists squads (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 80),
  description text not null check (char_length(description) <= 400),
  tags text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  is_seeded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table squads enable row level security;

create policy "squads_select_authenticated" on squads
  for select to authenticated using (true);

create policy "squads_insert_own" on squads
  for insert to authenticated with check (created_by = auth.uid());

create policy "squads_update_own" on squads
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "squads_delete_own" on squads
  for delete to authenticated using (created_by = auth.uid());

create index if not exists squads_tags_gin on squads using gin (tags);

-- ---------------------------------------------------------------------------
-- squad_members
-- ---------------------------------------------------------------------------
create table if not exists squad_members (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references squads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (squad_id, user_id)
);

alter table squad_members enable row level security;

create policy "squad_members_select_authenticated" on squad_members
  for select to authenticated using (true);

create policy "squad_members_insert_own" on squad_members
  for insert to authenticated with check (user_id = auth.uid());

create policy "squad_members_delete_own" on squad_members
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- posts
-- Replaces trackerState.communityPosts. No INSERT policy for anon/authenticated
-- on purpose -- the only way a row is created is through api/community-post.js
-- using the service-role key, after an AI safety check. This is what makes
-- moderation non-bypassable: even a hand-crafted supabase.from('posts').insert(...)
-- call from devtools is rejected at the database level.
-- ---------------------------------------------------------------------------
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  squad_id uuid references squads (id) on delete set null,
  body text not null check (char_length(body) between 8 and 1500),
  post_type text not null default 'general' check (post_type in ('general', 'milestone')),
  theme_week int,
  related_goal_title text,
  related_milestone_title text,
  status text not null default 'pending' check (status in ('pending', 'published', 'blocked')),
  moderation_reason text,
  created_at timestamptz not null default now()
);

alter table posts enable row level security;

create policy "posts_select_published_or_own" on posts
  for select to authenticated using (status = 'published' or author_id = auth.uid());

create policy "posts_delete_own" on posts
  for delete to authenticated using (author_id = auth.uid());

create index if not exists posts_status_created_at_idx on posts (status, created_at desc);
create index if not exists posts_squad_id_idx on posts (squad_id);

-- ---------------------------------------------------------------------------
-- accountability_optins
-- Explicit opt-in = explicit consent to be discoverable by other signed-in
-- users, so a table-wide SELECT for authenticated users is intentional here.
-- ---------------------------------------------------------------------------
create table if not exists accountability_optins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goal_title text not null,
  roadmap_stage text not null check (roadmap_stage in ('starting', 'in-progress', 'closing')),
  goal_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table accountability_optins enable row level security;

create policy "accountability_optins_select_authenticated" on accountability_optins
  for select to authenticated using (true);

create policy "accountability_optins_insert_own" on accountability_optins
  for insert to authenticated with check (user_id = auth.uid());

create policy "accountability_optins_update_own" on accountability_optins
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "accountability_optins_delete_own" on accountability_optins
  for delete to authenticated using (user_id = auth.uid());

create index if not exists accountability_optins_tags_gin on accountability_optins using gin (goal_tags);

-- ---------------------------------------------------------------------------
-- accountability_connections
-- Minimal viable matching: request -> accept -> each side optionally reveals
-- a self-entered contact hint. Deliberately not a chat/messaging product.
-- Only the two parties involved can ever read a given row.
-- ---------------------------------------------------------------------------
create table if not exists accountability_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'accepted', 'declined')),
  intro_message text not null check (char_length(intro_message) <= 500),
  contact_reveal jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table accountability_connections enable row level security;

create policy "accountability_connections_select_parties" on accountability_connections
  for select to authenticated using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "accountability_connections_insert_requester" on accountability_connections
  for insert to authenticated with check (requester_id = auth.uid());

create policy "accountability_connections_update_parties" on accountability_connections
  for update to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid())
  with check (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "accountability_connections_delete_requester_pending" on accountability_connections
  for delete to authenticated using (requester_id = auth.uid() and status = 'requested');

-- ---------------------------------------------------------------------------
-- opportunities_shared
-- Crowdsourced opportunities, distinct from the static opportunityItems list
-- in app.js. Same moderation/insert shape as posts.
-- ---------------------------------------------------------------------------
create table if not exists opportunities_shared (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) <= 140),
  description text not null check (char_length(description) <= 800),
  link text not null,
  tags text[] not null default '{}',
  category text not null,
  status text not null default 'pending' check (status in ('pending', 'published', 'blocked')),
  moderation_reason text,
  created_at timestamptz not null default now()
);

alter table opportunities_shared enable row level security;

create policy "opportunities_shared_select_published_or_own" on opportunities_shared
  for select to authenticated using (status = 'published' or submitted_by = auth.uid());

create policy "opportunities_shared_delete_own" on opportunities_shared
  for delete to authenticated using (submitted_by = auth.uid());

create index if not exists opportunities_shared_status_created_at_idx on opportunities_shared (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Seed data: migrate the 6 static communityGroups from app.js (lines ~322-365)
-- into real, joinable squads. created_by is left null (system-seeded).
-- Guarded so re-running this script never duplicates the seed rows.
-- ---------------------------------------------------------------------------
insert into squads (title, description, tags, is_seeded)
select v.title, v.description, v.tags, true
from (values
  ('Study Focus', 'Share focus routines, exam pressure strategies, and realistic study blocks.', array['study', 'focus', 'exam']),
  ('Leadership', 'Practice communication, confidence, teamwork, and leading without ego.', array['leadership', 'confidence', 'teamwork']),
  ('Entrepreneurship', 'Discuss small business ideas, experiments, customer learning, and responsible risk.', array['business', 'startup', 'entrepreneurship']),
  ('Mental Wellness', 'Anonymous support, calm check-ins, and encouragement to reach trusted people.', array['wellness', 'support', 'calm']),
  ('Scholarships', 'Share scholarship preparation, essay ideas, deadlines, and interview practice.', array['scholarship', 'education', 'essay']),
  ('Career Growth', 'Explore internships, portfolios, beginner skills, and career confidence.', array['career', 'internship', 'resume'])
) as v(title, description, tags)
where not exists (select 1 from squads where squads.title = v.title and squads.is_seeded);
