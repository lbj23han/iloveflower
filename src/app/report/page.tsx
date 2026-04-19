"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BloomStatusValue,
  BLOOM_STATUS_LABELS,
  FlowerSpotMapItem,
  FlowerType,
  FLOWER_TYPE_LABELS,
} from "@/types";
import { getOrCreateSession, getDeviceId } from "@/lib/session";
import BrandLockup from "@/components/ui/BrandLockup";

const FLOWER_TYPES = Object.entries(FLOWER_TYPE_LABELS) as Array<
  [FlowerType, string]
>;
const BLOOM_STATUSES = Object.entries(BLOOM_STATUS_LABELS) as Array<
  [BloomStatusValue, string]
>;

type PickedLocation = {
  lat: number;
  lng: number;
};

function ReportLocationPicker({
  initialPosition,
  onClose,
  onConfirm,
}: {
  initialPosition: PickedLocation | null;
  onClose: () => void;
  onConfirm: (location: PickedLocation) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<{
    setMap: (map: object | null) => void;
    setPosition: (latlng: { getLat: () => number; getLng: () => number }) => void;
  } | null>(null);
  const [pendingLocation, setPendingLocation] = useState<PickedLocation | null>(
    initialPosition,
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const kakaoWindow = window as typeof window & { kakao?: any };

    const seedLocation = initialPosition ?? { lat: 37.5665, lng: 126.978 };

    const init = () => {
      if (!containerRef.current || !kakaoWindow.kakao?.maps) return;
      const { maps } = kakaoWindow.kakao;
      const center = new maps.LatLng(seedLocation.lat, seedLocation.lng);
      const map = new maps.Map(containerRef.current, {
        center,
        level: 4,
      });

      if (initialPosition) {
        const marker = new maps.Marker({ position: center });
        marker.setMap(map);
        markerRef.current = marker;
      }

      maps.event.addListener(map, "click", (mouseEvent: any) => {
        const lat = mouseEvent.latLng.getLat();
        const lng = mouseEvent.latLng.getLng();
        setPendingLocation({ lat, lng });

        if (!markerRef.current) {
          const marker = new maps.Marker({ position: mouseEvent.latLng });
          marker.setMap(map);
          markerRef.current = marker;
          return;
        }

        markerRef.current.setPosition(mouseEvent.latLng);
      });
    };

    if (kakaoWindow.kakao?.maps) {
      kakaoWindow.kakao.maps.load(init);
      return;
    }

    const timer = window.setInterval(() => {
      if (!kakaoWindow.kakao?.maps) return;
      window.clearInterval(timer);
      kakaoWindow.kakao.maps.load(init);
    }, 120);

    return () => window.clearInterval(timer);
  }, [initialPosition]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(15,23,42,0.28)] px-4 pb-4 pt-10 backdrop-blur-[2px] md:items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/55 bg-white/78 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#ffd6dc]/55 px-5 py-4">
          <div>
            <div className="text-base font-bold text-[#111827]">
              지도에서 제보 위치 선택
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[#6b7280]">
              등록되지 않은 장소라면 지도를 눌러 정확한 위치를 남겨주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 select-none items-center justify-center rounded-full border border-[#ffd6dc]/55 bg-white/80 text-sm text-[#6b7280] transition-transform active:scale-[0.98]"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <div
            ref={containerRef}
            className="h-[320px] w-full rounded-[24px] border border-[#ffd6dc]/55 bg-[#fffafb]"
          />

          <div className="mt-4 rounded-[24px] border border-[#ffd6dc]/45 bg-[#fffafb]/80 px-4 py-3">
            <div className="text-sm font-semibold text-[#111827]">
              선택한 위치
            </div>
            <div className="mt-1 text-sm leading-relaxed text-[#6b7280]">
              {pendingLocation
                ? `${pendingLocation.lat.toFixed(6)}, ${pendingLocation.lng.toFixed(6)}`
                : "지도 위를 눌러 제보 위치를 선택해주세요."}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] flex-1 select-none rounded-2xl border border-[#ffd6dc]/55 bg-white/85 px-4 py-3 text-base font-medium text-[#4b5563] transition-transform active:scale-[0.98]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => pendingLocation && onConfirm(pendingLocation)}
              disabled={!pendingLocation}
              className="min-h-[48px] flex-1 select-none rounded-2xl bg-[#ff6b81] px-4 py-3 text-base font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              이 위치로 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportForm() {
  const params = useSearchParams();
  const initialSpotId = params.get("spot_id");
  const initialSpotName = params.get("spot_name") ?? "";

  const [spotName, setSpotName] = useState(initialSpotName);
  const [flowerType, setFlowerType] = useState<FlowerType | "">("");
  const [bloomStatus, setBloomStatus] = useState<BloomStatusValue | "">("");
  const [entryFee, setEntryFee] = useState("");
  const [freeEntry, setFreeEntry] = useState(false);
  const [hasNightLight, setHasNightLight] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);
  const [comment, setComment] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);

  const [searchQuery, setSearchQuery] = useState(initialSpotName);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FlowerSpotMapItem[]>([]);
  const [linkedSpot, setLinkedSpot] = useState<FlowerSpotMapItem | null>(
    initialSpotId && initialSpotName
      ? {
          id: initialSpotId,
          name: initialSpotName,
          address: null,
          lat: null,
          lng: null,
          flower_types: [],
          category: "etc",
          bloom_status: null,
          bloom_pct: null,
          has_night_light: false,
          has_parking: false,
          pet_friendly: false,
          photo_spot: false,
          entry_fee: 0,
          vote_up: 0,
          vote_down: 0,
          festival_count: 0,
          has_active_festival: false,
        }
      : null,
  );

  useEffect(() => {
    const keyword = searchQuery.trim();
    if (keyword.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        let spots: FlowerSpotMapItem[] = [];
        if (process.env.NEXT_PUBLIC_TOSS_BUILD === 'true') {
          const { searchSpotsByNameClient } = await import('@/lib/clientApi');
          const result = await searchSpotsByNameClient(keyword);
          spots = result.spots;
        } else {
          const res = await fetch(`/api/gyms?q=${encodeURIComponent(keyword)}`);
          const json = await res.json();
          spots = json.spots ?? [];
        }
        setSearchResults(spots);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const linkedLabel = useMemo(() => {
    if (!linkedSpot) return null;
    return linkedSpot.address
      ? `${linkedSpot.name} · ${linkedSpot.address}`
      : linkedSpot.name;
  }, [linkedSpot]);

  const pickedLocationLabel = useMemo(() => {
    if (!pickedLocation) return null;
    return `${pickedLocation.lat.toFixed(6)}, ${pickedLocation.lng.toFixed(6)}`;
  }, [pickedLocation]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 5 - imageUrls.length)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload?folder=reports", {
          method: "POST",
          body: fd,
        });
        if (res.ok) {
          const { url } = await res.json();
          uploaded.push(url);
        } else {
          const body = await res.json().catch(() => ({}));
          alert(body.error || "이미지 업로드에 실패했습니다.");
        }
      }
      setImageUrls((prev) => [...prev, ...uploaded].slice(0, 5));
    } catch {
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    if (!spotName.trim() || submitting) return;
    setSubmitting(true);

    const { sessionId, nickname } = getOrCreateSession();
    const deviceId = await getDeviceId();
    const normalizedComment = comment.trim();
    const locationPrefixedComment =
      !linkedSpot && pickedLocation
        ? `[지도 선택 위치] ${pickedLocation.lat.toFixed(6)}, ${pickedLocation.lng.toFixed(6)}${
            normalizedComment ? `\n${normalizedComment}` : ""
          }`
        : normalizedComment || null;

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spot_id: linkedSpot?.id ?? initialSpotId ?? null,
          spot_name: spotName.trim(),
          flower_type: flowerType || null,
          bloom_status: bloomStatus || null,
          entry_fee: freeEntry
            ? 0
            : entryFee.trim()
              ? parseInt(entryFee, 10)
              : null,
          has_night_light: hasNightLight || null,
          has_parking: hasParking || null,
          pet_friendly: petFriendly || null,
          comment: locationPrefixedComment,
          image_urls: imageUrls,
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
        <p className="text-sm leading-relaxed text-[#6b7280]">
          검토 후 지도에 반영될 예정이에요.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#ff6b81] px-6 py-3 text-base font-medium text-white"
        >
          지도로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
        <div className="rounded-[24px] border border-[#ffd6dc] bg-white/90 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
          <div className="mb-2 text-sm font-semibold text-[#111827]">
            기존 명소에 연결하기
          </div>
          <p className="mb-3 text-sm leading-relaxed text-[#6b7280]">
            이미 등록된 명소라면 먼저 연결해두면 관리자 승인과 반영이 더 빨라져요.
          </p>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="예: 여의도 벚꽃길, 석촌호수"
            className="min-h-[48px] w-full rounded-2xl border border-[#e5e7eb] px-4 py-3 text-base focus:border-[#ff6b81] focus:outline-none"
          />

          {linkedSpot && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl bg-[#fff5f7] px-3 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#ff4d6d]">
                  연결된 명소
                </div>
                <div className="mt-1 text-sm leading-relaxed text-[#374151]">
                  {linkedLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkedSpot(null)}
                className="min-h-[44px] shrink-0 select-none rounded-full border border-[#ffd6dc] bg-white px-4 py-2 text-sm text-[#6b7280] transition-transform active:scale-[0.98]"
              >
                해제
              </button>
            </div>
          )}

          {!linkedSpot && (searching || searchResults.length > 0) && (
            <div className="mt-3 space-y-2">
              {searching ? (
                <div className="animate-pulse rounded-2xl bg-[#f9fafb] px-3 py-3 text-sm text-[#9ca3af]">
                  명소 검색 중...
                </div>
              ) : (
                searchResults.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => {
                      setLinkedSpot(spot);
                      setPickedLocation(null);
                      setSpotName(spot.name);
                      setSearchQuery(spot.name);
                      setSearchResults([]);
                    }}
                    className="block w-full select-none rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-left transition-transform active:scale-[0.98]"
                  >
                    <div className="text-sm font-semibold text-[#111827]">
                      {spot.name}
                    </div>
                    {spot.address && (
                      <div className="mt-1 text-sm leading-relaxed text-[#6b7280]">
                        {spot.address}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {!linkedSpot && (
            <div className="mt-3 rounded-2xl border border-[#ffd6dc]/45 bg-[#fffafb]/80 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#111827]">
                    등록되지 않은 장소인가요?
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[#6b7280]">
                    지도에서 실제 위치를 찍어두면 관리자가 새 명소로 추가하기 쉬워져요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="min-h-[44px] shrink-0 select-none rounded-full border border-[#ffd6dc] bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition-transform active:scale-[0.98]"
                >
                  {pickedLocation ? "선택한 위치 수정" : "지도에서 위치 선택"}
                </button>
              </div>

              {pickedLocationLabel && (
                <div className="mt-3 rounded-2xl bg-white/90 px-3 py-3 text-sm leading-relaxed text-[#374151]">
                  선택한 위치: {pickedLocationLabel}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#374151]">
            장소 이름 <span className="text-[#ff6b81]">*</span>
          </label>
          <input
            type="text"
            value={spotName}
            onChange={(e) => setSpotName(e.target.value)}
            placeholder="예: 여의도 벚꽃길"
            className="min-h-[48px] w-full rounded-2xl border border-[#e5e7eb] px-4 py-3 text-base focus:border-[#ff6b81] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#374151]">
            꽃 종류
          </label>
          <div className="flex flex-wrap gap-2">
            {FLOWER_TYPES.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFlowerType(flowerType === key ? "" : key)}
                className={`min-h-[40px] select-none rounded-full border px-4 py-2 text-sm transition-transform active:scale-[0.98] ${
                  flowerType === key
                    ? "border-[#ff6b81] bg-[#ff6b81] text-white"
                    : "border-[#e5e7eb] bg-white text-[#374151]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#374151]">
            개화 현황
          </label>
          <div className="flex flex-wrap gap-2">
            {BLOOM_STATUSES.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setBloomStatus(bloomStatus === key ? "" : key)}
                className={`min-h-[40px] select-none rounded-full border px-4 py-2 text-sm transition-transform active:scale-[0.98] ${
                  bloomStatus === key
                    ? "border-[#ff6b81] bg-[#ff6b81] text-white"
                    : "border-[#e5e7eb] bg-white text-[#374151]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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
              className="min-h-[48px] w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 pr-12 text-base text-[#111827] focus:border-[#ff6b81] focus:outline-none disabled:bg-[#f9fafb] disabled:text-[#9ca3af]"
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

        <div>
          <label className="mb-2 block text-sm font-medium text-[#374151]">
            편의 정보
          </label>
          <div className="space-y-2 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
            {[
              {
                label: "야간 조명 있어요",
                state: hasNightLight,
                set: setHasNightLight,
              },
              { label: "주차 가능해요", state: hasParking, set: setHasParking },
              {
                label: "반려동물 동반 가능해요",
                state: petFriendly,
                set: setPetFriendly,
              },
            ].map(({ label, state, set }) => (
              <label
                key={label}
                className="flex cursor-pointer items-center gap-2"
              >
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

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#374151]">
            한마디{" "}
            <span className="font-normal text-[#9ca3af]">(선택, 50자 이내)</span>
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 50))}
            placeholder="예: 산책로가 길고 저녁 조명이 예뻐요"
            className="min-h-[48px] w-full rounded-2xl border border-[#e5e7eb] px-4 py-3 text-base focus:border-[#ff6b81] focus:outline-none"
          />
          <div className="mt-1 text-right text-sm text-[#9ca3af]">
            {comment.length}/50
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#374151]">
            사진{" "}
            <span className="font-normal text-[#9ca3af]">(선택, 최대 5장)</span>
          </label>
          <p className="mb-2 text-sm leading-relaxed text-[#6b7280]">
            실제 장소 사진을 올려주시면, 관리자 승인 후 명소 대표 이미지로 반영될 수 있어요.
          </p>
          <div className="flex flex-wrap gap-2">
            {imageUrls.map((url, i) => (
              <div
                key={url}
                className="relative h-20 w-20 overflow-hidden rounded-2xl border border-[#e5e7eb]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setImageUrls((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute right-1 top-1 flex h-7 w-7 select-none items-center justify-center rounded-full bg-black/60 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            {imageUrls.length < 5 && (
              <label className="flex h-20 w-20 cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[#e5e7eb] text-[#9ca3af]">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={uploading}
                />
                <span className="text-xl">{uploading ? "…" : "+"}</span>
                <span className="text-xs">
                  {uploading ? "업로드 중" : "사진 추가"}
                </span>
              </label>
            )}
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[#9ca3af]">
          익명으로 제보되며, 관리자 검토 후 지도에 반영됩니다.
        </p>

        <button
          onClick={submit}
          disabled={!spotName.trim() || submitting || uploading}
          className="min-h-[52px] w-full select-none rounded-2xl bg-[#ff6b81] px-4 py-3.5 text-base font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "제출 중..." : "익명으로 제보하기"}
        </button>
      </div>

      {pickerOpen && (
        <ReportLocationPicker
          initialPosition={pickedLocation}
          onClose={() => setPickerOpen(false)}
          onConfirm={(location) => {
            setPickedLocation(location);
            setPickerOpen(false);
          }}
        />
      )}
    </>
  );
}

export default function ReportPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[radial-gradient(circle_at_top,#ffe4e6_0%,#fff1f4_38%,#ffffff_100%)]">
      <header className="sticky top-0 z-10 border-b border-[#ffd6dc] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/55 bg-white/70 text-[#6b7280]"
          >
            ←
          </Link>
          <BrandLockup
            title="꽃놀이 명소 제보하기"
            subtitle="익명으로 제보되고, 검토 후 반영돼요"
            iconSize={44}
            iconWidth={31}
            iconHeight={44}
            titleClassName="font-semibold text-[#111827]"
            subtitleClassName="text-sm leading-relaxed text-[#6b7280]"
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
