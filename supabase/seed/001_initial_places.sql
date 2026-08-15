-- The first ten stops on the tour.
--
-- Coordinates came from OpenStreetMap (Nominatim), matched on business name.
-- Spot-check any pin that looks off on the map and correct the row directly.
--
-- Every place is seeded as 'wishlist'. A place becomes 'visited' once someone
-- rates it, so seeding them as 'visited' with zero ratings would put a
-- contradiction on the map. Flip any you've already been to by hand, or just
-- rate them and let it happen on its own.

insert into places (slug, name, address, city, neighborhood, region, lat, lng, status) values
  ('oakland-street-food', 'Oakland Street Food',              '430 13th Street',        'Oakland',       'Downtown',             'east_bay', 37.8036234, -122.2712300, 'wishlist'),
  ('breakfast-little',    'Breakfast Little',                 '3275 22nd Street',       'San Francisco', 'Mission',              'sf',       37.7552248, -122.4203609, 'wishlist'),
  ('bandit',              'Bandit',                           '499 Dolores Street',     'San Francisco', 'Mission',              'sf',       37.7615757, -122.4258676, 'wishlist'),
  ('napper-tandy',        'The Napper Tandy',                 '3200 24th Street',       'San Francisco', 'Mission',              'sf',       37.7524748, -122.4164736, 'wishlist'),
  ('the-boardroom',       'The Boardroom',                    '1609 Powell Street',     'San Francisco', 'North Beach',          'sf',       37.7994533, -122.4105373, 'wishlist'),
  ('underdogs-tres',      'Underdogs Tres',                   '1224 9th Avenue',        'San Francisco', 'Inner Sunset',         'sf',       37.7654241, -122.4662930, 'wishlist'),
  ('sweet-maple',         'Sweet Maple',                      '2101 Sutter Street',     'San Francisco', 'Lower Pacific Heights','sf',       37.7857522, -122.4350453, 'wishlist'),
  ('the-bird',            'The Bird',                         '115 New Montgomery Street', 'San Francisco', 'SOMA',              'sf',       37.7872353, -122.4000703, 'wishlist'),
  ('grubbin',             'Grubbin''',                        '1404 Taraval Street',    'San Francisco', 'Outer Sunset',         'sf',       37.7429359, -122.4812611, 'wishlist'),
  ('richmond-republic',   'Richmond Republic Draught House',  '642 Clement Street',     'San Francisco', 'Inner Richmond',       'sf',       37.7830174, -122.4662352, 'wishlist')
on conflict (slug) do nothing;

-- One tater tot item per place, so there is something to rate on day one.
-- Rename these once you know what the menu actually calls them ("Truffle Tots",
-- "Tot-chos"), and add a second item anywhere that serves more than one style.
insert into items (place_id, potato_type, name)
select p.id, 'tater_tot', 'Tater Tots'
from places p
where not exists (
  select 1 from items i where i.place_id = p.id and i.potato_type = 'tater_tot'
);
