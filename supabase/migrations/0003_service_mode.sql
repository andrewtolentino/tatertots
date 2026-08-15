-- Takeout tots steam in the box and arrive soggy; the same order eaten at the
-- bar is a different food. Recording how it was served keeps that from showing
-- up as unexplained variance in the scores, and lets rankings filter on it
-- later ("best dine-in tots" is a different list from "best takeout tots").
--
-- Nullable on purpose: the form always sets it, but a rating imported or
-- back-filled from the old spreadsheet genuinely may not know.
--
-- Written to be safe to run twice. `create type` has no IF NOT EXISTS, so a
-- second run would otherwise abort with 42710 before reaching the ALTER.

do $$
begin
  create type service_mode as enum ('dine_in', 'takeout');
exception
  when duplicate_object then null;
end
$$;

alter table ratings add column if not exists service_mode service_mode;
