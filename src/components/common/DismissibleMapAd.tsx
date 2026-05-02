'use client';

import { useState } from 'react';
import TossAdBanner from '@/components/common/TossAdBanner';

export default function DismissibleMapAd() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-3 z-20 lg:inset-x-auto lg:right-5 lg:w-[360px]"
      style={{ bottom: 'calc(138px + env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto relative overflow-hidden rounded-[24px] border border-[#ffd6dc]/55 bg-[#fffafb]/82 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm font-semibold text-[#6b7280] shadow-sm transition-transform active:scale-[0.96]"
          aria-label="광고 닫기"
        >
          ×
        </button>
        <TossAdBanner variant="card" />
      </div>
    </div>
  );
}
