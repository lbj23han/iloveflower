'use client';

import { useMemo, useState } from 'react';
import {
  FilterState,
  FlowerCategory,
  CATEGORY_LABELS,
  FLOWER_TYPE_LABELS,
  BLOOM_STATUS_LABELS,
  FESTIVAL_FILTER_LABELS,
  PEAK_MONTH_LABELS,
  SEASON_FLOWER_TYPES,
} from '@/types';

interface Props {
  filters: FilterState;
  onChange: (partial: Partial<FilterState>) => void;
}

const CATEGORIES = [['all', '전체'], ...Object.entries(CATEGORY_LABELS)] as [string, string][];
const BLOOM_STATUSES = [['all', '전체'], ...Object.entries(BLOOM_STATUS_LABELS)] as [string, string][];
const PEAK_MONTHS = Object.entries(PEAK_MONTH_LABELS).map(([month, label]) => [
  Number(month),
  label,
]) as [number, string][];
const FESTIVAL_FILTERS = Object.entries(FESTIVAL_FILTER_LABELS) as [
  FilterState['festival'],
  string,
][];

const SEASON_BUTTONS = [
  { key: 'spring', label: '봄꽃' },
  { key: 'summer', label: '여름꽃' },
  { key: 'autumn', label: '가을꽃' },
  { key: 'winter', label: '겨울꽃' },
] as const;

type FilterSection = 'explore' | 'timing' | 'comfort';

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-[#ff6b81] text-white'
          : 'border border-white/55 bg-white/80 text-[#374151]'
      }`}
    >
      {children}
    </button>
  );
}

export default function SpotFilter({ filters, onChange }: Props) {
  const [activeSection, setActiveSection] = useState<FilterSection>('explore');

  const timingSummary = useMemo(() => {
    return filters.peak_month === 'all' ? '절정 시기 전체' : PEAK_MONTH_LABELS[filters.peak_month];
  }, [filters.peak_month]);

  return (
    <div className="flex max-h-[min(68vh,720px)] flex-col">
      <div className="mb-4 rounded-[22px] border border-[#ffd6dc]/50 bg-[#fff6f8]/76 p-1">
        <div className="grid grid-cols-3 gap-1">
          {[
            { key: 'explore', label: '탐색' },
            { key: 'timing', label: '시기' },
            { key: 'comfort', label: '편의' },
          ].map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key as FilterSection)}
              className={`rounded-[18px] px-3 py-2 text-xs font-semibold transition-colors ${
                activeSection === section.key
                  ? 'bg-[#ff6b81] text-white shadow-[0_8px_20px_rgba(255,107,129,0.22)]'
                  : 'text-[#6b7280]'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {activeSection === 'explore' && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-xs font-semibold text-[#6b7280]">꽃 종류</div>
              {filters.season === 'all' ? (
                <div className="flex flex-wrap gap-1.5">
                  {SEASON_BUTTONS.map(({ key, label }) => (
                    <FilterChip
                      key={key}
                      active={false}
                      onClick={() => onChange({ season: key, flower_type: 'all' })}
                    >
                      {label}
                    </FilterChip>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <FilterChip
                    active={false}
                    onClick={() => onChange({ season: 'all', flower_type: 'all' })}
                  >
                    ← 전체
                  </FilterChip>
                  {(SEASON_FLOWER_TYPES[filters.season] ?? []).map((flowerKey) => (
                    <FilterChip
                      key={flowerKey}
                      active={filters.flower_type === flowerKey}
                      onClick={() => onChange({ flower_type: flowerKey })}
                    >
                      {FLOWER_TYPE_LABELS[flowerKey]}
                    </FilterChip>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-[#6b7280]">카테고리</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(([val, label]) => (
                  <FilterChip
                    key={val}
                    active={filters.category === val}
                    onClick={() => onChange({ category: val as FlowerCategory | 'all' })}
                  >
                    {label}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-[#6b7280]">개화 상태</div>
              <div className="flex flex-wrap gap-1.5">
                {BLOOM_STATUSES.map(([val, label]) => (
                  <FilterChip
                    key={val}
                    active={filters.bloom_status === val}
                    onClick={() => onChange({ bloom_status: val as FilterState['bloom_status'] })}
                  >
                    {label}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'timing' && (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-[#ffd6dc]/45 bg-[#fffafb]/72 px-4 py-3">
              <div className="text-[11px] font-semibold text-[#6b7280]">지금 선택된 시기</div>
              <div className="mt-1 text-sm font-semibold text-[#111827]">{timingSummary}</div>
              <div className="mt-1 text-[11px] text-[#9ca3af]">
                절정 월 기준으로 명소를 걸러볼 수 있어요
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-[#6b7280]">절정 시기</div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={filters.peak_month === 'all'}
                  onClick={() => onChange({ peak_month: 'all' })}
                >
                  전체
                </FilterChip>
                {PEAK_MONTHS.map(([month, label]) => (
                  <FilterChip
                    key={month}
                    active={filters.peak_month === month}
                    onClick={() => onChange({ peak_month: month })}
                  >
                    {label}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'comfort' && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-xs font-semibold text-[#6b7280]">축제</div>
              <div className="flex flex-wrap gap-1.5">
                {FESTIVAL_FILTERS.map(([val, label]) => (
                  <FilterChip
                    key={val}
                    active={filters.festival === val}
                    onClick={() => onChange({ festival: val })}
                  >
                    {label}
                  </FilterChip>
                ))}
              </div>
            </div>

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
                  <FilterChip
                    key={key}
                    active={Boolean(filters[key as keyof FilterState])}
                    onClick={() =>
                      onChange({ [key]: !filters[key as keyof FilterState] } as Partial<FilterState>)
                    }
                  >
                    {label}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-[#6b7280]">정렬</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { val: 'recommended', label: '추천순' },
                  { val: 'bloom', label: '개화순' },
                  { val: 'distance', label: '거리순' },
                ].map(({ val, label }) => (
                  <FilterChip
                    key={val}
                    active={filters.sort === val}
                    onClick={() => onChange({ sort: val as FilterState['sort'] })}
                  >
                    {label}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
