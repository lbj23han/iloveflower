/* eslint-disable @typescript-eslint/no-require-imports */
const { createServiceClient, normalizeCategory, normalizeFlowerTypes, nowIso } = require('./seedHelpers.cjs');
const { loadLocalEnv } = require('./loadEnv.cjs');
const { requestKeywordSearch } = require('./kakaoLocal.cjs');

const SOURCE = 'manual_may_june_2026_seed';
const BAD_SEED_EXTERNAL_PLACE_IDS = ['may-june-2026:25085251'];

const SPOTS = [
  // 5월 장미
  { name: '중랑장미공원', query: '중랑장미공원', addressHint: '서울 중랑구 묵동', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: false, photo_spot: true, source_url: 'https://festival.seoul.go.kr/festival/main/festivalView.do?festacode=604' },
  { name: '서울대공원 테마가든 장미원', query: '서울대공원 테마가든 장미원', fallbackQueries: ['서울대공원 장미원', '서울대공원 테마가든'], addressHint: '경기 과천시 대공원광장로 102', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://festival.seoul.go.kr/festival/main/festivalView.do?festacode=604' },
  { name: '곡성섬진강기차마을 장미공원', query: '곡성 섬진강기차마을 장미공원', addressHint: '전남 곡성군 오곡면 기차마을로 232', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, has_night_light: true, photo_spot: true, entry_fee: 5000, source_url: 'https://www.gokseong.go.kr/tour/festivity/rose' },
  { name: '이곡장미공원', query: '이곡장미공원', addressHint: '대구 달서구 선원로 199', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://tour.daegu.go.kr/index.do?menu_id=00002932&menu_link=%2Ffront%2Ftour%2FtourMapsView.do%3FtourId%3DKOEVENT_372' },
  { name: '임실치즈테마파크 장미원', query: '임실치즈테마파크 장미원', fallbackQueries: ['임실치즈테마파크'], addressHint: '전북 임실군 성수면 도인2길 50', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.imsil.go.kr/tour/' },
  { name: '삼척 장미공원', query: '삼척 장미공원', addressHint: '강원 삼척시 오십천로 586', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.stcf.or.kr/01298/01315/01315.web?amode=view&gcode=1001&idx=686' },
  { name: '화명장미공원', query: '화명장미공원', addressHint: '부산 북구 화명동', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.busan.go.kr' },
  { name: '조선대학교 장미원', query: '조선대학교 장미원', addressHint: '광주 동구 필문대로 309', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.chosun.ac.kr' },
  { name: '올림픽공원 장미광장', query: '올림픽공원 장미광장', addressHint: '서울 송파구 올림픽로 424', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.ksponco.or.kr/olympicpark/' },
  { name: '대전 한밭수목원 장미원', query: '한밭수목원 장미원', addressHint: '대전 서구 둔산대로 169', flower_types: ['rose'], category: 'botanical', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.daejeon.go.kr/gar/index.do' },
  { name: '인천대공원 장미원', query: '인천대공원 장미원', addressHint: '인천 남동구 무네미로 236', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.incheon.go.kr/park/' },
  { name: '광주 중외공원 장미원', query: '광주 중외공원 장미원', fallbackQueries: ['광주 중외공원'], addressHint: '광주 북구 하서로 52', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.gwangju.go.kr' },
  { name: '창원 장미공원', query: '창원 장미공원', addressHint: '경남 창원시 성산구 가음정동', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.changwon.go.kr' },
  { name: '대구 달성 장미공원', query: '대구 달성 장미공원', addressHint: '대구 달성군', flower_types: ['rose'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://tour.daegu.go.kr' },

  // 5~6월 작약·등꽃
  { name: '의성 조문국사적지 작약꽃밭', query: '의성 조문국사적지 작약꽃밭', fallbackQueries: ['조문국사적지', '의성조문국박물관'], addressHint: '경북 의성군 금성면 초전리', flower_types: ['peony'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.usc.go.kr/tour/' },
  { name: '함평 자연생태공원 작약원', query: '함평 자연생태공원 작약원', fallbackQueries: ['함평 자연생태공원'], addressHint: '전남 함평군 대동면 학동로 1398-77', flower_types: ['peony'], category: 'park', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.hampyeong.go.kr' },
  { name: '태안 청산수목원 작약정원', query: '태안 청산수목원 작약정원', fallbackQueries: ['청산수목원'], addressHint: '충남 태안군 남면 연꽃길 70', flower_types: ['peony'], category: 'botanical', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.greenpark.co.kr' },
  { name: '담양 죽녹원 등꽃길', query: '담양 죽녹원 등꽃길', fallbackQueries: ['담양 죽녹원', '죽녹원'], addressHint: '전남 담양군 담양읍 죽녹원로 119', flower_types: ['wisteria'], category: 'park', peak: [4, 5], has_parking: true, photo_spot: true, source_url: 'https://www.damyang.go.kr/tour/' },
  { name: '서울 창덕궁 등나무', query: '창덕궁 등나무', fallbackQueries: ['창덕궁 후원', '창덕궁'], addressHint: '서울 종로구 율곡로 99', flower_types: ['wisteria'], category: 'park', peak: [4, 5], has_parking: false, photo_spot: true, entry_fee: 3000, source_url: 'https://www.cdg.go.kr' },
  { name: '진해 내수면환경생태공원 등나무', query: '진해 내수면환경생태공원 등나무', fallbackQueries: ['내수면환경생태공원', '진해내수면환경생태공원'], addressHint: '경남 창원시 진해구 여명로25번길 55', flower_types: ['wisteria'], category: 'park', peak: [4, 5], has_parking: true, photo_spot: true, source_url: 'https://www.changwon.go.kr' },

  // 6월 수국
  { name: '혼인지 수국길', query: '혼인지 수국', addressHint: '제주 서귀포시 성산읍 혼인지로 39-22', flower_types: ['hydrangea'], category: 'park', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=f5daa981-9af7-4ac8-a82d-98ee5d0ada8d' },
  { name: '현애원 수국정원', query: '제주 현애원 수국', fallbackQueries: ['제주 현애원', '현애원'], addressHint: '제주 제주시 한경면 저지리', flower_types: ['hydrangea'], category: 'botanical', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=f5daa981-9af7-4ac8-a82d-98ee5d0ada8d' },
  { name: '새미동산 수국정원', query: '새미동산 수국', fallbackQueries: ['새미동산'], addressHint: '제주 제주시 조천읍 종인내길 133', flower_types: ['hydrangea'], category: 'botanical', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=f5daa981-9af7-4ac8-a82d-98ee5d0ada8d' },
  { name: '미레이나 수국정원', query: '미레이나 수국', fallbackQueries: ['미레이나'], addressHint: '제주 서귀포시 안덕면', flower_types: ['hydrangea'], category: 'cafe', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=f5daa981-9af7-4ac8-a82d-98ee5d0ada8d' },
  { name: '마노르블랑 수국정원', query: '마노르블랑 수국축제', fallbackQueries: ['마노르블랑'], addressHint: '제주 서귀포시 안덕면 일주서로2100번길 46', flower_types: ['hydrangea'], category: 'cafe', peak: [5, 8], has_parking: true, photo_spot: true, entry_fee: 6000, source_url: 'https://m.visitjeju.net/kr/detail/view?contentsid=CNTS_200000000010213&menuId=DOM_000001917009000000' },
  { name: '휴애리 자연생활공원 수국정원', query: '휴애리 수국축제', addressHint: '제주 서귀포시 남원읍 신례동로 256', flower_types: ['hydrangea'], category: 'park', peak: [6, 7], has_parking: true, photo_spot: true, entry_fee: 13000, source_url: 'https://www.hueree.com' },
  { name: '카멜리아힐 수국정원', query: '카멜리아힐 수국', addressHint: '제주 서귀포시 안덕면 병악로 166', flower_types: ['hydrangea'], category: 'botanical', peak: [6, 7], has_parking: true, photo_spot: true, entry_fee: 10000, source_url: 'https://www.camelliahill.co.kr' },
  { name: '답다니수국밭', query: '답다니수국밭', addressHint: '제주 서귀포시 월평로50번길 17-30', flower_types: ['hydrangea'], category: 'farm', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://www.visitjeju.net' },
  { name: '태종사 수국길', query: '태종사 수국', fallbackQueries: ['태종사'], addressHint: '부산 영도구 전망로 119', flower_types: ['hydrangea'], category: 'temple', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://www.visitbusan.net' },
  { name: '거제 저구항 수국동산', query: '거제 저구항 수국동산', addressHint: '경남 거제시 남부면 저구리', flower_types: ['hydrangea'], category: 'river', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://tour.geoje.go.kr' },
  { name: '남해 독일마을 수국길', query: '남해 독일마을', fallbackQueries: ['남해독일마을', '남해 독일마을 수국길'], addressHint: '경남 남해군 삼동면 독일로 92', flower_types: ['hydrangea'], category: 'street', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://www.namhae.go.kr/tour/' },
  { name: '안동 선성현문화단지 수국길', query: '안동 선성현문화단지 수국길', fallbackQueries: ['선성현문화단지'], addressHint: '경북 안동시 도산면 선성길 14', flower_types: ['hydrangea'], category: 'park', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://www.tourandong.com' },
  { name: '화담숲 수국원', query: '화담숲 수국원', addressHint: '경기 광주시 도척면 도척윗로 278-1', flower_types: ['hydrangea'], category: 'botanical', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://www.hwadamsup.com' },
  { name: '아침고요수목원 수국정원', query: '아침고요수목원 수국정원', fallbackQueries: ['아침고요수목원'], addressHint: '경기 가평군 상면 수목원로 432', flower_types: ['hydrangea'], category: 'botanical', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://www.morningcalm.co.kr' },
  { name: '서울식물원 수국원', query: '서울식물원 수국원', fallbackQueries: ['서울식물원'], addressHint: '서울 강서구 마곡동로 161', flower_types: ['hydrangea'], category: 'botanical', peak: [6, 7], has_parking: true, photo_spot: true, entry_fee: 5000, source_url: 'https://botanicpark.seoul.go.kr' },
  { name: '북서울꿈의숲 수국원', query: '북서울꿈의숲 수국원', fallbackQueries: ['북서울꿈의숲'], addressHint: '서울 강북구 월계로 173', flower_types: ['hydrangea'], category: 'park', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://parks.seoul.go.kr' },
  { name: '월드컵공원 수국길', query: '월드컵공원 수국길', fallbackQueries: ['월드컵공원', '하늘공원'], addressHint: '서울 마포구 하늘공원로 95', flower_types: ['hydrangea'], category: 'park', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://parks.seoul.go.kr' },
  { name: '고흥 우주발사전망대 수국길', query: '고흥 우주발사전망대 수국길', fallbackQueries: ['고흥우주발사 전망대', '우주발사전망대'], addressHint: '전남 고흥군 영남면 해맞이로 840', flower_types: ['hydrangea'], category: 'street', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://tour.goheung.go.kr' },
  { name: '여수 향일암 수국길', query: '여수 향일암 수국', fallbackQueries: ['향일암'], addressHint: '전남 여수시 돌산읍 향일암로 60', flower_types: ['hydrangea'], category: 'temple', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://www.yeosu.go.kr/tour' },
  { name: '태안 팜카밀레 수국정원', query: '팜카밀레 수국정원', addressHint: '충남 태안군 남면 우운길 56-19', flower_types: ['hydrangea'], category: 'botanical', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://www.kamille.co.kr' },

  // 6월 라벤더·능소화
  { name: '고성 하늬라벤더팜', query: '하늬라벤더팜', addressHint: '강원 고성군 간성읍 꽃대마을길 175', flower_types: ['lavender'], category: 'farm', peak: [6, 7], has_parking: true, photo_spot: true, entry_fee: 6000, source_url: 'https://www.herbnara.com' },
  { name: '고창 청농원 라벤더가든', query: '고창 청농원 라벤더', addressHint: '전북 고창군 공음면 청천길 41-27', flower_types: ['lavender'], category: 'farm', peak: [5, 6], has_parking: true, photo_spot: true, source_url: 'https://www.gochang.go.kr/tour/' },
  { name: '정읍 허브원 라벤더', query: '정읍 허브원 라벤더', fallbackQueries: ['정읍허브원', '허브원'], addressHint: '전북 정읍시 구량1길 188-29', flower_types: ['lavender'], category: 'farm', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://www.jeongeup.go.kr/culture/' },
  { name: '포천 허브아일랜드 라벤더', query: '허브아일랜드 라벤더', fallbackQueries: ['허브아일랜드'], addressHint: '경기 포천시 신북면 청신로947번길 51', flower_types: ['lavender'], category: 'park', peak: [6, 8], has_parking: true, has_night_light: true, photo_spot: true, entry_fee: 12000, source_url: 'https://herbisland.co.kr' },
  { name: '태안 팜카밀레 라벤더', query: '팜카밀레 라벤더', fallbackQueries: ['팜카밀레허브농원', '팜카밀레'], addressHint: '충남 태안군 남면 우운길 56-19', flower_types: ['lavender'], category: 'botanical', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://www.kamille.co.kr' },
  { name: '비체올린 능소화정원', query: '비체올린 능소화', fallbackQueries: ['비체올린'], addressHint: '제주 제주시 한경면 판조로 253-6', flower_types: ['neungsohwa'], category: 'park', peak: [6, 7], has_parking: true, photo_spot: true, source_url: 'https://www.vicheollin.com' },
  { name: '성균관 명륜당 능소화', query: '성균관 명륜당 능소화', fallbackQueries: ['성균관'], addressHint: '서울 종로구 성균관로 25-1', flower_types: ['neungsohwa'], category: 'park', peak: [6, 7], has_parking: false, photo_spot: true, source_url: 'https://www.skk.or.kr' },
  { name: '전주 경기전 능소화', query: '전주 경기전 능소화', fallbackQueries: ['경기전'], addressHint: '전북 전주시 완산구 태조로 44', flower_types: ['neungsohwa'], category: 'park', peak: [6, 7], has_parking: true, photo_spot: true, entry_fee: 3000, source_url: 'https://tour.jeonju.go.kr' },
];

const FESTIVALS = [
  { spotName: '중랑장미공원', name: '제18회 중랑 서울장미축제', start_date: '2026-05-15', end_date: '2026-05-23', description: '중랑천 5.45km 장미터널과 장미공원 일대에서 열리는 서울 대표 장미 축제', source_url: 'https://festival.seoul.go.kr/festival/main/festivalView.do?festacode=604' },
  { spotName: '서울대공원 장미원', name: '서울대공원 장미원축제', start_date: '2026-05-30', end_date: '2026-06-07', description: '서울대공원 테마가든 장미원 일대에서 열리는 장미 축제', source_url: 'https://festival.seoul.go.kr/festival/main/festivalView.do?festacode=604' },
  { spotName: '곡성 섬진강기차마을 장미공원', name: '제16회 곡성세계장미축제', start_date: '2026-05-22', end_date: '2026-05-31', description: '곡성 섬진강기차마을 장미공원에서 열리는 5월 대표 장미 축제', source_url: 'https://www.gokseong.go.kr/tour/festivity/rose' },
  { spotName: '이곡장미공원', name: '장미꽃 필(feel) 무렵', start_date: '2026-05-15', end_date: '2026-05-17', description: '대구 달서구 이곡분수공원·이곡장미공원 일대 장미 축제', source_url: 'https://tour.daegu.go.kr/index.do?menu_id=00002932&menu_link=%2Ffront%2Ftour%2FtourMapsView.do%3FtourId%3DKOEVENT_372' },
  { spotName: '임실치즈테마파크 장미원', name: '임실N장미축제', start_date: '2026-05-28', end_date: '2026-05-31', description: '임실치즈테마파크 장미원에서 열리는 신규 장미 축제', source_url: 'https://www.imsil.go.kr/tour/' },
  { spotName: '삼척장미공원', name: '2026 삼척 장미축제', start_date: '2026-05-19', end_date: '2026-05-25', description: '삼척 장미공원 일대에서 열리는 장미 축제', source_url: 'https://www.stcf.or.kr/01298/01315/01315.web?amode=view&gcode=1001&idx=686' },
  { spotName: '마노르블랑', name: '마노르블랑 수국축제', start_date: '2026-05-23', end_date: '2026-08-31', description: '제주 마노르블랑에서 열리는 유럽수국 축제', source_url: 'https://m.visitjeju.net/kr/detail/view?contentsid=CNTS_200000000010213&menuId=DOM_000001917009000000' },
  { spotName: '휴애리 자연생활공원 수국정원', name: '휴애리 여름 수국축제', start_date: '2026-06-13', end_date: '2026-07-27', description: '제주 휴애리 자연생활공원 여름 수국 축제', source_url: 'https://www.hueree.com' },
  { spotName: '화담숲 수국원', name: '화담숲 여름 수국축제', start_date: '2026-06-01', end_date: '2026-07-31', description: '경기 광주 화담숲에서 즐기는 여름 수국 축제', source_url: 'https://www.hwadamsup.com' },
  { spotName: '고성 하늬라벤더팜', name: '하늬라벤더팜 라벤더축제', start_date: '2026-06-05', end_date: '2026-06-23', description: '강원 고성 라벤더 농장에서 열리는 6월 라벤더 축제', source_url: 'https://www.herbnara.com' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeName(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function mergeFlowerTypes(current, next) {
  return normalizeFlowerTypes([...(current || []), ...(next || [])]);
}

function isUsableCandidate(doc, spot) {
  const category = doc.category_name || '';
  const name = normalizeName(doc.place_name);
  const query = normalizeName(spot.query);
  const spotName = normalizeName(spot.name);
  const isCafe = category.includes('카페') || category.includes('음식점');
  const isClearlyWrong = ['편의점', '숙박', '부동산', '주차장', '화장실', '충전소', '펜션', '예식장', '빌딩']
    .some((word) => category.includes(word) || name.includes(normalizeName(word)));

  if (isClearlyWrong) return false;
  if (isCafe && spot.category !== 'cafe') return false;

  return name.includes(query)
    || query.includes(name)
    || name.includes(spotName)
    || spotName.includes(name)
    || category.includes('여행')
    || category.includes('문화')
    || category.includes('공원')
    || category.includes('관광')
    || category.includes('수목원')
    || category.includes('종교')
    || category.includes('농업');
}

async function kakaoSearch(apiKey, spot) {
  const queries = [
    `${spot.query} ${spot.addressHint || ''}`.trim(),
    spot.query,
    ...(spot.fallbackQueries || []),
    `${spot.name} ${spot.addressHint || ''}`.trim(),
    spot.name,
  ];

  for (const query of [...new Set(queries.filter(Boolean))]) {
    const payload = await requestKeywordSearch({ apiKey, query, size: 5 });
    const docs = (payload?.documents ?? []).filter((doc) => isUsableCandidate(doc, spot));
    if (docs.length === 0) continue;

    const normalizedQuery = normalizeName(spot.name);
    const preferred = docs.find((doc) => normalizeName(doc.place_name).includes(normalizedQuery) || normalizedQuery.includes(normalizeName(doc.place_name)))
      ?? docs[0];

    return {
      external_place_id: preferred.id,
      name: spot.name,
      address: preferred.road_address_name || preferred.address_name || spot.addressHint || null,
      lat: preferred.y ? Number(preferred.y) : null,
      lng: preferred.x ? Number(preferred.x) : null,
      phone: preferred.phone || null,
      website_url: preferred.place_url || null,
      raw_place_name: preferred.place_name,
    };
  }

  return null;
}

async function findExistingSpot(supabase, spot, resolved) {
  if (resolved?.external_place_id) {
    const { data, error } = await supabase
      .from('flower_spots')
      .select('*')
      .eq('external_place_id', resolved.external_place_id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const { data: exact, error: exactError } = await supabase
    .from('flower_spots')
    .select('*')
    .eq('name', spot.name)
    .limit(1)
    .maybeSingle();
  if (exactError) throw exactError;
  if (exact) return exact;

  const { data: fuzzy, error: fuzzyError } = await supabase
    .from('flower_spots')
    .select('*')
    .ilike('name', `%${spot.name.replace(/\s+/g, '%')}%`)
    .limit(1)
    .maybeSingle();
  if (fuzzyError) throw fuzzyError;
  return fuzzy || null;
}

async function upsertSpot(supabase, apiKey, spot) {
  const resolved = await kakaoSearch(apiKey, spot);
  if (!resolved?.lat || !resolved?.lng) {
    console.warn(`[skip] ${spot.name} — Kakao 좌표 검색 실패`);
    return { status: 'skipped' };
  }

  const existing = await findExistingSpot(supabase, spot, resolved);
  const shouldRefreshResolvedFields = !existing || existing.source === SOURCE;
  const payload = {
    external_place_id: existing?.external_place_id || `may-june-2026:${resolved.external_place_id}`,
    name: existing?.name || spot.name,
    address: shouldRefreshResolvedFields ? (resolved.address || spot.addressHint || existing?.address || null) : (existing?.address || resolved.address || spot.addressHint || null),
    lat: shouldRefreshResolvedFields ? resolved.lat : (existing?.lat || resolved.lat),
    lng: shouldRefreshResolvedFields ? resolved.lng : (existing?.lng || resolved.lng),
    flower_types: mergeFlowerTypes(existing?.flower_types, spot.flower_types),
    category: normalizeCategory(existing?.category || spot.category),
    peak_month_start: spot.peak[0],
    peak_month_end: spot.peak[1],
    has_night_light: Boolean(existing?.has_night_light || spot.has_night_light),
    has_parking: Boolean(existing?.has_parking || spot.has_parking),
    pet_friendly: Boolean(existing?.pet_friendly || spot.pet_friendly),
    photo_spot: Boolean(existing?.photo_spot || spot.photo_spot),
    entry_fee: Number.isFinite(existing?.entry_fee) && existing.entry_fee > 0 ? existing.entry_fee : (spot.entry_fee || 0),
    phone: existing?.phone || resolved.phone || null,
    website_url: existing?.website_url || resolved.website_url || spot.source_url || null,
    source: existing?.source || SOURCE,
    updated_at: nowIso(),
  };

  if (existing?.id) {
    const { error } = await supabase.from('flower_spots').update(payload).eq('id', existing.id);
    if (error) throw error;
    console.log(`[spot] updated: ${payload.name} (${resolved.raw_place_name})`);
    return { status: 'updated', id: existing.id, name: payload.name };
  }

  const { data, error } = await supabase.from('flower_spots').insert(payload).select('id, name').single();
  if (error) throw error;
  console.log(`[spot] inserted: ${data.name} (${resolved.raw_place_name})`);
  return { status: 'inserted', id: data.id, name: data.name };
}

async function findSpotByNameLoose(supabase, name) {
  const { data: exact, error: exactError } = await supabase
    .from('flower_spots')
    .select('id, name')
    .eq('name', name)
    .limit(1)
    .maybeSingle();
  if (exactError) throw exactError;
  if (exact) return exact;

  const { data: fuzzy, error: fuzzyError } = await supabase
    .from('flower_spots')
    .select('id, name')
    .ilike('name', `%${name.replace(/\s+/g, '%')}%`)
    .limit(1)
    .maybeSingle();
  if (fuzzyError) throw fuzzyError;
  return fuzzy;
}

async function cleanupBadSeedRows(supabase) {
  const { error } = await supabase
    .from('flower_spots')
    .delete()
    .eq('source', SOURCE)
    .in('external_place_id', BAD_SEED_EXTERNAL_PLACE_IDS);
  if (error) throw error;
}

async function upsertFestival(supabase, festival) {
  const spot = await findSpotByNameLoose(supabase, festival.spotName);
  if (!spot) {
    console.warn(`[festival] skipped: ${festival.name} — spot not found`);
    return 'skipped';
  }

  const { data: existing, error: existingError } = await supabase
    .from('festivals')
    .select('id')
    .eq('spot_id', spot.id)
    .eq('name', festival.name)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;

  const payload = {
    spot_id: spot.id,
    name: festival.name,
    start_date: festival.start_date,
    end_date: festival.end_date,
    description: festival.description,
    source_url: festival.source_url,
  };

  if (existing?.id) {
    const { error } = await supabase.from('festivals').update(payload).eq('id', existing.id);
    if (error) throw error;
    console.log(`[festival] updated: ${festival.name} -> ${spot.name}`);
    return 'updated';
  }

  const { error } = await supabase.from('festivals').insert(payload);
  if (error) throw error;
  console.log(`[festival] inserted: ${festival.name} -> ${spot.name}`);
  return 'inserted';
}

async function main() {
  loadLocalEnv();
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoApiKey) throw new Error('KAKAO_REST_API_KEY is missing');

  const supabase = createServiceClient();
  const summary = { inserted: 0, updated: 0, skipped: 0, festivalInserted: 0, festivalUpdated: 0, festivalSkipped: 0 };
  await cleanupBadSeedRows(supabase);

  for (const spot of SPOTS) {
    const result = await upsertSpot(supabase, kakaoApiKey, spot);
    if (result.status === 'inserted') summary.inserted += 1;
    if (result.status === 'updated') summary.updated += 1;
    if (result.status === 'skipped') summary.skipped += 1;
    await sleep(180);
  }

  for (const festival of FESTIVALS) {
    const status = await upsertFestival(supabase, festival);
    if (status === 'inserted') summary.festivalInserted += 1;
    if (status === 'updated') summary.festivalUpdated += 1;
    if (status === 'skipped') summary.festivalSkipped += 1;
  }

  console.log('\n[may-june-2026] done', summary);
}

main().catch((error) => {
  console.error('[may-june-2026] failed:', error);
  process.exit(1);
});
