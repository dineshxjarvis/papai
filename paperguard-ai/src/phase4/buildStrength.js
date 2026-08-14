export function buildEvidenceStrength(result = {}) {
  const quality = (result.evidenceQuality || "weak").toLowerCase();
  const evidence = result.evidence || [];
  const support = evidence.filter((e) => e.supportsClaim === "yes").length;
  const limitations = evidence.filter(
    (e) => e.supportsClaim === "no" || (e.limitations || []).length
  ).length;
  const spans = evidence.filter((e) => e.evidenceSpan).length;

  const levelMap = {
    strong: { level: "Strong", bars: 9, tone: "strong" },
    moderate: { level: "Moderate", bars: 6, tone: "moderate" },
    weak: { level: "Weak", bars: 3, tone: "weak" },
  };
  const meta = levelMap[quality] || levelMap.weak;

  return {
    level: meta.level,
    bars: meta.bars,
    tone: meta.tone,
    supportingPapers: support,
    limitations,
    evidenceSpans: spans,
    assessmentConfidence: result.verificationConfidence || "low",
  };
}
