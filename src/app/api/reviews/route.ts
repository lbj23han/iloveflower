import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit, ipHash } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const spotId = searchParams.get('spot_id');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '12', 10), 30);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);

  if (!spotId) {
    return NextResponse.json({ error: 'spot_id가 필요합니다.' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('spot_reviews')
    .select('id, spot_id, content, nickname, rating, signal_crowded, signal_photo_spot, signal_accessible, signal_parking_ok, bloom_status, visited_at, image_urls, moderation_status, created_at')
    .eq('spot_id', spotId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: '후기 조회에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { ok } = rateLimit(req, 'review', { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!ok) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const body = await req.json();
  const {
    spot_id,
    content,
    anon_session_id,
    device_id,
    nickname,
    rating,
    signal_crowded,
    signal_photo_spot,
    signal_accessible,
    signal_parking_ok,
    bloom_status,
    visited_at,
    image_urls,
  } = body;

  if (!spot_id || !anon_session_id) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  if (content && content.length > 300) {
    return NextResponse.json({ error: '300자 이내로 작성해주세요.' }, { status: 400 });
  }

  const safeRating =
    typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5
      ? rating
      : null;

  const safeImageUrls = Array.isArray(image_urls)
    ? image_urls.filter((item: unknown) => typeof item === 'string' && item.startsWith('data:image/')).slice(0, 5)
    : [];

  const supabase = await createServiceClient();
  const ip = ipHash(req);

  // 1회 평가 제한
  const dupCheck = device_id
    ? await supabase.from('spot_reviews').select('id').eq('spot_id', spot_id).eq('device_hash', device_id).limit(1)
    : await supabase.from('spot_reviews').select('id').eq('spot_id', spot_id).eq('anon_session_id', anon_session_id).limit(1);

  if (dupCheck.data && dupCheck.data.length > 0) {
    return NextResponse.json({ error: '이 장소에는 이미 후기를 남겼어요.' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('spot_reviews')
    .insert({
      spot_id,
      content: content?.trim() ?? null,
      nickname: nickname ?? '익명',
      rating: safeRating,
      signal_crowded: Boolean(signal_crowded),
      signal_photo_spot: Boolean(signal_photo_spot),
      signal_accessible: Boolean(signal_accessible),
      signal_parking_ok: Boolean(signal_parking_ok),
      bloom_status: bloom_status ?? null,
      visited_at: visited_at ?? null,
      image_urls: safeImageUrls,
      anon_session_id,
      device_hash: device_id ?? null,
      ip_hash: ip,
      moderation_status: 'visible',
    })
    .select('id, spot_id, content, nickname, rating, signal_crowded, signal_photo_spot, signal_accessible, signal_parking_ok, bloom_status, visited_at, image_urls, moderation_status, created_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '후기 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
