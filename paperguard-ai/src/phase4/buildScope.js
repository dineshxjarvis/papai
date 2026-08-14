export function buildVerificationScope(result = {}) {
  // Handle new backend format: key_papers with stance field
  const keyPapers = result.key_papers || [];
  const support =
    result.supporting_evidence ||
    keyPapers.filter((p) => p.stance === "supports" || p.stance === "supporting");
  const contradict =
    result.contradicting_evidence ||
    keyPapers.filter((p) => p.stance === "contradicts" || p.stance === "contradicting");

  const allPapers = keyPapers.length > 0 ? keyPapers : [...support, ...contradict];

  const fullText = allPapers.filter((e) => e.location && e.location.toLowerCase().includes("full text")).length;
  const abstractOnly = allPapers.length - fullText;

  const adversarialSearch = (result.audit_trace || []).some(
    (t) => t.agent_name && t.agent_name.toLowerCase().includes("adversarial")
  )
    ? "completed"
    : "skipped";

  // conflict_map from new backend response
  const conflictMap = result.conflict_map || {};

  return {
    papersAnalyzed: allPapers.length || (conflictMap.supporting?.count || 0) + (conflictMap.contradicting?.count || 0),
    fullText,
    abstractOnly: Math.max(abstractOnly, 0),
    supporting: support.length || conflictMap.supporting?.count || 0,
    contradicting: contradict.length || conflictMap.contradicting?.count || 0,
    adversarialSearch,
    evidenceSpans: allPapers.filter((e) => e.text_span || e.abstract).length,
    description: result.scope || "No specific scope provided.",
  };
}
