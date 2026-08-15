-- Neighborhood is how the crew actually refers to these places ("Bandit, Mission"),
-- and `city` can't carry it — every SF spot has the same city.

alter table places add column neighborhood text;
