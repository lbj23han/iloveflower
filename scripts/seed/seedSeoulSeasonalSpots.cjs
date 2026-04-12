/* eslint-disable @typescript-eslint/no-require-imports */
const { createServiceClient, buildExternalPlaceId, insertSpotIfMissing } = require('./seedHelpers.cjs');

const SEOUL_SEASONAL_SPOTS = [
  { name: '서울식물원 수국', address: '서울 강서구 마곡동 281', lat: 37.5704, lng: 126.8271, category: 'botanical', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, entry_fee: 5000, has_parking: true, photo_spot: true },
  { name: '길동생태공원 연꽃', address: '서울 강동구 천호동 620-1', lat: 37.5384, lng: 127.1517, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, photo_spot: true },
  { name: '서울숲 꽃밭 (해바라기)', address: '서울 성동구 뚝섬로 273', lat: 37.5445, lng: 127.0374, category: 'park', flower_types: ['sunflower'], peak_month_start: 7, peak_month_end: 8, photo_spot: true },
  { name: '월드컵공원 수국', address: '서울 마포구 하늘공원로 95', lat: 37.5704, lng: 126.8913, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, photo_spot: true },
  { name: '어린이대공원 장미원', address: '서울 광진구 능동로 216', lat: 37.5481, lng: 127.0781, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6, photo_spot: true, has_parking: true },

  { name: '서울숲 코스모스', address: '서울 성동구 뚝섬로 273', lat: 37.5445, lng: 127.0374, category: 'park', flower_types: ['cosmos'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { name: '양재천 코스모스길', address: '서울 강남구 개포동', lat: 37.48, lng: 127.0544, category: 'river', flower_types: ['cosmos'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { name: '일자산 억새밭', address: '서울 강동구 길동 산21', lat: 37.5518, lng: 127.172, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 10, peak_month_end: 10, photo_spot: true },
  { name: '하늘공원 억새', address: '서울 마포구 하늘공원로 95', lat: 37.5704, lng: 126.8913, category: 'park', flower_types: ['silvergrass'], peak_month_start: 10, peak_month_end: 10, has_parking: true, photo_spot: true },
  { name: '북한산 진달래 능선', address: '서울 강북구 우이동 산1-1', lat: 37.6614, lng: 126.9802, category: 'mountain', flower_types: ['azalea'], peak_month_start: 4, peak_month_end: 5, photo_spot: true },

  { name: '남산공원 동백', address: '서울 중구 예장동 산5-5', lat: 37.5511, lng: 126.9882, category: 'mountain', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 3, photo_spot: true },
  { name: '창덕궁 수선화', address: '서울 종로구 율곡로 99', lat: 37.5793, lng: 126.9952, category: 'etc', flower_types: ['narcissus'], peak_month_start: 3, peak_month_end: 4, entry_fee: 3000, photo_spot: true },
];

async function main() {
  const supabase = createServiceClient();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const spot of SEOUL_SEASONAL_SPOTS) {
    try {
      const result = await insertSpotIfMissing(
        supabase,
        { ...spot, external_place_id: buildExternalPlaceId('manual-seoul-seasonal', spot.name) },
        'manual_seoul_seasonal_seed',
      );

      if (result.status === 'insert') inserted += 1;
      else skipped += 1;
    } catch (error) {
      errors += 1;
      console.warn(`[error] ${spot.name} — ${error.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        requested: SEOUL_SEASONAL_SPOTS.length,
        inserted,
        skipped,
        errors,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('[seed:seoul-seasonal] failed:', error);
  process.exit(1);
});
