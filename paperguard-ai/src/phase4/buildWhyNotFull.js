export function buildWhyNotFullySupported(result = {}) {
  const verdict = result.verdict || "";
  if (verdict === "supported") {
    return { show: false, title: null, summary: null, bullets: [] };
  }

  const evidence = result.evidence || [];
  const support = evidence.filter((e) => e.supportsClaim === "yes");
  const contradict = evidence.filter((e) => e.supportsClaim === "no");
  const coverage = result.evidenceCoverage || result.coverage || {};
  const quality = result.evidenceQuality || "weak";
  const bullets = [];

  if (support.length) bullets.push(`${support.length} supporting result(s) found`);
  if (contradict.length)
    bullets.push(`${contradict.length} contradictory / limitation result(s)`);
  if (coverage.ratio != null && coverage.ratio < 0.8) {
    bullets.push(
      `Claim coverage incomplete (${coverage.matched ?? "?"}/${coverage.total ?? "?"})`
    );
  }
  if (quality === "weak") {
    bullets.push("Evidence quality is weak (mostly abstracts or low specificity)");
  }
  const fullText = evidence.filter((e) => e.evidenceSource === "full_text").length;
  if (evidence.length && fullText === 0) {
    bullets.push("No full-text spans used — abstract-only verification");
  }
  if ((result.papers || []).length < 3) {
    bullets.push("Limited literature sample in this run");
  }
  if (!bullets.length) {
    bullets.push("Available evidence is mixed or incomplete for a full support rating");
  }

  const titles = {
    partially_supported: "PARTIALLY SUPPORTED",
    contradicted: "CONTRADICTED",
    insufficient: "INSUFFICIENT EVIDENCE",
  };
  const summaries = {
    partially_supported:
      "Some evidence aligns with the claim, but limitations or gaps prevent full support.",
    contradicted:
      "Counter-evidence or limitations outweigh clear supporting results in this run.",
    insufficient:
      "Not enough reliable, matching evidence was retrieved to support this claim.",
  };

  return {
    show: true,
    title: titles[verdict] || "NOT FULLY SUPPORTED",
    summary: summaries[verdict] || summaries.insufficient,
    bullets,
  };
}
