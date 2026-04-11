/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');

const FESTIVALS = [
  {
    name: '영등포 여의도 봄꽃축제',
    start_date: '2026-04-03',
    end_date: '2026-04-07',
    description: '여의서로 일대에서 열리는 대표 벚꽃 축제',
    source_url: 'https://www.ydp.go.kr',
    candidates: [
      { name: '윤중로' },
      { name: '여의서로' },
      { name: '여의도' },
    ],
  },
  {
    name: '진해군항제',
    start_date: '2026-03-27',
    end_date: '2026-04-05',
    description: '진해 여좌천과 경화역 일대에서 열리는 대표 벚꽃 축제',
    source_url: 'https://www.changwon.go.kr/cwportal/depart/11063/11091/11377.web',
    candidates: [
      { name: '여좌천' },
      { name: '경화역' },
      { name: '진해루' },
    ],
  },
  {
    name: '광양매화축제',
    start_date: '2026-03-13',
    end_date: '2026-03-22',
    description: '광양 매화마을 일대에서 열리는 대표 매화 축제',
    source_url: 'https://korean.visitkorea.or.kr/kfes/detail/fstvlDetail.do?fstvlCntntsId=f0b79efc-4314-4b9b-b47d-bb56e9ea1d5b',
    candidates: [
      { name: '매화마을' },
      { name: '광양매화' },
    ],
  },
  {
    name: '고양국제꽃박람회',
    start_date: '2026-04-24',
    end_date: '2026-05-10',
    description: '일산호수공원 일대에서 열리는 대형 꽃 박람회',
    source_url: 'https://www.flower.or.kr/main',
    candidates: [
      { name: '일산호수공원' },
      { name: '고양꽃전시관' },
    ],
  },
  {
    name: '태안 세계튤립꽃박람회',
    start_date: '2026-04-01',
    end_date: '2026-05-06',
    description: '코리아플라워파크에서 열리는 대표 튤립 축제',
    source_url: 'https://ffestival.co.kr/?pn=festival&skey=%ED%8A%A4%EB%A6%BD',
    candidates: [
      { name: '코리아플라워파크' },
      { name: '네이처월드' },
    ],
  },
  {
    name: '군포철쭉축제',
    start_date: '2026-04-18',
    end_date: '2026-04-26',
    description: '철쭉동산 일대에서 열리는 수도권 대표 철쭉 축제',
    source_url: 'https://www.mcst.go.kr/kor/s_culture/festival/festivalView.jsp?pSeq=12570',
    candidates: [
      { name: '철쭉동산' },
      { name: '철쭉공원' },
    ],
  },
  {
    name: '곡성세계장미축제',
    start_date: '2026-05-22',
    end_date: '2026-05-31',
    description: '섬진강기차마을 일대에서 열리는 대표 장미 축제',
    source_url: 'https://www.gokseong.go.kr/tour/festivity/rose',
    candidates: [
      { name: '섬진강기차마을' },
      { name: '곡성기차마을' },
    ],
  },
  {
    name: '고창벚꽃축제',
    start_date: '2026-04-03',
    end_date: '2026-04-05',
    description: '고창 석정지구 일대에서 열리는 벚꽃 축제',
    source_url: 'https://www.mcst.go.kr/kor/s_culture/festival/festivalView.jsp?pSeq=12534',
    candidates: [
      { name: '석정' },
      { name: '고창 벚꽃' },
    ],
  },
  {
    name: '구례 산수유꽃축제',
    start_date: '2026-03-13',
    end_date: '2026-03-22',
    description: '구례 산동면 일대에서 열리는 대표 산수유 축제',
    source_url: 'https://www.gurye.go.kr',
    candidates: [
      { name: '산수유마을' },
      { name: '산수유꽃' },
      { name: '산동면' },
    ],
  },
  {
    name: '하동 벚꽃축제',
    start_date: '2026-04-01',
    end_date: '2026-04-07',
    description: '하동 섬진강 십리벚꽃길 일대에서 열리는 벚꽃 축제',
    source_url: 'https://www.hadong.go.kr',
    candidates: [
      { name: '십리벚꽃길' },
      { name: '화개장터' },
      { name: '쌍계사' },
    ],
  },
  {
    name: '합천 황매산 철쭉제',
    start_date: '2026-05-01',
    end_date: '2026-05-10',
    description: '황매산 군립공원 일대에서 열리는 대표 철쭉 축제',
    source_url: 'https://www.hapcheon.go.kr',
    candidates: [
      { name: '황매산' },
    ],
  },
  {
    name: '함평나비대축제',
    start_date: '2026-05-01',
    end_date: '2026-05-10',
    description: '함평 엑스포공원에서 열리는 나비와 꽃 축제',
    source_url: 'https://www.hampyeong.go.kr',
    candidates: [
      { name: '함평엑스포' },
      { name: '함평나비' },
      { name: '함평자연생태공원' },
    ],
  },
  {
    name: '부산 대저생태공원 유채꽃',
    start_date: '2026-04-01',
    end_date: '2026-04-15',
    description: '낙동강변 대저생태공원에서 즐기는 유채꽃 명소',
    source_url: 'https://www.busan.go.kr',
    candidates: [
      { name: '대저생태공원' },
    ],
  },
  {
    name: '제주 녹산로 유채꽃 축제',
    start_date: '2026-03-28',
    end_date: '2026-04-06',
    description: '제주 녹산로 일대에서 열리는 유채꽃 드라이브 명소',
    source_url: 'https://www.visitjeju.net',
    candidates: [
      { name: '녹산로' },
      { name: '가시리 유채꽃' },
    ],
  },
  {
    name: '경주 벚꽃 축제',
    start_date: '2026-04-01',
    end_date: '2026-04-10',
    description: '경주 보문단지와 황룡원 일대에서 즐기는 벚꽃',
    source_url: 'https://www.gyeongju.go.kr',
    candidates: [
      { name: '황룡원' },
      { name: '보문호' },
      { name: '경주벚꽃' },
    ],
  },
  {
    name: '담양 메타세쿼이아길 봄꽃',
    start_date: '2026-04-01',
    end_date: '2026-04-15',
    description: '담양 메타세쿼이아 가로수길 일대 봄꽃 명소',
    source_url: 'https://www.damyang.go.kr',
    candidates: [
      { name: '메타세쿼이아' },
      { name: '담양메타' },
    ],
  },
  // ── 여름꽃 축제 ──────────────────────────────────────────
  {
    name: '제주 마노르블랑 수국축제',
    start_date: '2026-05-23',
    end_date: '2026-08-31',
    description: '제주 마노르블랑에서 7천 본 수국과 함께하는 여름 수국 명소',
    source_url: 'https://www.manoirblancjeju.com',
    candidates: [
      { name: '마노르블랑' },
    ],
  },
  {
    name: '제주 휴애리 여름 수국축제',
    start_date: '2026-06-13',
    end_date: '2026-07-27',
    description: '제주 휴애리 자연생활공원에서 열리는 유럽 수국 축제',
    source_url: 'https://www.휴애리.com',
    candidates: [
      { name: '휴애리' },
    ],
  },
  {
    name: '비체올린 여름꽃·능소화 축제',
    start_date: '2026-05-15',
    end_date: '2026-07-15',
    description: '비체올린에서 즐기는 여름꽃과 능소화 명소',
    source_url: 'https://www.비체올린.com',
    candidates: [
      { name: '비체올린' },
    ],
  },
  {
    name: '울산 장생포 수국 페스티벌',
    start_date: '2026-06-01',
    end_date: '2026-06-30',
    description: '울산 장생포 고래문화특구 일대에서 열리는 수국 축제',
    source_url: 'https://www.ulsan.go.kr',
    candidates: [
      { name: '장생포' },
      { name: '고래문화특구' },
    ],
  },
  {
    name: '공주 유구색동수국 정원 꽃축제',
    start_date: '2026-06-01',
    end_date: '2026-06-30',
    description: '공주 유구읍 색동수국정원에서 열리는 수국 축제',
    source_url: 'https://www.gongju.go.kr',
    candidates: [
      { name: '색동수국' },
      { name: '유구수국' },
    ],
  },
  {
    name: '가평 양떼목장 수국축제',
    start_date: '2026-06-27',
    end_date: '2026-10-31',
    description: '가평 양떼목장 일대에서 즐기는 여름~가을 수국 명소',
    source_url: 'https://www.gapyeong.go.kr',
    candidates: [
      { name: '양떼목장' },
    ],
  },
  {
    name: '태백 해바라기 축제',
    start_date: '2026-07-18',
    end_date: '2026-08-17',
    description: '태백 구와우마을 해바라기 고원에서 열리는 해바라기 축제',
    source_url: 'https://www.taebaek.go.kr',
    candidates: [
      { name: '구와우마을' },
      { name: '태백 해바라기' },
    ],
  },
  {
    name: '부여 서동연꽃축제',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    description: '부여 궁남지에서 열리는 대표 연꽃 축제',
    source_url: 'https://www.buyeo.go.kr',
    candidates: [
      { name: '궁남지' },
    ],
  },
  {
    name: '무안 연꽃축제',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    description: '무안 회산백련지에서 열리는 백련 연꽃 축제',
    source_url: 'https://www.muan.go.kr',
    candidates: [
      { name: '회산백련지' },
      { name: '무안백련지' },
    ],
  },
  {
    name: '양평 세미원 연꽃문화제',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    description: '양평 세미원에서 열리는 연꽃 문화 축제',
    source_url: 'https://www.semiwon.or.kr',
    candidates: [
      { name: '세미원' },
    ],
  },
  {
    name: '장항 맥문동 꽃 축제',
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    description: '장항 국립생태원 일대에서 즐기는 맥문동 보라 물결',
    source_url: 'https://www.seocheon.go.kr',
    candidates: [
      { name: '국립생태원' },
      { name: '장항 맥문동' },
    ],
  },
  {
    name: '경기 광주 화담숲 수국축제',
    start_date: '2026-06-01',
    end_date: '2026-07-31',
    description: '경기 광주 화담숲에서 열리는 여름 수국 축제',
    source_url: 'https://www.hwadamsup.com',
    candidates: [
      { name: '화담숲' },
    ],
  },
  {
    name: '순천만국가정원 여름꽃 축제',
    start_date: '2026-06-01',
    end_date: '2026-08-31',
    description: '순천만 국가정원에서 즐기는 여름꽃 및 야간 개장',
    source_url: 'https://www.scgardens.or.kr',
    candidates: [
      { name: '순천만국가정원' },
      { name: '순천정원박람회' },
    ],
  },
];

async function findSpotForFestival(supabase, candidates) {
  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from('flower_spots')
      .select('id, name, address')
      .ilike('name', `%${candidate.name}%`)
      .limit(10);

    if (error) throw error;
    if (data?.length) {
      return data[0];
    }
  }
  return null;
}

async function upsertFestival(supabase, festival, spotId) {
  const { data: existing, error: existingError } = await supabase
    .from('festivals')
    .select('id')
    .eq('spot_id', spotId)
    .eq('name', festival.name)
    .maybeSingle();

  if (existingError) throw existingError;

  const payload = {
    spot_id: spotId,
    name: festival.name,
    start_date: festival.start_date,
    end_date: festival.end_date,
    description: festival.description,
    source_url: festival.source_url,
  };

  if (existing?.id) {
    const { error } = await supabase.from('festivals').update(payload).eq('id', existing.id);
    if (error) throw error;
    return 'updated';
  }

  const { error } = await supabase.from('festivals').insert(payload);
  if (error) throw error;
  return 'inserted';
}

async function main() {
  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Required env keys are missing. Check .env.local');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const festival of FESTIVALS) {
    const spot = await findSpotForFestival(supabase, festival.candidates);
    if (!spot) {
      skipped += 1;
      console.warn(`[festival] skipped: ${festival.name} (matching spot not found)`);
      continue;
    }

    const result = await upsertFestival(supabase, festival, spot.id);
    if (result === 'inserted') inserted += 1;
    if (result === 'updated') updated += 1;
    console.log(`[festival] ${result}: ${festival.name} -> ${spot.name}`);
  }

  console.log(`\n[festival] done. inserted=${inserted}, updated=${updated}, skipped=${skipped}`);
}

main().catch((error) => {
  console.error('[festival] failed:', error);
  process.exit(1);
});
