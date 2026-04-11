import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CATEGORY_LABELS, BLOOM_STATUS_LABELS, FLOWER_TYPE_LABELS } from '@/types';
import VoteButtons from '@/components/gym/VoteButtons';
import ReviewSection from '@/components/gym/ReviewSection';
import { getSpotDetailById } from '@/lib/spots';

interface Props {
  params: Promise<{ id: string }>;
}

async function getReviews(spotId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('spot_reviews')
    .select('*')
    .eq('spot_id', spotId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(12);
  return data ?? [];
}

export default async function SpotDetailPage({ params }: Props) {
  const { id } = await params;
  const [spot, reviews] = await Promise.all([getSpotDetailById(id), getReviews(id)]);

  if (!spot) notFound();

  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(spot.name)}`;
  const bloomStatus = spot.bloom_status;
  const bloomLabel = bloomStatus ? (BLOOM_STATUS_LABELS as Record<string, string>)[bloomStatus.status] : null;

  return (
    <div className="min-h-screen bg-[#f9fafb] pb-8">
      <div className="bg-white border-b border-[#e5e7eb] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-[#6b7280] hover:text-[#111827]">← 뒤로</Link>
          <span className="font-semibold text-[#111827] truncate">{spot.name}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        <div className="bg-white rounded-xl p-5 border border-[#e5e7eb]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-xl font-bold text-[#111827]">{spot.name}</h1>
              <span className="text-xs text-[#9ca3af] mt-0.5 block">
                {(CATEGORY_LABELS as Record<string, string>)[spot.category]}
              </span>
            </div>
            <VoteButtons spotId={spot.id} initialUp={spot.vote_up} initialDown={spot.vote_down} />
          </div>

          {/* 꽃 종류 */}
          {spot.flower_types.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {spot.flower_types.map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-[#fff1f4] text-[#ff4d6d] font-medium">
                  {(FLOWER_TYPE_LABELS as Record<string, string>)[t] ?? t}
                </span>
              ))}
            </div>
          )}

          {/* 개화 현황 */}
          {bloomStatus && bloomLabel && (
            <div className="mb-4 rounded-xl bg-[#fff1f4] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6b7280]">개화 현황</span>
                <span className="text-xs font-bold text-[#ff4d6d]">{bloomLabel}</span>
              </div>
              {bloomStatus.bloom_pct != null && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                  <div className="h-full rounded-full bg-[#ff6b81]" style={{ width: `${bloomStatus.bloom_pct}%` }} />
                </div>
              )}
            </div>
          )}

          {/* 시설 정보 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {spot.entry_fee === 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-[#ecfbf3] text-[#00935d] font-medium">무료입장</span>}
            {spot.entry_fee > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-[#f3f4f6] text-[#374151] font-medium">입장료 {spot.entry_fee.toLocaleString()}원</span>}
            {spot.has_night_light && <span className="text-xs px-2.5 py-1 rounded-full bg-[#fffbeb] text-[#b45309] font-medium">야간조명</span>}
            {spot.has_parking && <span className="text-xs px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#2563eb] font-medium">주차 가능</span>}
            {spot.pet_friendly && <span className="text-xs px-2.5 py-1 rounded-full bg-[#faf5ff] text-[#7c3aed] font-medium">반려동물</span>}
            {spot.photo_spot && <span className="text-xs px-2.5 py-1 rounded-full bg-[#fff1f4] text-[#ff4d6d] font-medium">포토스팟</span>}
          </div>

          <div className="space-y-2 text-sm">
            {spot.address && (
              <div className="flex gap-2 text-[#374151]">
                <span className="text-[#9ca3af] shrink-0">주소</span>
                <span>{spot.address}</span>
              </div>
            )}
            {spot.phone && (
              <div className="flex gap-2 text-[#374151]">
                <span className="text-[#9ca3af] shrink-0">전화</span>
                <a href={`tel:${spot.phone}`} className="text-[#ff6b81]">{spot.phone}</a>
              </div>
            )}
          </div>
        </div>

        <ReviewSection spotId={spot.id} initialReviews={reviews} />

        <div className="space-y-2">
          <a href={kakaoMapUrl} target="_blank" rel="noopener noreferrer"
            className="block w-full py-3 text-center bg-[#FEE500] text-[#111827] rounded-xl font-semibold text-sm">
            카카오맵으로 길찾기
          </a>
          <Link href={`/report?spot_id=${spot.id}&spot_name=${encodeURIComponent(spot.name)}`}
            className="block w-full py-3 text-center border border-[#e5e7eb] text-[#6b7280] rounded-xl text-sm">
            정보 제보하기
          </Link>
        </div>
      </div>
    </div>
  );
}
