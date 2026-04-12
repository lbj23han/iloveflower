import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rateLimit';

const BUCKET = 'post-images';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  const { ok } = rateLimit(req, 'upload', { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!ok) {
    return NextResponse.json({ error: '업로드 한도를 초과했습니다.' }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'jpg, png, webp, gif만 업로드 가능합니다.' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 });
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const allowedFolders = ['community', 'reports', 'spot-reviews'];
  const folderParam = req.nextUrl.searchParams.get('folder') ?? 'community';
  const folder = allowedFolders.includes(folderParam) ? folderParam : 'community';
  const path = `${folder}/${filename}`;

  const supabase = await createServiceClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: '업로드에 실패했습니다.' }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: publicUrl }, { status: 201 });
}
