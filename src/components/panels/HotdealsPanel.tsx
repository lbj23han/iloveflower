'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Deal {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  original_price?: number | null;
  deal_type: string;
  expires_at?: string | null;
  gym?: { id: string; name: string } | null;
  created_at: string;
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  trial: '체험권', event: '이벤트', discount: '할인', promo: '프로모션',
};

const CATEGORIES = ['전체', '체험권', '이벤트', '할인', '프로모션'];

export default function HotdealsPanel() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('전체');

  useEffect(() => {
    fetch('/api/hotdeals').then((r) => r.json()).then((data) => {
      setDeals(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = cat === '전체' ? deals : deals.filter((d) => DEAL_TYPE_LABELS[d.deal_type] === cat);

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-[#e5e7eb] shrink-0">
        <span className="font-bold text-[15px] text-[#111827]">핫딜</span>
        <Link
          href="/report?type=hotdeal"
          className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center text-lg"
        >
          ✏️
        </Link>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1.5 px-4 py-2 border-b border-[#e5e7eb] overflow-x-auto scrollbar-hide shrink-0">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              cat === c ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#374151]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f3f4f6]">
        {loading ? (
          <div className="py-10 text-center text-sm text-[#9ca3af]">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#9ca3af]">
            등록된 핫딜이 없어요
            <br />
            <Link href="/report?type=hotdeal" className="text-[#00C471] underline mt-1 inline-block text-xs">핫딜 제보하기 →</Link>
          </div>
        ) : (
          filtered.map((deal) => (
            <div key={deal.id} className="flex items-start gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#fee2e2] text-[#dc2626] font-medium">
                    {DEAL_TYPE_LABELS[deal.deal_type] ?? deal.deal_type}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#111827] mb-0.5">{deal.title}</div>
                {deal.description && (
                  <div className="text-[11px] text-[#6b7280] mb-1 line-clamp-2">{deal.description}</div>
                )}
                <div className="text-[11px] text-[#9ca3af]">
                  {deal.gym?.name && (
                    <Link href={`/gyms/${deal.gym.id}`} className="text-[#00C471]">{deal.gym.name} · </Link>
                  )}
                  {timeAgo(deal.created_at)}
                  {deal.expires_at && ` · ~${new Date(deal.expires_at).toLocaleDateString('ko-KR')}`}
                </div>
              </div>
              {deal.price != null && (
                <div className="shrink-0 text-right">
                  {deal.original_price && (
                    <div className="text-[10px] text-[#9ca3af] line-through">{deal.original_price.toLocaleString()}원</div>
                  )}
                  <div className="text-sm font-bold text-[#dc2626]">{deal.price.toLocaleString()}원</div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
