/* eslint-disable @typescript-eslint/no-require-imports */
const { createServiceClient, nowIso } = require('./seedHelpers.cjs');

const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';
const REQUEST_DELAY_MS = 1100;
const MAX_RESULTS = 6;
const REJECT_TITLE_KEYWORDS = [
  'panoramio',
  'elko',
  'nevada',
  'usa',
  'united states',
  'california',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\s()\-_/.,]/g, '');
}

function buildQueries(spot) {
  const base = [spot.name];
  if (spot.address) {
    const region = String(spot.address).split(' ').slice(0, 2).join(' ').trim();
    if (region) base.push(`${spot.name} ${region}`);
  }
  base.push(`${spot.name} Korea`);
  return [...new Set(base.map((q) => q.trim()).filter(Boolean))];
}

function scoreCandidate(spot, page) {
  const target = normalize(spot.name);
  const title = normalize(page.title);
  let score = 0;

  if (REJECT_TITLE_KEYWORDS.some((keyword) => title.includes(normalize(keyword)))) {
    return -999;
  }

  if (title.includes(target)) score += 100;
  if (target.includes(title)) score += 30;
  if (spot.address) {
    const region = normalize(String(spot.address).split(' ').slice(0, 2).join(' '));
    if (region && title.includes(region)) score += 20;
  }

  const imageInfo = page.imageinfo?.[0];
  if (imageInfo?.url?.match(/\.(jpg|jpeg|png)$/i)) score += 10;
  if (title.includes('commons')) score -= 20;
  const hasKoreanInName = /[가-힣]/.test(spot.name);
  const hasKoreanInTitle = /[가-힣]/.test(page.title);
  if (hasKoreanInName && !hasKoreanInTitle) score -= 35;

  return score;
}

async function searchWikimedia(spot) {
  const queries = buildQueries(spot);

  for (const query of queries) {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: String(MAX_RESULTS),
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: '1600',
      format: 'json',
      origin: '*',
    });

    const res = await fetch(`${WIKIMEDIA_API}?${params.toString()}`);
    if (!res.ok) {
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    const json = await res.json();
    const pages = Object.values(json?.query?.pages ?? {});
    if (!pages.length) {
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    const ranked = pages
      .filter((page) => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url)
      .map((page) => ({ page, score: scoreCandidate(spot, page) }))
      .sort((a, b) => b.score - a.score);

    const winner = ranked[0];
    if (winner && winner.score >= 70) {
      const info = winner.page.imageinfo[0];
      return {
        url: info.thumburl || info.url,
        title: winner.page.title,
        query,
      };
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return null;
}

function parseArgs(argv) {
  const args = { limit: 80 };
  for (const arg of argv) {
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.replace('--limit=', ''));
      if (Number.isFinite(parsed) && parsed > 0) args.limit = parsed;
    }
  }
  return args;
}

async function main() {
  const { limit } = parseArgs(process.argv.slice(2));
  const supabase = createServiceClient();

  const { data: spots, error } = await supabase
    .from('flower_spots')
    .select('id, name, address, source, photo_spot, cover_image_url')
    .is('cover_image_url', null)
    .or('source.like.curated%,source.like.official%')
    .order('photo_spot', { ascending: false })
    .limit(limit);

  if (error) throw error;

  let updated = 0;
  let skipped = 0;

  for (const spot of spots ?? []) {
    try {
      const result = await searchWikimedia(spot);
      if (!result) {
        skipped += 1;
        console.log(`[skip] ${spot.name} — no confident wikimedia match`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('flower_spots')
        .update({
          cover_image_url: result.url,
          updated_at: nowIso(),
        })
        .eq('id', spot.id);

      if (updateError) throw updateError;

      updated += 1;
      console.log(`[update] ${spot.name} — ${result.title} via "${result.query}"`);
      await sleep(REQUEST_DELAY_MS);
    } catch (err) {
      skipped += 1;
      console.log(`[error] ${spot.name} — ${err.message}`);
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(JSON.stringify({ scanned: spots?.length ?? 0, updated, skipped }, null, 2));
}

main().catch((error) => {
  console.error('[seed:wikimedia-search-covers] failed:', error);
  process.exit(1);
});
