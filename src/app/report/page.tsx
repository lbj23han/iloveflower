"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FlowerCategory, CATEGORY_LABELS } from "@/types";
import { getOrCreateSession, getDeviceId } from "@/lib/session";
import BrandLockup from "@/components/ui/BrandLockup";
import StarRating from "@/components/ui/StarRating";

const CATEGORIES = Object.entries(CATEGORY_LABELS) as Array<
  [FlowerCategory, string]
>;
const PRICE_TYPES = [
  { value: "day", label: "일일권" },
  { value: "monthly", label: "월이용권" },
  { value: "annual", label: "연회원권" },
] as const;

type PriceType = (typeof PRICE_TYPES)[number]["value"];
type SignalKey = "signal_beginner" | "signal_introvert" | "signal_value";

const SIGNAL_OPTIONS: Array<{ key: SignalKey; label: string }> = [
  { key: "signal_beginner", label: "헬린이가 많아요" },
  { key: "signal_introvert", label: "영업 별로 안해요" },
  { key: "signal_value", label: "가성비가 좋아요" },
];

function ReportForm() {
  const params = useSearchParams();
  const gymId = params.get("gym_id");
  const [gymName, setGymName] = useState(params.get("gym_name") ?? "");
  const [category, setCategory] = useState<FlowerCategory>("park");
  const [priceType, setPriceType] = useState<PriceType>("day");
  const [price, setPrice] = useState("");
  const [unknownPrice, setUnknownPrice] = useState(false);
  const [signalRatings, setSignalRatings] = useState<Record<SignalKey, number>>(
    {
      signal_beginner: 0,
      signal_introvert: 0,
      signal_value: 0,
    },
  );
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!gymName.trim() || submitting) return;
    setSubmitting(true);

    const { sessionId, nickname } = getOrCreateSession();
    const deviceId = await getDeviceId();

    const ratingValues = [
      signalRatings.signal_beginner,
      signalRatings.signal_introvert,
      signalRatings.signal_value,
    ];
    const anyRated = ratingValues.some((r) => r > 0);
    const overallRating = anyRated
      ? Math.max(
          1,
          Math.min(5, Math.round(ratingValues.reduce((a, b) => a + b, 0) / 3)),
        )
      : null;

    try {
      const parsedPrice =
        !unknownPrice && price.trim() ? parseInt(price, 10) : null;
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gym_id: gymId,
          gym_name: gymName.trim(),
          category,
          rating: overallRating,
          signal_beginner: signalRatings.signal_beginner >= 3,
          signal_introvert: signalRatings.signal_introvert >= 3,
          signal_value: signalRatings.signal_value >= 3,
          day_pass_price: priceType === "day" ? parsedPrice : null,
          monthly_price: priceType === "monthly" ? parsedPrice : null,
          annual_price: priceType === "annual" ? parsedPrice : null,
          comment: comment.trim() || null,
          anon_session_id: sessionId,
          device_id: deviceId,
          nickname,
        }),
      });

      if (res.ok) {
        setDone(true);
      } else {
        const { error } = await res.json();
        alert(error || "제출에 실패했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="text-lg font-bold text-[#111827]">제보 감사합니다!</h2>
        <p className="text-sm text-[#6b7280]">
          검토 후 지도에 반영될 예정이에요.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-[#00C471] px-6 py-2.5 text-sm font-medium text-white"
        >
          지도로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
      {/* 시설 이름 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#374151]">
          시설 이름 <span className="text-[#ef4444]">*</span>
        </label>
        <input
          type="text"
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          placeholder="예: 헬린이짐 강남점"
          className="w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm focus:border-[#00C471] focus:outline-none"
        />
      </div>

      {/* 카테고리 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#374151]">
          카테고리
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                category === key
                  ? "border-[#00C471] bg-[#00C471] text-white"
                  : "border-[#e5e7eb] bg-white text-[#374151] hover:border-[#00C471]/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 가격 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#374151]">
          가격
        </label>
        <div className="grid grid-cols-[148px_1fr] gap-2">
          <div className="relative">
            <select
              value={priceType}
              onChange={(e) => setPriceType(e.target.value as PriceType)}
              disabled={unknownPrice}
              className="w-full appearance-none rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 pr-10 text-sm text-[#111827] focus:border-[#00C471] focus:outline-none disabled:bg-[#f9fafb] disabled:text-[#9ca3af]"
            >
              {PRICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#9ca3af]">
              ⌄
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={unknownPrice}
              placeholder="가격 입력"
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 pr-12 text-sm text-[#111827] focus:border-[#00C471] focus:outline-none disabled:bg-[#f9fafb] disabled:text-[#9ca3af]"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#6b7280]">
              원
            </span>
          </div>
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={unknownPrice}
            onChange={(e) => {
              setUnknownPrice(e.target.checked);
              if (e.target.checked) setPrice("");
            }}
            className="h-4 w-4 rounded border-[#e5e7eb] accent-[#00C471]"
          />
          <span className="text-sm text-[#6b7280]">모름 / 없음</span>
        </label>
      </div>

      {/* 평가 (signal ratings) */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[#374151]">
          평가
        </label>
        <div className="space-y-3 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
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
                size="md"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 한마디 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#374151]">
          한마디{" "}
          <span className="font-normal text-[#9ca3af]">(선택, 50자 이내)</span>
        </label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 50))}
          placeholder="예: 초보도 편하게 다닐 수 있어요"
          className="w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm focus:border-[#00C471] focus:outline-none"
        />
        <div className="mt-1 text-right text-xs text-[#9ca3af]">
          {comment.length}/50
        </div>
      </div>

      <p className="text-xs text-[#9ca3af]">
        익명으로 제보되며, 관리자 검토 후 지도에 반영됩니다.
      </p>

      <button
        onClick={submit}
        disabled={!gymName.trim() || submitting}
        className="w-full rounded-xl bg-[#00C471] py-3.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "제출 중..." : "익명으로 제보하기"}
      </button>
    </div>
  );
}

export default function ReportPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Link href="/" className="text-[#6b7280]">
            ←
          </Link>
          <BrandLockup
            title="시설 제보하기"
            subtitle="익명으로 제보되고, 검토 후 반영돼요"
            iconSize={44}
            iconWidth={31}
            iconHeight={44}
            titleClassName="font-semibold text-[#111827]"
            subtitleClassName="text-[11px] text-[#6b7280]"
          />
        </div>
      </header>
      <Suspense
        fallback={
          <div className="p-6 text-center text-sm text-[#9ca3af]">
            로딩 중...
          </div>
        }
      >
        <ReportForm />
      </Suspense>
    </div>
  );
}
