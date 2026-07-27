-- Community tab schema for Compass - Future Mirror.
-- Run this once in the Supabase SQL editor for a fresh project.
-- Everything here is additive: it does not touch any table Supabase creates
-- for you (auth.users etc). Community used to be the only part of the app
-- using this database; two deliberate, confirmed exceptions since then:
-- Guardian Sharing (see guardian_shares below) needed its own
-- unauthenticated, token-gated table since Life Roadmap has no Community/
-- Supabase Auth requirement; compass_backups (below) lets a signed-in
-- Community user back up their entire local trackerState so a cleared
-- cache or a new device doesn't lose everything - direct auth.uid()-scoped
-- RLS, no service-role/moderation layer needed since it's private data
-- only its owner can ever read or write. Every other tab still keeps its
-- existing local-only storage.

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
  difficulty text check (difficulty in ('Beginner', 'Medium', 'Advanced')),
  prep_needed text check (char_length(prep_needed) <= 300),
  status text not null default 'pending' check (status in ('pending', 'published', 'blocked')),
  moderation_reason text,
  created_at timestamptz not null default now()
);

-- Migration for projects that ran this script before difficulty/prep_needed
-- existed - create table if not exists above only helps fresh projects.
alter table opportunities_shared add column if not exists difficulty text check (difficulty in ('Beginner', 'Medium', 'Advanced'));
alter table opportunities_shared add column if not exists prep_needed text check (char_length(prep_needed) <= 300);

alter table opportunities_shared enable row level security;

create policy "opportunities_shared_select_published_or_own" on opportunities_shared
  for select to authenticated using (status = 'published' or submitted_by = auth.uid());

create policy "opportunities_shared_delete_own" on opportunities_shared
  for delete to authenticated using (submitted_by = auth.uid());

create index if not exists opportunities_shared_status_created_at_idx on opportunities_shared (status, created_at desc);

-- ---------------------------------------------------------------------------
-- mentor_profiles
-- The live, visible mentor roster. No client-reachable insert/update/delete
-- policy at all -- a user cannot write their own way into this table no
-- matter what they do client-side. Rows only ever land here through the
-- owner manually promoting an approved mentor_applications row (see below).
-- This is what makes "vetted" real given this app has no admin panel and no
-- way to do genuine identity/background verification.
-- ---------------------------------------------------------------------------
create table if not exists mentor_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bio text not null check (char_length(bio) <= 600),
  focus_tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table mentor_profiles enable row level security;

create policy "mentor_profiles_select_authenticated" on mentor_profiles
  for select to authenticated using (is_active = true);

-- ---------------------------------------------------------------------------
-- mentor_applications
-- The intake queue. A user can see and withdraw their own pending
-- application, but nobody can insert directly -- applications go through
-- api/community-mentor-apply.js (verify -> AI moderate -> service-role
-- insert), same non-bypassable shape as posts/opportunities_shared.
--
-- To promote an approved application (done manually by the owner in the
-- Supabase SQL editor after actually reading the application -- there is no
-- admin UI for this by design):
--   update mentor_applications set status = 'approved' where id = '<application id>';
--   insert into mentor_profiles (user_id, bio, focus_tags)
--     select user_id, bio, focus_tags from mentor_applications where id = '<application id>';
-- ---------------------------------------------------------------------------
create table if not exists mentor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bio text not null check (char_length(bio) between 40 and 600),
  focus_tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'blocked')),
  moderation_reason text,
  created_at timestamptz not null default now()
);

alter table mentor_applications enable row level security;

create policy "mentor_applications_select_own" on mentor_applications
  for select to authenticated using (user_id = auth.uid());

create policy "mentor_applications_delete_own_pending" on mentor_applications
  for delete to authenticated using (user_id = auth.uid() and status = 'pending');

-- ---------------------------------------------------------------------------
-- skill_tags
-- Backs the Skill Exchange feature: each row is one "I can offer X" or
-- "I need X" listing, tagged with one of the 6 BUILD_LIFE_MOMENT_CATEGORIES
-- (app.js) and a one-line note. Same non-bypassable moderation shape as
-- posts/opportunities_shared -- no client-reachable INSERT policy, so the
-- only way a row lands here is api/community-skill-tag.js (verify session ->
-- AI safety check on the note -> service-role insert). No payments/points;
-- connecting reuses accountability_connections as-is.
-- ---------------------------------------------------------------------------
create table if not exists skill_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('offered', 'needed')),
  category text not null check (category in ('independence', 'money', 'communication', 'career', 'wellness', 'relationships')),
  note text not null check (char_length(note) between 4 and 140),
  status text not null default 'pending' check (status in ('pending', 'published', 'blocked')),
  moderation_reason text,
  created_at timestamptz not null default now()
);

alter table skill_tags enable row level security;

create policy "skill_tags_select_published_or_own" on skill_tags
  for select to authenticated using (status = 'published' or user_id = auth.uid());

create policy "skill_tags_delete_own" on skill_tags
  for delete to authenticated using (user_id = auth.uid());

create index if not exists skill_tags_category_type_idx on skill_tags (category, type);
create index if not exists skill_tags_user_id_idx on skill_tags (user_id);

-- ---------------------------------------------------------------------------
-- guardian_shares
-- Backs the Guardian read-only share feature on Life Roadmap. Life Roadmap
-- goals/milestones live only in the browser's localStorage, and using them
-- doesn't require a Community account - so there is no auth.uid() to scope
-- RLS against here, unlike every other table in this file. RLS is enabled
-- with NO policies at all, meaning anon/authenticated get zero direct
-- access; every read and write goes through api/guardian-share.js using the
-- service-role key. The token (a long random unguessable string) is the
-- "view" credential a guardian needs to open their link; manage_secret
-- (known only to the sharing user's own browser, never returned by a public
-- read) is the separate "revoke/update" credential. Regenerating a link
-- deletes the old row and creates a new token+manage_secret pair - there is
-- no user identity to reset a forgotten manage_secret against, by design.
-- ---------------------------------------------------------------------------
create table if not exists guardian_shares (
  token text primary key,
  manage_secret text not null,
  local_user_id text not null,
  goals jsonb not null default '[]'::jsonb,
  include_personal_blueprint boolean not null default false,
  include_chat_history boolean not null default false,
  include_cost_of_living boolean not null default false,
  personal_blueprint jsonb,
  chat_history jsonb,
  cost_of_living jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table guardian_shares enable row level security;
-- Intentionally no policies here - see comment above.

-- ---------------------------------------------------------------------------
-- compass_backups
-- One row per signed-in user - their entire local trackerState, backed up
-- on request. Unlike posts/opportunities_shared/skill_tags, this needs no
-- moderation or service-role layer: it's private data, and RLS already
-- guarantees only its own owner (auth.uid()) can ever read or write it, so
-- normal client-side insert/update/select policies are safe here.
-- ---------------------------------------------------------------------------
create table if not exists compass_backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table compass_backups enable row level security;

create policy "compass_backups_select_own" on compass_backups
  for select to authenticated using (user_id = auth.uid());

create policy "compass_backups_insert_own" on compass_backups
  for insert to authenticated with check (user_id = auth.uid());

create policy "compass_backups_update_own" on compass_backups
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

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
