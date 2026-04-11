import { NextRequest, NextResponse } from 'next/server';
import { getSpotMapItemsByBounds, searchSpotsByName } from '@/lib/spots';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const searchQuery = searchParams.get('q')?.trim() ?? '';

  if (searchQuery) {
    try {
      const spots = await searchSpotsByName(searchQuery);
      return NextResponse.json({ spots, meta: { zoomHint: null } });
    } catch {
      return NextResponse.json({ error: '검색에 실패했습니다.' }, { status: 500 });
    }
  }

  const swLat = parseFloat(searchParams.get('swLat') ?? '0');
  const swLng = parseFloat(searchParams.get('swLng') ?? '0');
  const neLat = parseFloat(searchParams.get('neLat') ?? '0');
  const neLng = parseFloat(searchParams.get('neLng') ?? '0');

  if (!swLat || !swLng || !neLat || !neLng) {
    return NextResponse.json({ error: 'Invalid bounds' }, { status: 400 });
  }

  const area = Math.abs(neLat - swLat) * Math.abs(neLng - swLng);
  if (area > 1.8) {
    return NextResponse.json({
      spots: [],
      meta: { zoomHint: '지도를 더 확대해 주세요.' },
    });
  }

  try {
    const spots = await getSpotMapItemsByBounds({
      swLat,
      swLng,
      neLat,
      neLng,
      category: searchParams.get('category') ?? undefined,
      flowerType: searchParams.get('flower_type') ?? undefined,
      bloomStatus: searchParams.get('bloom_status') ?? undefined,
      hasNightLight: searchParams.get('has_night_light') === 'true',
      hasParking: searchParams.get('has_parking') === 'true',
      petFriendly: searchParams.get('pet_friendly') === 'true',
      photoSpot: searchParams.get('photo_spot') === 'true',
      freeOnly: searchParams.get('free_only') === 'true',
      sort: (searchParams.get('sort') as 'recommended' | 'distance' | 'bloom') ?? 'recommended',
    });

    return NextResponse.json(
      { spots, meta: { zoomHint: null } },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
