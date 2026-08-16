-- Menus change, and a place can end up on the map that never really had tots.
-- Visitors can now report that against a specific place.
--
-- This rides on the suggestions table rather than getting its own, because the
-- crew wants one inbox to check, and the write-only-to-the-public boundary is
-- already correct here. The two kinds differ in one structural way: a report
-- points at an existing place, a suggestion proposes one that does not exist
-- yet, which is what the policy check below enforces.
--
-- Safe to run twice.

do $$
begin
  create type suggestion_kind as enum ('new_place', 'no_tots');
exception
  when duplicate_object then null;
end
$$;

alter table suggestions
  add column if not exists kind suggestion_kind not null default 'new_place',
  add column if not exists place_id uuid references places(id) on delete cascade;

-- Replaced rather than added to: policies are permissive, so a second insert
-- policy would widen access instead of tightening it.
drop policy if exists "anyone can suggest" on suggestions;
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
    -- A report is meaningless without the place it is about.
    and (kind <> 'no_tots' or place_id is not null)
  );
