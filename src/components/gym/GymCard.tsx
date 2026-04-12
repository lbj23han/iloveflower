'use client';

import { FlowerSpotMapItem, CATEGORY_LABELS, BLOOM_STATUS_LABELS } from '@/types';
import { getAccentStyle } from '@/lib/flowerTheme';

interface Props {
  spot: FlowerSpotMapItem;
  onClick?: () => void;
}

export default function SpotCard({ spot, onClick }: Props) {
  const bloomLabel = spot.bloom_status ? BLOOM_STATUS_LABELS[spot.bloom_status] : null;
  const flowerLabel = spot.flower_types[0]
    ? { cherry: '벚꽃', plum: '매화', forsythia: '개나리', azalea: '진달래', magnolia: '목련', wisteria: '등나무', tulip: '튤립', rape: '유채꽃', peony: '작약', peachblossom: '복숭아꽃', rose: '장미', sunflower: '해바라기', lavender: '라벤더', hydrangea: '수국', lotus: '연꽃', morningglory: '나팔꽃', babysbreath: '안개꽃', zinnia: '백일홍', neungsohwa: '능소화', pomegranateblossom: '석류꽃', cosmos: '코스모스', silvergrass: '억새', pinkmuhly: '핑크뮬리', buckwheat: '메밀꽃', mossrose: '채송화', aconite: '투구꽃', chuhaedang: '추해당', chrysanthemum: '국화·구절초', camellia: '동백꽃', narcissus: '수선화', clivia: '군자란', cyclamen: '시클라멘', adonis: '복수초', christmasrose: '크리스마스로즈', snowflower: '눈꽃', etc: '기타' }[spot.flower_types[0]] ?? '기타'
    : null;
  const accent = getAccentStyle(spot.flower_types, spot.category);

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-[20px] border border-white/55 bg-white/80 px-4 py-4 shadow-sm transition-all hover:shadow-md"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-bold text-[#111827]">{spot.name}</div>
          {spot.address && <div className="truncate text-xs text-[#9ca3af]">{spot.address}</div>}
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: accent.bg, color: accent.text }}
        >
          {CATEGORY_LABELS[spot.category]}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {flowerLabel && (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: accent.bg, color: accent.text }}
          >
            {flowerLabel}
          </span>
        )}
        {bloomLabel && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            spot.bloom_status === 'peak' ? 'bg-[#ff6b81] text-white' :
            spot.bloom_status === 'blooming' ? 'bg-[#ffd6e0] text-[#c0392b]' :
            'bg-[#f3f4f6] text-[#6b7280]'
          }`}>
            {bloomLabel}
          </span>
        )}
        {spot.has_active_festival && (
          <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-xs font-medium text-[#c2410c]">
            진행 중 축제
          </span>
        )}
        {!spot.has_active_festival && spot.festival_count > 0 && (
          <span className="rounded-full bg-[#fef3c7] px-2.5 py-1 text-xs font-medium text-[#92400e]">
            축제 {spot.festival_count}
          </span>
        )}
        {spot.entry_fee === 0 && (
          <span className="rounded-full bg-[#ecfbf3] px-2.5 py-1 text-xs font-medium text-[#00935d]">무료</span>
        )}
        {spot.has_night_light && (
          <span className="rounded-full bg-[#fffbeb] px-2.5 py-1 text-xs font-medium text-[#b45309]">야간조명</span>
        )}
        {spot.pet_friendly && (
          <span className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs font-medium text-[#2563eb]">반려동물</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-[#9ca3af]">
        <span>👍 {spot.vote_up}</span>
        <span>👎 {spot.vote_down}</span>
      </div>
    </div>
  );
}
