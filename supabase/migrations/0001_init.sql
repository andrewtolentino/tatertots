-- Tater Tot Tour — initial schema
-- Paste into the Supabase SQL editor and run once.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type region       as enum ('sf','east_bay','peninsula','south_bay','north_bay');
create type place_status as enum ('wishlist','visited','closed');
create type potato_type  as enum ('tater_tot','french_fry','curly_fry','waffle_fry',
                                  'hash_brown','potato_wedge','latke','other');

-- ---------------------------------------------------------------------------
-- Crew allowlist
--
-- Seeded by hand in the SQL editor, never from the app. No RLS policies are
-- defined on this table, which with RLS enabled means *nobody* can read or
-- write it through the API — only the service role and this editor.
-- ---------------------------------------------------------------------------

create table allowed_emails (
  email      text primary key,
  note       text,
  created_at timestamptz default now()
);
alter table allowed_emails enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url   text,
  is_crew      boolean not null default false,
  is_admin     boolean not null default false,
  created_at   timestamptz default now()
);
alter table profiles enable row level security;

-- Anyone signing up gets a profile. Crew status is granted only if their email
-- was already on the allowlist, so a stranger logging in lands as a read-only
-- account rather than being rejected outright.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, is_crew)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    exists (
      select 1 from public.allowed_emails a
      where lower(a.email) = lower(new.email)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Checking crew status from inside a policy on `profiles` would recurse, so this
-- runs as definer to read the row directly.
create or replace function is_crew()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_crew from public.profiles p where p.id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Places
-- ---------------------------------------------------------------------------

create table places (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  address    text,
  city       text,
  region     region not null default 'sf',
  lat        double precision not null,
  lng        double precision not null,
  website    text,
  status     place_status not null default 'wishlist',
  notes      text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table places enable row level security;

-- ---------------------------------------------------------------------------
-- Items
--
-- Ratings hang off a menu item rather than a restaurant. That is what makes
-- adding fries, wedges, or hash browns later cost nothing.
-- ---------------------------------------------------------------------------

create table items (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references places(id) on delete cascade,
  potato_type potato_type not null default 'tater_tot',
  name        text not null,
  description text,
  price_cents int,
  is_active   boolean default true,
  created_at  timestamptz default now()
);
create index items_place_id_idx on items (place_id);
alter table items enable row level security;

-- ---------------------------------------------------------------------------
-- Ratings
-- ---------------------------------------------------------------------------

create table ratings (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references items(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  score      numeric(3,1) not null check (score >= 1 and score <= 10),
  notes      text,
  photo_path text,
  visited_on date not null default current_date,
  detail     jsonb,
  created_at timestamptz default now(),
  -- One rating per person per item per visit; a later visit can be rated again.
  unique (item_id, user_id, visited_on)
);
create index ratings_item_id_idx on ratings (item_id);
alter table ratings enable row level security;

-- ---------------------------------------------------------------------------
-- Suggestions
-- ---------------------------------------------------------------------------

create table suggestions (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  address           text,
  city              text,
  potato_type       potato_type default 'tater_tot',
  submitter_name    text,
  submitter_contact text,
  note              text,
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  created_at        timestamptz default now()
);
alter table suggestions enable row level security;

-- ---------------------------------------------------------------------------
-- Score rollup
--
-- security_invoker makes the view respect the querying user's RLS rather than
-- the view owner's. Everything underneath is publicly readable anyway, but the
-- default (definer) would silently become a leak the day that changes.
-- ---------------------------------------------------------------------------

create view item_scores
with (security_invoker = on) as
  select i.id       as item_id,
         i.place_id,
         round(avg(r.score)::numeric, 1) as avg_score,
         count(r.id)                     as rating_count
  from items i
  left join ratings r on r.item_id = i.id
  group by i.id;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- Map data: world-readable, crew-writable.
create policy "places are public" on places
  for select using (true);
create policy "crew manages places" on places
  for all to authenticated using (is_crew()) with check (is_crew());

create policy "items are public" on items
  for select using (true);
create policy "crew manages items" on items
  for all to authenticated using (is_crew()) with check (is_crew());

-- Ratings are public to read so the rankings work for visitors, but a crew
-- member may only write rows attributed to themselves.
create policy "ratings are public" on ratings
  for select using (true);
create policy "crew inserts own ratings" on ratings
  for insert to authenticated with check (is_crew() and user_id = auth.uid());
create policy "crew edits own ratings" on ratings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "crew deletes own ratings" on ratings
  for delete to authenticated using (user_id = auth.uid());

create policy "profiles are public" on profiles
  for select using (true);
create policy "users edit own profile" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- The public may drop a note in the box but can never read the box. Length caps
-- are enforced here rather than in the form, since the form is just JavaScript
-- that anyone can bypass.
create policy "anyone can suggest" on suggestions
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and length(name) between 1 and 120
    and coalesce(length(address), 0)           <= 200
    and coalesce(length(city), 0)              <= 80
    and coalesce(length(submitter_name), 0)    <= 80
    and coalesce(length(submitter_contact), 0) <= 120
    and coalesce(length(note), 0)              <= 1000
  );
create policy "crew reads suggestions" on suggestions
  for select to authenticated using (is_crew());
create policy "crew updates suggestions" on suggestions
  for update to authenticated using (is_crew()) with check (is_crew());

-- ---------------------------------------------------------------------------
-- Photo storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('tot-photos', 'tot-photos', true)
on conflict (id) do nothing;

create policy "tot photos are public" on storage.objects
  for select using (bucket_id = 'tot-photos');
create policy "crew uploads tot photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tot-photos' and is_crew());
create policy "crew deletes tot photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'tot-photos' and is_crew());
