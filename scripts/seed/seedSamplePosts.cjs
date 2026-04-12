/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');
const crypto = require('crypto');

function hashPostPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

const POSTS = [
  // ───── 봄꽃 ─────
  {
    category: 'spring',
    nickname: '꽃구경러버',
    title: '여의도 벚꽃 올해 진짜 역대급이에요 (3/31 현장)',
    content: `오늘 퇴근하고 여의도 윤중로 다녀왔는데 지금 딱 절정이에요!! 어제까지만 해도 70% 정도였는데 오늘 기준 거의 만개 수준입니다.

야간조명이 오후 6시부터 켜지는데 낮이랑 완전 다른 느낌이에요. 꽃잎이 빛을 받아서 진짜 몽환적으로 예쁩니다. 인생샷 포인트는 국회의사당 앞 분수대 쪽이에요.

주차는 당연히 불가능하고요ㅋㅋㅋ 여의도역 1번 출구에서 도보 5분이에요. 인파가 심하면 63빌딩 쪽 강변으로 내려가도 벚꽃길 이어져 있어요. 이번 주말 지나면 꽃잎 다 질 것 같으니 내일모레 안으로 가세요!`,
    image_urls: ['https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80', 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800&q=80'],
  },
  {
    category: 'spring',
    nickname: '매화탐방단장',
    title: '광양 매화마을 3월 둘째주 방문 — 타이밍 완벽했어요',
    content: `섬진강 매화마을 3월 10일에 다녀왔어요. 결론부터 말하면 타이밍 완벽했습니다.

하얀 매화가 강변을 따라 끝없이 펼쳐지는 게 진짜 꿈속 같아요. 청매실농원 위쪽 언덕에서 내려다보는 뷰가 인생샷 포인트예요. 아침 9시 전에 올라가면 아직 안개가 살짝 깔려있어서 진짜 수묵화 느낌납니다.

주말엔 주차가 거의 불가능해서 평일 방문 강추해요. 근처 식당에서 재첩국밥+매실막걸리 꼭 드시고요 ㅎㅎ 다압면 섬진강매화마을 축제가 보통 3월 중순~말에 열리니 일정 맞추면 더 좋아요.`,
    image_urls: ['https://images.unsplash.com/photo-1591280063444-d3c514eb6e13?w=800&q=80'],
  },
  {
    category: 'spring',
    nickname: '진해벚꽃원정대',
    title: '진해 군항제 처음 갔는데 진짜 압도당했어요',
    content: `진해 군항제 올해 처음 갔어요. 왜 매년 난리인지 이제 알겠어요.

여좌천 로망스다리 쪽이 메인인데 양쪽 벚꽃 나무가 터널처럼 이어져 있어서 진짜 예쁩니다. 경화역 플랫폼도 명소인데 기차 안 다니는 폐역이라 선로 위에 올라가서 사진 찍을 수 있어요.

군함도 투어 배도 탈 수 있고요. 숙박은 창원에서 잡는 게 진해보다 선택지 많고 가격도 나아요. 셔틀버스 운행하니까 참고하시구요. 개인적으론 군항제 시작 전날 갔을 때 인파가 훨씬 덜해서 좋았어요.`,
    image_urls: ['https://images.unsplash.com/photo-1493606278519-11aa9f86e40a?w=800&q=80', 'https://images.unsplash.com/photo-1554752138-99bbaa51f66d?w=800&q=80'],
  },

  // ───── 여름꽃 ─────
  {
    category: 'summer',
    nickname: '수국덕후',
    title: '제주 마노르블랑 수국 6월 중순 딱 절정이에요',
    content: `제주 마노르블랑 6월 17일에 갔는데 수국이 완전 만개했습니다!! 입장료 내는 게 아깝지 않을 정도로 규모가 어마어마해요.

블루, 핑크, 퍼플 수국이 층층이 계단식으로 심겨있는데 아래에서 위로 올려다보는 구도가 진짜 예뻐요. 하늘이 파란 날 가야 색감이 살아요. 오전 10시 전에 도착하면 인파 없이 여유롭게 사진 찍을 수 있어요.

인근 카페에서 수국 케이크 파는데 비주얼 너무 예뻤음ㅋㅋ 제주 올 때 수국 시즌 맞춰오세요. 6월 중순~7월 초가 타이밍이에요!`,
    image_urls: ['https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=800&q=80', 'https://images.unsplash.com/photo-1560717845-968823efbee1?w=800&q=80'],
  },
  {
    category: 'summer',
    nickname: '연꽃순례자',
    title: '무안 회산백련지 이른 아침이 진짜 진짜 예뻐요',
    content: `전남 무안 회산백련지 7월 첫 주에 다녀왔어요. 동양 최대 연꽃 군락지라는 말이 과장이 아니에요.

새벽 6시에 도착했는데 안개가 수면 위를 낮게 깔려있고 하얀 연꽃이 빼곡하게 피어있는 게 진짜 비현실적인 장면이었어요. 일출 직후 빛이 연꽃을 투과할 때 사진이 가장 잘 나와요. 늦어도 8시 전엔 도착하세요.

산책로가 연꽃밭 사이로 나있어서 걸으면서 구경할 수 있고요. 연근 요리 파는 식당들도 많아요. 개인적으론 일주일에 한 번씩 가고 싶을 정도로 좋았어요..`,
    image_urls: ['https://images.unsplash.com/photo-1585504198199-20277593b94f?w=800&q=80', 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=800&q=80'],
  },
  {
    category: 'summer',
    nickname: '해바라기길여행자',
    title: '태안 청산수목원 해바라기 8월 초가 피크예요',
    content: `충남 태안 청산수목원 해바라기 보러 갔다왔어요. 수십만 송이 해바라기가 일제히 태양 향해 피어있는 게 압도적입니다.

언덕 위에서 내려다보는 구도가 있는데 거기서 사진 찍으면 배경이 황금빛 바다처럼 나와요. 오후 3~5시 햇빛이 기울기 시작할 때가 색감 제일 좋아요. 해바라기는 아침에 동쪽, 오후에 서쪽을 보는 특성이 있어서 오전이냐 오후냐에 따라 사진 구도가 달라져요.

입장료 있고 주말은 주차가 꽤 혼잡해요. 근처 태안 해안 드라이브랑 같이 묶으면 하루 코스로 딱 좋습니다.`,
    image_urls: ['https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80'],
  },

  // ───── 가을꽃 ─────
  {
    category: 'autumn',
    nickname: '코스모스필름',
    title: '순천 코스모스 드라이브 코스 10월 초 강추',
    content: `10월 3일 순천 갔다왔는데 코스모스 드라이브 코스가 진짜 대박이었어요.

순천만국가정원 쪽에서 순천만 습지 가는 길목에 코스모스밭이 양쪽으로 쭉 이어져있는데, 창문 열고 달리면 꽃향기가 차 안으로 들어오거든요. 중간중간 갓길에 차 세우고 사진 찍기도 좋아요.

보통 코스모스라고 하면 흰분홍 생각하는데 여기는 진분홍-버건디 코스모스가 많아서 색감이 진해요. 순천만 갈대밭이랑 당일 코스로 묶으면 완벽한 가을 여행이 됩니다. 순천만국가정원은 입장료 있으니 미리 확인하세요.`,
    image_urls: ['https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&q=80', 'https://images.unsplash.com/photo-1508759073847-cd61b5be24f3?w=800&q=80'],
  },
  {
    category: 'autumn',
    nickname: '억새바람',
    title: '민둥산 억새 9월 말 꼭 가세요 — 황금빛 출렁임',
    content: `강원도 정선 민둥산 억새 매년 가는데 올해도 9월 28일에 딱 맞춰 갔어요.

정상부 억새밭이 바람에 물결처럼 출렁이는 게 진짜 뭔가 울컥함ㅋㅋ 일몰 때 억새가 황금빛으로 물드는데 그 장면은 말로 표현이 안 돼요. 올해 억새 축제가 10월 초에 열렸는데 이때 가면 핫도그 같은 행사 먹거리도 많아요.

등산 난이도는 무난한 편인데 왕복 2시간 30분 정도는 잡으세요. 무릎 안 좋은 분들은 스틱 챙기시고요. 스마트폰보다 카메라 가져가는 걸 추천해요 억새밭 사진은 카메라가 훨씬 잘 나와요.`,
    image_urls: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80'],
  },
  {
    category: 'autumn',
    nickname: '구절초야생화',
    title: '정읍 구절초테마공원 — 10월엔 여기가 답이에요',
    content: `전북 정읍 구절초테마공원 다녀왔어요. 국화과 야생화 구절초가 산 전체를 하얗게 뒤덮는 장관인데 아직 많이 알려지지 않아서 한적하게 즐길 수 있어요.

10월 첫째~셋째 주가 절정이에요. 하얀 꽃밭 사이에 걸어들어가는 느낌이 진짜 힐링이에요. 입장료가 있는데 상당히 저렴하고 공원 규모에 비해 관리가 잘 되어있어요.

내장산 단풍이랑 같은 날 같이 보면 하루에 가을 느낌 꽉 채울 수 있어요. 차로 30분 거리니까 같이 묶어서 계획 세우세요!`,
    image_urls: ['https://images.unsplash.com/photo-1490750967868-88df5691cc61?w=800&q=80', 'https://images.unsplash.com/photo-1444930694458-01babf71abda?w=800&q=80'],
  },

  // ───── 겨울꽃 ─────
  {
    category: 'winter',
    nickname: '동백꽃여행자',
    title: '거제 지심도 동백꽃 — 섬 전체가 붉어요',
    content: `1월 말 거제 지심도 다녀왔는데 동백꽃이 완전 절정이었어요. 섬 전체가 동백나무 숲인데 군데군데 빨간 꽃이 산처럼 피어있어요.

장승포항에서 배로 15분이면 도착하는데 배 시간표 미리 확인하세요. 섬이 크지 않아서 1~2시간이면 한 바퀴 다 돌 수 있어요. 동백꽃이 통째로 뚝 떨어지는 게 특징인데 길바닥에 떨어진 꽃들도 되게 예뻐요.

겨울 바닷바람이 좀 세서 두툼하게 입고 가세요. 개인적으론 사람 거의 없는 평일 오전이 제일 좋았어요. 조용하고 새소리만 들리고..진짜 힐링됐어요.`,
    image_urls: ['https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&q=80'],
  },
  {
    category: 'winter',
    nickname: '수선화밭탐방가',
    title: '제주 휴애리 수선화 축제 2월 초가 절정이에요',
    content: `제주 휴애리 수선화 축제 2월 3일에 갔는데 딱 절정이었어요!! 흰 수선화가 드넓게 펼쳐지는데 향기가 진짜 장난 아니에요. 꽃향기에 취할 것 같았어요 진짜로.

한라산을 배경으로 수선화밭이 펼쳐지는 포인트가 있는데 거기서 찍은 사진이 진짜 잡지 화보 느낌나요. 동백꽃이 같이 피어있는 시기라서 두 꽃을 한번에 볼 수 있어요.

입장료 있고 주차공간은 넉넉해요. 오전에 가서 서귀포 쪽 남은 일정 채우는 게 효율적이에요. 2월 말 되면 수선화 지기 시작하니까 2월 초~중순 방문 추천드려요.`,
    image_urls: ['https://images.unsplash.com/photo-1589894404892-7310b6498b3f?w=800&q=80', 'https://images.unsplash.com/photo-1551649001-7a2482d98d05?w=800&q=80'],
  },
  {
    category: 'winter',
    nickname: '납매꽃탐방단',
    title: '창덕궁 후원 납매 꽃 — 서울 도심 겨울꽃 명소',
    content: `1월에 서울 도심에서 꽃 볼 수 있는 데 찾다가 창덕궁 후원 납매를 발견했어요. 납매는 매화랑 비슷한데 노란색이고 꿀 향기가 나는 꽃이에요.

창덕궁 후원 관람 예약하고 들어가면 후원 안쪽에 납매나무가 있어요. 한겨울에 노란 꽃이 피어있는 게 비현실적으로 예뻐요. 한복 입고 오면 궁궐+납매 배경으로 진짜 예쁜 사진 찍을 수 있어요.

후원 관람은 사전 예약 필수예요. 1월~2월 사이에 가면 납매 볼 수 있는데 정확한 개화 시기는 해마다 다르니 가기 전에 창덕궁 인스타 확인하세요.`,
    image_urls: ['https://images.unsplash.com/photo-1591280063444-d3c514eb6e13?w=800&q=80'],
  },

  // ───── 꽃놀이 팁 ─────
  {
    category: 'tips',
    nickname: '꽃사진작가지망생',
    title: '스마트폰으로 꽃 사진 잘 찍는 법 (진짜 실용 팁)',
    content: `꽃 사진 찍다보면 왜 눈으로 보는 것만큼 안 나오냐 싶죠? 몇 가지 알면 확 달라져요.

① 역광 써먹기 — 꽃 뒤에 태양 두면 꽃잎이 반투명하게 빛나요. 특히 튤립이나 벚꽃이 이 방법으로 진짜 예뻐요
② 로우앵글 — 꽃 눈높이로 낮춰서 찍으면 배경을 자연스럽게 날릴 수 있어요
③ 이른 아침 이슬 — 물방울 맺힌 꽃이 훨씬 생동감 있어요. 분무기 들고 가는 것도 방법
④ 황금 시간 — 일출 30분 후, 일몰 1시간 전 빛이 따뜻하고 예뻐요
⑤ 노출 조절 — 흰 꽃은 살짝 -0.3~-0.5 노출 내리면 날아가지 않아요

사진 잘 나오는 날씨는 맑은 날 아침이 최고예요!`,
    image_urls: ['https://images.unsplash.com/photo-1490750967868-88df5691cc61?w=800&q=80'],
  },
  {
    category: 'tips',
    nickname: '대중교통꽃여행',
    title: '수도권 꽃구경 명소 지하철 접근 가이드 총정리',
    content: `봄 되면 주차 전쟁 때문에 드라이브 포기하는 분들 많잖아요. 사실 대중교통으로 가는 게 훨씬 편해요.

🚇 여의도 윤중로 — 여의도역 1번 출구 도보 5분
🚇 석촌호수 — 잠실나루역 1번 출구 도보 3분
🚇 남산 벚꽃길 — 명동역 3번 출구 → 02번 버스
🚇 서울숲 — 서울숲역 3번 출구 도보 5분
🚇 경의선 숲길 — 홍대입구역 3번 출구 도보 10분
🚇 삼청동 길 — 경복궁역 3번 출구 도보 15분

꽃놀이 시즌엔 대중교통 배차 간격도 짧아지니까 진짜 편해요. 주차비+주차 스트레스 생각하면 훨씬 나아요ㅎㅎ`,
    image_urls: [],
  },
  {
    category: 'tips',
    nickname: '꽃여행기록가',
    title: '벚꽃 개화 예측 어플/사이트 추천 & 활용법',
    content: `매년 벚꽃 타이밍 놓쳐서 아쉬워하는 분들 있죠? 미리 준비하면 절정 시기 딱 맞출 수 있어요.

📱 기상청 봄꽃 개화 예측 — 기상청 앱에서 지역별 개화 예상일 확인 가능해요
📱 케이웨더 꽃구경 지도 — 전국 벚꽃 명소 실시간 개화 상태 업데이트
📱 인스타그램 해시태그 — #여의도벚꽃 #진해벚꽃 등 당일 게시물로 실시간 파악 최고

개화 예측은 보통 남부지방(부산/광양)이 3월 중순, 서울은 3월 말~4월 초예요. 한라산은 4월 중순까지도 봄꽃 볼 수 있어요.

벚꽃은 만개 후 1주일이면 지기 시작하니까 주말 기다리지 말고 만개 확인되면 바로 가세요!`,
    image_urls: ['https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800&q=80'],
  },

  // ───── 인생카페 ─────
  {
    category: 'cafe',
    nickname: '카페투어러',
    title: '경주 황리단길 한옥카페 — 벚꽃 시즌엔 여기가 답',
    content: `경주 황리단길 벚꽃 시즌에 다녀왔어요. 한옥 카페 뒤로 벚꽃 나무가 보이는 뷰가 진짜 국내에서 이만한 데 없다고 생각해요.

카페 교리김밥 옆 한옥 카페 골목이 포인트인데 돌담 위로 벚꽃이 드리워지는 풍경이 진짜 예뻐요. 카페 이스트바 황리단길점이 루프탑에서 첨성대+벚꽃 뷰 볼 수 있어서 강추예요.

벚꽃 시즌엔 웨이팅 장난 아니니까 평일 오전에 가거나 예약 되는 데는 미리 잡으세요. 경주는 봄 벚꽃 시즌에 숙소 가격이 2~3배 뛰니까 일찍 잡는 게 좋아요.`,
    image_urls: ['https://images.unsplash.com/photo-1511081692775-05d0f180a065?w=800&q=80', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80'],
  },
  {
    category: 'cafe',
    nickname: '제주카페탐방러',
    title: '제주 수국 카페 솔직 후기 — 마노르블랑 vs 땅끄부부',
    content: `제주 수국 시즌에 카페 두 곳 다 가봤어요. 어디 갈지 고민하는 분들 위해 솔직하게 비교해드릴게요.

🌿 마노르블랑 — 규모 압도적. 수국정원이 카페 안에 있어서 음료 마시면서 수국 구경 가능. 단 사람이 너무 많음. 사진 찍으려면 기다려야 함.

🌿 산방산 땅끄부부 — 수국+산방산+바다 트리플뷰. 음료 퀄리티가 마노르블랑보다 좋음. 상대적으로 덜 붐빔.

개인적으론 땅끄부부 한 표! 뷰 조합이 진짜 독보적이에요. 6월 중순~7월 초 수국 시즌에 맞춰서 오세요. 오픈 직후 가야 웨이팅 없이 바로 들어갈 수 있어요.`,
    image_urls: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80'],
  },
  {
    category: 'cafe',
    nickname: '대저카페거리탐방',
    title: '부산 대저 유채꽃밭 카페 — 봄엔 여기 꼭 가세요',
    content: `부산 강서구 대저동 유채꽃밭 옆 카페 다녀왔어요. 낙동강 옆에 노란 유채꽃밭이 끝없이 펼쳐지고 그 사이에 카페들이 자리잡고 있어요.

카페 뷰가 진짜 이국적인 게 부산 맞나 싶을 정도예요. 에어포트뷰 카페들도 있는데 비행기 이착륙 보면서 유채꽃밭 배경으로 앉아있으면 진짜 힐링돼요.

4월 초~중순이 유채꽃 절정인데 주말엔 사람이 진짜 많이 와요. 평일 오전을 강추해요. 김해공항 근처라 비행기 타기 전후로 들르기도 좋아요. 주차장은 넓어서 드라이브로 가도 괜찮아요!`,
    image_urls: ['https://images.unsplash.com/photo-1490750967868-88df5691cc61?w=800&q=80', 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&q=80'],
  },
];

async function main() {
  loadLocalEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // 기존 글 전체 삭제
  console.log('[seed] 기존 게시글 삭제 중...');
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // 전체 삭제

  if (deleteError) {
    console.error('[seed] 삭제 실패:', deleteError.message);
    process.exit(1);
  }
  console.log('[seed] 기존 게시글 삭제 완료');

  // 새 글 삽입
  const password = 'seed1234';
  const passwordHash = hashPostPassword(password);
  const sessionId = crypto.randomUUID();

  let inserted = 0;
  for (const post of POSTS) {
    const { error } = await supabase.from('posts').insert({
      category: post.category,
      nickname: post.nickname,
      title: post.title,
      content: post.content,
      image_urls: post.image_urls,
      post_password_hash: passwordHash,
      anon_session_id: sessionId,
      moderation_status: 'visible',
    });

    if (error) {
      console.error(`[seed] 삽입 실패: ${post.title}`, error.message);
    } else {
      inserted++;
      console.log(`[seed] 삽입 완료: [${post.category}] ${post.title}`);
    }
  }

  console.log(`\n[seed] 완료 — ${inserted}/${POSTS.length}개 삽입됨 (비밀번호: ${password})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
