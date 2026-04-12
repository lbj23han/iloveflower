/* eslint-disable @typescript-eslint/no-require-imports */
const {
  createServiceClient,
  fetchAllByRange,
  normalizeFlowerTypes,
  nowIso,
} = require('./seedHelpers.cjs');

const FLOWER_RULES = [
  { patterns: ['목련'], flower_types: ['magnolia'], peak: [3, 4] },
  { patterns: ['등나무', '등꽃'], flower_types: ['wisteria'], peak: [4, 5] },
  { patterns: ['작약'], flower_types: ['peony'], peak: [5, 6] },
  { patterns: ['복숭아꽃', '복사꽃'], flower_types: ['peach'], peak: [3, 4] },
  { patterns: ['꽃잔디'], flower_types: ['phlox'], peak: [4, 5] },
  { patterns: ['나팔꽃'], flower_types: ['morningglory'], peak: [7, 8] },
  { patterns: ['안개꽃'], flower_types: ['babysbreath'], peak: [6, 7] },
  { patterns: ['백일홍'], flower_types: ['zinnia'], peak: [7, 9] },
  { patterns: ['석류꽃'], flower_types: ['pomegranateblossom'], peak: [6, 7] },
  { patterns: ['채송화'], flower_types: ['mossrose'], peak: [7, 9] },
  { patterns: ['투구꽃'], flower_types: ['aconite'], peak: [9, 10] },
  { patterns: ['추해당'], flower_types: ['chuhaedang'], peak: [9, 10] },
  { patterns: ['군자란'], flower_types: ['clivia'], peak: [2, 4] },
  { patterns: ['시클라멘'], flower_types: ['cyclamen'], peak: [11, 2] },
  { patterns: ['복수초'], flower_types: ['adonis'], peak: [1, 2] },
  { patterns: ['크리스마스로즈'], flower_types: ['christmasrose'], peak: [12, 2] },
];

const NOISE_KEYWORDS = [
  '카페',
  '커피',
  '베이커리',
  '다방',
  '스터디카페',
  '플라워카페',
  '스타벅스',
  '이디야',
  '투썸',
  '빽다방',
  '할리스',
  '공차',
  '메가mgc',
  '메가m',
  '컴포즈',
  '매머드',
  '백미당',
  '벤티프레소',
  '폴바셋',
  '무인상점',
  '편의점',
  '주차장',
  '화장실',
  '매표소',
  '안내센터',
  '전기차충전소',
  '출입구',
  '정원역',
  '놀이터',
  '공연장',
  '스포츠센터',
  '체육센터',
];

function pickFlowerRule(name) {
  const text = String(name || '').trim();
  return FLOWER_RULES.find((rule) => rule.patterns.some((pattern) => text.includes(pattern))) ?? null;
}

function isObviousNoise(name, source) {
  if (source && source !== 'kakao_local') return false;
  const text = String(name || '').toLowerCase();
  return NOISE_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

async function main() {
  const supabase = createServiceClient();

  const targets = await fetchAllByRange((from, to) =>
    supabase
      .from('flower_spots')
      .select('id, name, source, flower_types, peak_month_start, peak_month_end')
      .contains('flower_types', ['etc'])
      .order('created_at', { ascending: true })
      .range(from, to),
  );

  let reclassified = 0;
  let deleted = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`[info] stage2 etc targets: ${targets.length}`);

  for (const spot of targets) {
    try {
      const flowerRule = pickFlowerRule(spot.name);

      if (flowerRule) {
        const nextTypes = normalizeFlowerTypes([
          ...(spot.flower_types || []).filter((value) => value !== 'etc'),
          ...flowerRule.flower_types,
        ]);

        const payload = {
          flower_types: nextTypes,
          updated_at: nowIso(),
        };

        if (!spot.peak_month_start || !spot.peak_month_end) {
          payload.peak_month_start = spot.peak_month_start ?? flowerRule.peak[0];
          payload.peak_month_end = spot.peak_month_end ?? flowerRule.peak[1];
        }

        const { error } = await supabase.from('flower_spots').update(payload).eq('id', spot.id);
        if (error) throw error;

        reclassified += 1;
        console.log(`[update] ${spot.name} — ${nextTypes.join(',')}`);
        continue;
      }

      if (isObviousNoise(spot.name, spot.source)) {
        const { error } = await supabase.from('flower_spots').delete().eq('id', spot.id);
        if (error) throw error;

        deleted += 1;
        console.log(`[delete] ${spot.name} — obvious noise`);
        continue;
      }

      skipped += 1;
      console.log(`[skip] ${spot.name} — keep for manual review`);
    } catch (error) {
      errors += 1;
      console.warn(`[error] ${spot.name} — ${error.message}`);
    }
  }

  console.log(JSON.stringify({ scanned: targets.length, reclassified, deleted, skipped, errors }, null, 2));
}

main().catch((error) => {
  console.error('[reclassify-etc-stage2] failed:', error);
  process.exit(1);
});
