export type FlowerCategory =
  | "park"
  | "mountain"
  | "river"
  | "botanical"
  | "street"
  | "temple"
  | "farm"
  | "etc";

export const CATEGORY_LABELS: Record<FlowerCategory, string> = {
  park: "공원",
  mountain: "산",
  river: "강변/호수",
  botanical: "수목원/식물원",
  street: "가로수길",
  temple: "사찰",
  farm: "농장/체험",
  etc: "기타",
};

export type FlowerType =
  | "cherry"
  | "plum"
  | "forsythia"
  | "azalea"
  | "wisteria"
  | "rose"
  | "cosmos"
  | "sunflower"
  | "tulip"
  | "lavender"
  | "rape"
  | "etc";

export const FLOWER_TYPE_LABELS: Record<FlowerType, string> = {
  cherry: "벚꽃",
  plum: "매화",
  forsythia: "개나리",
  azalea: "진달래·철쭉",
  wisteria: "등나무",
  rose: "장미",
  cosmos: "코스모스",
  sunflower: "해바라기",
  tulip: "튤립",
  lavender: "라벤더",
  rape: "유채꽃",
  etc: "기타",
};

export type BloomStatusValue =
  | "before"
  | "budding"
  | "blooming"
  | "peak"
  | "falling"
  | "done";

export const BLOOM_STATUS_LABELS: Record<BloomStatusValue, string> = {
  before: "개화 전",
  budding: "봉오리",
  blooming: "개화 중",
  peak: "만개",
  falling: "낙화 중",
  done: "종료",
};

export interface FlowerSpot {
  id: string;
  external_place_id: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  flower_types: FlowerType[];
  category: FlowerCategory;
  peak_month_start: number | null;
  peak_month_end: number | null;
  has_night_light: boolean;
  has_parking: boolean;
  pet_friendly: boolean;
  photo_spot: boolean;
  entry_fee: number;
  phone: string | null;
  website_url: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface BloomStatus {
  id: string;
  spot_id: string;
  year: number;
  status: BloomStatusValue;
  bloom_pct: number | null;
  updated_by: string;
  observed_at: string | null;
  created_at: string;
}

export interface Festival {
  id: string;
  spot_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  source_url: string | null;
  created_at: string;
}

export interface SpotReview {
  id: string;
  spot_id: string;
  content: string | null;
  nickname: string;
  rating: number | null;
  signal_crowded: boolean;
  signal_photo_spot: boolean;
  signal_accessible: boolean;
  signal_parking_ok: boolean;
  bloom_status: string | null;
  visited_at: string | null;
  image_urls: string[];
  anon_session_id: string;
  moderation_status: "visible" | "hidden" | "deleted";
  created_at: string;
}

export interface SpotReport {
  id: string;
  spot_id: string | null;
  spot_name: string;
  flower_type: string | null;
  bloom_status: string | null;
  entry_fee: number | null;
  has_night_light: boolean | null;
  has_parking: boolean | null;
  pet_friendly: boolean | null;
  comment: string | null;
  nickname: string;
  anon_session_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface Vote {
  id: string;
  spot_id: string;
  vote_type: "up" | "down";
  anon_session_id: string;
  device_hash: string | null;
  ip_hash: string | null;
  created_at: string;
}

export interface FlowerSpotWithDetails extends FlowerSpot {
  bloom_status: BloomStatus | null;
  festivals: Festival[];
  vote_up: number;
  vote_down: number;
  review_count: number;
  avg_rating: number | null;
  distance?: number;
}

export interface FlowerSpotMapItem {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  flower_types: FlowerType[];
  category: FlowerCategory;
  bloom_status: BloomStatusValue | null;
  bloom_pct: number | null;
  has_night_light: boolean;
  has_parking: boolean;
  pet_friendly: boolean;
  photo_spot: boolean;
  entry_fee: number;
  vote_up: number;
  vote_down: number;
}

export type PostCategory =
  | "cherry"
  | "plum"
  | "azalea"
  | "rape"
  | "cosmos"
  | "tips"
  | "chat";

export const POST_CATEGORIES: PostCategory[] = [
  "cherry",
  "plum",
  "azalea",
  "rape",
  "cosmos",
  "tips",
  "chat",
];

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  cherry: "벚꽃",
  plum: "매화·봄꽃",
  azalea: "진달래·철쭉",
  rape: "유채꽃",
  cosmos: "코스모스·가을꽃",
  tips: "꽃놀이 팁",
  chat: "자유",
};

export interface Post {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  nickname: string;
  anon_session_id: string;
  moderation_status: "visible" | "hidden" | "deleted";
  comment_count?: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  nickname: string;
  anon_session_id: string;
  moderation_status: "visible" | "hidden" | "deleted";
  created_at: string;
}

export interface FilterState {
  flower_type: FlowerType | "all";
  bloom_status: BloomStatusValue | "all";
  has_night_light: boolean;
  has_parking: boolean;
  pet_friendly: boolean;
  photo_spot: boolean;
  free_only: boolean;
  sort: "recommended" | "distance" | "bloom";
  category: FlowerCategory | "all";
}

export interface ViewportBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}
