import { createClient } from '@/lib/supabase/server';
import { FlowerSpotMapItem, FlowerSpotWithDetails } from '@/types';

export async function getSpotMapItemsByBounds({
  swLat,
  swLng,
  neLat,
  neLng,
  category,
  flowerType,
  bloomStatus,
  season,
  peakMonth,
  festival,
  hasNightLight,
  hasParking,
  petFriendly,
  photoSpot,
  freeOnly,
  sort = 'recommended',
  limit = 150,
}: {
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
  sort?: 'recommended' | 'distance' | 'bloom';
  limit?: number;
}): Promise<FlowerSpotMapItem[]> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const seasonMonthsMap: Record<string, number[]> = {
    spring: [3, 4, 5],
    summer: [6, 7, 8],
    autumn: [9, 10, 11],
    winter: [12, 1, 2],
  };

  const getPeakMonths = (start: number | null, end: number | null) => {
    if (!start && !end) return [];
    if (start && !end) return [start];
    if (!start && end) return [end];
    if (start === end) return start ? [start] : [];

    const months: number[] = [];
    let month = start!;
    while (true) {
      months.push(month);
      if (month === end) break;
      month = month === 12 ? 1 : month + 1;
      if (months.length > 12) break;
    }
    return months;
  };

  let query = supabase
    .from('flower_spots')
    .select(`
      id, name, address, lat, lng, flower_types, category,
      has_night_light, has_parking, pet_friendly, photo_spot, entry_fee,
      peak_month_start, peak_month_end, vote_up, vote_down,
      festivals!left (
        id, name, start_date, end_date
      ),
      bloom_status!left (
        status, bloom_pct, year
      )
    `)
    .gte('lat', swLat)
    .lte('lat', neLat)
    .gte('lng', swLng)
    .lte('lng', neLng)
    .limit(limit * 2);

  if (category && category !== 'all') query = query.eq('category', category);
  if (hasNightLight) query = query.eq('has_night_light', true);
  if (hasParking) query = query.eq('has_parking', true);
  if (petFriendly) query = query.eq('pet_friendly', true);
  if (photoSpot) query = query.eq('photo_spot', true);
  if (freeOnly) query = query.eq('entry_fee', 0);

  const { data: spots, error } = await query;
  if (error || !spots) throw new Error(error?.message ?? 'Failed to fetch spots');

  const BLOOM_SORT_ORDER: Record<string, number> = {
    peak: 0, blooming: 1, falling: 2, budding: 3, before: 4, done: 5,
  };

  const today = new Date().toISOString().slice(0, 10);
  let result: FlowerSpotMapItem[] = spots.map((spot) => {
    const bloomRows = (spot.bloom_status as Array<{ status: string; bloom_pct: number | null; year: number }> | null) ?? [];
    const festivalRows =
      (spot.festivals as Array<{ id: string; name: string; start_date: string | null; end_date: string | null }> | null) ?? [];
    const currentBloom = bloomRows.find((b) => b.year === currentYear);
    const hasActiveFestival = festivalRows.some((festivalRow) => {
      if (!festivalRow.start_date && !festivalRow.end_date) return true;
      const startsOk = !festivalRow.start_date || festivalRow.start_date <= today;
      const endsOk = !festivalRow.end_date || festivalRow.end_date >= today;
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
      bloom_status: (currentBloom?.status as FlowerSpotMapItem['bloom_status']) ?? null,
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
    };
  });

  if (flowerType && flowerType !== 'all') {
    result = result.filter((s) => s.flower_types.includes(flowerType as FlowerSpotMapItem['flower_types'][number]));
  }
  if (bloomStatus && bloomStatus !== 'all') {
    result = result.filter((s) => s.bloom_status === bloomStatus);
  }
  if (season && season !== 'all') {
    result = result.filter((spot) => {
      const source = spots.find((item) => item.id === spot.id);
      const months = getPeakMonths(source?.peak_month_start ?? null, source?.peak_month_end ?? null);
      return months.some((month) => seasonMonthsMap[season]?.includes(month));
    });
  }
  if (peakMonth && peakMonth !== 'all') {
    const targetMonth = Number(peakMonth);
    result = result.filter((spot) => {
      const source = spots.find((item) => item.id === spot.id);
      const months = getPeakMonths(source?.peak_month_start ?? null, source?.peak_month_end ?? null);
      return months.includes(targetMonth);
    });
  }
  if (festival === 'only') {
    result = result.filter((spot) => spot.festival_count > 0);
  }

  const compareFestivalPriority = (a: FlowerSpotMapItem, b: FlowerSpotMapItem) => {
    if (a.has_active_festival !== b.has_active_festival) {
      return Number(b.has_active_festival) - Number(a.has_active_festival);
    }
    if (a.festival_count !== b.festival_count) {
      return b.festival_count - a.festival_count;
    }
    return 0;
  };

  if (sort === 'bloom') {
    result.sort((a, b) => {
      const festivalCompare = compareFestivalPriority(a, b);
      if (festivalCompare !== 0) return festivalCompare;
      return (
        (BLOOM_SORT_ORDER[a.bloom_status ?? 'done'] ?? 99) -
        (BLOOM_SORT_ORDER[b.bloom_status ?? 'done'] ?? 99)
      );
    });
  } else {
    result.sort((a, b) => {
      const festivalCompare = compareFestivalPriority(a, b);
      if (festivalCompare !== 0) return festivalCompare;
      return (b.vote_up - b.vote_down) - (a.vote_up - a.vote_down);
    });
  }

  return result.slice(0, limit);
}

export async function getSpotDetailById(id: string): Promise<FlowerSpotWithDetails | null> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data: spot } = await supabase
    .from('flower_spots')
    .select('*')
    .eq('id', id)
    .single();

  if (!spot) return null;

  const [
    { data: bloomRows },
    { data: festivals },
    { data: votes },
    { data: reviews },
  ] = await Promise.all([
    supabase.from('bloom_status').select('*').eq('spot_id', id).eq('year', currentYear).order('created_at', { ascending: false }).limit(1),
    supabase.from('festivals').select('*').eq('spot_id', id).order('start_date', { ascending: true }),
    supabase.from('votes').select('vote_type').eq('spot_id', id),
    supabase.from('spot_reviews').select('rating').eq('spot_id', id).eq('moderation_status', 'visible'),
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
    vote_up: voteUp,
    vote_down: voteDown,
    review_count: (reviews ?? []).length,
    avg_rating: avgRating,
  };
}

export async function searchSpotsByName(query: string, limit = 12): Promise<FlowerSpotMapItem[]> {
  const supabase = await createClient();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data: spots, error } = await supabase
    .from('flower_spots')
    .select('id, name, address, lat, lng, flower_types, category, has_night_light, has_parking, pet_friendly, photo_spot, entry_fee')
    .ilike('name', `%${trimmed}%`)
    .limit(Math.min(limit, 20));

  if (error || !spots) throw new Error(error?.message ?? 'Failed to search spots');

  return spots.map((s) => ({
    ...s,
    flower_types: s.flower_types ?? [],
    bloom_status: null,
    bloom_pct: null,
    vote_up: 0,
    vote_down: 0,
    festival_count: 0,
    has_active_festival: false,
  }));
}
