'use client';

import { useState, useEffect } from 'react';
import { getOrCreateSession, getDeviceId } from '@/lib/session';

interface Props {
  spotId: string;
  initialUp: number;
  initialDown: number;
}

export default function VoteButtons({ spotId, initialUp, initialDown }: Props) {
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [myVote, setMyVote] = useState<'up' | 'down' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`vote_${spotId}`);
    if (stored === 'up' || stored === 'down') setMyVote(stored);
  }, [spotId]);

  const vote = async (type: 'up' | 'down') => {
    if (loading || myVote) return;
    setLoading(true);

    const { sessionId, nickname } = getOrCreateSession();
    const deviceId = await getDeviceId();

    try {
      let ok = false;
      let errorMsg = '';
      if (process.env.NEXT_PUBLIC_TOSS_BUILD === 'true') {
        const { voteClient } = await import('@/lib/clientApi');
        const result = await voteClient({ spot_id: spotId, vote_type: type, anon_session_id: sessionId, device_id: deviceId });
        ok = result.ok;
        errorMsg = result.error ?? '';
      } else {
        const res = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spot_id: spotId, vote_type: type, anon_session_id: sessionId, device_id: deviceId, nickname }),
        });
        ok = res.ok;
        if (!res.ok) { const j = await res.json(); errorMsg = j.error || '투표에 실패했습니다.'; }
      }

      if (ok) {
        if (type === 'up') setUp((v) => v + 1);
        else setDown((v) => v + 1);
        setMyVote(type);
        localStorage.setItem(`vote_${spotId}`, type);
      } else {
        alert(errorMsg || '투표에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={() => vote('up')} disabled={!!myVote || loading}
        className={`flex min-h-[44px] min-w-[44px] select-none items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border leading-relaxed transition-transform active:scale-[0.98] ${
          myVote === 'up' ? 'bg-[#ff6b81] text-white border-[#ff6b81]' :
          myVote ? 'bg-[#f3f4f6] text-[#9ca3af] border-[#e5e7eb] cursor-not-allowed' :
          'bg-white/80 text-[#374151] border-[#e5e7eb] cursor-pointer'
        }`}>
        👍 {up}
      </button>
      <button onClick={() => vote('down')} disabled={!!myVote || loading}
        className={`flex min-h-[44px] min-w-[44px] select-none items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border leading-relaxed transition-transform active:scale-[0.98] ${
          myVote === 'down' ? 'bg-[#ef4444] text-white border-[#ef4444]' :
          myVote ? 'bg-[#f3f4f6] text-[#9ca3af] border-[#e5e7eb] cursor-not-allowed' :
          'bg-white/80 text-[#374151] border-[#e5e7eb] cursor-pointer'
        }`}>
        👎 {down}
      </button>
    </div>
  );
}
