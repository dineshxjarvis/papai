import { splitSentences, buildContextWindows, htmlToPlainText } from "./sentenceSplitter";
import { filterCandidates } from "./candidateFilter";
import { detectClaims } from "./claimDetector";

function deduplicateClaims(claims) {
  const seen = new Map();
  const result = [];

  for (const claim of claims) {
    const key = claim.text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);

    if (seen.has(key)) continue;
    seen.set(key, true);
    result.push(claim);
  }
  return result;
}

export async function runClaimPipeline(input, options = {}) {
  const {
    source = "live",
    apiBase,
    forceLocal = false,
    confidenceThreshold = 0.65,
    skipCandidateFilter = false,
  } = options;

  const plain = input.includes("<") ? htmlToPlainText(input) : input;
  if (!plain || plain.trim().length < 20) return [];

  const sentences = splitSentences(plain);
  if (sentences.length === 0) return [];

  let windows = buildContextWindows(sentences);

  if (!skipCandidateFilter) {
    windows = filterCandidates(windows);
  }

  if (windows.length === 0) return [];

  const claims = await detectClaims(windows, {
    apiBase,
    forceLocal,
    confidenceThreshold,
    source,
  });

  const unique = deduplicateClaims(claims);

  const rank = {
    quantitative: 0,
    comparative: 1,
    causal: 2,
    performance: 3,
    limitation: 4,
    other: 5,
  };

  unique.sort((a, b) => {
    const ra = rank[a.claimType] ?? 9;
    const rb = rank[b.claimType] ?? 9;
    if (ra !== rb) return ra - rb;
    return b.confidence - a.confidence;
  });

  return unique;
}

export async function runIncrementalClaimPipeline(fullText, existingClaims = [], options = {}) {
  const existingTexts = new Set(
    existingClaims.map((c) => c.text.toLowerCase().replace(/\s+/g, " ").trim())
  );

  const all = await runClaimPipeline(fullText, { ...options, source: "live" });

  return all.filter((c) => {
    const key = c.text.toLowerCase().replace(/\s+/g, " ").trim();
    return !existingTexts.has(key);
  });
}
