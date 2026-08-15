-- Ratings are world-readable, so display_name is published to anyone with the
-- link. Defaulting it to the email prefix meant a new account leaked its email
-- address the moment it rated anything — "andrewjtolentino" is not a nickname.
--
-- New accounts now land on a neutral placeholder that the crew renames to a
-- chosen handle. Crew status is unchanged: still granted only by matching the
-- allowlist.
--
-- Safe to run twice.

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
    -- Never derive this from the email. A placeholder that obviously wants
    -- replacing is better than one that quietly publishes an address.
    coalesce(new.raw_user_meta_data->>'display_name', 'New tester'),
    exists (
      select 1 from public.allowed_emails a
      where lower(a.email) = lower(new.email)
    )
  );
  return new;
end;
$$;
