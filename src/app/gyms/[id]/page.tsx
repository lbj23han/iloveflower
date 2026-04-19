import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CATEGORY_LABELS, BLOOM_STATUS_LABELS, FLOWER_TYPE_LABELS } from '@/types';
import VoteButtons from '@/components/gym/VoteButtons';
import ReviewSection from '@/components/gym/ReviewSection';
import SpotImageGallery from '@/components/gym/SpotImageGallery';
import { getSpotDetailById } from '@/lib/spots';
import { getAccentStyle } from '@/lib/flowerTheme';
import { getSpotCoverImage } from '@/lib/spotCovers';

export async function generateStaticParams() {
  return [];
}

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

function getRepresentativeImages(reviews: Awaited<ReturnType<typeof getReviews>>) {
  // rating 높고 이미지 있는 리뷰 우선, 최대 6장
  const withImages = reviews
    .filter((r) => r.image_urls?.length > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const urls: string[] = [];
  for (const r of withImages) {
    for (const url of r.image_urls ?? []) {
      if (!urls.includes(url)) urls.push(url);
      if (urls.length >= 6) return urls;
    }
  }
  return urls;
}

export default async function SpotDetailPage({ params }: Props) {
  const { id } = await params;
  const [spot, reviews] = await Promise.all([getSpotDetailById(id), getReviews(id)]);

  if (!spot) notFound();

  const representativeImages = getRepresentativeImages(reviews);
  const coverImage = getSpotCoverImage(spot, representativeImages);
  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(spot.name)}`;
  const bloomStatus = spot.bloom_status;
  const bloomLabel = bloomStatus ? (BLOOM_STATUS_LABELS as Record<string, string>)[bloomStatus.status] : null;
  const accent = getAccentStyle(spot.flower_types, spot.category);

  return (
    <div className="min-h-[100dvh] bg-[#fff5f7] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <div className="sticky top-0 z-10 border-b border-white/55 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex h-11 min-w-[44px] select-none items-center justify-center rounded-full border border-white/55 bg-white/70 text-[#6b7280] transition-transform active:scale-[0.98]">←</Link>
          <span className="font-semibold text-[#111827] truncate">{spot.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-5">
        <SpotImageGallery
          coverImage={coverImage}
          representativeImages={representativeImages}
          spotName={spot.name}
        />

        <div className="rounded-[24px] border border-[#ffd6dc] bg-[#fff5f7] p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-xl font-bold text-[#111827]">{spot.name}</h1>
              <span className="mt-0.5 block text-sm text-[#9ca3af]">
                {(CATEGORY_LABELS as Record<string, string>)[spot.category]}
              </span>
            </div>
            <VoteButtons spotId={spot.id} initialUp={spot.vote_up} initialDown={spot.vote_down} />
          </div>

          {/* 꽃 종류 */}
          {spot.flower_types.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {spot.flower_types.map((t) => (
                <span
                  key={t}
                  className="rounded-full px-3 py-1.5 text-sm font-medium"
                  style={{ backgroundColor: accent.bg, color: accent.text }}
                >
                  {(FLOWER_TYPE_LABELS as Record<string, string>)[t] ?? t}
                </span>
              ))}
            </div>
          )}

          {/* 개화 현황 */}
          {bloomStatus && bloomLabel && (
            <div className="mb-4 rounded-xl bg-[#fff1f4] p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#6b7280]">개화 현황</span>
                <span className="text-sm font-bold text-[#ff4d6d]">{bloomLabel}</span>
              </div>
              {bloomStatus.bloom_pct != null && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${bloomStatus.bloom_pct}%`, backgroundColor: accent.strongBg }}
                  />
                </div>
              )}
            </div>
          )}

          {/* 이용 정보 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {spot.entry_fee === 0 && <span className="rounded-full bg-[#ecfbf3] px-3 py-1.5 text-sm font-medium text-[#00935d]">무료입장</span>}
            {spot.entry_fee > 0 && <span className="rounded-full bg-[#f3f4f6] px-3 py-1.5 text-sm font-medium text-[#374151]">입장료 {spot.entry_fee.toLocaleString()}원</span>}
            {spot.has_night_light && <span className="rounded-full bg-[#fffbeb] px-3 py-1.5 text-sm font-medium text-[#b45309]">야간조명</span>}
            {spot.has_parking && <span className="rounded-full bg-[#eff6ff] px-3 py-1.5 text-sm font-medium text-[#2563eb]">주차 가능</span>}
            {spot.pet_friendly && <span className="rounded-full bg-[#faf5ff] px-3 py-1.5 text-sm font-medium text-[#7c3aed]">반려동물</span>}
            {spot.photo_spot && <span className="rounded-full bg-[#fff1f4] px-3 py-1.5 text-sm font-medium text-[#ff4d6d]">포토스팟</span>}
          </div>

          <div className="space-y-2 text-sm leading-relaxed">
            {spot.address && (
              <div className="flex gap-2 text-[#374151]">
                <span className="text-[#9ca3af] shrink-0">주소</span>
                <span>{spot.address}</span>
              </div>
            )}
            {spot.phone && (
              <div className="flex gap-2 text-[#374151]">
                <span className="text-[#9ca3af] shrink-0">전화</span>
                <a href={`tel:${spot.phone}`} className="inline-flex min-h-[44px] items-center rounded-2xl px-3 text-[#ff6b81]">{spot.phone}</a>
              </div>
            )}
          </div>
        </div>

        <ReviewSection spotId={spot.id} initialReviews={reviews} />

        <div className="space-y-2">
          <a href={kakaoMapUrl} target="_blank" rel="noopener noreferrer"
            className="block min-h-[56px] w-full select-none rounded-2xl bg-[#FEE500] py-4 text-center text-base font-semibold text-[#111827] transition-transform active:scale-[0.98]">
            카카오맵으로 길찾기
          </a>
          <Link href={`/report?spot_id=${spot.id}&spot_name=${encodeURIComponent(spot.name)}`}
            className="block min-h-[52px] w-full select-none rounded-2xl border border-[#ffd6dc] py-4 text-center text-base text-[#6b7280] transition-transform active:scale-[0.98]">
            정보 제보하기
          </Link>
        </div>
      </div>
    </div>
  );
}
