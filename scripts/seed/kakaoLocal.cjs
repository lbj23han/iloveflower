const KAKAO_LOCAL_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const REQUEST_DELAY_MS = 180;
const MAX_RETRIES = 3;
const SWIMMING_NOISE_KEYWORDS = ['워터파크', '워터월드', '해수욕장', '분수', '아쿠아리움'];
const GYM_KEYWORDS = ['헬스', '피트니스', '휘트니스', '휘트니', 'gym', '짐', 'pt', '스포애니', '스포짐', '스포', '바디', '머슬', '버핏', '웨이트'];
const GYM_FACILITY_KEYWORDS = ['체육', '체육관', '체력단련장', '스포츠센터', '스포츠클럽', '복합스포츠시설', '체육시설'];

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

function isExcludedPlace(placeName, categoryName) {
  const text = `${placeName ?? ''} ${categoryName ?? ''}`.toLowerCase();
  return SWIMMING_NOISE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function normalizeCategory(placeName, categoryName, keyword) {
  const text = `${placeName ?? ''} ${categoryName ?? ''} ${keyword}`.toLowerCase();

  if (text.includes('요가')) return 'yoga';
  if (text.includes('필라테스') || text.includes('필라')) return 'pilates';
  if (text.includes('크로스핏')) return 'crossfit';
  if (text.includes('클라이밍')) return 'climbing';
  if (!isExcludedPlace(placeName, categoryName) && (text.includes('수영') || text.includes('스윔') || text.includes('swim') || text.includes('풀') || text.includes('pool') || text.includes('물놀이') || text.includes('스쿠버') || text.includes('다이빙'))) return 'swimming';
  if (GYM_KEYWORDS.some((keywordValue) => text.includes(keywordValue))) return 'gym';
  if (GYM_FACILITY_KEYWORDS.some((keywordValue) => text.includes(keywordValue))) return 'gym';
  return 'etc';
}

function mapKakaoPlace(place, keyword) {
  if (isExcludedPlace(place.place_name, place.category_name)) {
    return null;
  }

  return {
    external_place_id: place.id,
    name: place.place_name,
    address: place.road_address_name || place.address_name || null,
    lat: place.y ? Number(place.y) : null,
    lng: place.x ? Number(place.x) : null,
    category: normalizeCategory(place.place_name, place.category_name, keyword),
    phone: place.phone || null,
    opening_hours: null,
    website_url: place.place_url || null,
    source: 'kakao_local',
  };
}

module.exports = { requestKeywordSearch, mapKakaoPlace };
