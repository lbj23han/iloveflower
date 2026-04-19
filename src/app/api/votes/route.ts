export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit, ipHash } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const { ok } = rateLimit(req, 'vote', { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!ok) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const body = await req.json();
  const { spot_id, vote_type, anon_session_id, device_id } = body;

  if (!spot_id || !vote_type || !anon_session_id) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  if (!['up', 'down'].includes(vote_type)) {
    return NextResponse.json({ error: '잘못된 투표 타입입니다.' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const ip = ipHash(req);

  const { data: existing } = await supabase
    .from('votes')
    .select('id')
    .eq('spot_id', spot_id)
    .eq('anon_session_id', anon_session_id)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: '이미 투표하셨습니다.' }, { status: 409 });
  }

  const { error } = await supabase.from('votes').insert({
    spot_id,
    vote_type,
    anon_session_id,
    device_hash: device_id ?? null,
    ip_hash: ip,
  });

  if (error) {
    return NextResponse.json({ error: '투표 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
