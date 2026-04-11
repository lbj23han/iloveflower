'use client';

import { FilterState, FlowerCategory, CATEGORY_LABELS, FLOWER_TYPE_LABELS, BLOOM_STATUS_LABELS } from '@/types';

interface Props {
  filters: FilterState;
  onChange: (partial: Partial<FilterState>) => void;
}

const FLOWER_TYPES = Object.entries(FLOWER_TYPE_LABELS) as [string, string][];
const CATEGORIES = [['all', '전체'], ...Object.entries(CATEGORY_LABELS)] as [string, string][];
const BLOOM_STATUSES = [['all', '전체'], ...Object.entries(BLOOM_STATUS_LABELS)] as [string, string][];

export default function SpotFilter({ filters, onChange }: Props) {
  return (
    <div className="space-y-4 px-4 py-4">
      {/* 카테고리 */}
      <div>
        <div className="mb-2 text-xs font-semibold text-[#6b7280]">카테고리</div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(([val, label]) => (
            <button key={val} onClick={() => onChange({ category: val as FlowerCategory | 'all' })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filters.category === val ? 'bg-[#ff6b81] text-white' : 'bg-white/80 text-[#374151] border border-white/55'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 꽃 종류 */}
      <div>
        <div className="mb-2 text-xs font-semibold text-[#6b7280]">꽃 종류</div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => onChange({ flower_type: 'all' })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filters.flower_type === 'all' ? 'bg-[#ff6b81] text-white' : 'bg-white/80 text-[#374151] border border-white/55'}`}>
            전체
          </button>
          {FLOWER_TYPES.map(([val, label]) => (
            <button key={val} onClick={() => onChange({ flower_type: val as FilterState['flower_type'] })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filters.flower_type === val ? 'bg-[#ff6b81] text-white' : 'bg-white/80 text-[#374151] border border-white/55'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 개화 상태 */}
      <div>
        <div className="mb-2 text-xs font-semibold text-[#6b7280]">개화 상태</div>
        <div className="flex flex-wrap gap-1.5">
          {BLOOM_STATUSES.map(([val, label]) => (
            <button key={val} onClick={() => onChange({ bloom_status: val as FilterState['bloom_status'] })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filters.bloom_status === val ? 'bg-[#ff6b81] text-white' : 'bg-white/80 text-[#374151] border border-white/55'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 편의 정보 */}
      <div>
        <div className="mb-2 text-xs font-semibold text-[#6b7280]">편의 정보</div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'has_night_light', label: '야간조명' },
            { key: 'has_parking', label: '주차 가능' },
            { key: 'pet_friendly', label: '반려동물' },
            { key: 'photo_spot', label: '포토스팟' },
            { key: 'free_only', label: '무료입장' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => onChange({ [key]: !filters[key as keyof FilterState] } as Partial<FilterState>)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filters[key as keyof FilterState] ? 'bg-[#ff6b81] text-white' : 'bg-white/80 text-[#374151] border border-white/55'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 정렬 */}
      <div>
        <div className="mb-2 text-xs font-semibold text-[#6b7280]">정렬</div>
        <div className="flex gap-1.5">
          {[
            { val: 'recommended', label: '추천순' },
            { val: 'bloom', label: '개화순' },
            { val: 'distance', label: '거리순' },
          ].map(({ val, label }) => (
            <button key={val} onClick={() => onChange({ sort: val as FilterState['sort'] })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filters.sort === val ? 'bg-[#ff6b81] text-white' : 'bg-white/80 text-[#374151] border border-white/55'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
