-- Eleven more candidates, researched August 2026 from Yelp/Tripadvisor tater tot
-- rankings, SFist, KQED and East Bay Express coverage.
--
-- Every coordinate was resolved through OpenStreetMap by business name or, where
-- the business was not in OSM, by the street address found in current listings.
-- Nothing here is a guess.
--
-- All land as 'wishlist', which is the honest status: these are places reported
-- to serve tots, not places the crew has been. A pin turns visited when someone
-- rates it.
--
-- Two things worth knowing about this list:
--
--   * Deliberately excluded — Dr. Teeth and the Electric Mayhem geocodes to the
--     same address as Teeth (2323 Mission St); it is the predecessor of that
--     space, not a second place. Handlebar in Berkeley appears in older
--     round-ups but Berkeleyside reported its closure in 2016. Bullitt, Wild
--     Hare and Lightning come only from a 2014 SFist piece and could not be
--     confirmed as trading, so they are left out rather than guessed at.
--   * Menus change. Verify the tots still exist before making a trip.

insert into places (slug, name, address, city, neighborhood, region, lat, lng, status) values
  -- San Francisco
  ('teeth',                 'Teeth',                   '2323 Mission Street',   'San Francisco', 'Mission',        'sf',       37.7598670, -122.4189763, 'wishlist'),
  ('breakfast-at-tiffanys', 'Breakfast at Tiffany''s', '2499 San Bruno Avenue', 'San Francisco', 'Silver Terrace', 'sf',       37.7304529, -122.4046218, 'wishlist'),
  ('sams-american-eatery',  'Sam''s American Eatery',  '1220 Market Street',    'San Francisco', 'Civic Center',   'sf',       37.7784378, -122.4154420, 'wishlist'),
  ('evil-eye',              'Evil Eye',                '2937 Mission Street',   'San Francisco', 'Mission',        'sf',       37.7500359, -122.4180938, 'wishlist'),
  ('enterprise-brewing',    'Enterprise Brewing',      '1150 Howard Street',    'San Francisco', 'SoMa',           'sf',       37.7771618, -122.4107040, 'wishlist'),

  -- East Bay
  ('hawking-bird',          'Hawking Bird',            '4901 Telegraph Avenue', 'Oakland',  'Temescal',    'east_bay', 37.8358590, -122.2628390, 'wishlist'),
  ('north-light',           'North Light',             '4915 Telegraph Avenue', 'Oakland',  'Temescal',    'east_bay', 37.8360203, -122.2628250, 'wishlist'),
  ('elis-mile-high-club',   'Eli''s Mile High Club',   '3627 Martin Luther King Jr Way', 'Oakland', 'Mosswood', 'east_bay', 37.8257804, -122.2696713, 'wishlist'),
  ('paradise-park-cafe',    'Paradise Park Cafe',      '6334 San Pablo Avenue', 'Oakland',  'Golden Gate', 'east_bay', 37.8468188, -122.2847736, 'wishlist'),
  ('malibus-burgers',       'Malibu''s Burgers',       '326 23rd Street',       'Oakland',  'Uptown',      'east_bay', 37.8121351, -122.2650800, 'wishlist'),
  ('jailbird',              'Jailbird',                '2353 East 12th Street', 'Oakland',  'San Antonio', 'east_bay', 37.7817676, -122.2362390, 'wishlist')
on conflict (slug) do nothing;

-- One tater tot item per place, matching the pattern from the first seed. This
-- only touches places that have no tater tot item yet, so it is safe to re-run
-- and will not disturb items you have renamed.
insert into items (place_id, potato_type, name)
select p.id, 'tater_tot', 'Tater Tots'
from places p
where not exists (
  select 1 from items i where i.place_id = p.id and i.potato_type = 'tater_tot'
);
