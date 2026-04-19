export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

function checkAuth(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret');
  return secret === process.env.ADMIN_SECRET;
}

async function updateSpotCoverImage(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  spotId: string,
  coverImageUrl: string | null,
) {
  if (!coverImageUrl) return null;
  const { error } = await supabase
    .from('flower_spots')
    .update({ cover_image_url: coverImageUrl })
    .eq('id', spotId);

  if (!error) return null;

  if (
    error.message.includes('cover_image_url')
    || error.message.includes("column 'cover_image_url' does not exist")
  ) {
    return '대표 사진 컬럼이 아직 DB에 없습니다. 마이그레이션을 먼저 적용해주세요.';
  }

  throw error;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { action, spot_id_override, cover_image_url } = await req.json();
  if (action !== 'approve' && action !== 'reject' && action !== 'set_cover') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: report, error: fetchError } = await supabase
    .from('spot_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const effectiveSpotId = spot_id_override || report.spot_id || null;

  if ((action === 'approve' || action === 'set_cover') && !effectiveSpotId) {
    return NextResponse.json(
      { error: '기존 명소와 먼저 연결해주세요.' },
      { status: 400 },
    );
  }

  if (action === 'set_cover' && !cover_image_url) {
    return NextResponse.json(
      { error: '대표 사진으로 지정할 이미지를 먼저 선택해주세요.' },
      { status: 400 },
    );
  }

  if (action === 'set_cover' && effectiveSpotId) {
    try {
      const migrationWarning = await updateSpotCoverImage(supabase, effectiveSpotId, cover_image_url);
      return NextResponse.json({ ok: true, migrationWarning });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '대표 사진 교체에 실패했습니다.' },
        { status: 500 },
      );
    }
  }

  const { error: updateError } = await supabase
    .from('spot_reports')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      spot_id: effectiveSpotId,
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (action === 'approve' && effectiveSpotId) {
    const { data: existingSpot } = await supabase
      .from('flower_spots')
      .select('id, flower_types')
      .eq('id', effectiveSpotId)
      .single();

    const updates: Record<string, unknown> = {};
    if (report.entry_fee != null) updates.entry_fee = report.entry_fee;
    if (report.has_night_light != null) updates.has_night_light = report.has_night_light;
    if (report.has_parking != null) updates.has_parking = report.has_parking;
    if (report.pet_friendly != null) updates.pet_friendly = report.pet_friendly;
    if (report.flower_type) {
      const mergedTypes = Array.from(
        new Set([...(existingSpot?.flower_types ?? []), report.flower_type]),
      );
      updates.flower_types = mergedTypes;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('flower_spots').update(updates).eq('id', effectiveSpotId);
    }

    let migrationWarning: string | null = null;
    try {
      migrationWarning = await updateSpotCoverImage(supabase, effectiveSpotId, cover_image_url ?? null);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '대표 사진 반영에 실패했습니다.' },
        { status: 500 },
      );
    }

    if (report.bloom_status) {
      const year = new Date().getFullYear();
      const { data: currentBloom } = await supabase
        .from('bloom_status')
        .select('id')
        .eq('spot_id', effectiveSpotId)
        .eq('year', year)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const payload = {
        spot_id: effectiveSpotId,
        year,
        status: report.bloom_status,
        updated_by: 'report',
        observed_at: new Date().toISOString(),
      };

      if (currentBloom?.id) {
        await supabase.from('bloom_status').update(payload).eq('id', currentBloom.id);
      } else {
        await supabase.from('bloom_status').insert(payload);
      }
    }

    return NextResponse.json({ ok: true, migrationWarning });
  }

  return NextResponse.json({ ok: true });
}
export async function generateStaticParams() { return []; }
