/**
 * Map Phase 3 result → Claim Log status / color
 */

export function mapVerdictToClaimPatch(result) {
  if (!result) return {};

  const verdict = result.verdict || "insufficient";

  const statusMap = {
    supported: "supported",
    partially_supported: "partially_supported",
    contradicted: "contradicted",
    insufficient: "inconclusive",
  };

  const colorMap = {
    supported: "green",
    partially_supported: "yellow",
    contradicted: "red",
    insufficient: "yellow",
  };

  return {
    status: statusMap[verdict] || "detected",
    color: colorMap[verdict] || "yellow",
    type: colorMap[verdict] || "yellow",
    confidence: Math.round((result.internalScore || 0) * 100),
    evidenceCount: result.evidence?.length || 0,
    evidenceQuality: result.evidenceQuality,
    verificationConfidence: result.verificationConfidence,
    verdict,
    evidenceCoverage: result.evidenceCoverage,
    conflictMap: result.conflictMap,
    verificationTrace: result.trace,
    lastVerificationAt: result.finishedAt || new Date().toISOString(),
  };
}

export function verdictLabel(verdict) {
  const map = {
    supported: "Supported",
    partially_supported: "Partially Supported",
    contradicted: "Contradicted",
    insufficient: "Insufficient Evidence",
  };
  return map[verdict] || verdict || "Unknown";
}
