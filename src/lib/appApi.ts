"use client";

import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { getDeviceId, getOrCreateSession } from "@/lib/session";
import {
  Comment,
  FlowerSpotMapItem,
  FlowerSpotWithDetails,
  POST_CATEGORIES,
  Post,
  PostCategory,
  SpotReview,
} from "@/types";

const isAit = process.env.NEXT_PUBLIC_TOSS_BUILD === "true";
const DEFAULT_API_BASE_URL = "https://xn--js0bm6bu3m3qo.site";

type JsonObject = Record<string, unknown>;

function getApiBaseUrl() {
  if (!isAit) return "";
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
    DEFAULT_API_BASE_URL
  );
}

function toApiUrl(path: string) {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const response = await fetch(toApiUrl(path), init);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as JsonObject).error === "string"
          ? ((payload as JsonObject).error as string)
          : `${response.status} ${response.statusText}`;

      return {
        data: null,
        error: errorMessage,
        status: response.status,
      };
    }

    return {
      data: payload as T,
      error: null,
      status: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Request failed",
      status: 0,
    };
  }
}

function getSupabaseBrowserClient() {
  return createSupabaseClient();
}

function isPostCategory(value: string | null | undefined): value is PostCategory {
  return !!value && POST_CATEGORIES.includes(value as PostCategory);
}

function getPostCategoryQueryValues(category: string | null): PostCategory[] | null {
  if (!category) return null;
  if (category === "best") return null;
  if (isPostCategory(category)) return [category];
  if (category === "spring") return ["spring", "cherry", "plum", "azalea", "rape"];
  if (category === "summer") return ["summer"];
  if (category === "autumn") return ["autumn", "cosmos"];
  if (category === "winter") return ["winter"];
  if (category === "photo") return ["photo"];
  if (category === "cafe") return ["cafe"];
  if (category === "free") return ["chat"];
  return null;
}

const seasonMonthsMap: Record<string, number[]> = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
};

export async function listCommunityPosts(category?: string, limit = 10) {
  if (!isAit) {
    const query =
      category === "best"
        ? `?category=best&limit=${limit}`
        : category
          ? `?category=${encodeURIComponent(category)}&limit=${limit}`
          : `?limit=${limit}`;
    return fetchJson<Post[]>(`/api/posts${query}`);
  }

  const supabase = getSupabaseBrowserClient();
  const categoryValues = getPostCategoryQueryValues(category ?? null);

  let query = supabase
    .from("posts")
    .select("id, title, content, category, nickname, comment_count, image_urls, created_at")
    .eq("moderation_status", "visible")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category === "best") {
    query = query.gte("comment_count", 5).order("comment_count", { ascending: false });
  } else if (categoryValues?.length === 1) {
    query = query.eq("category", categoryValues[0]);
  } else if (categoryValues && categoryValues.length > 1) {
    query = query.in("category", categoryValues);
  }

  const { data, error, status } = await query;
  return {
    data: (data ?? []) as Post[],
    error: error?.message ?? null,
    status: status ?? (error ? 500 : 200),
  };
}

export async function getCommunityPost(id: string) {
  if (!isAit) {
    return fetchJson<Post>(`/api/posts/${id}`);
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error, status } = await supabase
    .from("posts")
    .select("id, title, content, category, nickname, comment_count, image_urls, created_at")
    .eq("id", id)
    .eq("moderation_status", "visible")
    .single();

  return {
    data: (data as Post | null) ?? null,
    error: error?.message ?? null,
    status: status ?? (error ? 500 : 200),
  };
}

export async function listCommunityComments(postId: string) {
  if (!isAit) {
    return fetchJson<Comment[]>(`/api/comments?post_id=${encodeURIComponent(postId)}`);
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error, status } = await supabase
    .from("comments")
    .select("id, post_id, parent_id, content, nickname, anon_session_id, device_hash, moderation_status, created_at")
    .eq("post_id", postId)
    .eq("moderation_status", "visible")
    .order("created_at", { ascending: true })
    .limit(100);

  return {
    data: (data ?? []) as Comment[],
    error: error?.message ?? null,
    status: status ?? (error ? 500 : 200),
  };
}

export async function createCommunityPost(payload: {
  title: string;
  content: string;
  category: PostCategory;
  password: string;
  anon_session_id: string;
  device_id?: string;
  nickname?: string;
  image_urls?: string[];
}) {
  return fetchJson<Post>("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function verifyCommunityPostPassword(id: string, password: string) {
  return fetchJson<{ ok: boolean }>(`/api/posts/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

export async function updateCommunityPost(
  id: string,
  payload: {
    title: string;
    content: string;
    category: PostCategory;
    nickname?: string;
    password: string;
  },
) {
  return fetchJson<Post>(`/api/posts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteCommunityPost(id: string, password: string) {
  return fetchJson<{ ok: boolean }>(`/api/posts/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

export async function createCommunityComment(payload: {
  post_id: string;
  parent_id?: string | null;
  content: string;
  anon_session_id: string;
  device_id?: string;
  nickname?: string;
}) {
  return fetchJson<Comment>("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function uploadAppImage(
  file: File,
  folder: "community" | "reports" | "spot-reviews",
) {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJson<{ url: string }>(`/api/upload?folder=${folder}`, {
    method: "POST",
    body: formData,
  });
}

export async function listMapSpots(params: {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  category?: string;
  flowerType?: string;
  bloomStatus?: string;
  season?: string;
  peakMonth?: string;
  festival?: string;
  hasNightLight?: boolean;
  hasParking?: boolean;
  petFriendly?: boolean;
  photoSpot?: boolean;
  freeOnly?: boolean;
  sort?: "recommended" | "distance" | "bloom";
  limit?: number;
}): Promise<{
  data: { spots: FlowerSpotMapItem[]; meta: { zoomHint: string | null } } | null;
  error: string | null;
  status: number;
}> {
  if (!isAit) {
    const searchParams = new URLSearchParams({
      swLat: String(params.swLat),
      swLng: String(params.swLng),
      neLat: String(params.neLat),
      neLng: String(params.neLng),
      sort: params.sort ?? "recommended",
      category: params.category ?? "all",
      flower_type: params.flowerType ?? "all",
      bloom_status: params.bloomStatus ?? "all",
      season: params.season ?? "all",
      peak_month: params.peakMonth ?? "all",
      festival: params.festival ?? "all",
      has_night_light: String(Boolean(params.hasNightLight)),
      has_parking: String(Boolean(params.hasParking)),
      pet_friendly: String(Boolean(params.petFriendly)),
      photo_spot: String(Boolean(params.photoSpot)),
      free_only: String(Boolean(params.freeOnly)),
    });
    return fetchJson<{ spots: FlowerSpotMapItem[]; meta: { zoomHint: string | null } }>(
      `/api/gyms?${searchParams.toString()}`,
    );
  }

  const { swLat, swLng, neLat, neLng, category, flowerType, bloomStatus, season, peakMonth, festival, hasNightLight, hasParking, petFriendly, photoSpot, freeOnly, sort = "recommended", limit = 150 } = params;

  const area = Math.abs(neLat - swLat) * Math.abs(neLng - swLng);
  if (area > 1.8) {
    return {
      data: { spots: [], meta: { zoomHint: "지도를 더 확대해 주세요." } },
      error: null,
      status: 200,
    };
  }

  const supabase = getSupabaseBrowserClient();
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("flower_spots")
    .select(`
      id, name, address, lat, lng, flower_types, category,
      has_night_light, has_parking, pet_friendly, photo_spot, entry_fee,
      peak_month_start, peak_month_end, vote_up, vote_down, cover_image_url,
      festivals!left ( id, name, start_date, end_date ),
      bloom_status!left ( status, bloom_pct, year )
    `)
    .gte("lat", swLat)
    .lte("lat", neLat)
    .gte("lng", swLng)
    .lte("lng", neLng)
    .limit(limit * 2);

  if (category && category !== "all") query = query.eq("category", category);
  if (hasNightLight) query = query.eq("has_night_light", true);
  if (hasParking) query = query.eq("has_parking", true);
  if (petFriendly) query = query.eq("pet_friendly", true);
  if (photoSpot) query = query.eq("photo_spot", true);
  if (freeOnly) query = query.eq("entry_fee", 0);
  if (flowerType && flowerType !== "all") query = query.contains("flower_types", [flowerType]);
  if (season && season !== "all") {
    const months = seasonMonthsMap[season] ?? [];
    if (months.length > 0) {
      if (season === "winter") {
        query = query.or("peak_month_start.gte.12,peak_month_end.lte.2,and(peak_month_start.lte.2,peak_month_end.gte.1)");
      } else {
        const [s, e] = [Math.min(...months), Math.max(...months)];
        query = query.lte("peak_month_start", e).gte("peak_month_end", s);
      }
    }
  }
  if (peakMonth && peakMonth !== "all") {
    const m = Number(peakMonth);
    query = query.lte("peak_month_start", m).gte("peak_month_end", m);
  }

  const { data: rawSpots, error, status } = await query;
  if (error || !rawSpots) {
    return { data: null, error: error?.message ?? "Failed to fetch spots", status: status ?? 500 };
  }

  const bloomSortOrder: Record<string, number> = {
    peak: 0,
    blooming: 1,
    falling: 2,
    budding: 3,
    before: 4,
    done: 5,
  };

  let spots: FlowerSpotMapItem[] = rawSpots.map((spot) => {
    const bloomRows = (spot.bloom_status as Array<{ status: string; bloom_pct: number | null; year: number }> | null) ?? [];
    const festivalRows = (spot.festivals as Array<{ id: string; name: string; start_date: string | null; end_date: string | null }> | null) ?? [];
    const currentBloom = bloomRows.find((row) => row.year === currentYear);
    const hasActiveFestival = festivalRows.some((row) => {
      const startsOk = !row.start_date || row.start_date <= today;
      const endsOk = !row.end_date || row.end_date >= today;
      return startsOk && endsOk;
    });

    return {
      id: spot.id,
      name: spot.name,
      address: spot.address,
      lat: spot.lat,
      lng: spot.lng,
      flower_types: spot.flower_types ?? [],
      category: spot.category,
      bloom_status: (currentBloom?.status as FlowerSpotMapItem["bloom_status"]) ?? null,
      bloom_pct: currentBloom?.bloom_pct ?? null,
      has_night_light: spot.has_night_light,
      has_parking: spot.has_parking,
      pet_friendly: spot.pet_friendly,
      photo_spot: spot.photo_spot,
      entry_fee: spot.entry_fee,
      vote_up: spot.vote_up ?? 0,
      vote_down: spot.vote_down ?? 0,
      festival_count: festivalRows.length,
      has_active_festival: hasActiveFestival,
      cover_image_url: spot.cover_image_url ?? null,
    };
  });

  if (bloomStatus && bloomStatus !== "all") {
    spots = spots.filter((spot) => spot.bloom_status === bloomStatus);
  }
  if (festival === "only") {
    spots = spots.filter((spot) => spot.festival_count > 0);
  }

  const compareFestival = (a: FlowerSpotMapItem, b: FlowerSpotMapItem) => {
    if (a.has_active_festival !== b.has_active_festival) {
      return Number(b.has_active_festival) - Number(a.has_active_festival);
    }
    return b.festival_count - a.festival_count;
  };

  spots.sort((a, b) => {
    const festivalCompare = compareFestival(a, b);
    if (festivalCompare !== 0) return festivalCompare;
    if (sort === "bloom") {
      return (
        (bloomSortOrder[a.bloom_status ?? "done"] ?? 99) -
        (bloomSortOrder[b.bloom_status ?? "done"] ?? 99)
      );
    }
    return (b.vote_up - b.vote_down) - (a.vote_up - a.vote_down);
  });

  return {
    data: { spots: spots.slice(0, limit), meta: { zoomHint: null } },
    error: null,
    status: 200,
  };
}

export async function searchSpotsByName(query: string) {
  if (!isAit) {
    return fetchJson<{ spots: FlowerSpotMapItem[] }>(
      `/api/gyms?q=${encodeURIComponent(query.trim())}`,
    );
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { data: { spots: [] }, error: null, status: 200 };
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error, status } = await supabase
    .from("flower_spots")
    .select("id, name, address, lat, lng, flower_types, category, has_night_light, has_parking, pet_friendly, photo_spot, entry_fee")
    .ilike("name", `%${trimmed}%`)
    .limit(12);

  if (error) {
    return { data: null, error: error.message, status: status ?? 500 };
  }

  return {
    data: {
      spots: (data ?? []).map((spot) => ({
        ...spot,
        flower_types: spot.flower_types ?? [],
        bloom_status: null,
        bloom_pct: null,
        vote_up: 0,
        vote_down: 0,
        festival_count: 0,
        has_active_festival: false,
        cover_image_url: null,
      })),
    },
    error: null,
    status: status ?? 200,
  };
}

export async function getSpotDetail(id: string) {
  if (!isAit) {
    return fetchJson<FlowerSpotWithDetails>(`/api/gyms/${id}`);
  }

  const supabase = getSupabaseBrowserClient();
  const currentYear = new Date().getFullYear();
  const { data: spot, error, status } = await supabase
    .from("flower_spots")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !spot) {
    return { data: null, error: error?.message ?? "Spot not found", status: status ?? 404 };
  }

  const [{ data: bloomRows }, { data: festivals }, { data: votes }, { data: reviews }, { data: approvedReports }] =
    await Promise.all([
      supabase.from("bloom_status").select("*").eq("spot_id", id).eq("year", currentYear).order("created_at", { ascending: false }).limit(1),
      supabase.from("festivals").select("*").eq("spot_id", id).order("start_date", { ascending: true }),
      supabase.from("votes").select("vote_type").eq("spot_id", id),
      supabase.from("spot_reviews").select("rating").eq("spot_id", id).eq("moderation_status", "visible"),
      supabase.from("spot_reports").select("image_urls, created_at").eq("spot_id", id).eq("status", "approved").order("created_at", { ascending: false }).limit(20),
    ]);

  const voteUp = (votes ?? []).filter((vote) => vote.vote_type === "up").length;
  const voteDown = (votes ?? []).filter((vote) => vote.vote_type === "down").length;
  const ratedReviews = (reviews ?? []).filter((review) => review.rating != null);
  const avgRating =
    ratedReviews.length > 0
      ? ratedReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) /
        ratedReviews.length
      : null;

  return {
    data: {
      ...spot,
      bloom_status: (bloomRows?.[0] ?? null) as FlowerSpotWithDetails["bloom_status"],
      festivals: festivals ?? [],
      report_image_urls: (approvedReports ?? [])
        .flatMap((row) => (row.image_urls as string[] | null) ?? [])
        .filter(Boolean),
      vote_up: voteUp,
      vote_down: voteDown,
      review_count: (reviews ?? []).length,
      avg_rating: avgRating,
    } as FlowerSpotWithDetails,
    error: null,
    status: 200,
  };
}

export async function listFestivals() {
  if (!isAit) {
    return fetchJson<unknown[]>("/api/festivals");
  }

  const supabase = getSupabaseBrowserClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error, status } = await supabase
    .from("festivals")
    .select("id, name, start_date, end_date, description, source_url, flower_spots ( id, name, address, lat, lng )")
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order("start_date", { ascending: true })
    .limit(80);

  return {
    data: data ?? [],
    error: error?.message ?? null,
    status: status ?? (error ? 500 : 200),
  };
}

export async function listSpotReviews(spotId: string, limit = 12, offset = 0) {
  if (!isAit) {
    return fetchJson<SpotReview[]>(`/api/reviews?spot_id=${encodeURIComponent(spotId)}&limit=${limit}&offset=${offset}`);
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error, status } = await supabase
    .from("spot_reviews")
    .select("id, spot_id, content, nickname, rating, signal_crowded, signal_photo_spot, signal_accessible, signal_parking_ok, bloom_status, visited_at, image_urls, moderation_status, created_at")
    .eq("spot_id", spotId)
    .eq("moderation_status", "visible")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return {
    data: (data ?? []) as SpotReview[],
    error: error?.message ?? null,
    status: status ?? (error ? 500 : 200),
  };
}

export async function createSpotReview(payload: {
  spot_id: string;
  content?: string;
  anon_session_id: string;
  device_id?: string;
  nickname?: string;
  rating?: number | null;
  signal_crowded?: boolean;
  signal_photo_spot?: boolean;
  signal_accessible?: boolean;
  signal_parking_ok?: boolean;
  bloom_status?: string;
  visited_at?: string;
  image_urls?: string[];
  password?: string;
}) {
  return fetchJson<SpotReview>("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteSpotReview(review_id: string, password: string) {
  const { sessionId } = getOrCreateSession();
  const deviceId = await getDeviceId();
  return fetchJson<{ ok: boolean } | SpotReview>("/api/reviews", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      review_id,
      password,
      anon_session_id: sessionId,
      device_id: deviceId,
    }),
  });
}

export async function voteSpot(payload: {
  spot_id: string;
  vote_type: "up" | "down";
  anon_session_id: string;
  device_id?: string;
  nickname?: string;
}) {
  return fetchJson<{ ok: boolean }>("/api/votes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function createSpotReport(payload: {
  spot_id?: string | null;
  spot_name: string;
  flower_type?: string | null;
  bloom_status?: string | null;
  entry_fee?: number | null;
  has_night_light?: boolean | null;
  has_parking?: boolean | null;
  pet_friendly?: boolean | null;
  comment?: string | null;
  image_urls?: string[];
  anon_session_id: string;
  device_id?: string;
  nickname?: string;
}) {
  return fetchJson<JsonObject>("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
