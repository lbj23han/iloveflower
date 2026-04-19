"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { SpotReview } from '@/types';
type Review = SpotReview;
import {
  getOrCreateSession,
  getDeviceId,
  refreshNickname,
  setNickname,
} from "@/lib/session";
import StarRating from "@/components/ui/StarRating";

interface Props {
  spotId: string;
  initialReviews: Review[];
  variant?: "default" | "overlay";
}

type SortMode = "newest" | "best";
type SignalKey = 'signal_crowded' | 'signal_photo_spot' | 'signal_accessible' | 'signal_parking_ok';

const SIGNAL_OPTIONS: Array<{ key: SignalKey; label: string }> = [
  { key: 'signal_crowded', label: '사람이 많아요' },
  { key: 'signal_photo_spot', label: '포토스팟이에요' },
  { key: 'signal_accessible', label: '접근하기 편해요' },
  { key: 'signal_parking_ok', label: '주차 편해요' },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

function pickBestReviews(reviews: Review[]) {
  // rating >= 1 (좋아요 최소 1개 기준), 이미지 있는 것 우선, 최대 3개
  return [...reviews]
    .filter((r) => (r.rating ?? 0) >= 1)
    .sort(
      (a, b) =>
        (b.rating ?? 0) * 20 +
        (b.image_urls?.length ?? 0) * 30 +
        (b.content?.length ?? 0) -
        ((a.rating ?? 0) * 20 +
          (a.image_urls?.length ?? 0) * 30 +
          (a.content?.length ?? 0)),
    )
    .slice(0, 3);
}

function sortReviews(reviews: Review[], mode: SortMode) {
  if (mode === "best") {
    return [...reviews].sort(
      (a, b) =>
        (b.rating ?? 0) * 20 +
        (b.image_urls?.length ?? 0) * 30 +
        (b.content?.length ?? 0) -
        ((a.rating ?? 0) * 20 +
          (a.image_urls?.length ?? 0) * 30 +
          (a.content?.length ?? 0)),
    );
  }
  return [...reviews].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

async function uploadFiles(files: FileList, existingCount: number): Promise<string[]> {
  const toUpload = Array.from(files).slice(0, 5 - existingCount);
  const urls: string[] = [];
  for (const file of toUpload) {
    try {
      if (process.env.NEXT_PUBLIC_TOSS_BUILD === 'true') {
        const { uploadImageClient } = await import('@/lib/clientApi');
        const { url } = await uploadImageClient(file, 'spot-reviews');
        if (url) urls.push(url);
      } else {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload?folder=spot-reviews', { method: 'POST', body: fd });
        if (res.ok) { const { url } = await res.json(); urls.push(url); }
      }
    } catch {
      // 개별 실패 무시
    }
  }
  return urls;
}

function SignalBadge({
  signal,
  label,
}: {
  signal: boolean;
  label: string;
  signalKey: SignalKey;
}) {
  if (!signal) return null;
  return (
    <span className="rounded-full border border-[#b7efcf] bg-[#ecfbf3] px-2 py-0.5 text-[10px] font-semibold text-[#00935d]">
      {label}
    </span>
  );
}

export default function ReviewSection({
  spotId,
  initialReviews,
  variant = "default",
}: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [nickname, setNicknameState] = useState("");
  const [password, setPassword] = useState("");
  const [text, setText] = useState("");
  const [signalRatings, setSignalRatings] = useState<Record<SignalKey, number>>(
    {
      signal_crowded: 0,
      signal_photo_spot: 0,
      signal_accessible: 0,
      signal_parking_ok: 0,
    },
  );
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialReviews.length >= 12);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const session = getOrCreateSession();
    setNicknameState(session.nickname);
  }, []);

  useEffect(() => {
    setReviews(initialReviews);
    setHasMore(initialReviews.length >= 12);
    setComposerOpen(false);
  }, [spotId, initialReviews]);

  const bestReviews = useMemo(() => pickBestReviews(reviews), [reviews]);
  const sortedReviews = useMemo(
    () => sortReviews(reviews, sortMode),
    [reviews, sortMode],
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        spot_id: spotId,
        offset: String(reviews.length),
        limit: "12",
      });
      let nextReviews: Review[];
      if (process.env.NEXT_PUBLIC_TOSS_BUILD === 'true') {
        const { getReviewsClient } = await import('@/lib/clientApi');
        nextReviews = await getReviewsClient(spotId, 12, reviews.length) as Review[];
      } else {
        const res = await fetch(`/api/reviews?${params}`);
        if (!res.ok) throw new Error("Failed to fetch reviews");
        nextReviews = await res.json();
      }
      setReviews((prev) => [...prev, ...nextReviews]);
      setHasMore(nextReviews.length >= 12);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length || imageUrls.length >= 5) return;
    setUploadingImage(true);
    try {
      const uploaded = await uploadFiles(files, imageUrls.length);
      if (uploaded.length === 0) { alert("이미지 업로드에 실패했습니다."); return; }
      setImageUrls((prev) => [...prev, ...uploaded].slice(0, 5));
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const submit = async () => {
    if (!text.trim() || !password.trim() || submitting) return;
    setSubmitting(true);

    const { sessionId } = getOrCreateSession();
    const deviceId = await getDeviceId();
    const savedNickname = setNickname(nickname);

    const ratingValues = [
      signalRatings.signal_crowded,
      signalRatings.signal_photo_spot,
      signalRatings.signal_accessible,
    ];
    const anyRated = ratingValues.some((r) => r > 0);
    const overallRating = anyRated
      ? Math.max(
          1,
          Math.min(5, Math.round(ratingValues.reduce((a, b) => a + b, 0) / 3)),
        )
      : null;

    try {
      let newReview: Review | null = null;
      let errorMsg = '';
      if (process.env.NEXT_PUBLIC_TOSS_BUILD === 'true') {
        const { createReviewClient } = await import('@/lib/clientApi');
        const result = await createReviewClient({
          spot_id: spotId, content: text.trim(), rating: overallRating,
          signal_crowded: signalRatings.signal_crowded >= 3,
          signal_photo_spot: signalRatings.signal_photo_spot >= 3,
          signal_accessible: signalRatings.signal_accessible >= 3,
          image_urls: imageUrls, anon_session_id: sessionId, device_id: deviceId, nickname: savedNickname,
        });
        newReview = result.data; errorMsg = result.error ?? '';
      } else {
        const res = await fetch("/api/reviews", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spot_id: spotId, content: text.trim(), rating: overallRating,
            signal_crowded: signalRatings.signal_crowded >= 3,
            signal_photo_spot: signalRatings.signal_photo_spot >= 3,
            signal_accessible: signalRatings.signal_accessible >= 3,
            image_urls: imageUrls, password: password.trim(),
            anon_session_id: sessionId, device_id: deviceId, nickname: savedNickname,
          }),
        });
        if (res.ok) { newReview = await res.json(); }
        else { const j = await res.json(); errorMsg = j.error || "제출에 실패했습니다."; }
      }

      if (newReview) {
        setReviews((prev) => [newReview as Review, ...prev]);
        setHasMore(true); setText("");
        setSignalRatings({ signal_crowded: 0, signal_photo_spot: 0, signal_accessible: 0, signal_parking_ok: 0 });
        setImageUrls([]); setPassword(""); setComposerOpen(false);
      } else {
        alert(errorMsg || "제출에 실패했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const removeReview = async (reviewId: string) => {
    const enteredPassword = window.prompt(
      "리뷰 작성 시 설정한 비밀번호를 입력해주세요.",
    );
    if (!enteredPassword) return;

    setDeletingId(reviewId);
    try {
      const res = await fetch("/api/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_id: reviewId,
          password: enteredPassword.trim(),
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        alert(error || "리뷰 삭제에 실패했습니다.");
        return;
      }
      setReviews((prev) => prev.filter((review) => review.id !== reviewId));
    } finally {
      setDeletingId(null);
    }
  };

  const panelTone =
    variant === "overlay"
      ? "border-white/45 bg-white/52 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md"
      : "border-[#e5e7eb] bg-white";

  return (
    <>
    {lightboxUrl && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        onClick={() => setLightboxUrl(null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lightboxUrl} alt="원본 이미지" className="max-h-full max-w-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        <button onClick={() => setLightboxUrl(null)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white text-lg">✕</button>
      </div>
    )}
    <div
      className={`min-h-[460px] overflow-hidden rounded-[28px] border ${panelTone}`}
    >
      <div
        className={`border-b px-5 py-4 ${variant === "overlay" ? "border-white/35" : "border-[#f3f4f6]"}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#374151]">
            댓글{" "}
            <span className="ml-1 font-normal text-[#9ca3af]">
              {reviews.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortMode("newest")}
              className={`min-h-[40px] select-none rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-[0.98] ${sortMode === "newest" ? "bg-[#111827] text-white" : "bg-white/70 text-[#6b7280]"}`}
            >
              최신순
            </button>
            <button
              onClick={() => setSortMode("best")}
              className={`min-h-[40px] select-none rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-[0.98] ${sortMode === "best" ? "bg-[#111827] text-white" : "bg-white/70 text-[#6b7280]"}`}
            >
              좋아요순
            </button>
          </div>
        </div>

        {!composerOpen ? (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="min-h-[44px] select-none rounded-full border border-[#00C471]/60 bg-[#00C471]/10 px-5 py-2 text-sm font-semibold text-[#00935d] transition-transform active:scale-[0.98]"
          >
            평가하기
          </button>
        ) : (
          <div className="mt-2 rounded-[24px] border border-white/45 bg-white/56 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#374151]">
                평가 작성
              </span>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="flex h-11 w-11 select-none items-center justify-center rounded-full bg-white/72 text-sm text-[#6b7280] transition-transform active:scale-[0.98]"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_120px]">
              <input
                value={nickname}
                onChange={(event) =>
                  setNicknameState(event.target.value.slice(0, 20))
                }
                placeholder="익명 닉네임"
                className="min-h-[48px] rounded-2xl border border-[#e5e7eb] bg-white/88 px-4 py-3 text-base font-semibold text-[#111827] focus:border-[#00C471] focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNicknameState(refreshNickname())}
                  className="flex h-full w-12 items-center justify-center rounded-2xl border border-[#e5e7eb] bg-white/88 text-lg text-[#4b5563]"
                  aria-label="닉네임 다시 생성"
                >
                  ⟳
                </button>
                <input
                  value={password}
                  type="password"
                  onChange={(event) =>
                    setPassword(event.target.value.slice(0, 20))
                  }
                  placeholder="비밀번호"
                  className="min-h-[48px] min-w-0 flex-1 rounded-2xl border border-[#e5e7eb] bg-white/88 px-4 py-3 text-base font-medium text-[#111827] focus:border-[#00C471] focus:outline-none"
                />
              </div>
              <button
                onClick={submit}
                disabled={!text.trim() || !password.trim() || submitting}
                className="min-h-[52px] rounded-[24px] bg-[#1f2a3d] px-5 py-3 text-base font-bold text-white disabled:opacity-50"
              >
                {submitting ? "등록 중" : "등록"}
              </button>
            </div>

            <div className="mt-4 space-y-3 rounded-[20px] border border-white/60 bg-white/60 px-4 py-3">
              {SIGNAL_OPTIONS.map((option) => (
                <div
                  key={option.key}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm text-[#374151]">{option.label}</span>
                  <StarRating
                    value={signalRatings[option.key]}
                    onChange={(v) =>
                      setSignalRatings((prev) => ({ ...prev, [option.key]: v }))
                    }
                    size="sm"
                  />
                </div>
              ))}
              <p className="text-sm leading-relaxed text-[#9ca3af]">
                {" "}
                항목이 배지 근거에 반영돼요
              </p>
            </div>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 300))}
              placeholder="한 줄 후기를 남겨 주세요."
              rows={3}
              className="mt-3 w-full rounded-[22px] border border-[#e5e7eb] bg-white/88 px-4 py-3 text-base leading-relaxed text-[#374151] focus:border-[#00C471] focus:outline-none"
            />

            {imageUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {imageUrls.map((imageUrl, index) => (
                  <div
                    key={`${imageUrl}-${index}`}
                    className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/55 bg-white/70"
                  >
                    <Image
                      src={imageUrl}
                      alt={`리뷰 이미지 ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setImageUrls((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      className="absolute right-1 top-1 flex h-7 w-7 select-none items-center justify-center rounded-full bg-[rgba(15,23,42,0.72)] text-xs text-white"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <label className={`inline-flex min-h-[44px] cursor-pointer select-none items-center gap-2 rounded-full border border-[#e5e7eb] bg-white/80 px-4 py-2 text-sm font-semibold text-[#374151] ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={uploadingImage || imageUrls.length >= 5}
                />
                {uploadingImage ? '업로드 중...' : `이미지 추가하기${imageUrls.length > 0 ? ` (${imageUrls.length}/5)` : ''}`}
              </label>
              <span className="text-sm text-[#9ca3af]">
                익명 작성 · 비밀번호로 삭제
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-3 pt-4">
        <div
          className={`rounded-3xl border px-4 py-4 ${variant === "overlay" ? "border-white/45 bg-white/55" : "border-[#eef2f7] bg-[#f8fafc]"}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111827]">
              베스트 댓글
            </h3>
            <span className="text-sm text-[#6b7280]">
              길이와 이미지 기준
            </span>
          </div>

          {bestReviews.length === 0 ? (
            <p className="text-sm text-[#9ca3af]">
              아직 정보가 부족해요. 여러분의 참여가 필요해요.
            </p>
          ) : (
            <div className="space-y-3">
              {bestReviews.map((review, index) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-white/60 bg-white/78 px-3 py-3 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-[#111827] px-3 py-1 text-xs font-bold text-white">
                      BEST {index + 1}
                    </span>
                    <span className="text-sm font-medium text-[#374151]">
                      {review.nickname}
                    </span>
                    {review.rating ? (
                      <StarRating value={review.rating} readOnly size="sm" />
                    ) : null}
                    <span className="text-sm text-[#9ca3af]">
                      {timeAgo(review.created_at)}
                    </span>
                  </div>
                  {(review.signal_crowded ||
                    review.signal_photo_spot ||
                    review.signal_accessible) && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                  <SignalBadge
                        signal={!!review.signal_crowded}
                        label="사람이 많아요"
                        signalKey="signal_crowded"
                      />
                      <SignalBadge
                        signal={!!review.signal_photo_spot}
                        label="포토스팟이에요"
                        signalKey="signal_photo_spot"
                      />
                      <SignalBadge
                        signal={!!review.signal_accessible}
                        label="접근하기 편해요"
                        signalKey="signal_accessible"
                      />
                      <SignalBadge
                        signal={!!review.signal_parking_ok}
                        label="주차 편해요"
                        signalKey="signal_parking_ok"
                      />
                    </div>
                  )}
                  <p className="text-sm leading-6 text-[#374151]">
                    {review.content}
                  </p>
                  {!!review.image_urls?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.image_urls.map((imageUrl, imageIndex) => (
                        <button
                          key={`${review.id}-best-${imageIndex}`}
                          onClick={() => setLightboxUrl(imageUrl)}
                          className="relative h-24 w-24 overflow-hidden rounded-2xl border border-white/60 bg-white/70"
                        >
                          <Image
                            src={imageUrl}
                            alt={`${review.nickname} 이미지`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[#d1d5db] to-transparent" />

      <div
        className={`divide-y ${variant === "overlay" ? "divide-white/30" : "divide-[#f3f4f6]"}`}
      >
        {sortedReviews.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm leading-relaxed text-[#9ca3af]">
            아직 정보가 부족해요. 여러분의 참여가 필요해요.
          </div>
        ) : (
          sortedReviews.map((review) => (
            <div key={review.id} className="px-5 py-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[#374151]">
                    {review.nickname}
                  </span>
                  {review.rating ? (
                    <StarRating value={review.rating} readOnly size="sm" />
                  ) : null}
                  <span className="text-sm text-[#9ca3af]">
                    {timeAgo(review.created_at)}
                  </span>
                </div>
                <button
                  onClick={() => removeReview(review.id)}
                  disabled={deletingId === review.id}
                  className="min-h-[40px] select-none text-sm font-medium text-[#9ca3af] disabled:opacity-50"
                >
                  {deletingId === review.id ? "삭제 중..." : "삭제"}
                </button>
              </div>
              {(review.signal_crowded ||
                review.signal_photo_spot ||
                review.signal_accessible) && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <SignalBadge
                    signal={!!review.signal_crowded}
                    label="사람이 많아요"
                    signalKey="signal_crowded"
                  />
                  <SignalBadge
                    signal={!!review.signal_photo_spot}
                    label="포토스팟이에요"
                    signalKey="signal_photo_spot"
                  />
                  <SignalBadge
                    signal={!!review.signal_accessible}
                    label="접근하기 편해요"
                    signalKey="signal_accessible"
                  />
                  <SignalBadge
                    signal={!!review.signal_parking_ok}
                    label="주차 편해요"
                    signalKey="signal_parking_ok"
                  />
                </div>
              )}
              <p className="text-sm leading-6 text-[#374151]">
                {review.content}
              </p>
              {!!review.image_urls?.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.image_urls.map((imageUrl, index) => (
                    <button
                      key={`${review.id}-${index}`}
                      onClick={() => setLightboxUrl(imageUrl)}
                      className="relative h-28 w-28 overflow-hidden rounded-2xl border border-white/55 bg-white/70"
                    >
                      <Image
                        src={imageUrl}
                        alt={`${review.nickname} 리뷰 이미지`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {sortedReviews.length > 0 && (
        <div className="px-5 pb-5 pt-4">
          {hasMore ? (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="min-h-[52px] w-full select-none rounded-2xl border border-white/55 bg-white/72 px-4 py-3 text-base font-semibold text-[#374151] disabled:opacity-50"
            >
              {loadingMore ? "불러오는 중..." : "댓글 더 보기"}
            </button>
          ) : (
            <div className="text-center text-sm text-[#9ca3af]">
              마지막 댓글까지 확인했어요
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
