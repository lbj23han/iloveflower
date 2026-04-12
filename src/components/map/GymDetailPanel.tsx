'use client';
import { CATEGORY_LABELS, BLOOM_STATUS_LABELS, FLOWER_TYPE_LABELS, FlowerSpotWithDetails, SpotReview } from '@/types';
import ReviewSection from '@/components/gym/ReviewSection';
import VoteButtons from '@/components/gym/VoteButtons';
import StarRating from '@/components/ui/StarRating';
import { getAccentStyle } from '@/lib/flowerTheme';
import { getSpotCoverImage } from '@/lib/spotCovers';

interface Props {
  gym: FlowerSpotWithDetails;
  initialReviews: SpotReview[];
  onClose?: () => void;
  mobile?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (spot: FlowerSpotWithDetails) => void;
}

export default function SpotDetailPanel({
  gym: spot,
  initialReviews,
  onClose,
  mobile = false,
  isFavorite = false,
  onToggleFavorite,
}: Props) {
  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(spot.name)}`;

  const totalReviews = initialReviews.length;
  const ratedReviews = initialReviews.filter((r) => r.rating != null);
  const avgRating =
    ratedReviews.length > 0
      ? ratedReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratedReviews.length
      : null;

  const signalCounts = {
    crowded: initialReviews.filter((r) => r.signal_crowded).length,
    photo: initialReviews.filter((r) => r.signal_photo_spot).length,
    accessible: initialReviews.filter((r) => r.signal_accessible).length,
    parking: initialReviews.filter((r) => r.signal_parking_ok).length,
  };
  const hasAnySignal = Object.values(signalCounts).some((v) => v > 0);

  const bloomStatus = spot.bloom_status;
  const bloomLabel = bloomStatus ? (BLOOM_STATUS_LABELS as Record<string, string>)[bloomStatus.status] : null;
  const bloomPct = bloomStatus?.bloom_pct;
  const accent = getAccentStyle(spot.flower_types, spot.category);
  const reviewImages = initialReviews.flatMap((review) => review.image_urls ?? []).filter(Boolean);
  const coverImage = getSpotCoverImage(spot, reviewImages);

  const currentFestivals = spot.festivals.filter((f) => {
    if (!f.end_date) return true;
    return new Date(f.end_date) >= new Date();
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="shrink-0 border-b border-[#ffd6dc]/40 px-5 pb-5 pt-5">
        {/* 헤더 */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={`${mobile ? 'text-[22px]' : 'text-[24px]'} font-extrabold tracking-tight text-[#111827]`}>
              {spot.name}
            </h2>
            {spot.address && <p className="mt-1 text-sm text-[#6b7280]">{spot.address}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite?.(spot)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-base shadow-sm transition-colors ${
                isFavorite ? 'border-[#ff6b81]/40 bg-[#fff1f4] text-[#ff4d6d]' : 'border-[#ffd6dc]/55 bg-[#fffafb]/76 text-[#6b7280]'
              }`}
              aria-label={isFavorite ? '찜 해제' : '찜하기'}
            >♥</button>
            {onClose && (
              <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fffafb]/74 text-sm text-[#6b7280] shadow-sm">
                ✕
              </button>
            )}
          </div>
        </div>

        {coverImage && (
          <div className="mb-4 overflow-hidden rounded-[24px] border border-[#ffd6dc]/55 bg-[#fffafb]/76">
            <div className="relative aspect-[16/9] w-full">
              <img
                src={coverImage}
                alt={`${spot.name} 대표 이미지`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {bloomStatus && (
          <div className="mb-4 rounded-[24px] border border-[#ffd6dc]/55 bg-[#fffafb]/76 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold text-[#6b7280]">개화 현황</div>
              {bloomLabel && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  bloomStatus.status === 'peak' ? 'bg-[#ff6b81] text-white' :
                  bloomStatus.status === 'blooming' ? 'bg-[#ffd6e0] text-[#c0392b]' :
                  'bg-[#f3f4f6] text-[#6b7280]'
                }`}>{bloomLabel}</span>
              )}
            </div>
            {bloomPct != null && (
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                  <div className="h-full rounded-full" style={{ width: `${bloomPct}%`, backgroundColor: accent.strongBg }} />
                </div>
                <div className="text-right text-xs text-[#9ca3af]">{bloomPct}%</div>
              </div>
            )}
          </div>
        )}

        {/* 카테고리 + 꽃 종류 */}
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-[24px] border border-[#ffd6dc]/55 bg-[#fffafb]/78 px-4 py-4">
            <div className="text-xs font-semibold text-[#6b7280]">카테고리</div>
            <div className="mt-2 text-lg font-bold text-[#111827]">{(CATEGORY_LABELS as Record<string, string>)[spot.category]}</div>
          </div>
          <div className="rounded-[24px] border border-[#ffd6dc]/55 bg-[#fffafb]/78 px-4 py-4">
            <div className="text-xs font-semibold text-[#6b7280]">꽃 종류</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {spot.flower_types.length > 0
                ? spot.flower_types.map((t) => (
                    <span
                      key={t}
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: accent.bg, color: accent.text }}
                    >
                      {(FLOWER_TYPE_LABELS as Record<string, string>)[t] ?? t}
                    </span>
                  ))
                : <span className="text-sm text-[#9ca3af]">정보 없음</span>}
            </div>
          </div>
        </div>

        {/* 이용 정보 */}
        <div className="mb-4 rounded-[24px] border border-[#ffd6dc]/55 bg-[#fffafb]/76 px-4 py-4">
          <div className="mb-3 text-xs font-semibold text-[#6b7280]">이용 정보</div>
          <div className="flex flex-wrap gap-2">
            {[
              { cond: spot.entry_fee === 0, label: '무료입장', color: 'bg-[#ecfbf3] text-[#00935d]' },
              { cond: spot.entry_fee > 0, label: `입장료 ${spot.entry_fee.toLocaleString()}원`, color: 'bg-[#f3f4f6] text-[#374151]' },
              { cond: spot.has_night_light, label: '야간조명', color: 'bg-[#fffbeb] text-[#b45309]' },
              { cond: spot.has_parking, label: '주차 가능', color: 'bg-[#eff6ff] text-[#2563eb]' },
              { cond: spot.pet_friendly, label: '반려동물', color: 'bg-[#faf5ff] text-[#7c3aed]' },
              { cond: spot.photo_spot, label: '포토스팟', color: 'bg-[#fff1f4] text-[#ff4d6d]' },
            ].filter((item) => item.cond).map(({ label, color }) => (
              <span key={label} className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{label}</span>
            ))}
          </div>
          {spot.peak_month_start && (
            <div className="mt-2 text-xs text-[#6b7280]">
              절정 시기: {spot.peak_month_start}월{spot.peak_month_end && spot.peak_month_end !== spot.peak_month_start ? ` ~ ${spot.peak_month_end}월` : ''}
            </div>
          )}
        </div>

        {/* 축제 */}
        {currentFestivals.length > 0 && (
          <div className="mb-4 rounded-[24px] border border-[#ffd6dc]/55 bg-[#fffafb]/76 px-4 py-4">
            <div className="mb-3 text-xs font-semibold text-[#6b7280]">관련 축제</div>
            <div className="space-y-2">
              {currentFestivals.map((f) => (
                <div key={f.id}>
                  <div className="font-medium text-sm text-[#111827]">{f.name}</div>
                  {(f.start_date || f.end_date) && (
                    <div className="text-xs text-[#9ca3af]">{f.start_date}{f.end_date && ` ~ ${f.end_date}`}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 이용자 반응 */}
        {totalReviews > 0 && (
          <div className="mb-4 rounded-[24px] border border-[#ffd6dc]/55 bg-[#fffafb]/76 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold text-[#6b7280]">이용자 반응</div>
              <div className="flex items-center gap-1.5">
                {avgRating != null && <StarRating value={Math.round(avgRating * 2) / 2} readOnly size="sm" />}
                <span className="text-xs text-[#9ca3af]">{totalReviews}명 참여</span>
              </div>
            </div>
            {hasAnySignal ? (
              <div className="space-y-2.5">
                {[
                  { label: '사람이 많아요', count: signalCounts.crowded },
                  { label: '포토스팟이에요', count: signalCounts.photo },
                  { label: '접근이 편해요', count: signalCounts.accessible },
                  { label: '주차 편해요', count: signalCounts.parking },
                ].map((signal) => (
                  <div key={signal.label} className="flex items-center gap-2">
                    <span className="w-[108px] shrink-0 text-xs text-[#374151]">{signal.label}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e5e7eb]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (signal.count / totalReviews) * 100)}%`,
                          backgroundColor: accent.strongBg,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-[#6b7280]">{signal.count}명</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#9ca3af]">평가 항목 응답 없음</p>
            )}
          </div>
        )}

        {/* 운영 정보 */}
        {(spot.phone || spot.website_url) && (
          <div className="mb-4 space-y-2 rounded-[24px] border border-[#ffd6dc]/55 bg-[#fffafb]/76 px-4 py-4">
            <div className="text-xs font-semibold text-[#6b7280]">운영 정보</div>
            {spot.phone && (
              <div className="flex gap-2">
                <span className="w-16 shrink-0 text-xs text-[#9ca3af]">전화</span>
                <a href={`tel:${spot.phone}`} className="text-xs text-[#00935d]">{spot.phone}</a>
              </div>
            )}
            {spot.website_url && (
              <div className="flex gap-2">
                <span className="w-16 shrink-0 text-xs text-[#9ca3af]">홈페이지</span>
                <a href={spot.website_url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-[#2563eb]">
                  {spot.website_url.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        )}

        {/* 카카오맵 + 투표 */}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <a href={kakaoMapUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center rounded-2xl bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#111827] shadow-sm">
            카카오맵에서 보기
          </a>
          <div className="flex items-center justify-center rounded-2xl border border-[#ffd6dc]/55 bg-[#fffafb]/76 px-4 py-3">
            <VoteButtons spotId={spot.id} initialUp={spot.vote_up} initialDown={spot.vote_down} />
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 pt-4">
        <ReviewSection spotId={spot.id} initialReviews={initialReviews} variant="overlay" />
      </div>
    </div>
  );
}
