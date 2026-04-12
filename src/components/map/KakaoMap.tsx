'use client';

import { useEffect, useRef, useCallback } from 'react';
import { FlowerSpotMapItem, CATEGORY_LABELS, ViewportBounds } from '@/types';
import { getAccentStyle } from '@/lib/flowerTheme';

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (container: HTMLElement, opts: object) => KakaoMapType;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        LatLngBounds: new () => KakaoLatLngBounds;
        Marker: new (opts: object) => KakaoMarker;
        CustomOverlay: new (opts: object) => KakaoOverlay;
        MarkerClusterer: new (opts: object) => KakaoClusterer;
        event: {
          addListener: (target: object, type: string, handler: () => void) => void;
        };
      };
    };
  }
}

type KakaoMapType = {
  getBounds: () => KakaoLatLngBounds;
  setCenter: (latlng: KakaoLatLng) => void;
  setLevel: (level: number) => void;
  panBy: (x: number, y: number) => void;
};
type KakaoLatLng = { getLat: () => number; getLng: () => number };
type KakaoLatLngBounds = { getSouthWest: () => KakaoLatLng; getNorthEast: () => KakaoLatLng };
type KakaoMarker = { setMap: (map: KakaoMapType | null) => void };
type KakaoOverlay = { setMap: (map: KakaoMapType | null) => void };
type KakaoClusterer = { addMarkers: (markers: KakaoMarker[]) => void; clear: () => void };

const BLOOM_COLORS: Record<string, string> = {
  peak: '#ff6b81',
  blooming: '#ff9eb5',
  falling: '#ffc2d1',
  budding: '#ffd6e0',
  before: '#d1d5db',
  done: '#9ca3af',
};

function getBloomColor(status: string | null) {
  return status ? (BLOOM_COLORS[status] ?? '#d1d5db') : '#d1d5db';
}

interface Props {
  center: { lat: number; lng: number };
  spots: FlowerSpotMapItem[];
  currentPosition?: { lat: number; lng: number } | null;
  onBoundsChanged: (bounds: ViewportBounds) => void;
  onSpotSelect: (spot: FlowerSpotMapItem) => void;
  selectedSpotId?: string | null;
  selectedSpotPosition?: { lat: number; lng: number } | null;
  focusPosition?: { lat: number; lng: number } | null;
  focusTrigger?: number;
  panOffset?: { x: number; y: number };
}

export default function KakaoMap({
  center,
  spots,
  currentPosition,
  onBoundsChanged,
  onSpotSelect,
  selectedSpotId,
  selectedSpotPosition,
  focusPosition,
  focusTrigger,
  panOffset,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapType | null>(null);
  const overlaysRef = useRef<KakaoOverlay[]>([]);
  const currentLocationOverlayRef = useRef<KakaoOverlay | null>(null);
  const clustererRef = useRef<KakaoClusterer | null>(null);
  const initializedRef = useRef(false);
  const panOffsetRef = useRef(panOffset);
  const lastFocusedKeyRef = useRef<string | null>(null);
  const lastBoundsKeyRef = useRef<string | null>(null);
  const onBoundsChangedRef = useRef(onBoundsChanged);
  const onSpotSelectRef = useRef(onSpotSelect);
  panOffsetRef.current = panOffset;
  onBoundsChangedRef.current = onBoundsChanged;
  onSpotSelectRef.current = onSpotSelect;

  const getBounds = useCallback((map: KakaoMapType): ViewportBounds => {
    const b = map.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    return { swLat: sw.getLat(), swLng: sw.getLng(), neLat: ne.getLat(), neLng: ne.getLng() };
  }, []);

  const emitBounds = useCallback((map: KakaoMapType) => {
    const nextBounds = getBounds(map);
    const nextKey = [
      nextBounds.swLat.toFixed(4),
      nextBounds.swLng.toFixed(4),
      nextBounds.neLat.toFixed(4),
      nextBounds.neLng.toFixed(4),
    ].join(':');
    if (lastBoundsKeyRef.current === nextKey) return;
    lastBoundsKeyRef.current = nextKey;
    onBoundsChangedRef.current(nextBounds);
  }, [getBounds]);

  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;

    const safeLat = typeof center.lat === 'number' && !isNaN(center.lat) ? center.lat : 37.5665;
    const safeLng = typeof center.lng === 'number' && !isNaN(center.lng) ? center.lng : 126.9780;

    const init = () => {
      if (initializedRef.current || !containerRef.current) return;
      try {
        const { maps } = window.kakao;
        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(safeLat, safeLng),
          level: 5,
        });
        mapRef.current = map;

        if (maps.MarkerClusterer) {
          const clusterer = new maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 7,
            styles: [{
              width: '36px', height: '36px',
              background: '#ff6b81', borderRadius: '50%',
              color: '#fff', textAlign: 'center', lineHeight: '36px',
              fontSize: '12px', fontWeight: '700',
              border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,.3)',
            }],
          });
          clustererRef.current = clusterer;
        }

        maps.event.addListener(map, 'idle', () => emitBounds(map));
        emitBounds(map);
        initializedRef.current = true;
      } catch (e) {
        console.error('[KakaoMap] init error:', e);
      }
    };

    const tryInit = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(init);
      } else {
        const timer = setInterval(() => {
          if (window.kakao?.maps) {
            clearInterval(timer);
            window.kakao.maps.load(init);
          }
        }, 100);
        setTimeout(() => clearInterval(timer), 10000);
      }
    };

    tryInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마커 업데이트
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const { maps } = window.kakao;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    currentLocationOverlayRef.current?.setMap(null);
    currentLocationOverlayRef.current = null;
    clustererRef.current?.clear();

    spots.forEach((spot) => {
      if (!spot.lat || !spot.lng) return;
      const isSelected = selectedSpotId === spot.id;
      const bloomColor = getBloomColor(spot.bloom_status);
      const accent = getAccentStyle(spot.flower_types, spot.category);
      const categoryLabel = CATEGORY_LABELS[spot.category] ?? '기타';
      const flowerLabel = spot.flower_types[0] ? spot.flower_types[0] : null;
      const label = flowerLabel
        ? { cherry: '벚꽃', plum: '매화', forsythia: '개나리', azalea: '진달래', magnolia: '목련', wisteria: '등나무', tulip: '튤립', rape: '유채꽃', peony: '작약', peachblossom: '복숭아꽃', rose: '장미', sunflower: '해바라기', lavender: '라벤더', hydrangea: '수국', lotus: '연꽃', morningglory: '나팔꽃', babysbreath: '안개꽃', zinnia: '백일홍', neungsohwa: '능소화', pomegranateblossom: '석류꽃', cosmos: '코스모스', silvergrass: '억새', pinkmuhly: '핑크뮬리', buckwheat: '메밀꽃', mossrose: '채송화', aconite: '투구꽃', chuhaedang: '추해당', chrysanthemum: '국화·구절초', camellia: '동백꽃', narcissus: '수선화', clivia: '군자란', cyclamen: '시클라멘', adonis: '복수초', christmasrose: '크리스마스로즈', snowflower: '눈꽃', etc: categoryLabel }[flowerLabel] ?? categoryLabel
        : categoryLabel;

      const bg = isSelected ? '#111827' : 'rgba(255,255,255,0.96)';
      const color = isSelected ? '#ffffff' : '#111827';
      const borderColor = isSelected ? '#111827' : accent.border;
      const borderWidth = isSelected ? '2px' : '2px';
      const shadow = isSelected ? '0 8px 18px rgba(17,24,39,0.28)' : '0 4px 10px rgba(15,23,42,0.14)';

      const content = document.createElement('div');
      content.innerHTML = `
        <div style="
          display:inline-flex; align-items:center; gap:3px;
          background:${bg}; color:${color};
          border:${borderWidth} solid ${borderColor};
          border-radius:999px; padding:5px 9px;
          font-size:11px; font-weight:800;
          letter-spacing:-0.02em; white-space:nowrap;
          cursor:pointer; box-shadow:${shadow};
          font-family:-apple-system,sans-serif;
        ">
          <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${bloomColor};box-shadow:0 0 0 1px rgba(255,255,255,0.8)"></span>
          ${label}
        </div>
      `;
      content.addEventListener('click', () => onSpotSelectRef.current(spot));

      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(spot.lat, spot.lng),
        content,
        yAnchor: 1.3,
      });
      overlay.setMap(mapRef.current!);
      overlaysRef.current.push(overlay);
    });

    if (currentPosition?.lat && currentPosition?.lng) {
      const content = document.createElement('div');
      content.style.pointerEvents = 'none';
      content.innerHTML = `
        <div style="position:relative;width:20px;height:20px;">
          <span style="
            position:absolute;inset:-8px;
            border-radius:999px;
            background:rgba(59,130,246,0.18);
            border:1px solid rgba(59,130,246,0.28);
          "></span>
          <span style="
            position:absolute;inset:4px;
            border-radius:999px;
            background:#3b82f6;
            border:2px solid #ffffff;
            box-shadow:0 4px 12px rgba(59,130,246,0.35);
          "></span>
        </div>
      `;

      const currentOverlay = new maps.CustomOverlay({
        position: new maps.LatLng(currentPosition.lat, currentPosition.lng),
        content,
        yAnchor: 0.5,
      });

      currentOverlay.setMap(mapRef.current!);
      currentLocationOverlayRef.current = currentOverlay;
    }
  }, [currentPosition?.lat, currentPosition?.lng, spots, selectedSpotId]);

  useEffect(() => {
    if (!selectedSpotId) { lastFocusedKeyRef.current = null; return; }
    if (!mapRef.current || !window.kakao?.maps) return;
    const lat = selectedSpotPosition?.lat;
    const lng = selectedSpotPosition?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    const { x = 0, y = 0 } = panOffsetRef.current ?? {};
    const focusKey = `${selectedSpotId}:${lat}:${lng}:${x}:${y}`;
    if (lastFocusedKeyRef.current === focusKey) return;
    lastFocusedKeyRef.current = focusKey;

    mapRef.current.setCenter(new window.kakao.maps.LatLng(lat, lng));
    if (x || y) setTimeout(() => mapRef.current?.panBy(x, y), 80);
  }, [selectedSpotId, selectedSpotPosition?.lat, selectedSpotPosition?.lng, panOffset?.x, panOffset?.y]);

  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps || !focusTrigger) return;
    const lat = focusPosition?.lat;
    const lng = focusPosition?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    const { x = 0, y = 0 } = panOffsetRef.current ?? {};
    mapRef.current.setCenter(new window.kakao.maps.LatLng(lat, lng));
    if (x || y) setTimeout(() => mapRef.current?.panBy(x, y), 80);
  }, [focusTrigger, focusPosition?.lat, focusPosition?.lng]);

  return <div ref={containerRef} className="w-full h-full" />;
}
