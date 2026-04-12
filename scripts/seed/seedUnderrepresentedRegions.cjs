/* eslint-disable @typescript-eslint/no-require-imports */
const { createServiceClient, buildExternalPlaceId, insertSpotIfMissing } = require('./seedHelpers.cjs');

const SPOTS = [
  // 경북 20
  { region: '경북', name: '울진 불영계곡 철쭉길', address: '경북 울진군 금강송면 하원리', lat: 36.9862, lng: 129.2532, category: 'mountain', flower_types: ['azalea'], peak_month_start: 4, peak_month_end: 5, photo_spot: true },
  { region: '경북', name: '영덕 장사해수욕장 수국길', address: '경북 영덕군 남정면 장사리', lat: 36.2894, lng: 129.3678, category: 'street', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, photo_spot: true },
  { region: '경북', name: '안동 하회마을 연꽃', address: '경북 안동시 풍천면 전서로 186', lat: 36.5397, lng: 128.5182, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, photo_spot: true },
  { region: '경북', name: '경주 동궁과월지 연꽃', address: '경북 경주시 원화로 102', lat: 35.8347, lng: 129.2247, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, photo_spot: true },
  { region: '경북', name: '포항 철길숲 장미원', address: '경북 포항시 남구 대잠동 725', lat: 36.0198, lng: 129.3416, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6 },
  { region: '경북', name: '문경새재 철쭉군락지', address: '경북 문경시 문경읍 새재로 932', lat: 36.7642, lng: 128.0712, category: 'mountain', flower_types: ['azalea'], peak_month_start: 4, peak_month_end: 5, photo_spot: true },
  { region: '경북', name: '영주 소백산 철쭉', address: '경북 영주시 풍기읍 삼가리', lat: 36.9351, lng: 128.4844, category: 'mountain', flower_types: ['azalea'], peak_month_start: 5, peak_month_end: 5, photo_spot: true },
  { region: '경북', name: '청도 프로방스 수국정원', address: '경북 청도군 화양읍 이슬미로 272-23', lat: 35.6464, lng: 128.7328, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, has_parking: true },
  { region: '경북', name: '예천 삼강주막 연꽃정원', address: '경북 예천군 풍양면 삼강리길 27', lat: 36.5465, lng: 128.3008, category: 'river', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8 },
  { region: '경북', name: '구미 낙동강체육공원 코스모스', address: '경북 구미시 양호동 614', lat: 36.1125, lng: 128.3941, category: 'river', flower_types: ['cosmos'], peak_month_start: 9, peak_month_end: 10 },
  { region: '경북', name: '김천 직지문화공원 국화원', address: '경북 김천시 대항면 직지사길 95', lat: 36.1183, lng: 128.1159, category: 'park', flower_types: ['chrysanthemum'], peak_month_start: 10, peak_month_end: 11 },
  { region: '경북', name: '상주 경천섬 유채꽃', address: '경북 상주시 도남동 1-1', lat: 36.4024, lng: 128.1758, category: 'river', flower_types: ['rape'], peak_month_start: 4, peak_month_end: 4, photo_spot: true },
  { region: '경북', name: '울릉 나리분지 해바라기', address: '경북 울릉군 북면 나리', lat: 37.5215, lng: 130.8702, category: 'farm', flower_types: ['sunflower'], peak_month_start: 7, peak_month_end: 8 },
  { region: '경북', name: '경산 반곡지 연꽃', address: '경북 경산시 남산면 반곡리 246', lat: 35.8165, lng: 128.7677, category: 'river', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, photo_spot: true },
  { region: '경북', name: '경주 보문정 수국길', address: '경북 경주시 신평동 150-1', lat: 35.8433, lng: 129.2813, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { region: '경북', name: '영천 보현산댐 코스모스길', address: '경북 영천시 화북면 입석리', lat: 36.0935, lng: 128.9663, category: 'river', flower_types: ['cosmos'], peak_month_start: 9, peak_month_end: 10 },
  { region: '경북', name: '군위 화본마을 수국길', address: '경북 군위군 산성면 산성가음로 711', lat: 36.1208, lng: 128.6456, category: 'street', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { region: '경북', name: '봉화 청량산 수선화', address: '경북 봉화군 명호면 광석길 39', lat: 36.8716, lng: 128.9973, category: 'mountain', flower_types: ['narcissus'], peak_month_start: 3, peak_month_end: 4 },
  { region: '경북', name: '포항 환호공원 수국', address: '경북 포항시 북구 환호공원길 30', lat: 36.0653, lng: 129.3921, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { region: '경북', name: '안동 월영교 수국길', address: '경북 안동시 상아동 569', lat: 36.5651, lng: 128.7257, category: 'street', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, photo_spot: true },

  // 경남 20
  { region: '경남', name: '남해 독일마을 수국길', address: '경남 남해군 삼동면 독일로 92', lat: 34.8274, lng: 127.9489, category: 'street', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, photo_spot: true },
  { region: '경남', name: '거제 공곶이 수선화정원', address: '경남 거제시 일운면 와현리 87', lat: 34.8435, lng: 128.7008, category: 'park', flower_types: ['narcissus'], peak_month_start: 2, peak_month_end: 3, photo_spot: true },
  { region: '경남', name: '창녕 화왕산 억새', address: '경남 창녕군 창녕읍 옥천리 산1', lat: 35.5326, lng: 128.508, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { region: '경남', name: '통영 동백섬', address: '경남 통영시 도남동 625', lat: 34.8369, lng: 128.4284, category: 'mountain', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2, photo_spot: true },
  { region: '경남', name: '함안 연꽃테마파크', address: '경남 함안군 가야읍 왕궁길 38-20', lat: 35.2723, lng: 128.4085, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8, photo_spot: true },
  { region: '경남', name: '합천 황강 연꽃단지', address: '경남 합천군 합천읍 영창리', lat: 35.5636, lng: 128.1671, category: 'river', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8 },
  { region: '경남', name: '합천 신소양체육공원 핑크뮬리', address: '경남 합천군 합천읍 영창리 898', lat: 35.5626, lng: 128.1665, category: 'park', flower_types: ['pinkmuhly'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { region: '경남', name: '김해 연지공원 장미원', address: '경남 김해시 금관대로1368번길 7', lat: 35.2313, lng: 128.8785, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6 },
  { region: '경남', name: '진주 초전공원 장미원', address: '경남 진주시 초전동 1653-1', lat: 35.2057, lng: 128.1276, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6 },
  { region: '경남', name: '양산 황산공원 코스모스', address: '경남 양산시 물금읍 물금리 162-1', lat: 35.3112, lng: 128.9891, category: 'river', flower_types: ['cosmos'], peak_month_start: 9, peak_month_end: 10 },
  { region: '경남', name: '거제 지심도 동백', address: '경남 거제시 일운면 지세포리', lat: 34.8371, lng: 128.7229, category: 'mountain', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2, photo_spot: true },
  { region: '경남', name: '통영 소매물도 수국길', address: '경남 통영시 한산면 매죽리', lat: 34.6342, lng: 128.5483, category: 'mountain', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, photo_spot: true },
  { region: '경남', name: '남해 다랭이마을 유채꽃', address: '경남 남해군 남면 남면로 679번길 21', lat: 34.7167, lng: 127.8864, category: 'farm', flower_types: ['rape'], peak_month_start: 4, peak_month_end: 4, photo_spot: true },
  { region: '경남', name: '사천 케이블카공원 수국길', address: '경남 사천시 사천대로 18', lat: 34.9287, lng: 128.0688, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { region: '경남', name: '창원 장미공원', address: '경남 창원시 성산구 가음동 31', lat: 35.2159, lng: 128.6826, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6 },
  { region: '경남', name: '거창 감악산 국화원', address: '경남 거창군 신원면 과정리 산105', lat: 35.6867, lng: 127.8483, category: 'mountain', flower_types: ['chrysanthemum'], peak_month_start: 10, peak_month_end: 10, photo_spot: true },
  { region: '경남', name: '밀양 사자평 억새밭', address: '경남 밀양시 산내면 얼음골로', lat: 35.5371, lng: 128.8503, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 9, peak_month_end: 10, photo_spot: true },
  { region: '경남', name: '고성 당항포 수국정원', address: '경남 고성군 회화면 당항만로 1116', lat: 34.952, lng: 128.3666, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { region: '경남', name: '산청 황매산 철쭉', address: '경남 산청군 차황면 법평리 산1', lat: 35.4824, lng: 127.9794, category: 'mountain', flower_types: ['azalea'], peak_month_start: 5, peak_month_end: 5, photo_spot: true },
  { region: '경남', name: '거제 외도 보타니아 수국정원', address: '경남 거제시 일운면 와현리 산109', lat: 34.7772, lng: 128.7126, category: 'botanical', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, photo_spot: true },

  // 광주 20
  { region: '광주', name: '무등산 철쭉군락지', address: '광주 북구 금곡동 산1-1', lat: 35.1496, lng: 126.9896, category: 'mountain', flower_types: ['azalea'], peak_month_start: 4, peak_month_end: 5, photo_spot: true },
  { region: '광주', name: '중외공원 장미원', address: '광주 북구 하서로 52', lat: 35.2132, lng: 126.8918, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6 },
  { region: '광주', name: '광주호 호수생태원 수국길', address: '광주 북구 충효동 885', lat: 35.1872, lng: 126.9942, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { region: '광주', name: '승촌보 유채꽃밭', address: '광주 남구 승촌동 581-1', lat: 35.0624, lng: 126.8759, category: 'river', flower_types: ['rape'], peak_month_start: 4, peak_month_end: 4 },
  { region: '광주', name: '풍암호수공원 장미정원', address: '광주 서구 풍암동 460', lat: 35.1271, lng: 126.8791, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6 },
  { region: '광주', name: '우치공원 장미원', address: '광주 북구 우치로 677', lat: 35.2248, lng: 126.8957, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6 },
  { region: '광주', name: '증심사 진달래길', address: '광주 동구 증심사길 177', lat: 35.1314, lng: 126.9908, category: 'mountain', flower_types: ['azalea'], peak_month_start: 4, peak_month_end: 5 },
  { region: '광주', name: '쌍암공원 연꽃', address: '광주 광산구 첨단중앙로182번길 23', lat: 35.2144, lng: 126.8456, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8 },
  { region: '광주', name: '광주천 코스모스길', address: '광주 남구 백운동', lat: 35.1301, lng: 126.9106, category: 'river', flower_types: ['cosmos'], peak_month_start: 9, peak_month_end: 10 },
  { region: '광주', name: '영산강 자전거길 코스모스', address: '광주 광산구 우산동', lat: 35.1593, lng: 126.8067, category: 'river', flower_types: ['cosmos'], peak_month_start: 9, peak_month_end: 10 },
  { region: '광주', name: '5·18기념공원 장미원', address: '광주 서구 상무민주로 61', lat: 35.1539, lng: 126.8459, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6 },
  { region: '광주', name: '상무시민공원 수국', address: '광주 서구 치평동 1167', lat: 35.1531, lng: 126.8451, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { region: '광주', name: '운천저수지 연꽃', address: '광주 서구 쌍촌동 941-1', lat: 35.1494, lng: 126.8572, category: 'park', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8 },
  { region: '광주', name: '사직공원 동백', address: '광주 남구 사직길 49', lat: 35.1448, lng: 126.9188, category: 'park', flower_types: ['camellia'], peak_month_start: 1, peak_month_end: 2 },
  { region: '광주', name: '패밀리랜드 장미광장', address: '광주 북구 우치로 677', lat: 35.2243, lng: 126.8972, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6 },
  { region: '광주', name: '무등산 서석대 억새', address: '광주 북구 금곡동 산1-1', lat: 35.1348, lng: 127.0039, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 10, peak_month_end: 10, photo_spot: true },
  { region: '광주', name: '광주수목원 수국원', address: '광주 남구 도동길 142', lat: 35.1103, lng: 126.8808, category: 'botanical', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { region: '광주', name: '양림동 수국골목', address: '광주 남구 양림동 66', lat: 35.1419, lng: 126.9164, category: 'street', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, photo_spot: true },
  { region: '광주', name: '평동호수공원 해바라기', address: '광주 광산구 용곡동 1110', lat: 35.1216, lng: 126.7451, category: 'park', flower_types: ['sunflower'], peak_month_start: 7, peak_month_end: 8 },
  { region: '광주', name: '광주호 생태공원 코스모스', address: '광주 북구 충효동 886', lat: 35.1866, lng: 126.9931, category: 'park', flower_types: ['cosmos'], peak_month_start: 9, peak_month_end: 10 },

  // 충북 20
  { region: '충북', name: '단양 소백산 철쭉', address: '충북 단양군 가곡면 어의곡리', lat: 36.9408, lng: 128.4576, category: 'mountain', flower_types: ['azalea'], peak_month_start: 5, peak_month_end: 5, photo_spot: true },
  { region: '충북', name: '충주 하늘재 억새', address: '충북 충주시 수안보면 미륵송계로', lat: 36.8465, lng: 128.0636, category: 'mountain', flower_types: ['silvergrass'], peak_month_start: 10, peak_month_end: 10, photo_spot: true },
  { region: '충북', name: '청남대 수국정원', address: '충북 청주시 상당구 문의면 청남대길 646', lat: 36.4638, lng: 127.4916, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, has_parking: true },
  { region: '충북', name: '청남대 장미원', address: '충북 청주시 상당구 문의면 청남대길 646', lat: 36.4635, lng: 127.4911, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6, has_parking: true },
  { region: '충북', name: '청주 무심천 코스모스길', address: '충북 청주시 서원구 사직동', lat: 36.6354, lng: 127.4765, category: 'river', flower_types: ['cosmos'], peak_month_start: 9, peak_month_end: 10 },
  { region: '충북', name: '충주 탄금호 코스모스길', address: '충북 충주시 금릉동 626', lat: 36.9799, lng: 127.9288, category: 'river', flower_types: ['cosmos'], peak_month_start: 9, peak_month_end: 10 },
  { region: '충북', name: '속리산 법주사 진달래길', address: '충북 보은군 속리산면 법주사로 405', lat: 36.5437, lng: 127.8339, category: 'mountain', flower_types: ['azalea'], peak_month_start: 4, peak_month_end: 5 },
  { region: '충북', name: '제천 의림지 수국', address: '충북 제천시 모산동 241', lat: 37.1611, lng: 128.2125, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { region: '충북', name: '단양 도담삼봉 유채꽃', address: '충북 단양군 매포읍 삼봉로 644', lat: 36.9843, lng: 128.3652, category: 'river', flower_types: ['rape'], peak_month_start: 4, peak_month_end: 4, photo_spot: true },
  { region: '충북', name: '옥천 장계관광지 연꽃', address: '충북 옥천군 안내면 장계리', lat: 36.3028, lng: 127.5797, category: 'river', flower_types: ['lotus'], peak_month_start: 7, peak_month_end: 8 },
  { region: '충북', name: '진천 농다리 꽃잔디', address: '충북 진천군 문백면 구곡리 601', lat: 36.8795, lng: 127.4416, category: 'park', flower_types: ['phlox'], peak_month_start: 4, peak_month_end: 5, photo_spot: true },
  { region: '충북', name: '괴산 산막이옛길 수국', address: '충북 괴산군 칠성면 사은리 546-1', lat: 36.8188, lng: 127.9985, category: 'mountain', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { region: '충북', name: '문의문화재단지 수선화', address: '충북 청주시 상당구 문의면 대청호반로 721', lat: 36.4891, lng: 127.4868, category: 'park', flower_types: ['narcissus'], peak_month_start: 3, peak_month_end: 4 },
  { region: '충북', name: '충주 세계무술공원 장미원', address: '충북 충주시 금릉동 692', lat: 36.9807, lng: 127.9348, category: 'park', flower_types: ['rose'], peak_month_start: 5, peak_month_end: 6 },
  { region: '충북', name: '영동 월류봉 수국길', address: '충북 영동군 황간면 원촌리', lat: 36.2473, lng: 127.9279, category: 'mountain', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7, photo_spot: true },
  { region: '충북', name: '보은 삼년산성 철쭉', address: '충북 보은군 보은읍 어암리 산1-1', lat: 36.4842, lng: 127.7211, category: 'mountain', flower_types: ['azalea'], peak_month_start: 4, peak_month_end: 5 },
  { region: '충북', name: '증평 보강천 코스모스', address: '충북 증평군 증평읍 창동리', lat: 36.7797, lng: 127.5831, category: 'river', flower_types: ['cosmos'], peak_month_start: 9, peak_month_end: 10 },
  { region: '충북', name: '제천 청풍호반 케이블카 수국정원', address: '충북 제천시 청풍면 문화재길 166', lat: 37.0043, lng: 128.1687, category: 'park', flower_types: ['hydrangea'], peak_month_start: 6, peak_month_end: 7 },
  { region: '충북', name: '청주 상당산성 진달래길', address: '충북 청주시 상당구 산성동 산28-1', lat: 36.6597, lng: 127.5586, category: 'mountain', flower_types: ['azalea'], peak_month_start: 4, peak_month_end: 5 },
  { region: '충북', name: '충주 비내섬 유채꽃', address: '충북 충주시 앙성면 조천리', lat: 37.1327, lng: 127.7723, category: 'river', flower_types: ['rape'], peak_month_start: 4, peak_month_end: 4 },
];

async function main() {
  const supabase = createServiceClient();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const byRegion = {};

  for (const spot of SPOTS) {
    try {
      const result = await insertSpotIfMissing(
        supabase,
        { ...spot, external_place_id: buildExternalPlaceId('manual-underrepresented', `${spot.region}-${spot.name}`) },
        'manual_underrepresented_seed',
      );

      if (!byRegion[spot.region]) byRegion[spot.region] = { requested: 0, inserted: 0, skipped: 0, errors: 0 };
      byRegion[spot.region].requested += 1;

      if (result.status === 'insert') {
        inserted += 1;
        byRegion[spot.region].inserted += 1;
      } else {
        skipped += 1;
        byRegion[spot.region].skipped += 1;
      }
    } catch (error) {
      errors += 1;
      if (!byRegion[spot.region]) byRegion[spot.region] = { requested: 0, inserted: 0, skipped: 0, errors: 0 };
      byRegion[spot.region].requested += 1;
      byRegion[spot.region].errors += 1;
      console.warn(`[error] ${spot.name} — ${error.message}`);
    }
  }

  console.log(JSON.stringify({ requested: SPOTS.length, inserted, skipped, errors, byRegion }, null, 2));
}

main().catch((error) => {
  console.error('[seed:underrepresented-regions] failed:', error);
  process.exit(1);
});
