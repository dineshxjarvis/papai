/**
 * Verdict Engine — deterministic rules (LOCKED policy)
 * UI shows strength labels, NOT "94% true"
 */

import { scoreToEvidenceQuality, scoreToVerificationConfidence } from "../types.js";

export function computeVerdict({ evidence, contradictions, coverage, specificity }) {
  const supportStrong = evidence.filter(
    (e) => e.supportsClaim === "yes" && (e.evidenceQuality === "strong" || e.evidenceQuality === "moderate")
  );
  const supportAny = evidence.filter((e) => e.supportsClaim === "yes");
  const partialEv = evidence.filter((e) => e.supportsClaim === "partial");
  const contradictStrong = (contradictions || []).filter((c) => (c.confidence || 0) >= 0.45 || c.stance === "no");

  const coverageRatio = coverage?.ratio ?? 0;
  const hasDirect = supportAny.length > 0;
  const onlyWeak =
    hasDirect && supportAny.every((e) => e.evidenceQuality === "weak" || e.evidenceSource === "abstract");

  let verdict = "insufficient";

  // One strong direct source is enough if no strong contradiction
  if (supportStrong.length >= 1 && contradictStrong.length === 0 && coverageRatio >= 0.5) {
    verdict = "supported";
  } else if (supportAny.length >= 1 && contradictStrong.length === 0 && coverageRatio >= 0.75) {
    verdict = "supported";
  } else if (contradictStrong.length >= 1 && supportAny.length === 0) {
    verdict = "contradicted";
  } else if (contradictStrong.length >= 1 && supportAny.length >= 1) {
    verdict = "partially_supported";
  } else if (hasDirect && (coverageRatio < 0.75 || partialEv.length || onlyWeak)) {
    verdict = "partially_supported";
  } else if (hasDirect && specificity === "low") {
    verdict = "partially_supported";
  } else if (!hasDirect) {
    verdict = "insufficient";
  }

  // Internal score for labels only
  let score = 0;
  score += Math.min(0.35, supportStrong.length * 0.2 + supportAny.length * 0.1);
  score += 0.25 * coverageRatio;
  score += supportAny.some((e) => e.evidenceSource === "full_text") ? 0.2 : supportAny.length ? 0.1 : 0;
  score -= Math.min(0.35, contradictStrong.length * 0.2);
  if (specificity === "low") score -= 0.15;
  if (onlyWeak) score -= 0.1;
  score = Math.max(0, Math.min(1, score));

  if (verdict === "insufficient") score = Math.min(score, 0.35);

  return {
    verdict,
    evidenceQuality: scoreToEvidenceQuality(score),
    verificationConfidence: scoreToVerificationConfidence(score),
    internalScore: score,
    reasons: {
      supportCount: supportAny.length,
      strongSupportCount: supportStrong.length,
      contradictCount: contradictStrong.length,
      coverageRatio,
      specificity: specificity || "medium",
    },
  };
}
