export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { rateLimit, ipHash } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get('post_id');
  if (!postId) return NextResponse.json({ error: 'post_id required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { ok } = rateLimit(req, 'comment', { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!ok) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const body = await req.json();
  const { post_id, parent_id, content, anon_session_id, device_id, nickname } = body;

  if (!post_id || !content?.trim() || !anon_session_id) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  if (content.length > 200) {
    return NextResponse.json({ error: '200자 이내로 작성해주세요.' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const ip = ipHash(req);

  // 30초 내 같은 내용 중복 댓글 방지
  const since = new Date(Date.now() - 30 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('comments')
    .select('id')
    .eq('post_id', post_id)
    .eq('anon_session_id', anon_session_id)
    .eq('content', content.trim())
    .gte('created_at', since)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id,
      parent_id: parent_id ?? null,
      content: content.trim(),
      nickname: nickname ?? '익명',
      anon_session_id,
      device_hash: device_id ?? null,
      ip_hash: ip,
      moderation_status: 'visible',
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '댓글 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
