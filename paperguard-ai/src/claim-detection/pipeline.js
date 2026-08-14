import { cleanText, splitBySections } from "./stages/parseAndClean.js";
import { segmentSentences, withContext } from "./stages/sentenceSegment.js";
import { filterCandidates } from "./stages/candidateFilter.js";
import { classifyCandidates } from "./stages/classifyClaim.js";
import { structureClaims } from "./stages/structureNormalize.js";
import { calibrateAndDedup } from "./stages/calibrateDedup.js";
import { CONFIDENCE_THRESHOLD } from "./types.js";

export async function runClaimPipeline(rawText, options = {}) {
  const {
    signal,
    provider = "auto",
    threshold = CONFIDENCE_THRESHOLD,
    source = "full",
    onProgress,
    useMock = false,
  } = options;

  onProgress?.("parsing", "Cleaning text…");
  const cleaned = cleanText(rawText);
  if (!cleaned) return [];

  const sections = splitBySections(cleaned);

  onProgress?.("segmenting", "Splitting sentences…");
  let allSentences = [];
  for (const sec of sections) {
    const sents = segmentSentences(sec.text);
    allSentences = allSentences.concat(withContext(sents, sec.section));
  }

  if (signal?.aborted) return [];

  onProgress?.(
    "filtering",
    `Filtering candidates (${allSentences.length} sentences)…`
  );
  const candidates = filterCandidates(allSentences);
  onProgress?.("filtering", `${candidates.length} candidates kept`);

  if (candidates.length === 0) return [];

  onProgress?.("classifying", `Classifying ${candidates.length} candidates…`);
  const pairs = await classifyCandidates(candidates, {
    concurrency: 3,
    signal,
    provider,
    useMock,
    onProgress: (done, total) =>
      onProgress?.("classifying", `${done}/${total}`),
  });

  if (signal?.aborted) return [];

  onProgress?.("structuring", "Normalizing claims…");
  const structured = structureClaims(pairs, source);

  onProgress?.("calibrating", "Calibrating & deduplicating…");
  const finalClaims = calibrateAndDedup(structured, threshold);

  onProgress?.("done", `${finalClaims.length} claims ready`);
  return finalClaims;
}

export async function runLiveClaimPipeline(recentText, options = {}) {
  return runClaimPipeline(recentText, {
    ...options,
    source: "live",
  });
}
