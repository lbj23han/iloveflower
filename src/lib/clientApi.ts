'use client';

/**
 * clientApi.ts
 * TOSS_BUILD 시 API routes 대신 브라우저 Supabase 클라이언트를 직접 사용.
 * 서버 측 rate limiting / scrypt 비밀번호 해싱은 생략 (Supabase RLS 위임).
 */

import { createClient } from '@/lib/supabase/client';
import {
  FlowerSpotMapItem,
  FlowerSpotWithDetails,
  POST_CATEGORIES,
  PostCategory,
  SpotReview,
} from '@/types';

// ─── Spots ────────────────────────────────────────────────────────────────

export async function getSpotMapItemsByBoundsClient(params: {
  swLat: number; swLng: number; neLat: number; neLng: number;
  category?: string; flowerType?: string; bloomStatus?: string;
  season?: string; peakMonth?: string; festival?: string;
  hasNightLight?: boolean; hasParking?: boolean; petFriendly?: boolean;
  photoSpot?: boolean; freeOnly?: boolean;
  sort?: 'recommended' | 'distance' | 'bloom';
  limit?: number;
}): Promise<{ spots: FlowerSpotMapItem[]; meta: { zoomHint: string | null } }> {
  const { swLat, swLng, neLat, neLng, category, flowerType, bloomStatus,
    season, peakMonth, festival, hasNightLight, hasParking, petFriendly,
    photoSpot, freeOnly, sort = 'recommended', limit = 150 } = params;

  const area = Math.abs(neLat - swLat) * Math.abs(neLng - swLng);
  if (area > 1.8) {
    return { spots: [], meta: { zoomHint: '지도를 더 확대해 주세요.' } };
  }

  const supabase = createClient();
  const currentYear = new Date().getFullYear();
  const seasonMonthsMap: Record<string, number[]> = {
    spring: [3, 4, 5], summer: [6, 7, 8], autumn: [9, 10, 11], winter: [12, 1, 2],
  };

  let query = supabase
    .from('flower_spots')
    .select(`
      id, name, address, lat, lng, flower_types, category,
      has_night_light, has_parking, pet_friendly, photo_spot, entry_fee,
      peak_month_start, peak_month_end, vote_up, vote_down, cover_image_url,
      festivals!left ( id, name, start_date, end_date ),
      bloom_status!left ( status, bloom_pct, year )
    `)
    .gte('lat', swLat).lte('lat', neLat)
    .gte('lng', swLng).lte('lng', neLng)
    .limit(limit * 2);

  if (category && category !== 'all') query = query.eq('category', category);
  if (hasNightLight) query = query.eq('has_night_light', true);
  if (hasParking) query = query.eq('has_parking', true);
  if (petFriendly) query = query.eq('pet_friendly', true);
  if (photoSpot) query = query.eq('photo_spot', true);
  if (freeOnly) query = query.eq('entry_fee', 0);
  if (flowerType && flowerType !== 'all') query = query.contains('flower_types', [flowerType]);
  if (season && season !== 'all') {
    const months = seasonMonthsMap[season] ?? [];
    if (months.length > 0) {
      if (season === 'winter') {
        query = query.or('peak_month_start.gte.12,peak_month_end.lte.2,and(peak_month_start.lte.2,peak_month_end.gte.1)');
      } else {
        const [s, e] = [Math.min(...months), Math.max(...months)];
        query = query.lte('peak_month_start', e).gte('peak_month_end', s);
      }
    }
  }
  if (peakMonth && peakMonth !== 'all') {
    const m = Number(peakMonth);
    query = query.lte('peak_month_start', m).gte('peak_month_end', m);
  }

  const { data: rawSpots, error } = await query;
  if (error || !rawSpots) return { spots: [], meta: { zoomHint: null } };

  const BLOOM_SORT_ORDER: Record<string, number> = {
    peak: 0, blooming: 1, falling: 2, budding: 3, before: 4, done: 5,
  };
  const today = new Date().toISOString().slice(0, 10);

  let result: FlowerSpotMapItem[] = rawSpots.map((spot) => {
    const bloomRows = (spot.bloom_status as Array<{ status: string; bloom_pct: number | null; year: number }> | null) ?? [];
    const festivalRows = (spot.festivals as Array<{ id: string; name: string; start_date: string | null; end_date: string | null }> | null) ?? [];
    const currentBloom = bloomRows.find((b) => b.year === currentYear);
    const hasActiveFestival = festivalRows.some((f) => {
      const startsOk = !f.start_date || f.start_date <= today;
      const endsOk = !f.end_date || f.end_date >= today;
      return startsOk && endsOk;
    });
    return {
      id: spot.id, name: spot.name, address: spot.address,
      lat: spot.lat, lng: spot.lng,
      flower_types: spot.flower_types ?? [], category: spot.category,
      bloom_status: (currentBloom?.status as FlowerSpotMapItem['bloom_status']) ?? null,
      bloom_pct: currentBloom?.bloom_pct ?? null,
      has_night_light: spot.has_night_light, has_parking: spot.has_parking,
      pet_friendly: spot.pet_friendly, photo_spot: spot.photo_spot,
      entry_fee: spot.entry_fee, vote_up: spot.vote_up ?? 0, vote_down: spot.vote_down ?? 0,
      festival_count: festivalRows.length, has_active_festival: hasActiveFestival,
      cover_image_url: spot.cover_image_url ?? null,
    };
  });

  if (bloomStatus && bloomStatus !== 'all') result = result.filter((s) => s.bloom_status === bloomStatus);
  if (festival === 'only') result = result.filter((s) => s.festival_count > 0);

  const compareFestival = (a: FlowerSpotMapItem, b: FlowerSpotMapItem) => {
    if (a.has_active_festival !== b.has_active_festival) return Number(b.has_active_festival) - Number(a.has_active_festival);
    return b.festival_count - a.festival_count;
  };

  result.sort((a, b) => {
    const fc = compareFestival(a, b);
    if (fc !== 0) return fc;
    if (sort === 'bloom') {
      return (BLOOM_SORT_ORDER[a.bloom_status ?? 'done'] ?? 99) - (BLOOM_SORT_ORDER[b.bloom_status ?? 'done'] ?? 99);
    }
    return (b.vote_up - b.vote_down) - (a.vote_up - a.vote_down);
  });

  return { spots: result.slice(0, limit), meta: { zoomHint: null } };
}

export async function searchSpotsByNameClient(query: string): Promise<{ spots: FlowerSpotMapItem[] }> {
  const trimmed = query.trim();
  if (!trimmed) return { spots: [] };
  const supabase = createClient();
  const { data, error } = await supabase
    .from('flower_spots')
    .select('id, name, address, lat, lng, flower_types, category, has_night_light, has_parking, pet_friendly, photo_spot, entry_fee')
    .ilike('name', `%${trimmed}%`)
    .limit(12);
  if (error || !data) return { spots: [] };
  return {
    spots: data.map((s) => ({
      ...s, flower_types: s.flower_types ?? [],
      bloom_status: null, bloom_pct: null,
      vote_up: 0, vote_down: 0, festival_count: 0,
      has_active_festival: false, cover_image_url: null,
    })),
  };
}

export async function getSpotDetailByIdClient(id: string): Promise<FlowerSpotWithDetails | null> {
  const supabase = createClient();
  const currentYear = new Date().getFullYear();

  const { data: spot } = await supabase.from('flower_spots').select('*').eq('id', id).single();
  if (!spot) return null;

  const [
    { data: bloomRows },
    { data: festivals },
    { data: votes },
    { data: reviews },
    { data: approvedReports },
  ] = await Promise.all([
    supabase.from('bloom_status').select('*').eq('spot_id', id).eq('year', currentYear).order('created_at', { ascending: false }).limit(1),
    supabase.from('festivals').select('*').eq('spot_id', id).order('start_date', { ascending: true }),
    supabase.from('votes').select('vote_type').eq('spot_id', id),
    supabase.from('spot_reviews').select('rating').eq('spot_id', id).eq('moderation_status', 'visible'),
    supabase.from('spot_reports').select('image_urls, created_at').eq('spot_id', id).eq('status', 'approved').order('created_at', { ascending: false }).limit(20),
  ]);

  const voteUp = (votes ?? []).filter((v) => v.vote_type === 'up').length;
  const voteDown = (votes ?? []).filter((v) => v.vote_type === 'down').length;
  const ratedReviews = (reviews ?? []).filter((r) => r.rating != null);
  const avgRating = ratedReviews.length > 0
    ? ratedReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratedReviews.length
    : null;

  return {
    ...spot,
    bloom_status: (bloomRows?.[0] ?? null) as FlowerSpotWithDetails['bloom_status'],
    festivals: festivals ?? [],
    report_image_urls: (approvedReports ?? []).flatMap((row) => (row.image_urls as string[] | null) ?? []).filter(Boolean),
    vote_up: voteUp, vote_down: voteDown,
    review_count: (reviews ?? []).length, avg_rating: avgRating,
  };
}

// ─── Posts ────────────────────────────────────────────────────────────────

function isPostCategory(value: string | null): value is PostCategory {
  return !!value && POST_CATEGORIES.includes(value as PostCategory);
}

function sanitizePost<T extends { post_password_hash?: string | null }>(post: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { post_password_hash, ...safePost } = post;
  return safePost;
}

function getPostCategoryQueryValues(category: string | null): PostCategory[] | null {
  if (!category) return null;
  if (category === 'best') return null;
  if (isPostCategory(category)) return [category];
  if (category === 'spring') return ['spring', 'cherry', 'plum', 'azalea', 'rape'];
  if (category === 'summer') return ['summer'];
  if (category === 'autumn') return ['autumn', 'cosmos'];
  if (category === 'winter') return ['winter'];
  if (category === 'photo') return ['photo'];
  if (category === 'cafe') return ['cafe'];
  if (category === 'free') return ['chat'];
  return null;
}

export async function getPostsClient(category?: string): Promise<unknown[]> {
  const supabase = createClient();
  const categoryValues = getPostCategoryQueryValues(category ?? null);

  let query = supabase
    .from('posts')
    .select('id, title, content, category, nickname, anon_session_id, device_hash, comment_count, image_urls, created_at, moderation_status')
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(50);

  if (category === 'best') {
    query = query.gte('comment_count', 5).order('comment_count', { ascending: false });
  } else if (categoryValues?.length === 1) {
    query = query.eq('category', categoryValues[0]);
  } else if (categoryValues && categoryValues.length > 1) {
    query = query.in('category', categoryValues);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getPostByIdClient(id: string): Promise<unknown | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('moderation_status', 'visible')
    .single();
  return data ? sanitizePost(data) : null;
}

export async function createPostClient(body: {
  title: string; content: string; category: string;
  anon_session_id: string; device_id?: string; nickname?: string;
  image_urls?: string[];
}): Promise<{ data: unknown | null; error: string | null }> {
  const { title, content, category, anon_session_id, device_id, nickname, image_urls } = body;

  if (!title.trim() || !content.trim()) return { data: null, error: '제목과 내용을 입력해주세요.' };
  if (title.length > 80) return { data: null, error: '제목은 80자 이내로 작성해주세요.' };
  if (content.length > 500) return { data: null, error: '내용은 500자 이내로 작성해주세요.' };

  const supabase = createClient();
  const normalizedCategory = isPostCategory(category) ? category : 'chat';
  const safeImageUrls = Array.isArray(image_urls)
    ? image_urls.filter((u: unknown) => typeof u === 'string').slice(0, 4)
    : [];

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: title.trim(), content: content.trim(), category: normalizedCategory,
      nickname: nickname ?? '익명', anon_session_id,
      device_hash: device_id ?? null,
      moderation_status: 'visible', image_urls: safeImageUrls, comment_count: 0,
    })
    .select()
    .single();

  if (error || !data) return { data: null, error: '글 저장에 실패했습니다.' };
  return { data: { ...sanitizePost(data), comment_count: 0 }, error: null };
}

// ─── Comments ─────────────────────────────────────────────────────────────

export async function getCommentsClient(postId: string): Promise<unknown[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: true })
    .limit(100);
  return data ?? [];
}

export async function createCommentClient(body: {
  post_id: string; parent_id?: string; content: string;
  anon_session_id: string; device_id?: string; nickname?: string;
}): Promise<{ data: unknown | null; error: string | null }> {
  const { post_id, parent_id, content, anon_session_id, device_id, nickname } = body;
  if (!content.trim()) return { data: null, error: '내용을 입력해주세요.' };
  if (content.length > 200) return { data: null, error: '200자 이내로 작성해주세요.' };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id, parent_id: parent_id ?? null,
      content: content.trim(), nickname: nickname ?? '익명',
      anon_session_id, device_hash: device_id ?? null,
      moderation_status: 'visible',
    })
    .select()
    .single();

  if (error || !data) return { data: null, error: '댓글 저장에 실패했습니다.' };
  return { data, error: null };
}

// ─── Reviews ──────────────────────────────────────────────────────────────

export async function getReviewsClient(
  spotId: string, limit = 12, offset = 0,
): Promise<SpotReview[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('spot_reviews')
    .select('id, spot_id, content, nickname, rating, signal_crowded, signal_photo_spot, signal_accessible, signal_parking_ok, bloom_status, visited_at, image_urls, moderation_status, created_at')
    .eq('spot_id', spotId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return (data ?? []) as SpotReview[];
}

export async function createReviewClient(body: {
  spot_id: string; content?: string; anon_session_id: string; device_id?: string;
  nickname?: string; rating?: number | null;
  signal_crowded?: boolean; signal_photo_spot?: boolean;
  signal_accessible?: boolean; signal_parking_ok?: boolean;
  bloom_status?: string; visited_at?: string; image_urls?: string[];
}): Promise<{ data: SpotReview | null; error: string | null }> {
  const supabase = createClient();
  const safeRating =
    typeof body.rating === 'number' && Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5
      ? body.rating : null;

  // 중복 방지
  const dupQuery = body.device_id
    ? supabase.from('spot_reviews').select('id').eq('spot_id', body.spot_id).eq('device_hash', body.device_id).limit(1)
    : supabase.from('spot_reviews').select('id').eq('spot_id', body.spot_id).eq('anon_session_id', body.anon_session_id).limit(1);
  const { data: existing } = await dupQuery;
  if (existing && existing.length > 0) return { data: null, error: '이 장소에는 이미 후기를 남겼어요.' };

  const { data, error } = await supabase
    .from('spot_reviews')
    .insert({
      spot_id: body.spot_id,
      content: body.content?.trim() ?? null,
      nickname: body.nickname ?? '익명',
      rating: safeRating,
      signal_crowded: Boolean(body.signal_crowded),
      signal_photo_spot: Boolean(body.signal_photo_spot),
      signal_accessible: Boolean(body.signal_accessible),
      signal_parking_ok: Boolean(body.signal_parking_ok),
      bloom_status: body.bloom_status ?? null,
      visited_at: body.visited_at ?? null,
      image_urls: body.image_urls ?? [],
      anon_session_id: body.anon_session_id,
      device_hash: body.device_id ?? null,
      moderation_status: 'visible',
    })
    .select('id, spot_id, content, nickname, rating, signal_crowded, signal_photo_spot, signal_accessible, signal_parking_ok, bloom_status, visited_at, image_urls, moderation_status, created_at')
    .single();

  if (error || !data) return { data: null, error: '후기 저장에 실패했습니다.' };
  return { data: data as SpotReview, error: null };
}

// ─── Votes ────────────────────────────────────────────────────────────────

export async function voteClient(body: {
  spot_id: string; vote_type: 'up' | 'down'; anon_session_id: string; device_id?: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('votes').select('id')
    .eq('spot_id', body.spot_id).eq('anon_session_id', body.anon_session_id).limit(1);
  if (existing && existing.length > 0) return { ok: false, error: '이미 투표하셨습니다.' };

  const { error } = await supabase.from('votes').insert({
    spot_id: body.spot_id, vote_type: body.vote_type,
    anon_session_id: body.anon_session_id, device_hash: body.device_id ?? null,
  });
  if (error) return { ok: false, error: '투표 저장에 실패했습니다.' };
  return { ok: true, error: null };
}

// ─── Festivals ────────────────────────────────────────────────────────────

export async function getFestivalsClient(): Promise<unknown[]> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('festivals')
    .select(`id, name, start_date, end_date, description, source_url, flower_spots ( id, name, address, lat, lng )`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('start_date', { ascending: true })
    .limit(80);
  return data ?? [];
}

// ─── Reports ──────────────────────────────────────────────────────────────

export async function createReportClient(body: {
  spot_id?: string; spot_name: string; flower_type?: string;
  bloom_status?: string; entry_fee?: number; has_night_light?: boolean;
  has_parking?: boolean; pet_friendly?: boolean; comment?: string;
  image_urls?: string[]; anon_session_id: string; device_id?: string; nickname?: string;
}): Promise<{ ok: boolean; error: string | null }> {
  if (!body.spot_name?.trim()) return { ok: false, error: '장소 이름을 입력해주세요.' };
  const supabase = createClient();
  const { error } = await supabase.from('spot_reports').insert({
    spot_id: body.spot_id ?? null, spot_name: body.spot_name.trim(),
    flower_type: body.flower_type ?? null, bloom_status: body.bloom_status ?? null,
    entry_fee: body.entry_fee ?? null, has_night_light: body.has_night_light ?? null,
    has_parking: body.has_parking ?? null, pet_friendly: body.pet_friendly ?? null,
    comment: body.comment?.trim() ?? null,
    image_urls: Array.isArray(body.image_urls) ? body.image_urls.slice(0, 5) : [],
    nickname: body.nickname ?? '익명',
    anon_session_id: body.anon_session_id, device_hash: body.device_id ?? null,
    status: 'pending',
  });
  if (error) return { ok: false, error: '제보 저장에 실패했습니다.' };
  return { ok: true, error: null };
}

// ─── Upload ───────────────────────────────────────────────────────────────

export async function uploadImageClient(
  file: File,
  folder: 'community' | 'reports' | 'spot-reviews',
): Promise<{ url: string | null; error: string | null }> {
  const BUCKET = 'post-images';
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED_TYPES.includes(file.type)) return { url: null, error: '지원하지 않는 이미지 형식입니다.' };
  if (file.size > 5 * 1024 * 1024) return { url: null, error: '5MB 이하 이미지만 업로드 가능합니다.' };

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${folder}/${filename}`;

  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { url: null, error: '업로드에 실패했습니다.' };

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: publicUrl, error: null };
}
