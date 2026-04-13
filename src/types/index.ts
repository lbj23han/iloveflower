export type FlowerCategory =
  | "park"
  | "mountain"
  | "river"
  | "botanical"
  | "street"
  | "temple"
  | "farm"
  | "cafe"
  | "etc";

export const CATEGORY_LABELS: Record<FlowerCategory, string> = {
  park: "공원",
  mountain: "산",
  river: "강변/호수",
  botanical: "수목원/식물원",
  street: "가로수길",
  temple: "사찰",
  farm: "농장/체험",
  cafe: "카페",
  etc: "기타",
};

export type FlowerType =
  | "cherry"
  | "plum"
  | "forsythia"
  | "azalea"
  | "magnolia"
  | "wisteria"
  | "tulip"
  | "rape"
  | "peony"
  | "peach"
  | "peachblossom"
  | "phlox"
  | "rose"
  | "sunflower"
  | "lavender"
  | "hydrangea"
  | "lotus"
  | "morningglory"
  | "babysbreath"
  | "zinnia"
  | "neungsohwa"
  | "pomegranateblossom"
  | "cosmos"
  | "foliage"
  | "silvergrass"
  | "pinkmuhly"
  | "buckwheat"
  | "mossrose"
  | "aconite"
  | "chuhaedang"
  | "chrysanthemum"
  | "camellia"
  | "narcissus"
  | "clivia"
  | "cyclamen"
  | "adonis"
  | "christmasrose"
  | "snowflower"
  | "etc";

export const FLOWER_TYPE_LABELS: Record<FlowerType, string> = {
  cherry: "벚꽃",
  plum: "매화",
  forsythia: "개나리",
  azalea: "진달래·철쭉",
  magnolia: "목련",
  wisteria: "등나무",
  tulip: "튤립",
  rape: "유채꽃",
  peony: "작약",
  peach: "복숭아꽃",
  peachblossom: "복숭아꽃",
  phlox: "꽃잔디",
  rose: "장미",
  sunflower: "해바라기",
  lavender: "라벤더",
  hydrangea: "수국",
  lotus: "연꽃",
  morningglory: "나팔꽃",
  babysbreath: "안개꽃",
  zinnia: "백일홍",
  neungsohwa: "능소화",
  pomegranateblossom: "석류꽃",
  cosmos: "코스모스",
  foliage: "단풍",
  silvergrass: "억새",
  pinkmuhly: "핑크뮬리",
  buckwheat: "메밀꽃",
  mossrose: "채송화",
  aconite: "투구꽃",
  chuhaedang: "추해당",
  chrysanthemum: "국화·구절초",
  camellia: "동백꽃",
  narcissus: "수선화",
  clivia: "군자란",
  cyclamen: "시클라멘",
  adonis: "복수초",
  christmasrose: "크리스마스로즈",
  snowflower: "눈꽃",
  etc: "기타",
};

// 계절별 꽃 타입 그룹
export const SEASON_FLOWER_TYPES: Record<string, FlowerType[]> = {
  spring: [
    "cherry",
    "forsythia",
    "azalea",
    "magnolia",
    "tulip",
    "rape",
    "peony",
    "peach",
    "phlox",
    "plum",
    "wisteria",
  ],
  summer: [
    "rose",
    "sunflower",
    "lotus",
    "hydrangea",
    "morningglory",
    "babysbreath",
    "zinnia",
    "neungsohwa",
    "pomegranateblossom",
    "lavender",
  ],
  autumn: [
    "cosmos",
    "foliage",
    "silvergrass",
    "pinkmuhly",
    "buckwheat",
    "mossrose",
    "aconite",
    "chuhaedang",
    "chrysanthemum",
  ],
  winter: [
    "camellia",
    "narcissus",
    "plum",
    "clivia",
    "cyclamen",
    "adonis",
    "christmasrose",
    "snowflower",
  ],
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

export type SeasonFilter = "all" | "spring" | "summer" | "autumn" | "winter";

export const SEASON_FILTER_LABELS: Record<SeasonFilter, string> = {
  all: "전체",
  spring: "봄",
  summer: "여름",
  autumn: "가을",
  winter: "겨울",
};

export const PEAK_MONTH_LABELS: Record<number, string> = {
  1: "1월",
  2: "2월",
  3: "3월",
  4: "4월",
  5: "5월",
  6: "6월",
  7: "7월",
  8: "8월",
  9: "9월",
  10: "10월",
  11: "11월",
  12: "12월",
};

export type FestivalFilter = "all" | "only";

export const FESTIVAL_FILTER_LABELS: Record<FestivalFilter, string> = {
  all: "전체",
  only: "축제",
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
  cover_image_url?: string | null;
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
  image_urls: string[];
  nickname: string;
  anon_session_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  flower_spots?: { name: string; address: string | null; cover_image_url?: string | null } | null;
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
  report_image_urls: string[];
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
  festival_count: number;
  has_active_festival: boolean;
  cover_image_url?: string | null;
}

export type PostCategory =
  | "spring"
  | "summer"
  | "autumn"
  | "winter"
  | "photo"
  | "cafe"
  | "cherry"
  | "plum"
  | "azalea"
  | "rape"
  | "cosmos"
  | "tips"
  | "chat";

export const POST_CATEGORIES: PostCategory[] = [
  "spring",
  "summer",
  "autumn",
  "winter",
  "photo",
  "cafe",
  "cherry",
  "plum",
  "azalea",
  "rape",
  "cosmos",
  "tips",
  "chat",
];

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  spring: "봄꽃",
  summer: "여름꽃",
  autumn: "가을꽃",
  winter: "겨울꽃",
  photo: "인생샷",
  cafe: "인생카페",
  cherry: "벚꽃",
  plum: "봄꽃",
  azalea: "봄꽃",
  rape: "봄꽃",
  cosmos: "가을꽃",
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
  device_hash: string | null;
  moderation_status: "visible" | "hidden" | "deleted";
  comment_count?: number;
  image_urls: string[];
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
  season: SeasonFilter;
  peak_month: number | "all";
  festival: FestivalFilter;
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
