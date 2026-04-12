/* eslint-disable @typescript-eslint/no-require-imports */
const { createServiceClient } = require('./seedHelpers.cjs');

const FESTIVALS = [
  {
    name: '서울억새축제',
    start_date: '2026-10-10',
    end_date: '2026-10-18',
    description: '하늘공원 일대에서 열리는 서울 대표 가을 억새 축제',
    source_url: 'https://parks.seoul.go.kr',
    spotNames: ['하늘공원', '서울 하늘공원 억새축제', '하늘공원 억새'],
  },
  {
    name: '효석문화제 메밀꽃축제',
    start_date: '2026-09-05',
    end_date: '2026-09-13',
    description: '봉평 효석문화마을과 메밀꽃밭 일대에서 열리는 가을 축제',
    source_url: 'https://www.hyoseok.com',
    spotNames: ['효석문화마을', '봉평 메밀꽃밭'],
  },
  {
    name: '정읍 구절초 꽃축제',
    start_date: '2026-10-03',
    end_date: '2026-10-12',
    description: '정읍 구절초지방정원에서 열리는 대표 구절초 축제',
    source_url: 'https://www.jeongeup.go.kr',
    spotNames: ['정읍 구절초지방정원'],
  },
  {
    name: '제주 휴애리 수국축제',
    start_date: '2026-06-13',
    end_date: '2026-07-20',
    description: '휴애리 자연생활공원에서 즐기는 여름 수국 축제',
    source_url: 'https://www.hueree.com',
    spotNames: ['휴애리 자연생활공원'],
  },
  {
    name: '제주 휴애리 동백축제',
    start_date: '2026-11-15',
    end_date: '2027-02-15',
    description: '휴애리 자연생활공원 겨울 동백 축제',
    source_url: 'https://www.hueree.com',
    spotNames: ['휴애리 자연생활공원', '휴애리 동백축제'],
  },
  {
    name: '카멜리아힐 동백축제',
    start_date: '2026-11-20',
    end_date: '2027-02-28',
    description: '제주 카멜리아힐에서 열리는 대표 동백 축제',
    source_url: 'https://www.camelliahill.co.kr',
    spotNames: ['카멜리아힐', '제주 카멜리아힐'],
  },
  {
    name: '태안 세계튤립꽃박람회',
    start_date: '2026-04-01',
    end_date: '2026-05-06',
    description: '코리아플라워파크에서 열리는 대표 튤립 축제',
    source_url: 'https://ffestival.co.kr',
    spotNames: ['코리아플라워파크'],
  },
  {
    name: '함평 대한민국 국향대전',
    start_date: '2026-10-20',
    end_date: '2026-11-05',
    description: '함평엑스포공원 국화 전시 축제',
    source_url: 'https://www.hampyeong.go.kr',
    spotNames: ['함평엑스포공원'],
  },
  {
    name: '군포철쭉축제',
    start_date: '2026-04-18',
    end_date: '2026-04-26',
    description: '철쭉동산 일대에서 열리는 수도권 대표 철쭉 축제',
    source_url: 'https://www.gunpo.go.kr',
    spotNames: ['철쭉동산'],
  },
  {
    name: '고양국제꽃박람회',
    start_date: '2026-04-24',
    end_date: '2026-05-10',
    description: '일산호수공원 일대에서 열리는 대형 꽃 박람회',
    source_url: 'https://www.flower.or.kr/main',
    spotNames: ['일산호수공원'],
  },
  {
    name: '공주 유구색동수국정원 꽃축제',
    start_date: '2026-06-20',
    end_date: '2026-06-28',
    description: '유구색동수국정원 일대 수국 축제',
    source_url: 'https://www.gongju.go.kr',
    spotNames: ['유구색동수국정원'],
  },
  {
    name: '울산 장생포 수국 페스티벌',
    start_date: '2026-06-01',
    end_date: '2026-06-30',
    description: '장생포 고래문화특구 일대 수국 축제',
    source_url: 'https://www.ulsan.go.kr',
    spotNames: ['장생포 고래문화특구'],
  },
  {
    name: '태백 해바라기 축제',
    start_date: '2026-07-18',
    end_date: '2026-08-17',
    description: '구와우마을 해바라기 축제',
    source_url: 'https://www.taebaek.go.kr',
    spotNames: ['구와우마을'],
  },
  {
    name: '천관산 억새제',
    start_date: '2026-10-03',
    end_date: '2026-10-11',
    description: '천관산 억새 능선 일대에서 열리는 대표 가을 축제',
    source_url: 'https://www.jangheung.go.kr',
    spotNames: ['천관산', '장흥 천관산 억새'],
  },
];

async function findSpotId(supabase, spotNames) {
  for (const name of spotNames) {
    const { data, error } = await supabase
      .from('flower_spots')
      .select('id, name')
      .eq('name', name)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return data.id;
  }

  return null;
}

async function main() {
  const supabase = createServiceClient();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const festival of FESTIVALS) {
    try {
      const spotId = await findSpotId(supabase, festival.spotNames);

      if (!spotId) {
        skipped += 1;
        console.log(`[skip] ${festival.name} — no matching spot`);
        continue;
      }

      const { data: existing, error: existingError } = await supabase
        .from('festivals')
        .select('id')
        .eq('name', festival.name)
        .eq('spot_id', spotId)
        .limit(1)
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
        updated += 1;
        console.log(`[update] ${festival.name} — linked`);
      } else {
        const { error } = await supabase.from('festivals').insert(payload);
        if (error) throw error;
        inserted += 1;
        console.log(`[insert] ${festival.name} — linked`);
      }
    } catch (error) {
      errors += 1;
      console.warn(`[error] ${festival.name} — ${error.message}`);
    }
  }

  console.log(JSON.stringify({ requested: FESTIVALS.length, inserted, updated, skipped, errors }, null, 2));
}

main().catch((error) => {
  console.error('[seed:festival-direct] failed:', error);
  process.exit(1);
});
