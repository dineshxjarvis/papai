/**
 * Map Phase 3 result → Claim Log status / color
 * Handles both old format (supporting_evidence[]) and new format (key_papers with stance)
 */

function normalizeVerdict(raw) {
  if (!raw) return "insufficient";
  const v = String(raw).toLowerCase().replace(/[^a-z_]/g, "").trim();
  if (v.includes("support") && v.includes("partial")) return "partially_supported";
  if (v.includes("support")) return "supported";
  if (v.includes("contradict")) return "contradicted";
  if (v.includes("inconclusive")) return "insufficient";
  if (v.includes("insufficient")) return "insufficient";
  return "insufficient";
}

export function mapVerdictToClaimPatch(result) {
  if (!result) return {};

  const verdict = normalizeVerdict(result.verdict);

  const statusMap = {
    supported: "Supported",
    partially_supported: "Partially Supported",
    contradicted: "Contradicted",
    insufficient: "Inconclusive",
  };

  const colorMap = {
    supported: "green",
    partially_supported: "yellow",
    contradicted: "red",
    insufficient: "yellow",
  };

  const score =
    result.evidence_strength?.score ||
    result.confidence_score ||
    0;

  // Support both old and new backend formats
  const keyPapers = result.key_papers || [];
  const supportCount =
    (result.supporting_evidence || []).length ||
    keyPapers.filter((p) => p.stance === "supports" || p.stance === "supporting").length;
  const contradictCount =
    (result.contradicting_evidence || []).length ||
    keyPapers.filter((p) => p.stance === "contradicts" || p.stance === "contradicting").length;

  return {
    status: statusMap[verdict] || "Detected",
    color: colorMap[verdict] || "yellow",
    type: colorMap[verdict] || "yellow",
    confidence: Math.round(score),
    evidenceCount: supportCount + contradictCount,
    evidenceQuality: result.evidence_strength?.description || "Unknown",
    verdict,
    verificationTrace: result.audit_trace,
    lastVerificationAt: new Date().toISOString(),
  };
}

export function verdictLabel(verdict) {
  const map = {
    supported: "Supported",
    partially_supported: "Partially Supported",
    contradicted: "Contradicted",
    insufficient: "Insufficient Evidence",
    inconclusive: "Inconclusive",
  };
  return map[verdict] || verdict || "Unknown";
}
