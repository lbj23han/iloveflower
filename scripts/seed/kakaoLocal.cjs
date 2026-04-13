const KAKAO_LOCAL_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const KAKAO_BLOG_SEARCH_URL = 'https://dapi.kakao.com/v2/search/blog';
const KAKAO_CAFE_SEARCH_URL = 'https://dapi.kakao.com/v2/search/cafe';
const REQUEST_DELAY_MS = 420;
const MAX_RETRIES = 6;
const RATE_LIMIT_BACKOFF_MS = 4000;
const AI_BATCH_SIZE = 5;
let lastRequestAt = 0;

const FLOWER_TYPE_RULES = [
  { type: 'cherry', keywords: ['벚꽃', '벚나무'] },
  { type: 'plum', keywords: ['매화', '매실'] },
  { type: 'forsythia', keywords: ['개나리'] },
  { type: 'azalea', keywords: ['진달래', '철쭉', '영산홍'] },
  { type: 'magnolia', keywords: ['목련'] },
  { type: 'wisteria', keywords: ['등꽃', '등나무'] },
  { type: 'tulip', keywords: ['튤립'] },
  { type: 'rape', keywords: ['유채꽃', '유채'] },
  { type: 'peony', keywords: ['작약'] },
  { type: 'peachblossom', keywords: ['복숭아꽃', '복사꽃'] },
  { type: 'rose', keywords: ['장미'] },
  { type: 'sunflower', keywords: ['해바라기'] },
  { type: 'lavender', keywords: ['라벤더'] },
  { type: 'hydrangea', keywords: ['수국'] },
  { type: 'lotus', keywords: ['연꽃', '연밭', '연못', '수련'] },
  { type: 'morningglory', keywords: ['나팔꽃'] },
  { type: 'babysbreath', keywords: ['안개꽃'] },
  { type: 'zinnia', keywords: ['백일홍'] },
  { type: 'neungsohwa', keywords: ['능소화'] },
  { type: 'pomegranateblossom', keywords: ['석류꽃'] },
  { type: 'cosmos', keywords: ['코스모스'] },
  { type: 'foliage', keywords: ['단풍', '단풍길', '단풍명소', '단풍축제', '단풍나무', '가을단풍'] },
  { type: 'silvergrass', keywords: ['억새', '은빛 억새', '억새밭', '억새군락'] },
  { type: 'pinkmuhly', keywords: ['핑크뮬리'] },
  { type: 'buckwheat', keywords: ['메밀꽃', '메밀밭'] },
  { type: 'mossrose', keywords: ['채송화'] },
  { type: 'aconite', keywords: ['투구꽃'] },
  { type: 'chuhaedang', keywords: ['추해당'] },
  { type: 'chrysanthemum', keywords: ['국화', '구절초'] },
  { type: 'camellia', keywords: ['동백꽃', '동백'] },
  { type: 'narcissus', keywords: ['수선화'] },
  { type: 'clivia', keywords: ['군자란'] },
  { type: 'cyclamen', keywords: ['시클라멘'] },
  { type: 'adonis', keywords: ['복수초'] },
  { type: 'christmasrose', keywords: ['크리스마스로즈'] },
  { type: 'snowflower', keywords: ['눈꽃', '설경', '눈축제'] },
];

const NOISE_KEYWORDS = [
  '꽃집',
  '플라워샵',
  '화원',
  '부케',
  '웨딩',
  '장례',
  '스튜디오',
  '네일',
  '미용',
  '펜션',
  '호텔',
  '리조트',
];

// 카페는 이름에 꽃 관련 단어가 직접 있을 때만 허용 (가든/정원은 너무 범용적이라 제외)
const CAFE_ALLOWED_FLOWER_WORDS = [
  '벚꽃', '벚나무', '매화', '진달래', '철쭉', '유채', '코스모스',
  '해바라기', '라벤더', '장미', '튤립', '수국', '동백', '꽃밭',
  '꽃길', '꽃정원', '플라워', '억새', '핑크뮬리', '메밀꽃', '목련', '작약', '복숭아꽃',
  '나팔꽃', '안개꽃', '백일홍', '석류꽃', '채송화', '투구꽃', '추해당',
  '수선화', '군자란', '시클라멘', '복수초', '크리스마스로즈',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms) {
  return ms + Math.floor(Math.random() * 250);
}

async function requestKeywordSearch({ apiKey, query, rect, page = 1, size = 15 }) {
  const params = new URLSearchParams({
    query,
    page: String(page),
    size: String(size),
  });

  if (rect) {
    params.set('rect', `${rect.swLng},${rect.swLat},${rect.neLng},${rect.neLat}`);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const elapsed = Date.now() - lastRequestAt;
      if (elapsed < REQUEST_DELAY_MS) {
        await sleep(REQUEST_DELAY_MS - elapsed);
      }

      const response = await fetch(`${KAKAO_LOCAL_URL}?${params.toString()}`, {
        headers: {
          Authorization: `KakaoAK ${apiKey}`,
        },
      });
      lastRequestAt = Date.now();

      if (!response.ok) {
        const error = new Error(`Kakao Local API responded with ${response.status}`);
        error.status = response.status;
        error.retryAfter = response.headers.get('retry-after');
        throw error;
      }

      const payload = await response.json();
      await sleep(jitter(REQUEST_DELAY_MS));
      return payload;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;

      if (error?.status === 429) {
        const retryAfterMs = Number(error.retryAfter || 0) * 1000;
        const waitMs = retryAfterMs || jitter(RATE_LIMIT_BACKOFF_MS * attempt);
        console.warn(`[kakao] 429 rate limit: ${query} page=${page} attempt=${attempt}/${MAX_RETRIES} wait=${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }

      await sleep(jitter(REQUEST_DELAY_MS * attempt * 2));
    }
  }
}

function normalizeText(...parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isCafeOrFoodPlace(placeName, categoryName) {
  return categoryName.includes('카페') || categoryName.includes('음식점')
    || categoryName.includes('베이커리') || categoryName.includes('디저트')
    || placeName.includes('카페') || placeName.toLowerCase().includes('cafe');
}

function isExcludedPlace(placeName, categoryName, keyword) {
  const text = normalizeText(placeName, categoryName, keyword);
  if (NOISE_KEYWORDS.some((noise) => text.includes(noise))) return true;

  // 카페·음식점은 상호명에 꽃 단어가 하나도 없으면 즉시 제외 (명백히 무관한 곳)
  // 꽃 단어가 있는 카페는 AI 검증을 거쳐야 하므로 여기서는 통과시킴 (mapKakaoPlace에서 _needsAiCheck 표시)
  if (isCafeOrFoodPlace(placeName, categoryName)) {
    const nameOnly = placeName.toLowerCase();
    const hasAnyFlowerWord = CAFE_ALLOWED_FLOWER_WORDS.some((w) => nameOnly.includes(w));
    if (!hasAnyFlowerWord) return true;
  }

  return false;
}

function inferFlowerTypes(placeName, categoryName, keyword) {
  const text = normalizeText(placeName, categoryName, keyword);
  const matched = FLOWER_TYPE_RULES
    .filter((rule) => rule.keywords.some((value) => text.includes(value)))
    .map((rule) => rule.type);

  return matched.length > 0 ? [...new Set(matched)] : ['etc'];
}

function inferCategory(placeName, categoryName, keyword) {
  const text = normalizeText(placeName, categoryName, keyword);

  if (text.includes('카페') || text.includes('cafe')) return 'cafe';
  if (text.includes('수목원') || text.includes('식물원') || text.includes('정원')) return 'botanical';
  if (text.includes('농장') || text.includes('목장') || text.includes('팜')) return 'farm';
  if (text.includes('사찰') || text.includes('절') || text.includes('암')) return 'temple';
  if (text.includes('강') || text.includes('천') || text.includes('호수') || text.includes('저수지') || text.includes('하천')) return 'river';
  if (text.includes('산') || text.includes('둘레길') || text.includes('등산')) return 'mountain';
  if (text.includes('거리') || text.includes('가로수') || text.includes('꽃길') || text.includes('벚꽃길')) return 'street';
  if (text.includes('공원') || text.includes('생태') || text.includes('유원지')) return 'park';
  return 'etc';
}

function inferFeatureFlags(placeName, categoryName, keyword) {
  const text = normalizeText(placeName, categoryName, keyword);
  return {
    has_night_light: text.includes('야간') || text.includes('조명') || text.includes('빛축제'),
    has_parking: text.includes('주차') || text.includes('드라이브') || text.includes('대형카페'),
    pet_friendly: text.includes('반려') || text.includes('애견') || text.includes('펫'),
    photo_spot: text.includes('포토') || text.includes('사진') || text.includes('전망') || text.includes('명소'),
  };
}

function inferPeakMonths(flowerTypes) {
  const first = flowerTypes[0];
  const monthMap = {
    cherry: [3, 4],
    plum: [2, 3],
    forsythia: [3, 4],
    azalea: [4, 5],
    magnolia: [3, 4],
    wisteria: [4, 5],
    tulip: [4, 5],
    rape: [4, 5],
    peony: [5, 6],
    peachblossom: [3, 4],
    rose: [5, 6],
    sunflower: [7, 8],
    lavender: [6, 7],
    hydrangea: [6, 8],
    lotus: [7, 8],
    morningglory: [7, 8],
    babysbreath: [6, 8],
    zinnia: [7, 9],
    neungsohwa: [6, 8],
    pomegranateblossom: [5, 7],
    cosmos: [9, 10],
    foliage: [10, 11],
    silvergrass: [9, 11],
    pinkmuhly: [9, 10],
    buckwheat: [9, 10],
    mossrose: [8, 10],
    aconite: [9, 10],
    chuhaedang: [9, 10],
    chrysanthemum: [10, 11],
    camellia: [12, 2],
    narcissus: [12, 2],
    clivia: [1, 3],
    cyclamen: [11, 2],
    adonis: [1, 3],
    christmasrose: [12, 3],
    snowflower: [12, 2],
    etc: [null, null],
  };

  const [start, end] = monthMap[first] ?? [null, null];
  return {
    peak_month_start: start,
    peak_month_end: end,
  };
}

function mapKakaoPlace(place, keyword, options = {}) {
  const { skipExclusion = false } = options;

  if (!skipExclusion && isExcludedPlace(place.place_name, place.category_name, keyword)) {
    return null;
  }

  const flowerTypes = inferFlowerTypes(place.place_name, place.category_name, keyword);
  const category = inferCategory(place.place_name, place.category_name, keyword);
  const flags = inferFeatureFlags(place.place_name, place.category_name, keyword);
  const peakMonths = inferPeakMonths(flowerTypes);
  const needsAiCheck = isCafeOrFoodPlace(place.place_name, place.category_name);

  return {
    external_place_id: place.id,
    name: place.place_name,
    address: place.road_address_name || place.address_name || null,
    lat: place.y ? Number(place.y) : null,
    lng: place.x ? Number(place.x) : null,
    flower_types: flowerTypes,
    category,
    peak_month_start: peakMonths.peak_month_start,
    peak_month_end: peakMonths.peak_month_end,
    has_night_light: flags.has_night_light,
    has_parking: flags.has_parking,
    pet_friendly: flags.pet_friendly,
    photo_spot: flags.photo_spot,
    entry_fee: 0,
    phone: place.phone || null,
    website_url: place.place_url || null,
    source: 'kakao_local',
    _needsAiCheck: needsAiCheck,
  };
}

async function fetchBlogSnippets(placeName, address, kakaoApiKey) {
  const query = `${placeName} 꽃`;
  const snippets = [];

  for (const url of [KAKAO_BLOG_SEARCH_URL, KAKAO_CAFE_SEARCH_URL]) {
    try {
      const params = new URLSearchParams({ query, size: '5', sort: 'accuracy' });
      const res = await fetch(`${url}?${params}`, {
        headers: { Authorization: `KakaoAK ${kakaoApiKey}` },
      });
      if (!res.ok) continue;
      const json = await res.json();
      for (const doc of json.documents ?? []) {
        const text = (doc.contents || doc.title || '')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 200);
        if (text && text.length > 10) snippets.push(text);
      }
      await sleep(REQUEST_DELAY_MS);
    } catch {
      // ignore per-source errors
    }
  }

  return snippets;
}

async function validateCafeWithAI(spot, kakaoApiKey, openaiApiKey) {
  const snippets = await fetchBlogSnippets(spot.name, spot.address, kakaoApiKey);
  if (snippets.length === 0) return false;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = `카페/음식점 이름: "${spot.name}"
주소: ${spot.address || ''}

블로그·카페 검색 결과 (꽃 관련 검색):
${snippets.map((s, i) => `[${i + 1}] ${s}`).join('\n')}

위 검색 결과를 바탕으로, 이 카페/음식점이 실제 꽃 명소인지 판단해주세요.
판단 기준 (모두 충족해야 true):
1. 블로그 후기에서 실제 꽃(벚꽃, 유채꽃, 장미, 수국 등 자연 꽃)이 언급됨
2. 카페 자체에 꽃밭/꽃정원이 있거나, 꽃 명소 바로 인접
3. 단순히 상호명에 꽃 단어가 있는 것, 꽃 장식/인테리어만 있는 것은 false
JSON {"is_flower_related": true/false} 만 반환하세요.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_completion_tokens: 30,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return false;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(content);
    return Boolean(parsed.is_flower_related);
  } catch {
    return false;
  }
}

/**
 * Validates cafe/food spots with AI (Kakao blog search + OpenAI nano).
 * Returns spots with _needsAiCheck flag removed.
 * Non-cafe spots pass through unchanged.
 */
async function filterSpotsWithAI(spots, kakaoApiKey, openaiApiKey) {
  if (!openaiApiKey) {
    console.warn('[ai-filter] OPENAI_API_KEY 없음 - 카페 AI 검증 건너뜀, 모두 제외');
    return spots.filter((s) => !s._needsAiCheck).map(({ _needsAiCheck: _, ...rest }) => rest);
  }

  const regular = spots.filter((s) => !s._needsAiCheck).map(({ _needsAiCheck: _, ...rest }) => rest);
  const cafes = spots.filter((s) => s._needsAiCheck);

  if (cafes.length === 0) return regular;

  console.log(`[ai-filter] 카페/음식점 ${cafes.length}개 AI 검증 시작`);
  const validated = [];
  let passed = 0;

  for (let i = 0; i < cafes.length; i += AI_BATCH_SIZE) {
    const batch = cafes.slice(i, i + AI_BATCH_SIZE);
    const results = await Promise.all(
      batch.map((spot) => validateCafeWithAI(spot, kakaoApiKey, openaiApiKey)),
    );
    for (let j = 0; j < batch.length; j += 1) {
      const { _needsAiCheck: _, ...rest } = batch[j];
      if (results[j]) {
        validated.push(rest);
        passed += 1;
        console.log(`[ai-filter] ✓ ${batch[j].name}`);
      } else {
        console.log(`[ai-filter] ✕ ${batch[j].name} (제외)`);
      }
    }
  }

  console.log(`[ai-filter] 카페 검증 완료: ${passed}/${cafes.length} 통과`);
  return [...regular, ...validated];
}

module.exports = { requestKeywordSearch, mapKakaoPlace, filterSpotsWithAI };
