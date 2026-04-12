/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');
const crypto = require('crypto');

function hashPostPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function uuid() {
  return crypto.randomUUID();
}

const POSTS = [
  // 봄꽃
  {
    category: 'spring',
    nickname: '꽃구경러버',
    title: '여의도 벚꽃 실시간 개화 현황 공유해요',
    content: `오늘 여의도 윤중로 다녀왔는데 3월 말 기준 20~30% 개화 중이에요. 이번 주말이면 절정 될 것 같아요! 오후 5시 이후에 야간조명도 켜지는데 진짜 너무 예쁩니다. 주차는 거의 불가능하니 지하철 추천드려요 (여의도역 1번 출구).`,
    image_urls: [
      'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80',
      'https://images.unsplash.com/photo-1493606278519-11aa9f86e40a?w=800&q=80',
    ],
  },
  {
    category: 'spring',
    nickname: '매화탐방단',
    title: '광양 매화마을 3월 초 방문 후기',
    content: `섬진강 매화마을 갔다왔어요. 3월 5일~15일 사이가 절정인 것 같더라고요. 하얀 매화밭이 끝없이 펼쳐지는데 사진이 너무 잘 나와요. 주말엔 사람이 엄청 많으니 평일 오전을 추천해요. 근처 재첩국밥도 꼭 드세요!`,
    image_urls: [
      'https://images.unsplash.com/photo-1591280063444-d3c514eb6e13?w=800&q=80',
    ],
  },

  // 여름꽃
  {
    category: 'summer',
    nickname: '수국덕후',
    title: '제주 마노르블랑 수국 지금 딱 절정이에요',
    content: `6월 중순 제주 마노르블랑 방문했는데 수국이 완전 만개했어요! 입장료 있는데 충분히 값어치 해요. 블루·핑크·퍼플 수국이 층층이 펼쳐지는 뷰가 장관입니다. 아침 일찍 가야 인파가 덜하고 빛도 좋아요.`,
    image_urls: [
      'https://images.unsplash.com/photo-1560717845-968823efbee1?w=800&q=80',
      'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=800&q=80',
    ],
  },
  {
    category: 'summer',
    nickname: '연꽃순례자',
    title: '무안 회산백련지 연꽃 개화 시작됐어요',
    content: `전남 무안 회산백련지 7월 초 방문했습니다. 동양 최대 연꽃 군락지라는 말이 실감나요. 흰 연꽃이 수면을 가득 덮고 있는 장관... 이른 아침에 안개 낀 연꽃밭은 정말 몽환적이에요. 주변 연근 음식도 맛있으니 꼭 드셔보세요.`,
    image_urls: [
      'https://images.unsplash.com/photo-1585504198199-20277593b94f?w=800&q=80',
    ],
  },

  // 가을꽃
  {
    category: 'autumn',
    nickname: '코스모스필름',
    title: '순천 코스모스 길 드라이브 코스 추천',
    content: `10월 초 순천만 가는 길목 코스모스 드라이브 코스 너무 좋았어요. 창문 열고 달리면 꽃향기 가득이고 중간중간 갓길에 세워두고 사진 찍기 좋아요. 순천만국가정원이랑 같이 묶어서 당일치기로 딱 좋습니다.`,
    image_urls: [
      'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&q=80',
      'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80',
    ],
  },
  {
    category: 'autumn',
    nickname: '억새바람',
    title: '민둥산 억새 9월 말이 진짜 타이밍이에요',
    content: `강원도 정선 민둥산 억새 매년 가는데 올해도 9월 말에 딱 맞춰 갔어요. 정상부 억새밭이 바람에 출렁이는 게 진짜 장관입니다. 왕복 2시간 정도 등산이라 무릎 안 좋은 분들은 스틱 필수! 일몰 억새는 불타는 것처럼 황금빛이에요.`,
    image_urls: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    ],
  },

  // 겨울꽃
  {
    category: 'winter',
    nickname: '동백꽃여행자',
    title: '거제 지심도 동백꽃 섬 여행 강추',
    content: `1월 말 거제 지심도 동백꽃 완전 절정이에요. 섬 전체가 동백나무 숲인데 바닷바람에 흔들리는 빨간 꽃잎이 너무 이쁩니다. 장승포항에서 배로 15분이면 도착해요. 섬이 크지 않아서 1~2시간이면 한바퀴 다 돌 수 있어요.`,
    image_urls: [
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&q=80',
    ],
  },
  {
    category: 'winter',
    nickname: '수선화밭사진가',
    title: '제주 휴애리 수선화 축제 2월이 절정',
    content: `제주 휴애리 수선화 축제 다녀왔어요. 2월 초가 딱 절정이더라고요. 노란 수선화밭 사이로 한라산 뷰가 겹치는 포인트가 있는데 거기서 사진 찍으면 진짜 잡지 느낌나요. 동백꽃이랑 같이 볼 수 있어서 겨울 꽃 투어로 완벽했습니다.`,
    image_urls: [
      'https://images.unsplash.com/photo-1589894404892-7310b6498b3f?w=800&q=80',
      'https://images.unsplash.com/photo-1551649001-7a2482d98d05?w=800&q=80',
    ],
  },

  // 꽃놀이 팁
  {
    category: 'tips',
    nickname: '꽃사진마스터',
    title: '꽃 사진 잘 찍는 팁 총정리 (초보자용)',
    content: `① 역광 활용하기 — 꽃 뒤로 햇빛 두면 반투명하게 빛나서 예뻐요\n② 로우앵글 — 꽃 눈높이로 낮춰 찍으면 배경 날리기 쉬워요\n③ 물방울 — 아침 이슬이나 분무기로 물 뿌리면 생동감 업\n④ 황금시간 — 해뜬 직후/해지기 1시간 전 빛이 최고\n⑤ 배경 단순화 — 뒷배경 하늘 or 녹색으로 정리하면 꽃이 살아남`,
    image_urls: [
      'https://images.unsplash.com/photo-1490750967868-88df5691cc61?w=800&q=80',
    ],
  },
  {
    category: 'tips',
    nickname: '대중교통꽃여행',
    title: '수도권 벚꽃 명소 대중교통 접근 가이드',
    content: `🚇 여의도 윤중로 — 여의도역 1번출구 도보 5분\n🚇 석촌호수 — 잠실나루역 1번출구 도보 3분\n🚇 남산공원 — 명동역 3번출구 → 버스 02번\n🚇 서울숲 — 서울숲역 3번출구 도보 5분\n🚇 경의선숲길 — 홍대입구역 3번출구 도보 10분\n주차 전쟁 피하고 대중교통으로 여유롭게 꽃놀이하세요!`,
    image_urls: [],
  },

  // 인생카페
  {
    category: 'cafe',
    nickname: '카페투어러',
    title: '벚꽃 시즌 무조건 가야 할 카페 뷰 모음',
    content: `🌸 서울 — 용산 카페더라운지 (한강+벚꽃 뷰)\n🌸 경주 — 황리단길 카페 동리목월 (한옥+벚꽃)\n🌸 부산 — 대저카페거리 (유채꽃밭 뷰)\n🌸 제주 — 카페 그라시아 (매화밭 뷰)\n🌸 여수 — 카페 벨벳 (바다+동백 뷰)\n꽃 절정 시기에 자리 예약은 필수입니다!`,
    image_urls: [
      'https://images.unsplash.com/photo-1511081692775-05d0f180a065?w=800&q=80',
    ],
  },
  {
    category: 'cafe',
    nickname: '수국카페탐방',
    title: '제주 수국 카페 베스트 3 솔직 후기',
    content: `① 카페 마노르블랑 — 수국정원 併設, 입장료 별도지만 뷰 압도적\n② 산방산 땅끄부부 — 수국+산방산 뷰 조합 최강, 음료 퀄리티도 좋음\n③ 카페 드롭탑 함덕 — 함덕해수욕장 수국길 옆, 오션뷰+수국 동시에\n6~7월 방문 추천, 오픈런 필수입니다 웨이팅 장난 아님 ㅠ`,
    image_urls: [
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
    ],
  },
];

async function main() {
  loadLocalEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  for (const post of POSTS) {
    // 이미 등록된 글 찾아서 image_urls 업데이트
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('title', post.title)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('posts')
        .update({ image_urls: post.image_urls })
        .eq('id', existing[0].id);
      if (error) {
        console.error(`[update] 실패: ${post.title}`, error.message);
      } else {
        console.log(`[update] 이미지 업데이트: ${post.title} (${post.image_urls.length}장)`);
      }
    }
  }

  console.log('\n[seed] 이미지 업데이트 완료');
}

main().catch((e) => { console.error(e); process.exit(1); });
