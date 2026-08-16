// Hand-maintained to match supabase/migrations/. If the schema changes, update
// this too — or generate it with:
//   npx supabase gen types typescript --project-id hntbadypogilvjlqtzqo

export type Region =
  | "sf"
  | "east_bay"
  | "peninsula"
  | "south_bay"
  | "north_bay";

export type PlaceStatus = "wishlist" | "visited" | "closed";

export type PotatoType =
  | "tater_tot"
  | "french_fry"
  | "curly_fry"
  | "waffle_fry"
  | "hash_brown"
  | "potato_wedge"
  | "latke"
  | "other";

export type Place = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  region: Region;
  lat: number;
  lng: number;
  website: string | null;
  status: PlaceStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type Item = {
  id: string;
  place_id: string;
  potato_type: PotatoType;
  name: string;
  description: string | null;
  price_cents: number | null;
  is_active: boolean;
  created_at: string;
};

export type TextureTag =
  | "crispy"
  | "crunchy"
  | "tender"
  | "soft"
  | "mushy"
  | "dry";

/** Ordered as they appear on the paper scorecard. */
export const TEXTURE_TAGS: TextureTag[] = [
  "crispy",
  "crunchy",
  "tender",
  "soft",
  "mushy",
  "dry",
];

/** The card's four tot scales, besides the overall score. */
export const RATING_AXES = [
  { key: "presentation", label: "Presentation" },
  { key: "flavor", label: "Flavor" },
  { key: "creativity", label: "Creativity" },
  { key: "value_rating", label: "Value" },
] as const;

export type RatingAxis = (typeof RATING_AXES)[number]["key"];

export type ServiceMode = "dine_in" | "takeout";

export const SERVICE_MODE_LABELS: Record<ServiceMode, string> = {
  dine_in: "Dine in",
  takeout: "Takeout",
};

export type Rating = {
  id: string;
  item_id: string;
  user_id: string;
  score: number;
  notes: string | null;
  photo_path: string | null;
  visited_on: string;
  presentation: number | null;
  flavor: number | null;
  creativity: number | null;
  value_rating: number | null;
  price: number | null;
  texture: TextureTag[] | null;
  order_text: string | null;
  service_mode: ServiceMode | null;
  created_at: string;
};

export type ItemScore = {
  item_id: string;
  place_id: string;
  avg_score: number | null;
  rating_count: number;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_crew: boolean;
  is_admin: boolean;
  created_at: string;
};

export type SuggestionKind = "new_place" | "no_tots";

export type Suggestion = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  potato_type: PotatoType | null;
  submitter_name: string | null;
  submitter_contact: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  kind: SuggestionKind;
  place_id: string | null;
  created_at: string;
};

export const REGION_LABELS: Record<Region, string> = {
  sf: "San Francisco",
  east_bay: "East Bay",
  peninsula: "Peninsula",
  south_bay: "South Bay",
  north_bay: "North Bay",
};

export const POTATO_LABELS: Record<PotatoType, string> = {
  tater_tot: "Tater Tots",
  french_fry: "French Fries",
  curly_fry: "Curly Fries",
  waffle_fry: "Waffle Fries",
  hash_brown: "Hash Browns",
  potato_wedge: "Potato Wedges",
  latke: "Latkes",
  other: "Other",
};
