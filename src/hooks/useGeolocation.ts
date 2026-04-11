'use client';

import { useState, useEffect } from 'react';

interface Coords {
  lat: number;
  lng: number;
}

const DEFAULT_COORDS: Coords = { lat: 37.5665, lng: 126.978 }; // 서울 시청

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords>(DEFAULT_COORDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return;
    }

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => {
        setError('위치 권한이 거부되었습니다. 기본 위치를 사용합니다.');
        setLoading(false);
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  return { coords, loading, error };
}
