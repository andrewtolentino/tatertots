-- Back to a 1-10 scale for the overall score and the four axes.
--
-- Five buckets left too many places tied at "4 tots" — with ten spots already
-- and more coming, the extra resolution is what makes a ranking mean anything.
-- Half steps stay, so the effective range is 1.0 to 10.0 in 0.5s.
--
-- Price is deliberately left on 1-5: it is the card's $$$$$ scale, not a
-- quality judgement, and five levels is how price is conventionally read.
--
-- Widening a range is safe for existing rows, but it does silently change what
-- an already-stored number means — a 4 that meant 4/5 would now read as 4/10.
-- Verified zero ratings existed when this ran, so there was nothing to
-- reinterpret. If you ever re-run this against real 1-5 data, double the values
-- first.
--
-- Safe to run twice.

alter table ratings drop constraint if exists ratings_score_check;
alter table ratings add constraint ratings_score_check
  check (score >= 1 and score <= 10);

alter table ratings drop constraint if exists ratings_presentation_check;
alter table ratings add constraint ratings_presentation_check
  check (presentation between 1 and 10);

alter table ratings drop constraint if exists ratings_flavor_check;
alter table ratings add constraint ratings_flavor_check
  check (flavor between 1 and 10);

alter table ratings drop constraint if exists ratings_creativity_check;
alter table ratings add constraint ratings_creativity_check
  check (creativity between 1 and 10);

alter table ratings drop constraint if exists ratings_value_rating_check;
alter table ratings add constraint ratings_value_rating_check
  check (value_rating between 1 and 10);
