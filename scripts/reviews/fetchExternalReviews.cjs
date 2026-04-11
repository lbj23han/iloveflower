/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require('crypto');
const { loadLocalEnv } = require('../seed/loadEnv.cjs');
const { getSupabase, nowIso } = require('../badges/shared.cjs');
const { parseArgs, loadTargetGyms } = require('../shared/pipelineScope.cjs');

loadLocalEnv();

const DEFAULT_LIMIT = 30;
const MATCH_THRESHOLD = 0.74;
const AMBIGUOUS_THRESHOLD = 0.56;
const NAVER_RESULTS_PER_SOURCE = 10;
const DAUM_RESULTS_PER_SOURCE = 10;

const NAVER_SOURCES = [
  {
    source: 'naver_blog_api',
    endpoint: 'https://openapi.naver.com/v1/search/blog.json',
  },
  {
    source: 'naver_cafe_api',
    endpoint: 'https://openapi.naver.com/v1/search/cafearticle.json',
  },
];

const DAUM_SOURCES = [
  {
    source: 'daum_blog_api',
    endpoint: 'https://dapi.kakao.com/v2/search/blog',
    itemsKey: 'documents',
  },
  {
    source: 'daum_cafe_api',
    endpoint: 'https://dapi.kakao.com/v2/search/cafe',
    itemsKey: 'documents',
  },
  {
    source: 'daum_web_api',
    endpoint: 'https://dapi.kakao.com/v2/search/web',
    itemsKey: 'documents',
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha1(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex');
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLoose(text) {
  return stripHtml(text)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collapse(text) {
  return normalizeLoose(text).replace(/\s+/g, '');
}

function tokenize(text) {
  return normalizeLoose(text)
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function overlapScore(a, b) {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function districtTokens(address) {
  return String(address || '')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2);
}

function buildSearchQuery(gym) {
  const region = districtTokens(gym.address).join(' ');
  return [gym.name, region, '후기'].filter(Boolean).join(' ');
}

function scoreDocumentMatch(gym, doc) {
  const combined = [doc.title, doc.description, doc.text, doc.url]
    .filter(Boolean)
    .join(' ');

  const nameOverlap = overlapScore(gym.name, combined);
  const addressOverlap = overlapScore(gym.address, combined);
  const exactNameHit = collapse(combined).includes(collapse(gym.name)) ? 1 : 0;
  const regionHit = districtTokens(gym.address).some((token) =>
    normalizeLoose(combined).includes(normalizeLoose(token)),
  )
    ? 1
    : 0;

  if (exactNameHit && regionHit) {
    return 0.92;
  }

  if (exactNameHit && nameOverlap >= 0.35) {
    return 0.84;
  }

  return Number(
    (
      nameOverlap * 0.45 +
      addressOverlap * 0.2 +
      exactNameHit * 0.25 +
      regionHit * 0.1
    ).toFixed(4),
  );
}

function classifyMatch(score) {
  if (score >= MATCH_THRESHOLD) return 'matched';
  if (score >= AMBIGUOUS_THRESHOLD) return 'ambiguous';
  return 'unmatched';
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`External search failed: ${response.status}`);
  }
  return response.json();
}

async function fetchNaverDocuments(query) {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID || process.env.NAVER_CLIENT_ID;
  const clientSecret =
    process.env.NAVER_SEARCH_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) return [];

  const rows = [];
  for (const source of NAVER_SOURCES) {
    const url = new URL(source.endpoint);
    url.search = new URLSearchParams({
      query,
      display: String(NAVER_RESULTS_PER_SOURCE),
      sort: 'sim',
    }).toString();

    const json = await fetchJson(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    for (const item of json.items || []) {
      rows.push({
        source: source.source,
        externalReviewId: sha1(`${source.source}::${item.link || item.originallink || item.title}`),
        title: stripHtml(item.title),
        description: stripHtml(item.description),
        text: stripHtml(item.description),
        url: item.link || item.originallink || null,
        reviewer: item.bloggername || item.cafename || null,
        reviewDate: item.postdate ? `${item.postdate.slice(0, 4)}-${item.postdate.slice(4, 6)}-${item.postdate.slice(6, 8)}T00:00:00.000Z` : null,
      });
    }

    await sleep(180);
  }

  return rows;
}

async function fetchDaumDocuments(query) {
  const restKey = process.env.KAKAO_REST_API_KEY;
  if (!restKey) return [];

  const rows = [];
  for (const source of DAUM_SOURCES) {
    const url = new URL(source.endpoint);
    url.search = new URLSearchParams({
      query,
      size: String(DAUM_RESULTS_PER_SOURCE),
      sort: 'accuracy',
    }).toString();

    const json = await fetchJson(url, {
      headers: {
        Authorization: `KakaoAK ${restKey}`,
      },
    });

    for (const item of json[source.itemsKey] || []) {
      rows.push({
        source: source.source,
        externalReviewId: sha1(`${source.source}::${item.url || item.title}`),
        title: stripHtml(item.title),
        description: stripHtml(item.contents),
        text: stripHtml(item.contents),
        url: item.url || null,
        reviewer: item.blogname || item.cafename || null,
        reviewDate: item.datetime || null,
      });
    }

    await sleep(180);
  }

  return rows;
}

function toExternalRows(gym, documents) {
  return documents
    .map((doc) => {
      const text = stripHtml(doc.text || doc.description || '');
      if (!text || text.length < 8) return null;

      const matchScore = scoreDocumentMatch(gym, doc);
      const matchStatus = classifyMatch(matchScore);

      return {
        gym_id: matchStatus === 'matched' ? gym.id : null,
        external_source: doc.source,
        external_review_id: doc.externalReviewId,
        external_place_id: gym.external_place_id ?? null,
        gym_name_raw: doc.title || gym.name,
        address_raw: gym.address || null,
        reviewer_hash: doc.reviewer ? sha1(normalizeLoose(doc.reviewer)) : null,
        rating: null,
        review_text: text,
        review_url: doc.url,
        review_date: doc.reviewDate,
        match_status: matchStatus,
        match_score: matchScore,
        collected_at: nowIso(),
        created_at: nowIso(),
      };
    })
    .filter(Boolean);
}

async function upsertRows(supabase, rows) {
  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    const { error } = await supabase
      .from('external_reviews')
      .upsert(batch, { onConflict: 'external_source,external_review_id' });
    if (error) throw new Error(error.message);
  }
}

async function main() {
  const hasNaver =
    (process.env.NAVER_SEARCH_CLIENT_ID || process.env.NAVER_CLIENT_ID) &&
    (process.env.NAVER_SEARCH_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET);
  const hasKakao = Boolean(process.env.KAKAO_REST_API_KEY);

  if (!hasNaver && !hasKakao) {
    throw new Error(
      'NAVER_SEARCH_CLIENT_ID/NAVER_SEARCH_CLIENT_SECRET 또는 KAKAO_REST_API_KEY 중 하나가 필요합니다.',
    );
  }

  const scope = parseArgs();
  // city나 gymIds를 명시하면 limit 기본값을 적용하지 않아 전체 대상 처리
  if (!scope.limit && !scope.city && !scope.gymIds?.length) scope.limit = DEFAULT_LIMIT;

  const supabase = getSupabase();
  const gyms = await loadTargetGyms(supabase, scope);
  if (gyms.length === 0) {
    console.log('선택된 시설이 없습니다.');
    return;
  }

  let savedRows = 0;
  let matchedRows = 0;
  let ambiguousRows = 0;
  let unmatchedRows = 0;

  for (const gym of gyms) {
    const query = buildSearchQuery(gym);
    const [naverDocs, daumDocs] = await Promise.all([
      fetchNaverDocuments(query),
      fetchDaumDocuments(query),
    ]);
    const rows = toExternalRows(gym, [...naverDocs, ...daumDocs]);

    matchedRows += rows.filter((row) => row.match_status === 'matched').length;
    ambiguousRows += rows.filter((row) => row.match_status === 'ambiguous').length;
    unmatchedRows += rows.filter((row) => row.match_status === 'unmatched').length;

    if (scope.dryRun) {
      console.log(
        `[dry-run] ${gym.name} -> docs=${rows.length}, matched=${rows.filter((row) => row.match_status === 'matched').length}`,
      );
    } else if (rows.length > 0) {
      await upsertRows(supabase, rows);
      savedRows += rows.length;
      console.log(
        `[saved] ${gym.name} -> docs=${rows.length}, matched=${rows.filter((row) => row.match_status === 'matched').length}`,
      );
    } else {
      console.log(`[empty] ${gym.name} -> docs=0`);
    }

    await sleep(250);
  }

  console.log(
    JSON.stringify(
      {
        targetGyms: gyms.length,
        savedRows,
        matchedRows,
        ambiguousRows,
        unmatchedRows,
        dryRun: scope.dryRun,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
