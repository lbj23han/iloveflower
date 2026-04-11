import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit, ipHash } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const { ok } = rateLimit(req, 'report', { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!ok) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const body = await req.json();
  const {
    spot_id,
    spot_name,
    flower_type,
    bloom_status,
    entry_fee,
    has_night_light,
    has_parking,
    pet_friendly,
    comment,
    anon_session_id,
    device_id,
    nickname,
  } = body;

  if (!spot_name?.trim() || !anon_session_id) {
    return NextResponse.json({ error: '장소 이름을 입력해주세요.' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const ip = ipHash(req);

  // 1시간 내 동일 장소 중복 제보 방지
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('spot_reports')
    .select('id')
    .eq('anon_session_id', anon_session_id)
    .ilike('spot_name', spot_name.trim())
    .gte('created_at', since)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: '이미 같은 장소를 제보하셨습니다.' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('spot_reports')
    .insert({
      spot_id: spot_id ?? null,
      spot_name: spot_name.trim(),
      flower_type: flower_type ?? null,
      bloom_status: bloom_status ?? null,
      entry_fee: entry_fee ?? null,
      has_night_light: has_night_light ?? null,
      has_parking: has_parking ?? null,
      pet_friendly: pet_friendly ?? null,
      comment: comment?.trim() ?? null,
      nickname: nickname ?? '익명',
      anon_session_id,
      device_hash: device_id ?? null,
      ip_hash: ip,
      status: 'pending',
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '제보 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
