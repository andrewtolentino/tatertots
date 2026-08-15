-- Match the paper scorecard the tour has used since 2023.
--
-- Three changes worth naming:
--
-- 1. Scores move from 1-10 to the card's 1-5 tot scale (half steps allowed),
--    so paper scores from previous years transfer without translation.
-- 2. The invented crispiness/taste/colour axes are replaced by the card's
--    presentation / flavor / creativity / value. The `detail` jsonb goes with
--    them — these are fixed, comparable axes, so they deserve real columns you
--    can sort and average on.
-- 3. Texture becomes multi-select tags rather than a score. "Mushy" and "dry"
--    are different failures, not two ends of one axis, and a tot can be both
--    crispy and dry at once.
--
-- Price is deliberately separate from value: expensive-but-worth-it and
-- cheap-but-sad are different verdicts.
--
-- Safe to run twice.

do $$
begin
  create type texture_tag as enum
    ('crispy', 'crunchy', 'tender', 'soft', 'mushy', 'dry');
exception
  when duplicate_object then null;
end
$$;

-- The original constraint was created inline as ratings_score_check.
alter table ratings drop constraint if exists ratings_score_check;
alter table ratings add constraint ratings_score_check
  check (score >= 1 and score <= 5);

alter table ratings
  drop column if exists detail,
  add column if not exists presentation numeric(2,1)
    check (presentation between 1 and 5),
  add column if not exists flavor numeric(2,1)
    check (flavor between 1 and 5),
  add column if not exists creativity numeric(2,1)
    check (creativity between 1 and 5),
  -- `value` is a keyword in enough contexts to be worth avoiding as a name.
  add column if not exists value_rating numeric(2,1)
    check (value_rating between 1 and 5),
  add column if not exists price smallint
    check (price between 1 and 5),
  add column if not exists texture texture_tag[],
  -- What was actually ordered — the card's ORDER line. Catches the visit where
  -- you got the truffle tots rather than the standard ones.
  add column if not exists order_text text;
