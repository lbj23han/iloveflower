/* eslint-disable @typescript-eslint/no-require-imports */
const { createServiceClient, buildExternalPlaceId, insertSpotIfMissing } = require('./seedHelpers.cjs');

const SPOTS = [
  { name: '제주 마노르블랑', address: '제주 서귀포시 안덕면 사계리 181', lat: 33.2417, lng: 126.3275, category: 'garden', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { name: '제주 카멜리아힐 수국정원', address: '제주 서귀포시 안덕면 병악로 166', lat: 33.2802, lng: 126.3622, category: 'garden', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, entry_fee: 10000, photo_spot: true, has_parking: true },
  { name: '안동 선성현문화단지 수국길', address: '경북 안동시 예안면 선성길 62', lat: 36.6411, lng: 128.9284, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, has_parking: true },
  { name: '남해 독일마을 수국길', address: '경남 남해군 삼동면 독일로 92', lat: 34.8274, lng: 127.9489, category: 'street', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, photo_spot: true },
  { name: '인천 수국공원 (드림파크)', address: '인천 서구 백석동 산70', lat: 37.5951, lng: 126.6477, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, has_parking: true },
  { name: '태안 청산수목원 수국', address: '충남 태안군 남면 연꽃길 70', lat: 36.7158, lng: 126.4037, category: 'botanical', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, has_parking: true, photo_spot: true },
  { name: '포천 허브아일랜드 수국', address: '경기 포천시 신북면 청신로 947', lat: 37.9471, lng: 127.2024, category: 'botanical', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, entry_fee: 12000, has_parking: true, photo_spot: true, has_night_light: true },
  { name: '고흥 우주발사전망대 수국길', address: '전남 고흥군 두원면 우주발사전망로 490', lat: 34.6742, lng: 127.4313, category: 'trail', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, photo_spot: true },
  { name: '여수 향일암 수국', address: '전남 여수시 돌산읍 향일암로 60', lat: 34.6278, lng: 127.7942, category: 'temple', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, photo_spot: true },
  { name: '서울 북서울꿈의숲 수국원', address: '서울 강북구 번동 산28-1', lat: 37.6205, lng: 127.0505, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, has_parking: true },

  { name: '무안 회산백련지', address: '전남 무안군 일로읍 백련로 339', lat: 34.9744, lng: 126.5611, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, photo_spot: true, has_parking: true },
  { name: '함안 연꽃테마파크', address: '경남 함안군 가야읍 가야리 581', lat: 35.273, lng: 128.3986, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, has_parking: true, photo_spot: true },
  { name: '양평 세미원', address: '경기 양평군 양서면 용담리 267', lat: 37.5658, lng: 127.3018, category: 'botanical', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, entry_fee: 5000, has_parking: true, photo_spot: true },
  { name: '부여 궁남지', address: '충남 부여군 부여읍 동남리 117', lat: 36.27, lng: 126.9088, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, has_parking: true, photo_spot: true },
  { name: '익산 천만송이연꽃단지', address: '전북 익산시 삼기면 오산리', lat: 35.9875, lng: 126.9764, category: 'field', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, has_parking: true, photo_spot: true },
  { name: '서울 선유도공원 수생식물원', address: '서울 영등포구 선유로 343', lat: 37.544, lng: 126.8975, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, photo_spot: true },
  { name: '경포 가시연꽃 습지', address: '강원 강릉시 저동 1-1', lat: 37.799, lng: 128.906, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, photo_spot: true },
  { name: '합천 황강 연꽃단지', address: '경남 합천군 합천읍 황강변', lat: 35.5636, lng: 128.1671, category: 'field', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, photo_spot: true },
  { name: '고양 호수공원 연꽃', address: '경기 고양시 일산동구 장항동 906', lat: 37.6593, lng: 126.7701, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, has_parking: true },
  { name: '강릉 경포생태저류지 연꽃', address: '강원 강릉시 운정동', lat: 37.7944, lng: 128.909, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8 },

  { name: '거제 지심도', address: '경남 거제시 일운면 지세포리', lat: 34.8371, lng: 128.7229, category: 'trail', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2, photo_spot: true },
  { name: '통영 동백섬', address: '경남 통영시 도남동 625', lat: 34.8369, lng: 128.4284, category: 'trail', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2, photo_spot: true },
  { name: '선운사 동백숲', address: '전북 고창군 아산면 선운사로 250', lat: 35.4766, lng: 126.59, category: 'temple', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2, photo_spot: true, has_parking: true },
  { name: '제주 카멜리아힐', address: '제주 서귀포시 안덕면 병악로 166', lat: 33.2802, lng: 126.3622, category: 'garden', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2, entry_fee: 10000, photo_spot: true, has_parking: true },
  { name: '오동도 동백', address: '전남 여수시 오동도로 222', lat: 34.7396, lng: 127.7462, category: 'trail', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2, has_parking: true, photo_spot: true },
  { name: '강진 동백정원 (다산초당)', address: '전남 강진군 도암면 다산초당길 68', lat: 34.5756, lng: 126.7956, category: 'trail', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2, photo_spot: true },
  { name: '고흥 팔영산 동백숲', address: '전남 고흥군 점암면 성기리', lat: 34.608, lng: 127.4312, category: 'mountain', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2, photo_spot: true },
  { name: '대구 마비정 벽화마을 동백', address: '대구 달성군 화원읍 마비정길', lat: 35.7881, lng: 128.5211, category: 'etc', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2 },
  { name: '부산 천마산 동백숲', address: '부산 서구 천마산로', lat: 35.101, lng: 129.0165, category: 'mountain', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2 },

  { name: '정선 민둥산', address: '강원 정선군 남면 무릉리 산180', lat: 37.2108, lng: 128.7284, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { name: '제주 따라비오름', address: '제주 서귀포시 표선면 가시리 산62', lat: 33.3517, lng: 126.7224, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { name: '창녕 화왕산', address: '경남 창녕군 창녕읍 옥천리 산1', lat: 35.5326, lng: 128.508, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { name: '밀양 사자평 억새밭', address: '경남 밀양시 산내면 얼음골로', lat: 35.5371, lng: 128.8503, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { name: '영남알프스 간월재', address: '울산 울주군 상북면 덕현리 산264', lat: 35.558, lng: 128.936, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { name: '서울 하늘공원 억새축제', address: '서울 마포구 하늘공원로 95', lat: 37.5704, lng: 126.8913, category: 'park', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, photo_spot: true, has_parking: true },
  { name: '포천 국립수목원 억새원', address: '경기 포천시 소흘읍 광릉수목원로 415', lat: 37.7521, lng: 127.1643, category: 'botanical', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, has_parking: true },
  { name: '홍천 억새밭 (수타사계곡)', address: '강원 홍천군 동면 수타사로 473', lat: 37.8055, lng: 127.9949, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { name: '충주 계명산 억새', address: '충북 충주시 엄정면 목계나루길', lat: 37.0021, lng: 127.8822, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { name: '장흥 천관산 억새', address: '전남 장흥군 관산읍 천관산길', lat: 34.5706, lng: 126.9028, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
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
        { ...spot, external_place_id: buildExternalPlaceId('manual-missing-flower', spot.name) },
        'manual_missing_flower_seed',
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
  console.error('[seed:missing-flower-types] failed:', error);
  process.exit(1);
});
