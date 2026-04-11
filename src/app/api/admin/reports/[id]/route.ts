import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

function checkAuth(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret');
  return secret === process.env.ADMIN_SECRET;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { action, spot_id_override } = await req.json();
  if (action !== 'approve' && action !== 'reject') {
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

  if (action === 'approve' && !effectiveSpotId) {
    return NextResponse.json(
      { error: '승인하려면 기존 명소와 먼저 연결해주세요.' },
      { status: 400 },
    );
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
  }

  return NextResponse.json({ ok: true });
}
