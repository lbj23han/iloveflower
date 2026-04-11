"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FlowerType, FLOWER_TYPE_LABELS, BloomStatusValue, BLOOM_STATUS_LABELS } from "@/types";
import { getOrCreateSession, getDeviceId } from "@/lib/session";
import BrandLockup from "@/components/ui/BrandLockup";

const FLOWER_TYPES = Object.entries(FLOWER_TYPE_LABELS) as Array<[FlowerType, string]>;
const BLOOM_STATUSES = Object.entries(BLOOM_STATUS_LABELS) as Array<[BloomStatusValue, string]>;

function ReportForm() {
  const params = useSearchParams();
  const spotId = params.get("spot_id");
  const [spotName, setSpotName] = useState(params.get("spot_name") ?? "");
  const [flowerType, setFlowerType] = useState<FlowerType | "">("");
  const [bloomStatus, setBloomStatus] = useState<BloomStatusValue | "">("");
  const [entryFee, setEntryFee] = useState("");
  const [freeEntry, setFreeEntry] = useState(false);
  const [hasNightLight, setHasNightLight] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!spotName.trim() || submitting) return;
    setSubmitting(true);

    const { sessionId, nickname } = getOrCreateSession();
    const deviceId = await getDeviceId();

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spot_id: spotId ?? null,
          spot_name: spotName.trim(),
          flower_type: flowerType || null,
          bloom_status: bloomStatus || null,
          entry_fee: freeEntry ? 0 : (entryFee.trim() ? parseInt(entryFee, 10) : null),
          has_night_light: hasNightLight || null,
          has_parking: hasParking || null,
          pet_friendly: petFriendly || null,
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
        <div className="text-4xl">🌸</div>
        <h2 className="text-lg font-bold text-[#111827]">제보 감사합니다!</h2>
        <p className="text-sm text-[#6b7280]">
          검토 후 지도에 반영될 예정이에요.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-[#ff6b81] px-6 py-2.5 text-sm font-medium text-white"
        >
          지도로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
      {/* 장소 이름 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#374151]">
          장소 이름 <span className="text-[#ff6b81]">*</span>
        </label>
        <input
          type="text"
          value={spotName}
          onChange={(e) => setSpotName(e.target.value)}
          placeholder="예: 여의도 벚꽃길"
          className="w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm focus:border-[#ff6b81] focus:outline-none"
        />
      </div>

      {/* 꽃 종류 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#374151]">
          꽃 종류
        </label>
        <div className="flex flex-wrap gap-2">
          {FLOWER_TYPES.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFlowerType(flowerType === key ? "" : key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                flowerType === key
                  ? "border-[#ff6b81] bg-[#ff6b81] text-white"
                  : "border-[#e5e7eb] bg-white text-[#374151] hover:border-[#ff6b81]/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 개화 현황 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#374151]">
          개화 현황
        </label>
        <div className="flex flex-wrap gap-2">
          {BLOOM_STATUSES.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setBloomStatus(bloomStatus === key ? "" : key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                bloomStatus === key
                  ? "border-[#ff6b81] bg-[#ff6b81] text-white"
                  : "border-[#e5e7eb] bg-white text-[#374151] hover:border-[#ff6b81]/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 입장료 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#374151]">
          입장료
        </label>
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={entryFee}
            onChange={(e) => setEntryFee(e.target.value)}
            disabled={freeEntry}
            placeholder="입장료 입력"
            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 pr-12 text-sm text-[#111827] focus:border-[#ff6b81] focus:outline-none disabled:bg-[#f9fafb] disabled:text-[#9ca3af]"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#6b7280]">
            원
          </span>
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={freeEntry}
            onChange={(e) => {
              setFreeEntry(e.target.checked);
              if (e.target.checked) setEntryFee("");
            }}
            className="h-4 w-4 rounded border-[#e5e7eb] accent-[#ff6b81]"
          />
          <span className="text-sm text-[#6b7280]">무료 입장</span>
        </label>
      </div>

      {/* 시설 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[#374151]">
          시설 정보
        </label>
        <div className="space-y-2 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
          {[
            { label: "야간 조명 있어요", state: hasNightLight, set: setHasNightLight },
            { label: "주차 가능해요", state: hasParking, set: setHasParking },
            { label: "반려동물 동반 가능해요", state: petFriendly, set: setPetFriendly },
          ].map(({ label, state, set }) => (
            <label key={label} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={state}
                onChange={(e) => set(e.target.checked)}
                className="h-4 w-4 rounded border-[#e5e7eb] accent-[#ff6b81]"
              />
              <span className="text-sm text-[#374151]">{label}</span>
            </label>
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
          placeholder="예: 주차 공간이 넉넉하고 산책로가 예뻐요"
          className="w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm focus:border-[#ff6b81] focus:outline-none"
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
        disabled={!spotName.trim() || submitting}
        className="w-full rounded-xl bg-[#ff6b81] py-3.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "제출 중..." : "익명으로 제보하기"}
      </button>
    </div>
  );
}

export default function ReportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,#ffe4e6_0%,#fff1f4_38%,#ffffff_100%)]">
      <header className="sticky top-0 z-10 border-b border-[#ffd6dc] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Link href="/" className="text-[#6b7280]">
            ←
          </Link>
          <BrandLockup
            title="꽃놀이 명소 제보하기"
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
