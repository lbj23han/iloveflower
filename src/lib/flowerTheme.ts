import type { FlowerCategory, FlowerType } from '@/types';

type AccentStyle = {
  border: string;
  bg: string;
  text: string;
  softBg: string;
  strongBg: string;
  strongText: string;
};

const DEFAULT_STYLE: AccentStyle = {
  border: '#fda4af',
  bg: '#fff1f4',
  text: '#e11d48',
  softBg: '#fff5f7',
  strongBg: '#ff6b81',
  strongText: '#ffffff',
};

const FLOWER_STYLES: Record<FlowerType, AccentStyle> = {
  cherry: {
    border: '#f9a8d4',
    bg: '#fdf2f8',
    text: '#db2777',
    softBg: '#fdf2f8',
    strongBg: '#f9a8d4',
    strongText: '#831843',
  },
  plum: {
    border: '#c084fc',
    bg: '#faf5ff',
    text: '#9333ea',
    softBg: '#faf5ff',
    strongBg: '#c084fc',
    strongText: '#581c87',
  },
  forsythia: {
    border: '#facc15',
    bg: '#fefce8',
    text: '#a16207',
    softBg: '#fefce8',
    strongBg: '#facc15',
    strongText: '#713f12',
  },
  azalea: {
    border: '#fb7185',
    bg: '#fff1f2',
    text: '#e11d48',
    softBg: '#fff1f2',
    strongBg: '#fb7185',
    strongText: '#881337',
  },
  wisteria: {
    border: '#a78bfa',
    bg: '#f5f3ff',
    text: '#7c3aed',
    softBg: '#f5f3ff',
    strongBg: '#a78bfa',
    strongText: '#4c1d95',
  },
  rose: {
    border: '#fb7185',
    bg: '#fff1f2',
    text: '#be123c',
    softBg: '#fff1f2',
    strongBg: '#fb7185',
    strongText: '#881337',
  },
  cosmos: {
    border: '#f9a8d4',
    bg: '#fdf2f8',
    text: '#be185d',
    softBg: '#fdf2f8',
    strongBg: '#f9a8d4',
    strongText: '#831843',
  },
  sunflower: {
    border: '#fbbf24',
    bg: '#fffbeb',
    text: '#b45309',
    softBg: '#fffbeb',
    strongBg: '#fbbf24',
    strongText: '#78350f',
  },
  tulip: {
    border: '#fb7185',
    bg: '#fff7ed',
    text: '#ea580c',
    softBg: '#fff7ed',
    strongBg: '#fb7185',
    strongText: '#7c2d12',
  },
  lavender: {
    border: '#c4b5fd',
    bg: '#faf5ff',
    text: '#8b5cf6',
    softBg: '#faf5ff',
    strongBg: '#c4b5fd',
    strongText: '#5b21b6',
  },
  rape: {
    border: '#facc15',
    bg: '#fefce8',
    text: '#a16207',
    softBg: '#fefce8',
    strongBg: '#facc15',
    strongText: '#713f12',
  },
  etc: DEFAULT_STYLE,
};

const CATEGORY_STYLES: Partial<Record<FlowerCategory, AccentStyle>> = {
  cafe: {
    border: '#c08457',
    bg: '#fdf8f3',
    text: '#92400e',
    softBg: '#fef7ed',
    strongBg: '#d6a77a',
    strongText: '#4a2b13',
  },
};

export function getAccentStyle(flowerTypes?: FlowerType[] | null, category?: FlowerCategory | null): AccentStyle {
  if (category && CATEGORY_STYLES[category]) {
    return CATEGORY_STYLES[category]!;
  }

  const firstFlower = flowerTypes?.[0] ?? 'etc';
  return FLOWER_STYLES[firstFlower] ?? DEFAULT_STYLE;
}
