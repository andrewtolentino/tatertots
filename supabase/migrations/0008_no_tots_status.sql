-- A place can be real, open, and still not belong on a tater tot map, because
-- the tots came off the menu or were never there. That is not the same as
-- closed, so it gets its own status.
--
-- Deliberately a status rather than a delete: the row remembers that this place
-- was already considered and rejected, so it does not get re-suggested and
-- re-added months later. It also preserves any ratings the crew left while the
-- tots still existed, which are a true record of a real visit.
--
-- Safe to run twice.

alter type place_status add value if not exists 'no_tots';
