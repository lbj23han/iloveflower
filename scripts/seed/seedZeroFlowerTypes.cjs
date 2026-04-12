/* eslint-disable @typescript-eslint/no-require-imports */
const { createServiceClient, buildExternalPlaceId, insertSpotIfMissing } = require('./seedHelpers.cjs');

const SPOTS = [
  { name: '응봉산 개나리길', address: '서울 성동구 금호동4가 1540', lat: 37.548, lng: 127.0246, category: 'mountain', flower_types: ['forsythia'], peak_month_start: 3, peak_month_end: 4, photo_spot: true },
  { name: '안민고개 개나리길', address: '경남 창원시 성산구 안민동 산35', lat: 35.2098, lng: 128.6971, category: 'mountain', flower_types: ['forsythia'], peak_month_start: 3, peak_month_end: 4, photo_spot: true },
  { name: '서울대공원 개나리언덕', address: '경기 과천시 대공원광장로 102', lat: 37.4367, lng: 127.0104, category: 'park', flower_types: ['forsythia'], peak_month_start: 3, peak_month_end: 4 },

  { name: '덕수궁 목련', address: '서울 중구 세종대로 99', lat: 37.5658, lng: 126.9751, category: 'etc', flower_types: ['magnolia'], peak_month_start: 3, peak_month_end: 4, entry_fee: 1000, photo_spot: true },
  { name: '통영 봉숫골 목련거리', address: '경남 통영시 봉평동 124-1', lat: 34.8444, lng: 128.4259, category: 'street', flower_types: ['magnolia'], peak_month_start: 3, peak_month_end: 4, photo_spot: true },
  { name: '전주 경기전 목련', address: '전북 전주시 완산구 태조로 44', lat: 35.8156, lng: 127.1498, category: 'etc', flower_types: ['magnolia'], peak_month_start: 3, peak_month_end: 4, photo_spot: true },

  { name: '삼락생태공원 등나무길', address: '부산 사상구 삼락동 29-46', lat: 35.1779, lng: 128.9783, category: 'park', flower_types: ['wisteria'], peak_month_start: 4, peak_month_end: 5, photo_spot: true },
  { name: '수성못 등나무길', address: '대구 수성구 두산동 512', lat: 35.8269, lng: 128.6127, category: 'park', flower_types: ['wisteria'], peak_month_start: 4, peak_month_end: 5 },
  { name: '담양 죽녹원 등꽃길', address: '전남 담양군 담양읍 죽녹원로 119', lat: 35.3214, lng: 126.9875, category: 'park', flower_types: ['wisteria'], peak_month_start: 4, peak_month_end: 5 },

  { name: '함평 자연생태공원 작약원', address: '전남 함평군 대동면 학동로 1398-77', lat: 35.1222, lng: 126.5366, category: 'park', flower_types: ['peony'], peak_month_start: 5, peak_month_end: 6, photo_spot: true },
  { name: '태안 청산수목원 작약정원', address: '충남 태안군 남면 연꽃길 70', lat: 36.7158, lng: 126.4037, category: 'botanical', flower_types: ['peony'], peak_month_start: 5, peak_month_end: 6, photo_spot: true },
  { name: '어린이대공원 작약원', address: '서울 광진구 능동로 216', lat: 37.5481, lng: 127.0781, category: 'park', flower_types: ['peony'], peak_month_start: 5, peak_month_end: 6 },

  { name: '영덕 복사꽃마을', address: '경북 영덕군 영해면 원구리', lat: 36.5154, lng: 129.4132, category: 'farm', flower_types: ['peach'], peak_month_start: 3, peak_month_end: 4, photo_spot: true },
  { name: '청도 복사꽃길', address: '경북 청도군 이서면 각계리', lat: 35.6935, lng: 128.7943, category: 'street', flower_types: ['peach'], peak_month_start: 3, peak_month_end: 4, photo_spot: true },

  { name: '경주 첨성대 꽃잔디', address: '경북 경주시 인왕동 839-1', lat: 35.8347, lng: 129.2191, category: 'park', flower_types: ['phlox'], peak_month_start: 4, peak_month_end: 5, photo_spot: true },
  { name: '휴애리 꽃잔디정원', address: '제주 서귀포시 남원읍 신례동로 256', lat: 33.3088, lng: 126.6345, category: 'park', flower_types: ['phlox'], peak_month_start: 4, peak_month_end: 5, photo_spot: true },
  { name: '청산수목원 꽃잔디', address: '충남 태안군 남면 연꽃길 70', lat: 36.7158, lng: 126.4037, category: 'botanical', flower_types: ['phlox'], peak_month_start: 4, peak_month_end: 5, photo_spot: true },
];

async function main() {
  const supabase = createServiceClient();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const spot of SPOTS) {
    try {
      const result = await insertSpotIfMissing(
        supabase,
        { ...spot, external_place_id: buildExternalPlaceId('manual-zero-types', spot.name) },
        'manual_zero_flower_types_seed',
      );

      if (result.status === 'insert') inserted += 1;
      else skipped += 1;
    } catch (error) {
      errors += 1;
      console.warn(`[error] ${spot.name} — ${error.message}`);
    }
  }

  console.log(JSON.stringify({ requested: SPOTS.length, inserted, skipped, errors }, null, 2));
}

main().catch((error) => {
  console.error('[seed:zero-flower-types] failed:', error);
  process.exit(1);
});
