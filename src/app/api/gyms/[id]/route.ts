import { NextRequest, NextResponse } from 'next/server';
import { getSpotDetailById } from '@/lib/spots';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: Props) {
  const { id } = await params;
  const spot = await getSpotDetailById(id);

  if (!spot) {
    return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
  }

  return NextResponse.json(spot);
}
