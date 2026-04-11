"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CATEGORY_LABELS,
  FilterState,
  FlowerSpotMapItem,
  FlowerSpotWithDetails,
  SpotReview,
  ViewportBounds,
} from "@/types";
import SpotFilter from "@/components/gym/GymFilter";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useViewportSpots } from "@/hooks/useViewportGyms";
import { getOrCreateSession } from "@/lib/session";

import SpotDetailPanel from "@/components/map/GymDetailPanel";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import BrandLockup from "@/components/ui/BrandLockup";

const KakaoMap = dynamic(() => import("./KakaoMap"), { ssr: false });

function MarqueeTicker() {
  const tickerItems = [
    "전국 꽃 명소를 지도에서 확인해보세요",
    "실시간 개화 현황을 확인하고 꽃놀이를 즐겨보세요",
    "주변 꽃 명소를 직접 제보해서 꽃놀이맵을 완성해주세요",
    "벚꽃, 매화, 진달래, 유채꽃 등 다양한 꽃을 찾아보세요",
  ];

  return (
    <div className="w-full overflow-hidden">
      <div className="animate-marquee flex min-w-max items-center">
        {Array.from({ length: 3 }).map((_, groupIndex) => (
          <div
            key={groupIndex}
            className="flex items-center gap-10 pr-10"
            aria-hidden={groupIndex > 0}
          >
            {tickerItems.map((item) => (
              <span
                key={`${groupIndex}-${item}`}
                className="whitespace-nowrap text-[11px] font-medium text-[#4b5563]"
              >
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_FILTERS: FilterState = {
  flower_type: "all",
  bloom_status: "all",
  has_night_light: false,
  has_parking: false,
  pet_friendly: false,
  photo_spot: false,
  free_only: false,
  sort: "recommended",
  category: "all",
};

type LeftPanelMode = "ranking" | "list" | "favorites" | "detail" | "closed";
const FAVORITES_STORAGE_KEY = "favorite_gyms";

const FILTER_BUTTON_TOP = "calc(126px + 4.5vh)";
const OVERLAY_TOP = "calc(182px + 4.5vh)";
const MOBILE_SHEET_BOTTOM = 88;
const SIDE_INSET = "calc(1rem + 5vh)";
const MOBILE_FILTER_BUTTON_TOP = "calc(152px - 3vh)";
const MOBILE_OVERLAY_TOP = "calc(160px + 2vh)";
const MOBILE_SIDE_INSET = "12px";

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function GlassPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[30px] border border-[#ffd6dc]/40 bg-[#fffafb]/65 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-xl ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function FavoriteToggleButton({
  active,
  onClick,
  small = false,
}: {
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex items-center justify-center rounded-full transition-all ${
        small ? "h-8 w-8 text-sm" : "h-10 w-10 text-base"
      } ${
        active
          ? "bg-[#fff1f4] text-[#ff4d6d] shadow-[0_8px_18px_rgba(255,77,109,0.18)]"
          : "bg-[#fffafb]/76 text-[#6b7280] shadow-[0_8px_18px_rgba(15,23,42,0.10)]"
      }`}
      aria-label={active ? "찜 해제" : "찜하기"}
      title={active ? "찜 해제" : "찜하기"}
    >
      ♥
    </button>
  );
}

const FLOWER_LABELS_MAP: Record<string, string> = { cherry: '벚꽃', plum: '매화', forsythia: '개나리', azalea: '진달래', wisteria: '등나무', rose: '장미', cosmos: '코스모스', sunflower: '해바라기', tulip: '튤립', lavender: '라벤더', rape: '유채꽃', etc: '기타' };

function BadgeChipsCompact({ gym }: { gym: FlowerSpotMapItem }) {
  if (!gym.flower_types || gym.flower_types.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {gym.flower_types.slice(0, 2).map((key) => (
        <span key={key} className="rounded-full border border-[#ffc9df] bg-[#fff1f6] px-2 py-0.5 text-[10px] font-semibold text-[#d63384]">
          {FLOWER_LABELS_MAP[key] ?? key}
        </span>
      ))}
    </div>
  );
}

function RankingContent({
  gyms,
  onSelect,
  favoriteIds,
  onToggleFavorite,
}: {
  gyms: FlowerSpotMapItem[];
  onSelect: (g: FlowerSpotMapItem) => void;
  favoriteIds: string[];
  onToggleFavorite: (g: FlowerSpotMapItem) => void;
}) {
  const top = [...gyms]
    .sort(
      (a, b) =>
        b.vote_up - a.vote_up,
    )
    .slice(0, 5);
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    gym: FlowerSpotMapItem,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(gym);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto py-1 px-1">
      {top.length === 0 ? (
        <div className="py-8 text-center text-[11px] text-[#9ca3af]">
          이 지역 데이터가 없습니다
        </div>
      ) : (
        top.map((gym, i) => (
          <div
            key={gym.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(gym)}
            onKeyDown={(event) => handleKeyDown(event, gym)}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#fffafb]/60 text-left rounded-2xl transition-colors"
          >
            <span className="text-xs font-bold text-[#9ca3af] w-5 shrink-0">
              #{i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#111827] truncate">
                {gym.name}
              </div>
              <div className="text-[10px] text-[#9ca3af] truncate">
                {gym.address?.slice(0, 14)}
              </div>
              <BadgeChipsCompact gym={gym} />
            </div>
            <div className="text-[10px] text-[#00a35e] font-bold shrink-0">
              +{Math.round(gym.vote_up / 10)}
            </div>
            <FavoriteToggleButton
              active={favoriteIds.includes(gym.id)}
              onClick={() => onToggleFavorite(gym)}
              small
            />
          </div>
        ))
      )}
    </div>
  );
}

function ListContent({
  gyms,
  loading,
  onSelect,
  selectedId,
  favoriteIds,
  onToggleFavorite,
  emptyMessage = "등록된 명소가 없어요",
}: {
  gyms: FlowerSpotMapItem[];
  loading: boolean;
  onSelect: (g: FlowerSpotMapItem) => void;
  selectedId?: string | null;
  favoriteIds: string[];
  onToggleFavorite: (g: FlowerSpotMapItem) => void;
  emptyMessage?: string;
}) {
  if (loading && gyms.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-[#9ca3af]">
        불러오는 중...
      </div>
    );
  }
  if (gyms.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-xs text-[#9ca3af] gap-1">
        {emptyMessage}
        <Link href="/report" className="text-[#00C471] underline">
          첫 제보하기 →
        </Link>
      </div>
    );
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    gym: FlowerSpotMapItem,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(gym);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto py-1 px-1">
      {gyms.map((gym) => (
        <div
          key={gym.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(gym)}
          onKeyDown={(event) => handleKeyDown(event, gym)}
          className={`w-full flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors hover:bg-[#fffafb]/60 ${
            selectedId === gym.id
              ? gym.photo_spot
                ? "border-[#92e0b6] bg-[#f3fff8]"
                : "border-[#ffd6dc]/60 bg-[#fffafb]/65"
              : gym.photo_spot
                ? "border-[#d8f5e8] bg-white/42"
                : "border-transparent"
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[#111827] truncate">
              {gym.name}
            </div>
            <div className="text-[10px] text-[#9ca3af] truncate">
              {gym.address}
            </div>
            <BadgeChipsCompact gym={gym} />
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs font-semibold text-[#4b5563]">
              {CATEGORY_LABELS[gym.category]}
            </div>
            <div
              className="text-[9px] text-[#9ca3af] mt-0.5"
              suppressHydrationWarning
            >
              {timeAgo(gym.id)}
            </div>
          </div>
          <FavoriteToggleButton
            active={favoriteIds.includes(gym.id)}
            onClick={() => onToggleFavorite(gym)}
            small
          />
        </div>
      ))}
    </div>
  );
}

function JudgeContent({
  gyms,
  onSelect,
}: {
  gyms: FlowerSpotMapItem[];
  onSelect: (g: FlowerSpotMapItem) => void;
}) {
  const recent = [...gyms]
    .sort((a, b) => b.vote_up - a.vote_up)
    .slice(0, 8);
  return (
    <div className="flex-1 overflow-y-auto py-1 px-1">
      {recent.length === 0 ? (
        <div className="py-8 text-center text-[11px] text-[#9ca3af]">
          제보된 명소가 없습니다
        </div>
      ) : (
        recent.map((gym, i) => (
          <button
            key={gym.id}
            onClick={() => onSelect(gym)}
            className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-[#fffafb]/60 text-left rounded-2xl transition-colors"
          >
            <span className="text-[10px] font-bold text-[#9ca3af] w-5 shrink-0 pt-0.5">
              #{i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#111827] truncate">
                {gym.name}
              </div>
              <div className="text-[10px] text-[#9ca3af] truncate">
                {gym.address}
              </div>
              <div className="text-[10px] text-[#6b7280] mt-0.5">
                {CATEGORY_LABELS[gym.category]}
              </div>
              <BadgeChipsCompact gym={gym} />
            </div>
            <div
              className="text-[9px] text-[#9ca3af] shrink-0 pt-0.5"
              suppressHydrationWarning
            >
              {timeAgo(gym.id)}
            </div>
          </button>
        ))
      )}
    </div>
  );
}

export default function MapPage() {
  const {
    coords,
    loading: geolocationLoading,
    error: geolocationError,
  } = useGeolocation();
  const { spots: gyms, fetchSpots, loading, zoomHint, hasFetched } = useViewportSpots();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedGym, setSelectedGym] = useState<FlowerSpotMapItem | null>(null);
  const [selectedGymDetail, setSelectedGymDetail] =
    useState<FlowerSpotWithDetails | null>(null);
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>("ranking");
  const [rightJudgeOpen, setRightJudgeOpen] = useState(true);
  const [selectedGymReviews, setSelectedGymReviews] = useState<SpotReview[]>([]);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FlowerSpotMapItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [locationFocusToken, setLocationFocusToken] = useState(0);
  const [locationTarget, setLocationTarget] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [favoriteGyms, setFavoriteGyms] = useState<FlowerSpotMapItem[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState<"account" | "email" | null>(
    null,
  );
  const boundsRef = useRef<ViewportBounds | null>(null);
  const fetchTimerRef = useRef<number | null>(null);
  const lastFetchKeyRef = useRef<string | null>(null);
  const selectedGymRef = useRef<FlowerSpotMapItem | null>(null);
  selectedGymRef.current = selectedGym;

  useEffect(() => {
    getOrCreateSession();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as FlowerSpotMapItem[];
      if (Array.isArray(parsed)) {
        setFavoriteGyms(parsed);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(favoriteGyms),
    );
  }, [favoriteGyms]);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  const buildFetchKey = useCallback(
    (bounds: ViewportBounds, nextFilters: FilterState) => {
      return [
        bounds.swLat.toFixed(4),
        bounds.swLng.toFixed(4),
        bounds.neLat.toFixed(4),
        bounds.neLng.toFixed(4),
        nextFilters.category,
        nextFilters.sort,
        nextFilters.flower_type,
        nextFilters.bloom_status,
        Number(nextFilters.has_night_light),
        Number(nextFilters.has_parking),
        Number(nextFilters.pet_friendly),
        Number(nextFilters.photo_spot),
        Number(nextFilters.free_only),
      ].join(":");
    },
    [],
  );

  const queueViewportFetch = useCallback(
    (bounds: ViewportBounds, nextFilters: FilterState, immediate = false) => {
      const nextKey = buildFetchKey(bounds, nextFilters);
      if (lastFetchKeyRef.current === nextKey) return;

      if (fetchTimerRef.current) {
        window.clearTimeout(fetchTimerRef.current);
      }

      const runFetch = () => {
        lastFetchKeyRef.current = nextKey;
        fetchSpots(bounds, nextFilters);
      };

      if (immediate) {
        runFetch();
        return;
      }

      fetchTimerRef.current = window.setTimeout(runFetch, 260);
    },
    [buildFetchKey, fetchSpots],
  );

  useEffect(() => {
    return () => {
      if (fetchTimerRef.current) {
        window.clearTimeout(fetchTimerRef.current);
      }
    };
  }, []);

  const handleBoundsChanged = useCallback(
    (bounds: ViewportBounds) => {
      boundsRef.current = bounds;
      queueViewportFetch(bounds, filters);
    },
    [filters, queueViewportFetch],
  );

  const handleFilterChange = useCallback(
    (partial: Partial<FilterState>) => {
      setFilters((prev) => {
        const f = { ...prev, ...partial };
        lastFetchKeyRef.current = null;
        if (boundsRef.current) queueViewportFetch(boundsRef.current, f, true);
        return f;
      });
    },
    [queueViewportFetch],
  );

  const favoriteIds = useMemo(
    () => favoriteGyms.map((gym) => gym.id),
    [favoriteGyms],
  );
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const handleGymSelect = useCallback(
    (gym: FlowerSpotMapItem) => {
      // 이미 선택된 명소를 다시 클릭하면 선택 해제
      if (selectedGymRef.current?.id === gym.id) {
        setSelectedGym(null);
        setSelectedGymDetail(null);
        if (viewportWidth >= 1024) {
          setLeftPanelMode("list");
        }
        return;
      }
      if (favoritesOnly && !favoriteIdSet.has(gym.id)) {
        setFavoritesOnly(false);
      }
      setSelectedGym(gym);
      setSelectedGymDetail(null);
      if (viewportWidth >= 1024) {
        setLeftPanelMode("detail");
      }
      setMobileListOpen(false);
    },
    [favoriteIdSet, favoritesOnly, viewportWidth],
  );

  const handleLocateMe = useCallback(() => {
    if (locating) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationTarget(coords);
      setLocationFocusToken((prev) => prev + 1);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationTarget({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationFocusToken((prev) => prev + 1);
        setLocating(false);
      },
      () => {
        setLocationTarget(coords);
        setLocationFocusToken((prev) => prev + 1);
        setLocating(false);
      },
      { timeout: 6000, maximumAge: 15000, enableHighAccuracy: true },
    );
  }, [coords, locating]);

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (!searchOpen || trimmed.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmed });
        const res = await fetch(`/api/gyms?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to search gyms");
        const data: { gyms: FlowerSpotMapItem[] } = await res.json();
        setSearchResults(data.gyms ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error(error);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchOpen, searchQuery]);

  const handleToggleFavorite = useCallback(
    (gym: FlowerSpotMapItem | FlowerSpotWithDetails) => {
      setFavoriteGyms((prev) => {
        const exists = prev.some((item) => item.id === gym.id);
        if (exists) {
          return prev.filter((item) => item.id !== gym.id);
        }

        const bloomStatus = "bloom_status" in gym && gym.bloom_status && typeof gym.bloom_status === "object"
          ? (gym.bloom_status as import('@/types').BloomStatus).status
          : ("bloom_status" in gym && typeof gym.bloom_status === "string" ? gym.bloom_status as import('@/types').BloomStatusValue : null);
        const bloomPct = "bloom_status" in gym && gym.bloom_status && typeof gym.bloom_status === "object"
          ? (gym.bloom_status as import('@/types').BloomStatus).bloom_pct
          : ("bloom_pct" in gym ? (gym as FlowerSpotMapItem).bloom_pct : null);
        const nextFavorite: FlowerSpotMapItem = {
          id: gym.id,
          name: gym.name,
          address: gym.address,
          lat: gym.lat,
          lng: gym.lng,
          category: gym.category,
          flower_types: gym.flower_types,
          bloom_status: bloomStatus,
          bloom_pct: bloomPct ?? null,
          has_night_light: gym.has_night_light,
          has_parking: gym.has_parking,
          pet_friendly: gym.pet_friendly,
          photo_spot: gym.photo_spot,
          entry_fee: gym.entry_fee,
          vote_up: gym.vote_up,
          vote_down: gym.vote_down,
        };

        return [nextFavorite, ...prev].slice(0, 100);
      });
    },
    [],
  );

  const handleCopySupport = useCallback(
    async (type: "account" | "email", value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopyMessage(type);
        window.setTimeout(() => setCopyMessage(null), 1800);
      } catch (error) {
        console.error(error);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedGym) {
      setSelectedGymDetail(null);
      setSelectedGymReviews([]);
      return;
    }

    const controller = new AbortController();
    const fetchGymDetail = async () => {
      try {
        const res = await fetch(`/api/gyms/${selectedGym.id}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch gym detail");
        const data: FlowerSpotWithDetails = await res.json();
        setSelectedGymDetail(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error(error);
        }
      }
    };

    const fetchReviews = async () => {
      try {
        const params = new URLSearchParams({
          gym_id: selectedGym.id,
          limit: "12",
        });
        const res = await fetch(`/api/reviews?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setSelectedGymReviews([]);
          return;
        }
        const data: SpotReview[] | { error?: string } = await res.json();
        setSelectedGymReviews(Array.isArray(data) ? data : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSelectedGymReviews([]);
        }
      }
    };

    fetchGymDetail();
    fetchReviews();
    return () => controller.abort();
  }, [selectedGym]);

  const isDesktop = viewportWidth >= 1024;
  const controlTop = isDesktop ? FILTER_BUTTON_TOP : MOBILE_FILTER_BUTTON_TOP;
  const overlayTop = isDesktop ? OVERLAY_TOP : MOBILE_OVERLAY_TOP;
  const sideInset = isDesktop ? SIDE_INSET : MOBILE_SIDE_INSET;
  const visibleGyms = favoritesOnly ? favoriteGyms : gyms;
  const showMapSearchPrompt =
    !favoritesOnly &&
    !zoomHint &&
    hasFetched &&
    !loading &&
    visibleGyms.length === 0;
  const activeFilterCount =
    Number(false) +
    Number(false) +
    Number(false) +
    Number(filters.category !== "all") +
    Number(filters.sort !== "recommended");
  const leftPanelWidth =
    leftPanelMode === "detail"
      ? Math.min(Math.max(viewportWidth * 0.4, 440), 560)
      : 320;

  const panOffset = { x: 0, y: 0 };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      <div className="absolute inset-0">
        <KakaoMap
          center={coords}
          spots={visibleGyms.filter((g) => g.lat && g.lng)}
          onBoundsChanged={handleBoundsChanged}
          onSpotSelect={handleGymSelect}
          selectedSpotId={selectedGym?.id}
          selectedSpotPosition={
            selectedGym?.lat && selectedGym?.lng
              ? { lat: selectedGym.lat, lng: selectedGym.lng }
              : null
          }
          focusPosition={locationTarget}
          focusTrigger={locationFocusToken}
          panOffset={panOffset}
        />
      </div>

      {zoomHint && (
        <div
          className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#ffd6dc]/40 bg-[#fffafb]/74 px-4 py-2 text-sm text-[#4b5563] shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl"
          style={{ top: overlayTop }}
        >
          {zoomHint}
        </div>
      )}

      {showMapSearchPrompt && boundsRef.current && (
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <button
            onClick={() => {
              lastFetchKeyRef.current = null;
              queueViewportFetch(boundsRef.current!, filters, true);
            }}
            className="rounded-full border border-[#ffd6dc]/55 bg-[#fffafb]/84 px-5 py-3 text-sm font-semibold text-[#111827] shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl disabled:cursor-default disabled:opacity-90"
          >
            이 지역을 기반으로 검색하기
          </button>
          <div className="mt-2 text-center text-xs text-white [text-shadow:0_1px_8px_rgba(15,23,42,0.35)]">
            아직 보이는 명소가 없다면 이 지역 기준으로 다시 찾아보세요
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3 md:px-4 md:pt-4">
        <div className="pointer-events-auto space-y-2">
          {/* 데스크탑 헤더 */}
          <div className="hidden md:flex items-center justify-between rounded-[28px] border border-[#ffd6dc]/50 bg-[#fffafb]/76 px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <BrandLockup
              title="꽃놀이맵"
              subtitle="전국 꽃놀이 명소를 지도에서 한눈에"
              iconSize={64}
              iconWidth={48}
              iconHeight={68}
            />
            <Link
              href="/report"
              className="rounded-full bg-[#111827] px-4 py-2 text-xs font-semibold text-white shadow-sm"
            >
              제보하기
            </Link>
          </div>

          {/* 모바일 헤더: 한 줄 컴팩트 */}
          <div className="flex md:hidden items-center justify-between rounded-[22px] border border-[#ffd6dc]/50 bg-[#fffafb]/76 px-3 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <BrandLockup
              title="꽃놀이맵"
              iconSize={40}
              iconWidth={28}
              iconHeight={40}
            />
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => setSupportOpen(true)}
                className="rounded-full border border-[#ffd6dc] bg-[#fff1f4]/92 px-3 py-1.5 text-xs font-semibold text-[#c0394f]"
              >
                후원
              </button>
              <Link
                href="/report"
                className="rounded-full bg-[#111827] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
              >
                제보하기
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#ffd6dc]/45 bg-[#fffafb]/68 px-3 py-2 shadow-[0_12px_32px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <MarqueeTicker />
          </div>
        </div>
      </div>

      <div
        className="absolute z-30 flex flex-col items-end gap-3"
        style={{ top: controlTop, right: sideInset }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSupportOpen(true)}
            className="hidden md:flex h-[46px] items-center rounded-full border border-[#ffd6dc] bg-[#fff1f4]/92 px-4 text-xs font-semibold text-[#c0394f] shadow-[0_12px_30px_rgba(255,107,129,0.18)] backdrop-blur-xl transition-all hover:bg-[#ffe4ea]"
          >
            후원
          </button>

          <button
            onClick={() => setSearchOpen((prev) => !prev)}
            className={`flex h-[46px] w-[46px] items-center justify-center rounded-full border shadow-[0_14px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all ${
              searchOpen
                ? "border-[#111827] bg-[#111827]/92 text-white"
                : "border-[#ffd6dc]/50 bg-[#fffafb]/76 text-[#111827]"
            }`}
            aria-label="명소 검색"
            title="명소 검색"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
          </button>

          <button
            className={`flex h-[46px] w-[46px] items-center justify-center rounded-full border text-[16px] shadow-[0_14px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all ${
              favoritesOnly
                ? "border-[#ffccd5] bg-[#fff1f4]/96 text-[#ff4d6d]"
                : "border-[#ffd6dc]/50 bg-[#fffafb]/76 text-[#111827]"
            }`}
            aria-label={favoritesOnly ? "찜 필터 해제" : "찜한 명소만 보기"}
            title={favoritesOnly ? "찜 필터 해제" : "찜한 명소만 보기"}
            onClick={() => {
              setFavoritesOnly((prev) => {
                const next = !prev;
                if (next) {
                  setLeftPanelMode("favorites");
                } else if (leftPanelMode === "favorites") {
                  setLeftPanelMode("ranking");
                }
                return next;
              });
            }}
          >
            ♥
          </button>

          <button
            onClick={handleLocateMe}
            disabled={locating}
            title={
              geolocationError
                ? "기본 위치 또는 현재 위치로 이동"
                : "내 위치로 이동"
            }
            className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#ffd6dc]/50 bg-[#fffafb]/76 text-[18px] text-[#111827] shadow-[0_14px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all hover:bg-[#fffafb]/86 disabled:cursor-default disabled:opacity-75"
            aria-label={
              geolocationLoading || locating
                ? "현재 위치 찾는 중"
                : "내 위치로 이동"
            }
          >
            {locating ? "…" : "◎"}
          </button>

          <button
            onClick={() => setFilterOpen((prev) => !prev)}
            className={`flex h-[46px] items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-[0_14px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all ${
              filterOpen
                ? "border-[#111827] bg-[#111827]/92 text-white"
                : "border-[#ffd6dc]/50 bg-[#fffafb]/76 text-[#111827]"
            }`}
          >
            <span>필터</span>
            {activeFilterCount > 0 && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${filterOpen ? "bg-white text-[#111827]" : "bg-[#111827] text-white"}`}
              >
                {activeFilterCount}
              </span>
            )}
            <span
              className={`text-xs transition-transform ${filterOpen ? "rotate-180" : ""}`}
            >
              ⌃
            </span>
          </button>
        </div>

        {searchOpen && (
          <GlassPanel className="w-[min(360px,calc(100vw-2rem))] px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[#111827]">
                  명소 검색
                </div>
                <div className="text-[11px] text-[#6b7280]">
                  명소 이름으로 바로 찾아 이동할 수 있어요
                </div>
              </div>
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-[#9ca3af] hover:bg-black/5"
              >
                ✕
              </button>
            </div>

            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="예: 여의도 벚꽃길, 경복궁, 남산공원"
              className="w-full rounded-2xl border border-[#ffd6dc]/55 bg-[#fffafb]/82 px-4 py-3 text-sm text-[#111827] focus:border-[#111827] focus:outline-none"
            />

            <div className="mt-3 max-h-[320px] overflow-y-auto space-y-2">
              {searchLoading ? (
                <div className="rounded-2xl border border-[#ffd6dc]/50 bg-[#fffafb]/65 px-4 py-4 text-center text-sm text-[#6b7280]">
                  검색 중...
                </div>
              ) : searchQuery.trim().length < 2 ? (
                <div className="rounded-2xl border border-[#ffd6dc]/50 bg-[#fffafb]/65 px-4 py-4 text-center text-sm text-[#9ca3af]">
                  두 글자 이상 입력해 주세요
                </div>
              ) : searchResults.length === 0 ? (
                <div className="rounded-2xl border border-[#ffd6dc]/50 bg-[#fffafb]/65 px-4 py-4 text-center text-sm text-[#9ca3af]">
                  검색 결과가 없어요
                </div>
              ) : (
                searchResults.map((gym) => (
                  <button
                    key={gym.id}
                    onClick={() => {
                      handleGymSelect(gym);
                      setSearchOpen(false);
                    }}
                    className="w-full rounded-2xl border border-[#ffd6dc]/50 bg-[#fffafb]/72 px-4 py-3 text-left transition-colors hover:bg-[#fffafb]/86"
                  >
                    <div className="text-sm font-semibold text-[#111827]">
                      {gym.name}
                    </div>
                    <div className="mt-1 truncate text-xs text-[#6b7280]">
                      {gym.address}
                    </div>
                  </button>
                ))
              )}
            </div>
          </GlassPanel>
        )}

        {filterOpen && (
          <GlassPanel
            className={`w-[min(360px,calc(100vw-2rem))] px-4 py-4 ${isDesktop ? "" : "mr-0"}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[#111827]">
                  지금 보고 싶은 조건
                </div>
                <div className="text-[11px] text-[#6b7280]">
                  카테고리와 분위기를 바로 바꿔보세요
                </div>
              </div>
              <button
                onClick={() => handleFilterChange(DEFAULT_FILTERS)}
                className="rounded-full border border-[#ffd6dc]/50 bg-[#fffafb]/76 px-3 py-1.5 text-xs font-medium text-[#4b5563]"
              >
                초기화
              </button>
            </div>
            <SpotFilter
              filters={filters}
              onChange={handleFilterChange}
            />
          </GlassPanel>
        )}
      </div>

      <div
        className="absolute bottom-24 z-20 hidden lg:flex flex-col"
        style={{
          top: overlayTop,
          left: sideInset,
          width: leftPanelMode === "detail" ? leftPanelWidth : 320,
        }}
      >
        {leftPanelMode !== "closed" ? (
          <GlassPanel className="h-full">
            <div className="flex items-center gap-1 px-3 pb-2 pt-3 shrink-0">
              <button
                onClick={() => setLeftPanelMode("ranking")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  leftPanelMode === "ranking"
                    ? "bg-[#111827] text-white"
                    : "text-[#6b7280] hover:text-[#111827]"
                }`}
              >
                랭킹
              </button>
              <button
                onClick={() => setLeftPanelMode("list")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  leftPanelMode === "list"
                    ? "bg-[#111827] text-white"
                    : "text-[#6b7280] hover:text-[#111827]"
                }`}
              >
                목록
              </button>
              <button
                onClick={() => setLeftPanelMode("favorites")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  leftPanelMode === "favorites"
                    ? "bg-[#111827] text-white"
                    : "text-[#6b7280] hover:text-[#111827]"
                }`}
              >
                찜
              </button>
              {selectedGym && (
                <button
                  onClick={() => setLeftPanelMode("detail")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    leftPanelMode === "detail"
                      ? "bg-[#111827] text-white"
                      : "text-[#6b7280] hover:text-[#111827]"
                  }`}
                >
                  상세
                </button>
              )}
              {loading && (
                <span className="ml-1 text-[10px] text-[#9ca3af]">···</span>
              )}
              <div className="flex-1" />
              <button
                onClick={() => setLeftPanelMode("closed")}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-[#9ca3af] hover:bg-black/5"
              >
                ✕
              </button>
            </div>

            {leftPanelMode === "ranking" && (
              <RankingContent
                gyms={visibleGyms}
                onSelect={handleGymSelect}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
            {leftPanelMode === "list" && (
              <ListContent
                gyms={visibleGyms}
                loading={loading}
                onSelect={handleGymSelect}
                selectedId={selectedGym?.id}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
            {leftPanelMode === "favorites" && (
              <ListContent
                gyms={favoriteGyms}
                loading={false}
                onSelect={handleGymSelect}
                selectedId={selectedGym?.id}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                emptyMessage="아직 찜한 명소가 없어요"
              />
            )}
            {leftPanelMode === "detail" && selectedGym && (
              <div className="min-h-0 flex-1">
                {!selectedGymDetail ? (
                  <div className="flex h-full items-center justify-center text-sm text-[#6b7280]">
                    명소 정보를 불러오는 중...
                  </div>
                ) : (
                  <SpotDetailPanel
                    gym={selectedGymDetail}
                    initialReviews={selectedGymReviews}
                    isFavorite={favoriteIdSet.has(selectedGymDetail.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onClose={() => {
                      setSelectedGym(null);
                      setSelectedGymDetail(null);
                      setLeftPanelMode("list");
                    }}
                  />
                )}
              </div>
            )}
          </GlassPanel>
        ) : (
          <button
            onClick={() => setLeftPanelMode(selectedGym ? "detail" : "ranking")}
            className="self-start rounded-2xl border border-[#ffd6dc]/45 bg-[#fffafb]/70 px-3 py-4 text-sm text-[#6b7280] shadow-[0_14px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-colors hover:text-[#111827]"
          >
            ›
          </button>
        )}
      </div>

      <div
        className="absolute bottom-24 z-20 hidden w-[320px] lg:flex flex-col"
        style={{ top: overlayTop, right: sideInset }}
      >
        {rightJudgeOpen ? (
          <GlassPanel className="h-full">
            <div className="flex items-center px-3 pt-3 pb-2 shrink-0">
              <div className="flex-1">
                <div className="text-xs font-bold text-[#111827]">
                  여러분의 평가가 필요해요
                </div>
                <div className="text-[10px] text-[#9ca3af]">
                  최근 추가된 명소를 둘러보고 의견이 필요한 곳을 확인해보세요
                </div>
              </div>
              <button
                onClick={() => setRightJudgeOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-[#9ca3af] hover:bg-black/5"
              >
                ✕
              </button>
            </div>
            <JudgeContent gyms={visibleGyms} onSelect={handleGymSelect} />
          </GlassPanel>
        ) : (
          <button
            onClick={() => setRightJudgeOpen(true)}
            className="self-end rounded-2xl border border-[#ffd6dc]/45 bg-[#fffafb]/70 px-3 py-4 text-sm text-[#6b7280] shadow-[0_14px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-colors hover:text-[#111827]"
          >
            ‹
          </button>
        )}
      </div>

      {mobileListOpen && (
        <div
          className="absolute inset-x-3 bottom-[88px] z-20 flex flex-col lg:hidden"
          style={{ top: overlayTop }}
        >
          <GlassPanel className="h-full">
            <div className="flex items-center justify-between border-b border-[#ffd6dc]/40 px-4 py-3">
              <span className="text-sm font-semibold text-[#111827]">
                {loading ? "검색 중..." : `주변 명소 ${gyms.length}곳`}
              </span>
              <button
                onClick={() => setMobileListOpen(false)}
                className="text-xs text-[#6b7280]"
              >
                닫기
              </button>
            </div>
            <ListContent
              gyms={visibleGyms}
              loading={loading}
              onSelect={handleGymSelect}
              selectedId={selectedGym?.id}
              favoriteIds={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
            />
          </GlassPanel>
        </div>
      )}

      <button
        onClick={() => setMobileListOpen((prev) => !prev)}
        className="absolute bottom-[calc(86px+env(safe-area-inset-bottom))] left-3 z-20 rounded-full border border-[#ffd6dc]/50 bg-[#fffafb]/74 px-4 py-2 text-sm font-semibold text-[#111827] shadow-[0_14px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl lg:hidden"
      >
        {mobileListOpen ? "지도" : "목록"}
      </button>

      <FloatingTabBar />

      {selectedGym && (
        <div
          className="absolute inset-x-3 z-40 lg:hidden"
          style={{ bottom: MOBILE_SHEET_BOTTOM + 14, maxHeight: "84vh" }}
        >
          <GlassPanel className="max-h-[84vh] bg-[#fffafb]/72">
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-[#d1d5db]" />
            </div>
            {!selectedGymDetail ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-[#6b7280]">
                명소 정보를 불러오는 중...
              </div>
            ) : (
              <SpotDetailPanel
                gym={selectedGymDetail}
                initialReviews={selectedGymReviews}
                isFavorite={favoriteIdSet.has(selectedGymDetail.id)}
                onToggleFavorite={handleToggleFavorite}
                mobile
                onClose={() => {
                  setSelectedGym(null);
                  setSelectedGymDetail(null);
                }}
              />
            )}
          </GlassPanel>
        </div>
      )}

      {supportOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.20)] px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-[#ffd6dc]/55 bg-[#fffafb]/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold tracking-tight text-[#111827]">
                  후원하기
                </div>
                <div className="mt-1 text-xs text-[#6b7280]">
                  커피 한 잔 값의 후원이 서비스 유지에 큰 힘이 됩니다
                </div>
              </div>
              <button
                onClick={() => setSupportOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fffafb]/76 text-sm text-[#6b7280] shadow-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-[22px] border border-[#ffd6dc]/55 bg-[#fffafb]/80 px-4 py-3">
                <div className="text-xs font-bold text-[#111827]">계좌이체</div>
                <div className="mt-1 text-sm font-semibold text-[#374151]">
                  신한은행 110366096624 이중한
                </div>
                <button
                  onClick={() =>
                    handleCopySupport("account", "신한은행 110366096624 이중한")
                  }
                  className="mt-3 rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151]"
                >
                  {copyMessage === "account" ? "복사됨" : "계좌 복사"}
                </button>
              </div>

              <div className="rounded-[22px] border border-[#ffd6dc]/55 bg-[#fffafb]/80 px-4 py-3">
                <div className="text-xs font-bold text-[#111827]">문의</div>
                <div className="mt-1 text-sm font-semibold text-[#374151]">
                  ljhan0215@gmail.com
                </div>
                <button
                  onClick={() =>
                    handleCopySupport("email", "ljhan0215@gmail.com")
                  }
                  className="mt-3 rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151]"
                >
                  {copyMessage === "email" ? "복사됨" : "이메일 복사"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
