export function buildEvidenceStrength(result = {}) {
  const strengthObj = result.evidence_strength || {};

  // New backend: confidence_score is a percentage (0-100), e.g. 32.5
  const score = strengthObj.score || result.confidence_score || 0;

  // Handle both old and new format for support/contradict lists
  const keyPapers = result.key_papers || [];
  const support =
    result.supporting_evidence ||
    keyPapers.filter((p) => p.stance === "supports" || p.stance === "supporting");
  const contradict =
    result.contradicting_evidence ||
    keyPapers.filter((p) => p.stance === "contradicts" || p.stance === "contradicting");

  const spans = [...support, ...contradict].filter((e) => e.text_span || e.abstract).length;

  let quality = "weak";
  if (score >= 80) quality = "strong";
  else if (score >= 40) quality = "moderate";

  const levelMap = {
    strong: { level: "Strong", bars: 9, tone: "strong" },
    moderate: { level: "Moderate", bars: 6, tone: "moderate" },
    weak: { level: "Weak", bars: 3, tone: "weak" },
  };
  const meta = levelMap[quality];

  // Format confidence as percentage string
  const confidenceStr = score
    ? `${Math.round(score)}%`
    : strengthObj.description || "N/A";

  return {
    level: meta.level,
    bars: Math.max(1, Math.floor(score / 10)),
    tone: meta.tone,
    supportingPapers: support.length,
    limitations: contradict.length,
    evidenceSpans: spans,
    assessmentConfidence: confidenceStr,
  };
}
