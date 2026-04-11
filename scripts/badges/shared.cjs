/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('../seed/loadEnv.cjs');

loadLocalEnv();

const BADGE_THRESHOLDS = {
  beginner_friendly: { minScore: 1.6, minEvidenceCount: 2 },
  introvert_friendly: { minScore: 1.7, minEvidenceCount: 2 },
  value_friendly: { minScore: 1.6, minEvidenceCount: 1 },
};

const SOURCE_WEIGHTS = {
  admin: 1.0,
  external: 0.65,
  report: 0.65,
  review: 0.55,
  price: 0.7,
};

const PATTERN_STRENGTHS = {
  strong: 1.0,
  medium: 0.75,
  weak: 0.4,
};

const BADGE_COPY = {
  beginner_friendly: '최근 후기와 제보에서 처음 가도 부담이 적다는 신호가 반복적으로 확인됐어요.',
  introvert_friendly: '조용하고 부담이 덜한 분위기, 상담 부담이 덜했다는 반응이 있었어요.',
  value_friendly: '가격 정보 기준으로 비교적 부담이 낮은 편으로 확인됐어요.',
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[~!@#$%^&*()_\-+={[}\]|\\:;"'<,>.?/]/g, ' ')
    .trim();
}

function freshnessWeight(observedAt) {
  if (!observedAt) return 0.55;
  const days = (Date.now() - new Date(observedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 90) return 1.0;
  if (days <= 180) return 0.9;
  if (days <= 365) return 0.75;
  return 0.55;
}

function parseAmount(rawAmount, unit) {
  const numeric = Number(String(rawAmount).replace(/,/g, ''));
  if (Number.isNaN(numeric)) return null;
  if (unit === '만원') return Math.round(numeric * 10000);
  if (unit === '천원') return Math.round(numeric * 1000);
  return Math.round(numeric);
}

function sanitizePriceByPeriod(amount, period) {
  if (amount == null) return null;

  if (period === 'day') {
    return amount >= 3000 && amount <= 150000 ? amount : null;
  }

  if (period === 'month') {
    return amount >= 10000 && amount <= 500000 ? amount : null;
  }

  if (period === 'year') {
    return amount >= 50000 && amount <= 5000000 ? amount : null;
  }

  return amount >= 10000 && amount <= 500000 ? amount : null;
}

function extractPriceMentions(text) {
  return Array.from(
    String(text || '').matchAll(/((?:월회원권|월이용권|월권|한달|1개월|월\s+|연간|연회원권|12개월|연\s+|일일권|당일권|하루|1일)[^0-9]{0,8})?(\d[\d,]*)(만원|천원|원)/g)
  )
    .map((match) => {
      const prefix = match[1] || '';
      const prefixNormalized = prefix.replace(/\s+/g, ' ').trim();
      const amount = parseAmount(match[2], match[3]);
      if (!amount) return null;
      let period = 'unknown';
      if (/일일권|당일권|하루|1일/.test(prefixNormalized)) period = 'day';
      else if (/연간|연회원권|12개월|연/.test(prefixNormalized)) period = 'year';
      else if (/월회원권|월이용권|월권|한달|1개월|월/.test(prefixNormalized)) period = 'month';
      const sanitizedAmount = sanitizePriceByPeriod(amount, period);
      if (sanitizedAmount == null) return null;
      return { amount: sanitizedAmount, period, raw: match[0] };
    })
    .filter(Boolean);
}

function normalizePriceRecord(input) {
  const mentions = extractPriceMentions(input.raw_text || '');
  const day = sanitizePriceByPeriod(
    input.day_pass_price ?? (mentions.find((item) => item.period === 'day') || {}).amount ?? null,
    'day',
  );
  const month = sanitizePriceByPeriod(
    input.monthly_price ?? (mentions.find((item) => item.period === 'month') || {}).amount ?? null,
    'month',
  );
  const year = sanitizePriceByPeriod(
    input.annual_price ?? (mentions.find((item) => item.period === 'year') || {}).amount ?? null,
    'year',
  );
  const normalizedMonthly = month ?? (year ? Math.round(year / 12) : null);
  const validNormalizedMonthly =
    normalizedMonthly != null && normalizedMonthly >= 5000 && normalizedMonthly <= 500000
      ? normalizedMonthly
      : month != null
        ? month
        : null;
  const pricingPeriod = month != null ? 'month' : year != null ? 'year' : day != null ? 'day' : null;
  return {
    day_pass_price: day,
    monthly_price: month,
    annual_price: year,
    normalized_monthly_price: validNormalizedMonthly,
    pricing_period: pricingPeriod,
    price_metadata: mentions.length ? { mentions } : null,
  };
}

const PATTERNS = [
  {
    label_key: 'beginner_friendly',
    key: 'beginner-comfort',
    strength: 'strong',
    specificity: 1.0,
    groups: [
      ['초보', '헬린이', '처음', '입문'],
      ['친절', '편해', '부담 없', '설명 잘', '처음 가도', '적응', '안 무서'],
    ],
  },
  {
    label_key: 'beginner_friendly',
    key: 'beginner-kind',
    strength: 'medium',
    specificity: 0.88,
    groups: [
      ['처음 등록', '입문', '초보'],
      ['잘 알려', '차근차근', '응대 좋', '설명 자세'],
    ],
  },
  {
    label_key: 'introvert_friendly',
    key: 'quiet-comfort',
    strength: 'strong',
    specificity: 0.96,
    groups: [
      ['조용', '차분', '눈치 안', '각자 운동', '혼자 운동', '부담 없'],
      ['편해', '가능', '좋', '괜찮'],
    ],
  },
  {
    label_key: 'introvert_friendly',
    key: 'low-sales-pressure',
    strength: 'strong',
    specificity: 1.0,
    groups: [
      ['상담', '영업', '권유', '등록'],
      ['안 심', '적', '부담 없', '강요 없', '별로 없', '덜함'],
    ],
  },
];

function buildSnippet(text) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  // Array.from으로 코드포인트 단위 슬라이싱 (이모지 등 surrogate pair 분리 방지)
  const chars = Array.from(compact);
  return chars.length <= 110 ? compact : chars.slice(0, 107).join('') + '...';
}

function extractSignals(record) {
  const rawText = String(record.raw_text || '').trim();
  if (!rawText) return [];
  const normalized = normalizeText(rawText);
  const freshness = freshnessWeight(record.observed_at);
  const sourceWeight = SOURCE_WEIGHTS[record.source_type] || 0.55;

  return PATTERNS.filter((pattern) =>
    pattern.groups.every((group) => group.some((term) => normalized.includes(term)))
  ).map((pattern) => {
    const evidence_score =
      sourceWeight *
      PATTERN_STRENGTHS[pattern.strength] *
      pattern.specificity *
      freshness *
      1.0;

    return {
      gym_id: record.gym_id,
      label_key: pattern.label_key,
      source_type: record.source_type,
      source_ref_id: record.source_ref_id || null,
      source_url: record.source_url || null,
      raw_text: rawText,
      snippet: buildSnippet(rawText),
      normalized_text: normalized,
      pattern_key: pattern.key,
      pattern_strength: PATTERN_STRENGTHS[pattern.strength],
      source_weight: sourceWeight,
      specificity: pattern.specificity,
      freshness,
      uniqueness: 1.0,
      evidence_score: Number(evidence_score.toFixed(4)),
      status: 'active',
      parser_version: 'badge-rules-v1',
      metadata: record.metadata || null,
      observed_at: record.observed_at || null,
      updated_at: nowIso(),
    };
  });
}

function extractStructuredSignals(record) {
  if (!record.gym_id) return [];
  if (!record.rating || Number(record.rating) < 3) return [];

  const sourceWeight = SOURCE_WEIGHTS[record.source_type] || 0.55;
  const freshness = freshnessWeight(record.observed_at);
  const rows = [];

  const signalRows = [
    record.signal_beginner
      ? {
          label_key: 'beginner_friendly',
          pattern_key: 'rating-beginner',
          snippet: '별점 3점 이상과 함께 “헬린이가 많아요” 신호가 체크됐어요.',
        }
      : null,
    record.signal_introvert
      ? {
          label_key: 'introvert_friendly',
          pattern_key: 'rating-introvert',
          snippet: '별점 3점 이상과 함께 “영업 별로 안해요” 신호가 체크됐어요.',
        }
      : null,
    record.signal_value
      ? {
          label_key: 'value_friendly',
          pattern_key: 'rating-value',
          snippet: '별점 3점 이상과 함께 “가성비가 좋아요” 신호가 체크됐어요.',
        }
      : null,
  ].filter(Boolean);

  for (const signal of signalRows) {
    const evidence_score = sourceWeight * 1.0 * 0.92 * freshness * 1.0;
    rows.push({
      gym_id: record.gym_id,
      label_key: signal.label_key,
      source_type: record.source_type,
      source_ref_id: record.source_ref_id || null,
      source_url: record.source_url || null,
      raw_text: record.raw_text || null,
      snippet: signal.snippet,
      normalized_text: null,
      pattern_key: signal.pattern_key,
      pattern_strength: 1.0,
      source_weight: sourceWeight,
      specificity: 0.92,
      freshness,
      uniqueness: 1.0,
      evidence_score: Number(evidence_score.toFixed(4)),
      status: 'active',
      parser_version: 'badge-rules-v1',
      metadata: {
        ...(record.metadata || {}),
        rating: Number(record.rating),
        signal_beginner: Boolean(record.signal_beginner),
        signal_introvert: Boolean(record.signal_introvert),
        signal_value: Boolean(record.signal_value),
      },
      observed_at: record.observed_at || null,
      updated_at: nowIso(),
    });
  }

  return rows;
}

function applyUniquenessWeights(rows) {
  const counts = new Map();

  for (const row of rows) {
    const reviewerHash = row.metadata?.reviewer_hash || '';
    const normalizedSnippet = normalizeText(row.normalized_text || row.snippet || '');
    const key = `${row.gym_id}::${row.label_key}::${reviewerHash}::${normalizedSnippet}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return rows.map((row) => {
    const reviewerHash = row.metadata?.reviewer_hash || '';
    const normalizedSnippet = normalizeText(row.normalized_text || row.snippet || '');
    const key = `${row.gym_id}::${row.label_key}::${reviewerHash}::${normalizedSnippet}`;
    const duplicateCount = counts.get(key) || 1;
    const uniqueness = Number(Math.max(0.35, 1 / duplicateCount).toFixed(4));
    const evidence_score = Number(
      (
        Number(row.source_weight || 0) *
        Number(row.pattern_strength || 0) *
        Number(row.specificity || 0) *
        Number(row.freshness || 0) *
        uniqueness
      ).toFixed(4),
    );

    return {
      ...row,
      uniqueness,
      evidence_score,
    };
  });
}

function aggregateCandidates(evidenceRows) {
  const groups = new Map();
  for (const row of evidenceRows) {
    const key = `${row.gym_id}::${row.label_key}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const candidates = [];
  for (const [key, rows] of groups.entries()) {
    const [gym_id, label_key] = key.split('::');
    const top = [...rows].sort((a, b) => b.evidence_score - a.evidence_score).slice(0, 5);
    const baseScore = top.reduce((sum, row) => sum + row.evidence_score, 0);
    const diversity = new Set(top.map((row) => row.source_type)).size;
    const diversityBonus = diversity >= 3 ? 0.25 : diversity >= 2 ? 0.15 : 0;
    const score = Number((baseScore + diversityBonus).toFixed(4));
    const confidence = Number(Math.min(0.98, 0.45 + top.length * 0.09 + diversity * 0.07 + score * 0.12).toFixed(4));
    candidates.push({
      gym_id,
      label_key,
      score,
      confidence,
      evidence_count: rows.length,
      source_diversity: diversity,
      top_evidence_jsonb: top.map((row) => ({
        snippet: row.snippet,
        source_type: row.source_type,
        evidence_score: row.evidence_score,
        observed_at: row.observed_at || null,
        pattern_key: row.pattern_key || null,
      })),
      status: 'candidate',
      computed_at: nowIso(),
      updated_at: nowIso(),
    });
  }
  return candidates;
}

function regionBucket(address) {
  const tokens = String(address || '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) return `${tokens[0]} ${tokens[1]}`;
  return tokens[0] || 'unknown';
}

function computeValueCandidates(priceRows, gyms) {
  const gymMap = new Map(gyms.map((gym) => [gym.id, gym]));
  const buckets = new Map();

  for (const row of priceRows) {
    if (!row.normalized_monthly_price) continue;
    const gym = gymMap.get(row.gym_id);
    if (!gym) continue;
    const bucket = `${regionBucket(gym.address)}::${gym.category}`;
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket).push({ ...row, gym });
  }

  const result = [];
  for (const entries of buckets.values()) {
    if (entries.length < 5) continue;
    const sorted = [...entries].sort((a, b) => a.normalized_monthly_price - b.normalized_monthly_price);
    sorted.forEach((entry, index) => {
      const percentile = (index + 1) / sorted.length;
      if (percentile > 0.3) return;
      result.push({
        gym_id: entry.gym_id,
        label_key: 'value_friendly',
        score: Number((percentile <= 0.2 ? 1.95 : 1.65).toFixed(4)),
        confidence: percentile <= 0.2 ? 0.84 : 0.78,
        evidence_count: 1,
        source_diversity: 1,
        top_evidence_jsonb: [
          {
            snippet: `정규화 월가격 ${entry.normalized_monthly_price.toLocaleString()}원`,
            source_type: 'price',
            evidence_score: percentile <= 0.2 ? 1.95 : 1.65,
            observed_at: entry.last_verified_at || entry.updated_at || entry.created_at || null,
            pattern_key: percentile <= 0.2 ? 'value-top20' : 'value-top30',
          },
        ],
        status: 'candidate',
        computed_at: nowIso(),
        updated_at: nowIso(),
      });
    });
  }

  return result;
}

function shouldPublishCandidate(candidate) {
  const threshold = BADGE_THRESHOLDS[candidate.label_key];
  return candidate.score >= threshold.minScore && candidate.evidence_count >= threshold.minEvidenceCount;
}

function buildPublishedLabel(candidate) {
  return {
    gym_id: candidate.gym_id,
    label_key: candidate.label_key,
    label_value: true,
    confidence: Math.max(0, Math.min(100, Math.round(Number(candidate.confidence || 0) * 100))),
    evidence_count: candidate.evidence_count,
    evidence_summary: BADGE_COPY[candidate.label_key],
    verification_mode: 'auto',
    source: 'badge_pipeline',
    last_verified_at: nowIso(),
    updated_at: nowIso(),
  };
}

function computeGymScoreRow({ gym_id, beginner_score, introvert_score, value_score, published_badges }) {
  const badgeSet = new Set(published_badges);
  let total = beginner_score * 0.45 + introvert_score * 0.3 + value_score * 0.25;
  if (badgeSet.has('beginner_friendly') && badgeSet.has('introvert_friendly')) total += 8;
  if (badgeSet.has('beginner_friendly') && badgeSet.has('value_friendly')) total += 10;
  if (badgeSet.has('beginner_friendly') && badgeSet.has('introvert_friendly') && badgeSet.has('value_friendly')) total += 18;
  return {
    gym_id,
    beginner_score,
    introvert_score,
    value_score,
    total_score: Number(total.toFixed(2)),
    score_tier: total >= 85 ? 'gold' : total >= 72 ? 'green' : total >= 58 ? 'blue' : null,
    computed_at: nowIso(),
    updated_at: nowIso(),
  };
}

// Supabase REST API URL 길이 제한으로 .in() 에 많은 ID를 넣으면 fetch failed 발생.
// 100개씩 청크로 나눠 순차 쿼리 후 합치는 헬퍼.
const IN_CHUNK_SIZE = 100;

async function queryInChunks(buildQuery, ids) {
  const allRows = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + IN_CHUNK_SIZE);
    const { data, error } = await buildQuery(chunk);
    if (error) throw new Error(error.message);
    allRows.push(...(data || []));
  }
  return allRows;
}

module.exports = {
  getSupabase,
  nowIso,
  normalizePriceRecord,
  extractSignals,
  extractStructuredSignals,
  applyUniquenessWeights,
  aggregateCandidates,
  computeValueCandidates,
  shouldPublishCandidate,
  buildPublishedLabel,
  computeGymScoreRow,
  BADGE_COPY,
  queryInChunks,
};
