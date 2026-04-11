/* eslint-disable @typescript-eslint/no-require-imports */
const {
  getSupabase,
  extractSignals,
  extractStructuredSignals,
  normalizePriceRecord,
  nowIso,
  applyUniquenessWeights,
  queryInChunks,
} = require('./shared.cjs');
const { parseArgs, loadTargetGyms, buildGymScopeSet } = require('../shared/pipelineScope.cjs');

function hasScope(scope) {
  return Boolean(scope.city || (scope.gymIds && scope.gymIds.length) || scope.limit);
}

function buildPriceEvidence({ gymId, sourceType, sourceRefId, rawText, observedAt, metadata, normalizedPrice }) {
  if (!normalizedPrice.normalized_monthly_price) return null;

  return {
    gym_id: gymId,
    label_key: 'value_friendly',
    source_type: 'price',
    source_ref_id: sourceRefId,
    source_url: metadata?.source_url || null,
    raw_text: rawText || null,
    snippet: `구조화 가격 기준 월 환산 ${normalizedPrice.normalized_monthly_price.toLocaleString()}원`,
    normalized_text: null,
    pattern_key: `${sourceType}-price-structured`,
    pattern_strength: 1.0,
    source_weight: 0.7,
    specificity: 0.9,
    freshness: 1.0,
    uniqueness: 1.0,
    evidence_score: 0.63,
    status: 'active',
    parser_version: 'badge-rules-v1',
    metadata: {
      ...(metadata || {}),
      normalized_price: normalizedPrice,
    },
    observed_at: observedAt || null,
    updated_at: nowIso(),
  };
}

async function loadSourceRows(supabase, scopedGymIds, isScoped) {
  const scopedIds = [...scopedGymIds];

  // reviews: 청크 분할 또는 전체 로드
  let reviewsData = [];
  let reviewsError = null;
  if (isScoped && scopedIds.length > 0) {
    try {
      reviewsData = await queryInChunks(
        (chunk) =>
          supabase
            .from('reviews')
            .select('id, gym_id, content, nickname, rating, signal_beginner, signal_introvert, signal_value, created_at')
            .eq('moderation_status', 'visible')
            .in('gym_id', chunk),
        scopedIds,
      );
    } catch (err) {
      reviewsError = err;
    }
  } else {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, gym_id, content, nickname, rating, signal_beginner, signal_introvert, signal_value, created_at')
      .eq('moderation_status', 'visible');
    reviewsData = data || [];
    reviewsError = error;
  }

  let reportsData = [];
  let reportsError = null;
  if (isScoped && scopedIds.length > 0) {
    try {
      reportsData = await queryInChunks(
        (chunk) =>
          supabase
            .from('reports')
            .select('id, gym_id, gym_name, comment, rating, signal_beginner, signal_introvert, signal_value, day_pass_price, monthly_price, annual_price, created_at')
            .neq('status', 'rejected')
            .in('gym_id', chunk),
        scopedIds,
      );
    } catch (err) {
      reportsError = err;
    }
  } else {
    const reportsResult = await supabase
      .from('reports')
      .select('id, gym_id, gym_name, comment, rating, signal_beginner, signal_introvert, signal_value, day_pass_price, monthly_price, annual_price, created_at')
      .neq('status', 'rejected');
    reportsData = reportsResult.data || [];
    reportsError = reportsResult.error;
  }

  if (reportsError && /monthly_price|annual_price|rating|signal_beginner|signal_introvert|signal_value/.test(reportsError.message || '')) {
    if (isScoped && scopedIds.length > 0) {
      try {
        reportsData = await queryInChunks(
          (chunk) =>
            supabase
              .from('reports')
              .select('id, gym_id, gym_name, comment, day_pass_price, created_at')
              .neq('status', 'rejected')
              .in('gym_id', chunk),
          scopedIds,
        );
        reportsData = reportsData.map((row) => ({
          ...row,
          monthly_price: null,
          annual_price: null,
          rating: null,
          signal_beginner: false,
          signal_introvert: false,
          signal_value: false,
        }));
        reportsError = null;
      } catch (err) {
        reportsError = err;
      }
    } else {
      const fallbackReportsResult = await supabase
        .from('reports')
        .select('id, gym_id, gym_name, comment, day_pass_price, created_at')
        .neq('status', 'rejected');
      reportsData = (fallbackReportsResult.data || []).map((row) => ({
        ...row,
        monthly_price: null,
        annual_price: null,
        rating: null,
        signal_beginner: false,
        signal_introvert: false,
        signal_value: false,
      }));
      reportsError = fallbackReportsResult.error;
    }
  }

  if (reviewsError || reportsError) {
    throw new Error(
      (reviewsError instanceof Error ? reviewsError.message : reviewsError?.message) ||
        reportsError?.message ||
        'Failed to load source rows',
    );
  }

  // external_reviews 페이지네이션으로 전체 로드
  const pageSize = 1000;
  let extFrom = 0;
  const allExternalReviews = [];
  while (true) {
    let extRows = [];
    if (isScoped && scopedIds.length > 0) {
      extRows = await queryInChunks(
        (chunk) =>
          supabase
            .from('external_reviews')
            .select('id, gym_id, external_source, external_review_id, external_place_id, reviewer_hash, rating, review_text, review_url, review_date, match_status, match_score, collected_at, created_at')
            .eq('match_status', 'matched')
            .in('gym_id', chunk)
            .range(extFrom, extFrom + pageSize - 1),
        scopedIds,
      );
    } else {
      const { data: extData, error: extError } = await supabase
        .from('external_reviews')
        .select('id, gym_id, external_source, external_review_id, external_place_id, reviewer_hash, rating, review_text, review_url, review_date, match_status, match_score, collected_at, created_at')
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
    reviews: reviewsData || [],
    reports: reportsData,
    externalReviews: allExternalReviews,
  };
}

async function main() {
  const scope = parseArgs();
  const parserVersion = scope.parserVersion || 'badge-rules-v1';
  const supabase = getSupabase();
  const targetGyms = await loadTargetGyms(supabase, scope);
  const scopedGymIds = buildGymScopeSet(targetGyms);
  const isScoped = hasScope(scope);

  if (targetGyms.length === 0) {
    console.log('선택된 시설이 없습니다.');
    return;
  }

  const gymByName = new Map(targetGyms.map((gym) => [gym.name, gym.id]));
  const { reviews, reports, externalReviews } = await loadSourceRows(
    supabase,
    scopedGymIds,
    isScoped,
  );

  const evidenceRows = [];

  for (const review of reviews) {
    evidenceRows.push(
      ...extractSignals({
        gym_id: review.gym_id,
        source_type: 'review',
        source_ref_id: review.id,
        raw_text: review.content,
        observed_at: review.created_at,
      }).map((row) => ({
        ...row,
        parser_version: parserVersion,
      })),
    );
    evidenceRows.push(
      ...extractStructuredSignals({
        gym_id: review.gym_id,
        source_type: 'review',
        source_ref_id: review.id,
        raw_text: review.content,
        observed_at: review.created_at,
        rating: review.rating,
        signal_beginner: review.signal_beginner,
        signal_introvert: review.signal_introvert,
        signal_value: review.signal_value,
      }).map((row) => ({
        ...row,
        parser_version: parserVersion,
      })),
    );
  }

  for (const report of reports) {
    const gymId = report.gym_id || gymByName.get(report.gym_name);
    if (!gymId) continue;
    if (isScoped && !scopedGymIds.has(gymId)) continue;

    evidenceRows.push(
      ...extractSignals({
        gym_id: gymId,
        source_type: 'report',
        source_ref_id: report.id,
        raw_text: report.comment,
        observed_at: report.created_at,
      }).map((row) => ({
        ...row,
        parser_version: parserVersion,
      })),
    );
    evidenceRows.push(
      ...extractStructuredSignals({
        gym_id: gymId,
        source_type: 'report',
        source_ref_id: report.id,
        raw_text: report.comment,
        observed_at: report.created_at,
        rating: report.rating,
        signal_beginner: report.signal_beginner,
        signal_introvert: report.signal_introvert,
        signal_value: report.signal_value,
      }).map((row) => ({
        ...row,
        parser_version: parserVersion,
      })),
    );

    const normalizedPrice = normalizePriceRecord({
      day_pass_price: report.day_pass_price,
      monthly_price: report.monthly_price,
      annual_price: report.annual_price,
      raw_text: report.comment,
    });

    const priceEvidence = buildPriceEvidence({
      gymId,
      sourceType: 'report',
      sourceRefId: report.id,
      rawText: report.comment,
      observedAt: report.created_at,
      metadata: null,
      normalizedPrice,
    });

    if (priceEvidence) {
      evidenceRows.push({
        ...priceEvidence,
        parser_version: parserVersion,
      });
    }
  }

  for (const externalReview of externalReviews) {
    if (!externalReview.gym_id) continue;
    if (!externalReview.review_text?.trim()) continue;

    evidenceRows.push(
      ...extractSignals({
        gym_id: externalReview.gym_id,
        source_type: 'external',
        source_ref_id: externalReview.external_review_id || externalReview.id,
        source_url: externalReview.review_url,
        raw_text: externalReview.review_text,
        observed_at:
          externalReview.review_date ||
          externalReview.collected_at ||
          externalReview.created_at,
        metadata: {
          reviewer_hash: externalReview.reviewer_hash,
          external_source: externalReview.external_source,
          external_place_id: externalReview.external_place_id,
          match_score: externalReview.match_score,
        },
      }).map((row) => ({
        ...row,
        parser_version: parserVersion,
      })),
    );

    const normalizedPrice = normalizePriceRecord({
      raw_text: externalReview.review_text,
    });
    const priceEvidence = buildPriceEvidence({
      gymId: externalReview.gym_id,
      sourceType: 'external',
      sourceRefId: externalReview.external_review_id || externalReview.id,
      rawText: externalReview.review_text,
      observedAt:
        externalReview.review_date ||
        externalReview.collected_at ||
        externalReview.created_at,
      metadata: {
        reviewer_hash: externalReview.reviewer_hash,
        source_url: externalReview.review_url,
        external_source: externalReview.external_source,
      },
      normalizedPrice,
    });

    if (priceEvidence) {
      evidenceRows.push({
        ...priceEvidence,
        parser_version: parserVersion,
      });
    }
  }

  const normalizedRows = applyUniquenessWeights(evidenceRows);

  if (scope.dryRun) {
    console.log(
      JSON.stringify(
        {
          parserVersion,
          targetGyms: targetGyms.length,
          reviews: reviews.length,
          reports: reports.length,
          externalReviews: externalReviews.length,
          evidenceRows: normalizedRows.length,
          dryRun: true,
        },
        null,
        2,
      ),
    );
    return;
  }

  let deleteQuery = supabase
    .from('gym_text_evidence')
    .delete()
    .eq('parser_version', parserVersion);

  if (isScoped) {
    const scopedIds = [...scopedGymIds];
    for (let index = 0; index < scopedIds.length; index += 100) {
      const chunk = scopedIds.slice(index, index + 100);
      const { error: chunkDeleteError } = await supabase
        .from('gym_text_evidence')
        .delete()
        .eq('parser_version', parserVersion)
        .in('gym_id', chunk);
      if (chunkDeleteError) throw new Error(chunkDeleteError.message);
    }
  } else {
    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw new Error(deleteError.message);
  }

  if (normalizedRows.length === 0) {
    console.log('No evidence rows extracted.');
    return;
  }

  for (let index = 0; index < normalizedRows.length; index += 200) {
    const batch = normalizedRows.slice(index, index + 200);
    const { error } = await supabase.from('gym_text_evidence').insert(batch);
    if (error) throw new Error(error.message);
  }

  console.log(`Inserted ${normalizedRows.length} evidence rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
