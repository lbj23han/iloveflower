const KAKAO_LOCAL_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const REQUEST_DELAY_MS = 180;
const MAX_RETRIES = 3;

const FLOWER_TYPE_RULES = [
  { type: 'cherry', keywords: ['벚꽃', '벚나무'] },
  { type: 'plum', keywords: ['매화', '매실'] },
  { type: 'forsythia', keywords: ['개나리'] },
  { type: 'azalea', keywords: ['진달래', '철쭉', '영산홍'] },
  { type: 'wisteria', keywords: ['등꽃', '등나무'] },
  { type: 'rose', keywords: ['장미'] },
  { type: 'cosmos', keywords: ['코스모스'] },
  { type: 'sunflower', keywords: ['해바라기'] },
  { type: 'tulip', keywords: ['튤립'] },
  { type: 'lavender', keywords: ['라벤더'] },
  { type: 'rape', keywords: ['유채꽃', '유채'] },
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

// 카페는 이름에 꽃 관련 단어가 직접 있을 때만 허용
const CAFE_ALLOWED_FLOWER_WORDS = [
  '벚꽃', '벚나무', '매화', '진달래', '철쭉', '유채', '코스모스',
  '해바라기', '라벤더', '장미', '튤립', '수국', '동백', '꽃밭',
  '꽃길', '꽃정원', '플라워', '가든', '정원',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestKeywordSearch({ apiKey, query, rect, page = 1, size = 15 }) {
  const params = new URLSearchParams({
    query,
    page: String(page),
    size: String(size),
    rect: `${rect.swLng},${rect.swLat},${rect.neLng},${rect.neLat}`,
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${KAKAO_LOCAL_URL}?${params.toString()}`, {
        headers: {
          Authorization: `KakaoAK ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Kakao Local API responded with ${response.status}`);
      }

      const payload = await response.json();
      await sleep(REQUEST_DELAY_MS);
      return payload;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await sleep(REQUEST_DELAY_MS * attempt);
    }
  }
}

function normalizeText(...parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isExcludedPlace(placeName, categoryName, keyword) {
  const text = normalizeText(placeName, categoryName, keyword);
  if (NOISE_KEYWORDS.some((noise) => text.includes(noise))) return true;

  // 카카오 로컬 API는 블로그/후기 데이터가 없으므로
  // 카페·음식점·숙박은 place_name에 꽃 관련 단어가 2개 이상 있을 때만 허용
  // (단순히 "벚꽃카페"처럼 상호명에 꽃 단어를 끼워 넣은 것 방지)
  const isCafeOrFood = categoryName.includes('카페') || categoryName.includes('음식점')
    || categoryName.includes('베이커리') || categoryName.includes('디저트')
    || placeName.includes('카페') || placeName.toLowerCase().includes('cafe');
  if (isCafeOrFood) {
    const nameOnly = placeName.toLowerCase();
    const matchCount = CAFE_ALLOWED_FLOWER_WORDS.filter((w) => nameOnly.includes(w)).length;
    // place_name에 꽃 단어가 없으면 제외, 1개만 있어도 제외 (상호명 편승 방지)
    if (matchCount < 2) return true;
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
    wisteria: [4, 5],
    rose: [5, 6],
    cosmos: [9, 10],
    sunflower: [7, 8],
    tulip: [4, 5],
    lavender: [6, 7],
    rape: [4, 5],
    etc: [null, null],
  };

  const [start, end] = monthMap[first] ?? [null, null];
  return {
    peak_month_start: start,
    peak_month_end: end,
  };
}

function mapKakaoPlace(place, keyword) {
  if (isExcludedPlace(place.place_name, place.category_name, keyword)) {
    return null;
  }

  const flowerTypes = inferFlowerTypes(place.place_name, place.category_name, keyword);
  const category = inferCategory(place.place_name, place.category_name, keyword);
  const flags = inferFeatureFlags(place.place_name, place.category_name, keyword);
  const peakMonths = inferPeakMonths(flowerTypes);

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
  };
}

module.exports = { requestKeywordSearch, mapKakaoPlace };
