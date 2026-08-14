export function buildVerificationScope(result = {}) {
  const papers = result.papers || [];
  const evidence = result.evidence || [];
  const support = evidence.filter((e) => e.supportsClaim === "yes");
  const contradict = evidence.filter(
    (e) => e.supportsClaim === "no" || e.channel === "adversarial"
  );
  const fullText = evidence.filter((e) => e.evidenceSource === "full_text").length;
  const abstractOnly = evidence.filter(
    (e) => e.evidenceSource === "abstract" || !e.evidenceSource
  ).length;
  const adversarialDone =
    (result.queries || []).some((q) => q.channel === "adversarial") ||
    (result.trace || []).some((t) => /adversarial/i.test(t.agent || ""));

  return {
    papersAnalyzed: papers.length,
    fullText,
    abstractOnly: Math.max(abstractOnly, evidence.length - fullText),
    supporting: support.length,
    contradicting: contradict.length,
    adversarialSearch: adversarialDone ? "completed" : "skipped",
    evidenceSpans: evidence.filter((e) => e.evidenceSpan).length,
  };
}
