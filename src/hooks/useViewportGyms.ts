'use client';

import { useState, useCallback, useRef } from 'react';
import { FilterState, FlowerSpotMapItem, ViewportBounds } from '@/types';

export function useViewportSpots() {
  const [spots, setSpots] = useState<FlowerSpotMapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [zoomHint, setZoomHint] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const fetchSpots = useCallback(
    async (bounds: ViewportBounds, filters: FilterState) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      setLoading(true);
      try {
        const params = new URLSearchParams({
          swLat: String(bounds.swLat),
          swLng: String(bounds.swLng),
          neLat: String(bounds.neLat),
          neLng: String(bounds.neLng),
          sort: filters.sort,
          category: filters.category,
          flower_type: filters.flower_type,
          bloom_status: filters.bloom_status,
          season: filters.season,
          peak_month: String(filters.peak_month),
          has_night_light: String(filters.has_night_light),
          has_parking: String(filters.has_parking),
          pet_friendly: String(filters.pet_friendly),
          photo_spot: String(filters.photo_spot),
          free_only: String(filters.free_only),
        });

        const res = await fetch(`/api/gyms?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data: { spots: FlowerSpotMapItem[]; meta?: { zoomHint?: string | null } } = await res.json();
        if (requestId === requestIdRef.current) {
          setSpots(data.spots ?? []);
          setZoomHint(data.meta?.zoomHint ?? null);
          setHasFetched(true);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error(e);
          if (requestId === requestIdRef.current) {
            setSpots([]);
            setZoomHint(null);
            setHasFetched(true);
          }
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  return { spots, loading, fetchSpots, zoomHint, hasFetched };
}
