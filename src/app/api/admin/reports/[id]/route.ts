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
  const { action } = await req.json();
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

  const { error: updateError } = await supabase
    .from('spot_reports')
    .update({ status: action === 'approve' ? 'approved' : 'rejected' })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // On approve: update flower_spot fields if spot_id exists
  if (action === 'approve' && report.spot_id) {
    const updates: Record<string, unknown> = {};
    if (report.entry_fee != null) updates.entry_fee = report.entry_fee;
    if (report.has_night_light != null) updates.has_night_light = report.has_night_light;
    if (report.has_parking != null) updates.has_parking = report.has_parking;
    if (report.pet_friendly != null) updates.pet_friendly = report.pet_friendly;

    if (Object.keys(updates).length > 0) {
      await supabase.from('flower_spots').update(updates).eq('id', report.spot_id);
    }

    // Insert bloom_status if provided
    if (report.bloom_status) {
      await supabase.from('bloom_status').insert({
        spot_id: report.spot_id,
        year: new Date().getFullYear(),
        status: report.bloom_status,
        updated_by: 'report',
        observed_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
