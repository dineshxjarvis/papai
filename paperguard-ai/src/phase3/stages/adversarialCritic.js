/**
 * Adversarial Critic — contradiction / limitation evidence from adversarial channel
 */

export function collectContradictions(evidenceList) {
  return evidenceList
    .filter(
      (e) =>
        e.supportsClaim === "no" ||
        (e.channel === "adversarial" && e.supportsClaim !== "yes")
    )
    .filter(
      (e) =>
        e.supportsClaim === "no" ||
        (e.limitations && e.limitations.length) ||
        e.supportsClaim === "partial"
    )
    .map((e) => ({
      paperId: e.paperId,
      title: e.paper?.title || "",
      stance: e.supportsClaim,
      span: e.evidenceSpan,
      limitations: e.limitations || [],
      confidence: e.confidence,
      url: e.paper?.url,
      page: e.page ?? null,
      section: e.section || null,
      source: e.evidenceSource || null,
      quality: e.evidenceQuality || null,
    }));
}

export function buildConflictMap(evidenceList, contradictions) {
  const support = evidenceList.filter((e) => e.supportsClaim === "yes");
  const partial = evidenceList.filter((e) => e.supportsClaim === "partial");
  const contradict = contradictions.length
    ? contradictions
    : evidenceList.filter((e) => e.supportsClaim === "no");

  return {
    support: support.map(brief),
    partial: partial.map(brief),
    contradict: contradict.map((c) => ({
      paperId: c.paperId,
      title: c.title || c.paper?.title,
      span: c.span || c.evidenceSpan,
      url: c.url || c.paper?.url,
      page: c.page ?? null,
      section: c.section || null,
      source: c.source || c.evidenceSource || null,
      quality: c.quality || c.evidenceQuality || null,
    })),
  };
}

function brief(e) {
  return {
    paperId: e.paperId,
    title: e.paper?.title,
    span: e.evidenceSpan,
    quality: e.evidenceQuality,
    source: e.evidenceSource,
    section: e.section,
    page: e.page,
    url: e.paper?.url,
  };
}
