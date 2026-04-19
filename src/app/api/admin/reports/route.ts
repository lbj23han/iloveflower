export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

function checkAuth(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret');
  return secret === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get('status') ?? 'pending';
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('spot_reports')
    .select(`
      id, spot_id, spot_name, flower_type, bloom_status,
      entry_fee, has_night_light, has_parking, pet_friendly,
      comment, image_urls, nickname, status, created_at,
      flower_spots:spot_id (name, address, cover_image_url)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: data ?? [] });
}
