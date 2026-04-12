import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { POST_CATEGORIES, PostCategory } from '@/types';
import { verifyPostPassword } from '@/lib/postPassword';

function isPostCategory(value: string | null | undefined): value is PostCategory {
  return !!value && POST_CATEGORIES.includes(value as PostCategory);
}

function sanitizePost<T extends { post_password_hash?: string | null }>(post: T) {
  const { post_password_hash: __postPasswordHash, ...safePost } = post;
  void __postPasswordHash;
  return safePost;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password.trim() : '';

  if (!password) {
    return NextResponse.json({ error: '비밀번호를 입력해주세요.' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from('posts')
    .select('id, post_password_hash')
    .eq('id', id)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (!verifyPostPassword(password, existing.post_password_hash)) {
    return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('moderation_status', 'visible')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(sanitizePost(data));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { title, content, category, nickname, password } = body;

  if (!title?.trim() || !content?.trim() || !password?.trim()) {
    return NextResponse.json({ error: '수정에 필요한 정보가 부족합니다.' }, { status: 400 });
  }

  if (title.length > 80 || content.length > 500) {
    return NextResponse.json({ error: '입력 길이를 다시 확인해주세요.' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from('posts')
    .select('id, post_password_hash')
    .eq('id', id)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (!verifyPostPassword(password.trim(), existing.post_password_hash)) {
    return NextResponse.json({ error: '글 비밀번호가 일치하지 않습니다.' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('posts')
    .update({
      title: title.trim(),
      content: content.trim(),
      category: isPostCategory(category) ? category : 'chat',
      nickname: nickname?.trim() ? nickname.trim().slice(0, 20) : '익명',
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '글 수정에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(sanitizePost(data));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password.trim() : '';

  if (!password) {
    return NextResponse.json({ error: '삭제 비밀번호를 입력해주세요.' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from('posts')
    .select('id, post_password_hash')
    .eq('id', id)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (!verifyPostPassword(password, existing.post_password_hash)) {
    return NextResponse.json({ error: '글 비밀번호가 일치하지 않습니다.' }, { status: 403 });
  }

  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: '글 삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
