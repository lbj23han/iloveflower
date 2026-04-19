export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { rateLimit, ipHash } from '@/lib/rateLimit';
import { POST_CATEGORIES, PostCategory } from '@/types';
import { hashPostPassword } from '@/lib/postPassword';

function isPostCategory(value: string | null): value is PostCategory {
  return !!value && POST_CATEGORIES.includes(value as PostCategory);
}

function sanitizePost<T extends { post_password_hash?: string | null }>(post: T) {
  const { post_password_hash: __postPasswordHash, ...safePost } = post;
  void __postPasswordHash;
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

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const category = req.nextUrl.searchParams.get('category');
  const categoryValues = getPostCategoryQueryValues(category);

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

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { ok } = rateLimit(req, 'post', { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!ok) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const body = await req.json();
  const { title, content, category, password, anon_session_id, device_id, nickname, image_urls } = body;

  if (!title?.trim() || !content?.trim() || !anon_session_id) {
    return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 });
  }

  if (!password?.trim()) {
    return NextResponse.json({ error: '글 비밀번호를 입력해주세요.' }, { status: 400 });
  }

  if (title.length > 80) {
    return NextResponse.json({ error: '제목은 80자 이내로 작성해주세요.' }, { status: 400 });
  }

  if (content.length > 500) {
    return NextResponse.json({ error: '내용은 500자 이내로 작성해주세요.' }, { status: 400 });
  }

  if (password.length < 4 || password.length > 20) {
    return NextResponse.json({ error: '비밀번호는 4자 이상 20자 이하로 입력해주세요.' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const ip = ipHash(req);
  const normalizedCategory = isPostCategory(category) ? category : 'chat';

  // 5분 내 같은 세션 중복 글 방지
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('posts')
    .select('id')
    .eq('anon_session_id', anon_session_id)
    .gte('created_at', since)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: '5분 내 하나의 글만 등록할 수 있습니다.' }, { status: 429 });
  }

  const safeImageUrls = Array.isArray(image_urls)
    ? image_urls.filter((u: unknown) => typeof u === 'string').slice(0, 4)
    : [];

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: title.trim(),
      content: content.trim(),
      category: normalizedCategory,
      post_password_hash: hashPostPassword(password.trim()),
      nickname: nickname ?? '익명',
      anon_session_id,
      device_hash: device_id ?? null,
      ip_hash: ip,
      moderation_status: 'visible',
      image_urls: safeImageUrls,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '글 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ...sanitizePost(data), comment_count: 0 }, { status: 201 });
}
