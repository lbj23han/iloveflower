/* eslint-disable @typescript-eslint/no-require-imports */
const { loadLocalEnv } = require('../seed/loadEnv.cjs');
const { getSupabase, nowIso, queryInChunks } = require('./shared.cjs');
const { parseArgs, loadTargetGyms, buildGymScopeSet } = require('../shared/pipelineScope.cjs');

loadLocalEnv();

const MAX_SNIPPETS = 8;
const MAX_BATCH = Number(process.env.OPENAI_CLASSIFY_BATCH || 4);
const DEFAULT_AI_BUDGET_USD = Number(process.env.AI_BADGE_BUDGET_USD || 8);
const DEFAULT_OUTPUT_TOKENS = 260;
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 45000);
const OPENAI_MAX_ATTEMPTS = Number(process.env.OPENAI_MAX_ATTEMPTS || 3);
const INPUT_COST_PER_MILLION = Number(process.env.OPENAI_INPUT_COST_PER_MILLION || 0.2);
const OUTPUT_COST_PER_MILLION = Number(process.env.OPENAI_OUTPUT_COST_PER_MILLION || 1.25);
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-nano';

function hasScope(scope) {
  return Boolean(scope.city || (scope.gymIds && scope.gymIds.length) || scope.limit || (scope.categories && scope.categories.length));
}

function cleanText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarizePrice(price) {
  if (!price) return null;
  return {
    day_pass_price: price.day_pass_price ?? null,
    monthly_price: price.monthly_price ?? null,
    normalized_monthly_price: price.normalized_monthly_price ?? null,
    pricing_period: price.pricing_period ?? null,
  };
}

function buildGymPayload(gym, bundle) {
  const snippets = [];

  for (const row of bundle.reviews || []) {
    if (!row.content) continue;
    snippets.push({
      source_type: 'review',
      observed_at: row.created_at,
      text: cleanText(row.content).slice(0, 240),
      rating: row.rating ?? null,
    });
  }

  for (const row of bundle.reports || []) {
    if (!row.comment) continue;
    snippets.push({
      source_type: 'report',
      observed_at: row.created_at,
      text: cleanText(row.comment).slice(0, 240),
      rating: row.rating ?? null,
      signals: {
        beginner: Boolean(row.signal_beginner),
        introvert: Boolean(row.signal_introvert),
        value: Boolean(row.signal_value),
      },
    });
  }

  for (const row of bundle.externalReviews || []) {
    if (!row.review_text) continue;
    snippets.push({
      source_type: 'external',
      observed_at: row.review_date || row.collected_at || row.created_at,
      text: cleanText(row.review_text).slice(0, 240),
      rating: row.rating ?? null,
      review_url: row.review_url || null,
    });
  }

  const uniqueSnippets = [];
  const seen = new Set();
  for (const item of snippets) {
    const key = `${item.source_type}::${item.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueSnippets.push(item);
    if (uniqueSnippets.length >= MAX_SNIPPETS) break;
  }

  return {
    gym: {
      id: gym.id,
      name: gym.name,
      address: gym.address,
      category: gym.category,
    },
    prices: summarizePrice(bundle.price),
    snippets: uniqueSnippets,
  };
}

function buildPrompt(payload) {
  return `당신은 운동시설 긍정형 배지 분류기입니다.

목표:
- beginner_friendly
- introvert_friendly
- value_friendly

중요 규칙:
- 부정 낙인형 판단 금지
- 애매하면 false
- 높은 precision 우선
- introvert_friendly는 조용함, 눈치 덜 봄, 영업/상담 부담 적음까지 포함
- value_friendly는 가격 정보가 있거나 가격 부담이 낮다는 근거가 분명할 때만 true
- 별점이 있더라도 3점 미만은 강한 긍정 근거로 쓰지 말 것

출력 형식은 반드시 JSON 하나만 반환:
{
  "facility_point_text": "한 줄 요약 또는 null",
  "labels": {
    "beginner_friendly": {
      "should_publish": boolean,
      "score": number,
      "confidence": number,
      "evidence_summary": string,
      "evidence_snippets": string[]
    },
    "introvert_friendly": {
      "should_publish": boolean,
      "score": number,
      "confidence": number,
      "evidence_summary": string,
      "evidence_snippets": string[]
    },
    "value_friendly": {
      "should_publish": boolean,
      "score": number,
      "confidence": number,
      "evidence_summary": string,
      "evidence_snippets": string[]
    }
  }
}

점수 기준:
- 0.0 ~ 2.5
- publish threshold는 대략 1.6 이상
- confidence는 0.0 ~ 1.0

입력 데이터:
${JSON.stringify(payload, null, 2)}`;
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || '').length / 4));
}

function estimateUsdForPayload(payload) {
  const prompt = buildPrompt(payload);
  const inputTokens = estimateTokens(prompt);
  const outputTokens = DEFAULT_OUTPUT_TOKENS;
  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  return {
    inputTokens,
    outputTokens,
    estimatedUsd: Number((inputCost + outputCost).toFixed(6)),
  };
}

function parseAIJson(text) {
  const trimmed = String(text || '').trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('AI JSON not found');
  }
  return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
}

async function createOpenAICompletion(payload) {
  let lastError = null;

  for (let attempt = 1; attempt <= OPENAI_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
        body: JSON.stringify({
          model: MODEL,
          temperature: 0,
          max_completion_tokens: 700,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                '당신은 운동시설 긍정형 배지 분류기입니다. 항상 JSON 객체 하나만 반환하고, 애매하면 should_publish를 false로 두세요.',
            },
            {
              role: 'user',
              content: buildPrompt(payload),
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
      }

      const json = await response.json();
      const text = json?.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('OpenAI response content missing');
      }

      return {
        text,
        model: json?.model || MODEL,
        usage: json?.usage || null,
      };
    } catch (error) {
      lastError = error;
      if (attempt >= OPENAI_MAX_ATTEMPTS) {
        break;
      }
      const message = String(error?.message || '');
      const retryMsMatch = message.match(/try again in\s+(\d+)ms/i);
      const retryMs = retryMsMatch
        ? Number(retryMsMatch[1]) + 250
        : null;
      const waitMs = retryMs || 2000 * attempt;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError || new Error('OpenAI request failed');
}

function normalizeUsage(usage) {
  return {
    prompt_tokens:
      Number(
        usage?.prompt_tokens ??
          usage?.input_tokens ??
          usage?.promptTokens ??
          0,
      ) || 0,
    completion_tokens:
      Number(
        usage?.completion_tokens ??
          usage?.output_tokens ??
          usage?.completionTokens ??
          0,
      ) || 0,
  };
}

function computeUsdFromUsage(usage) {
  const normalized = normalizeUsage(usage);
  const promptCost = (normalized.prompt_tokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const completionCost = (normalized.completion_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

  return {
    ...normalized,
    total_usd: Number((promptCost + completionCost).toFixed(6)),
  };
}

function normalizeLabelCandidate(gymId, labelKey, aiLabel) {
  const score = Number(Math.max(0, Math.min(2.5, aiLabel.score || 0)).toFixed(4));
  const confidence = Number(Math.max(0, Math.min(0.99, aiLabel.confidence || 0)).toFixed(4));
  const snippets = Array.isArray(aiLabel.evidence_snippets)
    ? aiLabel.evidence_snippets.map((item) => cleanText(item)).filter(Boolean).slice(0, 5)
    : [];

  return {
    gym_id: gymId,
    label_key: labelKey,
    score,
    confidence,
    evidence_count: snippets.length,
    source_diversity: snippets.length > 0 ? 1 : 0,
    top_evidence_jsonb: snippets.map((snippet) => ({
      snippet,
      source_type: 'ai',
      evidence_score: score,
      observed_at: null,
      pattern_key: 'ai-classifier-v1',
    })),
    status: aiLabel.should_publish ? 'candidate' : 'candidate',
    computed_at: nowIso(),
    updated_at: nowIso(),
  };
}

function countSignalHits(text) {
  const normalized = cleanText(text).toLowerCase();
  let score = 0;

  if (/(초보|헬린이|처음|입문)/.test(normalized) && /(친절|편하|부담|설명|적응|안 무서)/.test(normalized)) score += 3;
  if (/(조용|차분|눈치 안|각자 운동|혼자 운동)/.test(normalized)) score += 2;
  if (/(상담|영업|권유|등록)/.test(normalized) && /(안 심|부담 없|강요 없|별로 없|덜함)/.test(normalized)) score += 3;
  if (/(가성비|가격 괜찮|가격 좋|저렴|합리적)/.test(normalized)) score += 1;

  return score;
}

function computeBundlePriority(bundle) {
  const reviewCount = bundle.reviews?.length || 0;
  const reportCount = bundle.reports?.length || 0;
  const externalCount = bundle.externalReviews?.length || 0;
  const hasPrice = Boolean(bundle.price?.normalized_monthly_price || bundle.price?.monthly_price || bundle.price?.day_pass_price);

  let score = reviewCount * 2 + reportCount * 3 + Math.min(externalCount, 10) * 0.6;
  if (hasPrice) score += 2;

  for (const row of bundle.reviews || []) {
    score += countSignalHits(row.content);
    if (Number(row.rating || 0) >= 4) score += 1;
  }

  for (const row of bundle.reports || []) {
    score += countSignalHits(row.comment);
    if (row.signal_beginner) score += 3;
    if (row.signal_introvert) score += 3;
    if (row.signal_value) score += 2;
    if (Number(row.rating || 0) >= 4) score += 1;
  }

  for (const row of bundle.externalReviews || []) {
    score += Math.min(2, countSignalHits(row.review_text));
    if (Number(row.rating || 0) >= 4) score += 0.5;
  }

  return Number(score.toFixed(2));
}

function shouldClassifyBundle(bundle) {
  const reviewCount = bundle.reviews?.length || 0;
  const reportCount = bundle.reports?.length || 0;
  const externalCount = bundle.externalReviews?.length || 0;
  const hasPrice = Boolean(bundle.price?.normalized_monthly_price || bundle.price?.monthly_price || bundle.price?.day_pass_price);

  if (reportCount > 0 || reviewCount > 0) return true;
  if (externalCount >= 3) return true;
  if (hasPrice && externalCount >= 2) return true;
  return computeBundlePriority(bundle) >= 5;
}

async function loadBundles(supabase, gymIds, isScoped) {
  let reviewsQuery = supabase
    .from('reviews')
    .select('gym_id, content, rating, created_at')
    .eq('moderation_status', 'visible');
  let reportsQuery = supabase
    .from('reports')
    .select('gym_id, gym_name, comment, rating, signal_beginner, signal_introvert, signal_value, created_at')
    .neq('status', 'rejected');
  let pricesQuery = supabase
    .from('gym_prices')
    .select('gym_id, day_pass_price, monthly_price, normalized_monthly_price, pricing_period, created_at')
    .order('created_at', { ascending: false });

  let reviewsData = [];
  let reportsData = [];
  let pricesData = [];

  if (isScoped) {
    const ids = [...gymIds];
    [reviewsData, pricesData] = await Promise.all([
      queryInChunks(
        (chunk) =>
          supabase
            .from('reviews')
            .select('gym_id, content, rating, created_at')
            .eq('moderation_status', 'visible')
            .in('gym_id', chunk),
        ids,
      ),
      queryInChunks(
        (chunk) =>
          supabase
            .from('gym_prices')
            .select('gym_id, day_pass_price, monthly_price, normalized_monthly_price, pricing_period, created_at')
            .order('created_at', { ascending: false })
            .in('gym_id', chunk),
        ids,
      ),
    ]);
    try {
      reportsData = await queryInChunks(
        (chunk) =>
          supabase
            .from('reports')
            .select('gym_id, gym_name, comment, rating, signal_beginner, signal_introvert, signal_value, created_at')
            .neq('status', 'rejected')
            .in('gym_id', chunk),
        ids,
      );
    } catch (err) {
      if (/rating|signal_beginner|signal_introvert|signal_value/.test(err.message || '')) {
        reportsData = await queryInChunks(
          (chunk) =>
            supabase
              .from('reports')
              .select('gym_id, gym_name, comment, created_at')
              .neq('status', 'rejected')
              .in('gym_id', chunk),
          ids,
        );
        reportsData = reportsData.map((row) => ({ ...row, rating: null, signal_beginner: false, signal_introvert: false, signal_value: false }));
      } else throw err;
    }
  } else {
    const [reviewsResult, reportsResult, pricesResult] = await Promise.all([reviewsQuery, reportsQuery, pricesQuery]);
    if (reviewsResult.error) throw new Error(reviewsResult.error.message);
    if (pricesResult.error) throw new Error(pricesResult.error.message);
    reviewsData = reviewsResult.data || [];
    pricesData = pricesResult.data || [];

    let reportsError = reportsResult.error;
    reportsData = reportsResult.data || [];
    if (reportsError && /rating|signal_beginner|signal_introvert|signal_value/.test(reportsError.message || '')) {
      const fallback = await supabase.from('reports').select('gym_id, gym_name, comment, created_at').neq('status', 'rejected');
      reportsData = (fallback.data || []).map((row) => ({ ...row, rating: null, signal_beginner: false, signal_introvert: false, signal_value: false }));
      reportsError = fallback.error;
    }
    if (reportsError) throw new Error(reportsError.message || 'Failed to load AI classification inputs');
  }

  // external_reviews: 페이지네이션 + 청크 in() 병행
  const pageSize = 1000;
  let extFrom = 0;
  const allExternalReviews = [];
  const ids = isScoped ? [...gymIds] : null;
  while (true) {
    let extRows = [];
    if (isScoped && ids) {
      extRows = await queryInChunks((chunk) =>
        supabase.from('external_reviews')
          .select('gym_id, review_text, review_url, review_date, collected_at, created_at, rating')
          .eq('match_status', 'matched')
          .in('gym_id', chunk)
          .range(extFrom, extFrom + pageSize - 1),
        ids,
      );
    } else {
      const { data: extData, error: extError } = await supabase
        .from('external_reviews')
        .select('gym_id, review_text, review_url, review_date, collected_at, created_at, rating')
        .eq('match_status', 'matched')
        .range(extFrom, extFrom + pageSize - 1);
      if (extError) throw new Error(extError.message);
      extRows = extData || [];
    }
    allExternalReviews.push(...extRows);
    if (extRows.length < pageSize) break;
    extFrom += pageSize;
  }

  return {
    reviews: reviewsData,
    reports: reportsData,
    externalReviews: allExternalReviews,
    prices: pricesData,
  };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY가 필요합니다.');
  }

  const scope = parseArgs();
  const supabase = getSupabase();
  const targetGyms = await loadTargetGyms(supabase, scope);
  const targetGymIds = buildGymScopeSet(targetGyms);
  const isScoped = hasScope(scope);

  if (targetGyms.length === 0) {
    console.log('선택된 시설이 없습니다.');
    return;
  }

  const { reviews, reports, externalReviews, prices } = await loadBundles(
    supabase,
    targetGymIds,
    isScoped,
  );

  const reportsByGymId = new Map();
  const reviewsByGymId = new Map();
  const externalByGymId = new Map();
  const latestPriceByGymId = new Map();
  const gymByName = new Map(targetGyms.map((gym) => [gym.name, gym.id]));

  for (const review of reviews) {
    if (!reviewsByGymId.has(review.gym_id)) reviewsByGymId.set(review.gym_id, []);
    reviewsByGymId.get(review.gym_id).push(review);
  }
  for (const report of reports) {
    const gymId = report.gym_id || gymByName.get(report.gym_name);
    if (!gymId) continue;
    if (!reportsByGymId.has(gymId)) reportsByGymId.set(gymId, []);
    reportsByGymId.get(gymId).push(report);
  }
  for (const row of externalReviews) {
    if (!row.gym_id) continue;
    if (!externalByGymId.has(row.gym_id)) externalByGymId.set(row.gym_id, []);
    externalByGymId.get(row.gym_id).push(row);
  }
  for (const price of prices) {
    if (!latestPriceByGymId.has(price.gym_id)) {
      latestPriceByGymId.set(price.gym_id, price);
    }
  }

  const scopedBudgetUsd = scope.aiBudgetUsd || DEFAULT_AI_BUDGET_USD;
  const scopedMaxGyms = scope.aiMaxGyms || null;

  const gymBundles = targetGyms.map((gym) => ({
    gym,
    bundle: {
      reviews: reviewsByGymId.get(gym.id) || [],
      reports: reportsByGymId.get(gym.id) || [],
      externalReviews: externalByGymId.get(gym.id) || [],
      price: latestPriceByGymId.get(gym.id) || null,
    },
  }));

  const gymsToClassify = gymBundles
    .filter(({ bundle }) => shouldClassifyBundle(bundle))
    .map(({ gym, bundle }) => ({
      gym,
      bundle,
      priority: computeBundlePriority(bundle),
      payload: buildGymPayload(gym, bundle),
    }))
    .filter(({ payload }) => payload.snippets.length > 0 || payload.prices)
    .sort((a, b) => b.priority - a.priority);

  const selected = [];
  let budgetUsed = 0;

  for (const item of gymsToClassify) {
    if (scopedMaxGyms && selected.length >= scopedMaxGyms) break;
    const estimate = estimateUsdForPayload(item.payload);
    if (selected.length > 0 && budgetUsed + estimate.estimatedUsd > scopedBudgetUsd) {
      continue;
    }

    selected.push({ ...item, estimate });
    budgetUsed += estimate.estimatedUsd;
  }

  const candidateRows = [];
  const summaryRows = [];
  const usageTotals = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_usd: 0,
  };

  for (let index = 0; index < selected.length; index += MAX_BATCH) {
    const batch = selected.slice(index, index + MAX_BATCH);
    const results = await Promise.all(
      batch.map(async (item) => {
        const { gym, payload } = item;
        const { text, model, usage } = await createOpenAICompletion(payload);
        return {
          gym,
          model,
          parsed: parseAIJson(text),
          usageCost: computeUsdFromUsage(usage),
        };
      }),
    );

    for (const result of results) {
      usageTotals.prompt_tokens += result.usageCost.prompt_tokens;
      usageTotals.completion_tokens += result.usageCost.completion_tokens;
      usageTotals.total_usd += result.usageCost.total_usd;

      const labels = result.parsed.labels || {};
      for (const labelKey of ['beginner_friendly', 'introvert_friendly', 'value_friendly']) {
        if (!labels[labelKey]) continue;
        candidateRows.push(normalizeLabelCandidate(result.gym.id, labelKey, labels[labelKey]));
      }

      if (result.parsed.facility_point_text) {
        summaryRows.push({
          gym_id: result.gym.id,
          summary_text: cleanText(result.parsed.facility_point_text),
          summary_source: `openai_badge_classifier:${result.model}`,
          verification_mode: 'auto',
          updated_at: nowIso(),
        });
      }
    }

    console.log(
      `[ai-batch] ${Math.min(index + batch.length, selected.length)}/${selected.length} gyms classified`,
    );
  }

  if (scope.dryRun) {
    console.log(
      JSON.stringify(
        {
          targetGyms: targetGyms.length,
          eligibleGyms: gymsToClassify.length,
          classifiedGyms: selected.length,
          candidateRows: candidateRows.length,
          summaryRows: summaryRows.length,
          estimatedBudgetUsd: Number(budgetUsed.toFixed(4)),
          configuredBudgetUsd: scopedBudgetUsd,
          actualUsage: {
            prompt_tokens: usageTotals.prompt_tokens,
            completion_tokens: usageTotals.completion_tokens,
            total_usd: Number(usageTotals.total_usd.toFixed(6)),
          },
          dryRun: true,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (candidateRows.length > 0) {
    for (let index = 0; index < candidateRows.length; index += 200) {
      const batch = candidateRows.slice(index, index + 200);
      const { error } = await supabase
        .from('gym_label_candidates')
        .upsert(batch, { onConflict: 'gym_id,label_key' });
      if (error) throw new Error(error.message);
    }
  }

  if (summaryRows.length > 0) {
    for (let index = 0; index < summaryRows.length; index += 100) {
      const batch = summaryRows.slice(index, index + 100);
      const { error } = await supabase
        .from('gym_summaries')
        .upsert(batch, { onConflict: 'gym_id' });
      if (error) throw new Error(error.message);
    }
  }

  console.log(
    JSON.stringify(
      {
        targetGyms: targetGyms.length,
        eligibleGyms: gymsToClassify.length,
        classifiedGyms: selected.length,
        candidateRows: candidateRows.length,
        summaryRows: summaryRows.length,
        estimatedBudgetUsd: Number(budgetUsed.toFixed(4)),
        configuredBudgetUsd: scopedBudgetUsd,
        actualUsage: {
          prompt_tokens: usageTotals.prompt_tokens,
          completion_tokens: usageTotals.completion_tokens,
          total_usd: Number(usageTotals.total_usd.toFixed(6)),
        },
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
