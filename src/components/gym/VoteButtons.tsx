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
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spot_id: spotId, vote_type: type, anon_session_id: sessionId, device_id: deviceId, nickname }),
      });

      if (res.ok) {
        if (type === 'up') setUp((v) => v + 1);
        else setDown((v) => v + 1);
        setMyVote(type);
        localStorage.setItem(`vote_${spotId}`, type);
      } else {
        const { error } = await res.json();
        alert(error || '투표에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={() => vote('up')} disabled={!!myVote || loading}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
          myVote === 'up' ? 'bg-[#ff6b81] text-white border-[#ff6b81]' :
          myVote ? 'bg-[#f3f4f6] text-[#9ca3af] border-[#e5e7eb] cursor-not-allowed' :
          'bg-white text-[#374151] border-[#e5e7eb] hover:border-[#ff6b81]/50 cursor-pointer'
        }`}>
        👍 {up}
      </button>
      <button onClick={() => vote('down')} disabled={!!myVote || loading}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
          myVote === 'down' ? 'bg-[#ef4444] text-white border-[#ef4444]' :
          myVote ? 'bg-[#f3f4f6] text-[#9ca3af] border-[#e5e7eb] cursor-not-allowed' :
          'bg-white text-[#374151] border-[#e5e7eb] hover:border-[#ef4444]/50 cursor-pointer'
        }`}>
        👎 {down}
      </button>
    </div>
  );
}
