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
