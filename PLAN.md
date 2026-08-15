# Tater Tot Tour — Build Plan

A map of Bay Area restaurants serving tater tots, rated by the crew.
Starts in San Francisco, expands to the East Bay, and grows into all potatoes.

---

## 1. Decisions locked

| Decision | Choice | Why |
|---|---|---|
| Who rates | Crew only (invite-list) | Rankings stay authoritative |
| Who reads | Public, read-only map + rankings | Shareable; no moderation burden |
| Who suggests | Anyone, via a write-only form | Grows the wishlist without giving away edit rights |
| Getting places on the map | You add them manually; suggestions queue for approval | No API cost, full control |
| Scoring | One overall 1–10 + notes (optional detail axes) | Low friction to submit |
| Stack | Next.js (static export) + Supabase + MapLibre | $0, deploys to GitHub Pages |
| Hosting | GitHub Pages via GitHub Actions | Asked for; Vercel is the escape hatch |

### One thing to confirm

You picked "just my crew (private)" but also wanted public suggestions. Those pull in
opposite directions, so the plan resolves it as:

- **Map + rankings**: publicly readable (anyone with the link sees them)
- **Ratings**: crew-only to write; visible to all
- **Suggestions**: anyone can submit, only crew can read the queue

If you'd rather the map be genuinely hidden from the public, say so — the suggestion
form then becomes a standalone shareable link and the map goes behind auth. Everything
else in this plan is unchanged.

---

## 2. The one architectural decision that matters

**Ratings attach to a menu item, not to a restaurant.**

```
place (Zeitgeist)
  └── item (Tater Tots, potato_type: tater_tot)
        └── rating (Andrew, 8.5, "crispy shell, hollow inside")
  └── item (Garlic Fries, potato_type: french_fry)     ← free, later
        └── rating (...)
```

This is what makes "eventually grow it to more potatoes" cost nothing later. A place can
serve tots *and* curly fries *and* a hash brown, each rated independently, each ranked in
its own leaderboard. If ratings hung off `place`, adding fries later would mean a painful
migration and muddled scores.

Everything else in the schema is ordinary. This is the part worth getting right on day one.

---

## 3. Data model

```sql
-- Crew membership. Populated by an allowlist you seed in the Supabase SQL editor
-- (never in the repo).
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url   text,
  is_crew      boolean not null default false,
  is_admin     boolean not null default false,
  created_at   timestamptz default now()
);

create type region       as enum ('sf','east_bay','peninsula','south_bay','north_bay');
create type place_status as enum ('wishlist','visited','closed');
create type potato_type  as enum ('tater_tot','french_fry','curly_fry','waffle_fry',
                                  'hash_brown','potato_wedge','latke','other');

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

create table items (
  id           uuid primary key default gen_random_uuid(),
  place_id     uuid not null references places(id) on delete cascade,
  potato_type  potato_type not null default 'tater_tot',
  name         text not null,              -- "Truffle Parm Tots"
  description  text,
  price_cents  int,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

create table ratings (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references items(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  score      numeric(3,1) not null check (score >= 1 and score <= 10),
  notes      text,
  photo_path text,
  visited_on date not null default current_date,
  detail     jsonb,                        -- optional {crispiness, taste, color}
  created_at timestamptz default now(),
  unique (item_id, user_id, visited_on)     -- re-rate on a later visit
);

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

create view item_scores as
  select i.id as item_id,
         i.place_id,
         round(avg(r.score)::numeric, 1) as avg_score,
         count(r.id)                     as rating_count
  from items i
  left join ratings r on r.item_id = i.id
  group by i.id;
```

### On the `detail` column

You chose simple scoring, so the required field is one 1–10 number. But `detail jsonb`
sits there unused until you want it — a collapsed "add detail" section in the rate form
can capture crispiness / taste / color per visit without ever blocking a quick submit.
Costs nothing now, preserves the tour's original DNA. Drop it if you disagree.

### Row Level Security

| Table | anon (public) | crew | 
|---|---|---|
| `places`, `items`, `item_scores` | read | read + write |
| `ratings` | read | read; write **own rows only** |
| `suggestions` | **insert only** (cannot read) | read + update status |
| `profiles` | read (display names) | update own |

The suggestions policy is the interesting one: the public can drop a note in the box but
can never read the box.

---

## 4. Ranking

v1: sort by `avg_score` descending, show `rating_count` alongside, and mark anything with
fewer than 2 ratings as "unranked — needs another opinion." That's honest and takes ten
minutes.

The refinement, once you have real data: average each person's *most recent* rating per
item rather than all their ratings, so a place that improved isn't dragged down by a bad
2024 visit. Worth deferring until it actually bites.

---

## 5. Tech choices, concretely

- **Map**: MapLibre GL JS with [OpenFreeMap](https://openfreemap.org) tiles — free, no API
  key, no signup, no billing account. Fallback if it ever goes down: Protomaps or CARTO.
- **Geocoding**: none. Right-click a spot in Google Maps, copy the lat/lng, paste it into
  the admin form. For 20 places that's ten minutes total and zero dependencies.
- **Auth**: Supabase magic link (email). A database trigger sets `is_crew = true` only for
  addresses in an `allowed_emails` table you seed by hand.
- **Photos**: Supabase Storage bucket, public read, crew write.
- **UI shape**: single-page map with a slide-over detail panel, not separate routes per
  place. Better on mobile *and* it sidesteps static export's dynamic-route problem —
  adding a place never requires a rebuild.

---

## 6. Phases

**Phase 0 — Skeleton and pipeline**
Next.js app, `output: 'export'`, GitHub Actions workflow, Pages enabled. Ship a "Hello
Tots" page to a live URL. *Prove hosting works before building anything on top of it.*

**Phase 1 — Supabase and schema**
Create project, run the SQL, enable RLS, seed 5–10 SF spots you've already been to.

**Phase 2 — The map**
MapLibre centered on SF, pins from `places`, pin color by score (grey = unrated →
gold = 9+). Click a pin → detail panel with items and average scores.

**Phase 3 — Auth and rating**
Magic-link login, crew gate, rate form: score, notes, optional photo, optional detail axes.

**Phase 4 — Rankings**
Leaderboard, filterable by region and potato type. The potato-type filter is the visible
proof the "more potatoes" plan works.

**Phase 5 — Suggestion box**
Public form → `suggestions`. Crew-only queue with one-click promote-to-place.

**Phase 6 — East Bay and polish**
Region toggle, mobile pass, share cards for texting the group.

---

## 7. Risks

1. **Public repo required.** Free GitHub Pages won't serve from a private repo. The anon
   key being public is fine and expected; the service role key must never be committed.
2. **Static export = no server.** No API routes, no middleware, no `next/image`
   optimization. Anything needing a secret goes in a Supabase Edge Function.
3. **Suggestion spam.** Start with a honeypot field and a Supabase rate limit. If it gets
   abused, move the endpoint into an Edge Function with Cloudflare Turnstile.
4. **Supabase free tier pauses after 7 days of inactivity.** For a project you touch
   monthly, that means an occasional cold start. Not fatal, worth knowing.

---

## 8. Settled details

### Crew size: 3 (including Andrew)

- The `allowed_emails` allowlist is three rows seeded by hand. No invite flow needed.
- "Ranked" threshold of 2 ratings means an item ranks once two of you have been. That's
  the right bar for a crew of three — requiring all three would leave most of the map
  perpetually unranked.

### Domain: custom, not yet purchased

Don't let this block Phase 0. Ship to `andrewtolentino.github.io/tatertots` first, move
the domain over later. To make that move a one-line change rather than a rewrite, the
base path is read from an env var at build time:

```js
// next.config.js
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
module.exports = { output: 'export', basePath, images: { unoptimized: true } }
```

Set `NEXT_PUBLIC_BASE_PATH=/tatertots` in the GitHub Actions workflow now; delete that
line the day the domain lands, add a `CNAME` file, point DNS at GitHub Pages. Done.

Registrar note: Cloudflare Registrar sells at wholesale cost with no markup and no
first-year-cheap/renewal-expensive game. Roughly $10–12/yr for a `.com`.

### Photos: in v1

Supabase Storage bucket `tot-photos`, public read, crew write. Two things to handle,
both consequences of having no server:

1. **Resize in the browser before upload.** Canvas-downscale to ~1600px on the long edge
   and re-encode as JPEG at ~0.8 quality. Gets a 4MB phone photo under 500KB, which keeps
   you inside the 1GB free tier essentially forever and makes the map panel load fast.
2. **HEIC.** iPhone photos are HEIC by default. Safari can decode them in a canvas;
   desktop Chrome and Firefox cannot. Handle it by attempting the resize and falling back
   to uploading the original file if the canvas comes back blank — you'll be uploading
   from phones most of the time anyway, so this is a rare path, not the common one.

---

## 9. Where a suggestion goes

The submit path, end to end:

```
public form  →  insert into `suggestions`  (anon may INSERT, never SELECT)
                     ↓ Supabase Database Webhook fires on insert
               Discord/Slack message to the crew channel
                     ↓
               /admin/suggestions  →  crew reviews  →  "Promote to place"
                     ↓                                        ↓
               status = 'rejected'                  creates `places` row
                                                    (status: 'wishlist')
                                                    + status = 'approved'
```

A promoted suggestion lands on the map immediately as a **wishlist** pin — visually
distinct from places you've actually been. That gives the wishlist a real job: it's your
tour itinerary, not a hidden backlog. A wishlist pin becomes a visited pin the first time
someone rates it.

**Why the webhook URL lives in Supabase, not the repo:** the repo is public. Database
Webhooks are configured in the Supabase dashboard and fire server-side from Postgres, so
the credential never reaches the browser or the build. This is the general rule for this
architecture — anything secret goes in Supabase, never in the static site.

If your crew doesn't have a Discord or Slack channel, skip the webhook in v1 and just put
a pending-count badge on the admin nav. Email notification needs a verified sending
domain, so it's naturally a post-domain-purchase task.

### Spam

Start with a honeypot field (a hidden input real users never fill; reject any submission
that has it filled) plus a length cap enforced in the RLS insert policy. That handles
naive bots, which is all a small site attracts. If it ever gets genuinely abused, move the
insert behind an Edge Function with Cloudflare Turnstile — a contained change, since the
form already posts to one place.
```