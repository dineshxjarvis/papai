export function buildWhyNotFullySupported(result = {}) {
  const verdict = result.verdict || "";
  if (verdict === "supported") {
    return { show: false, title: null, summary: null, bullets: [] };
  }

  const support = result.supporting_evidence || [];
  const contradict = result.contradicting_evidence || [];
  const coverage = result.coverage || {};
  const conflicts = result.conflicts || [];
  
  const bullets = [];

  if (support.length) bullets.push(`${support.length} supporting result(s) found`);
  if (contradict.length)
    bullets.push(`${contradict.length} contradictory / limitation result(s)`);
  
  if (coverage.gaps && coverage.gaps.length > 0) {
    coverage.gaps.forEach(gap => bullets.push(`Gap: ${gap}`));
  }
  
  if (conflicts.length > 0) {
    conflicts.forEach(c => bullets.push(`Conflict: ${c.description || c.nature_of_conflict}`));
  }

  const allEvidence = [...support, ...contradict];
  const fullText = allEvidence.filter((e) => e.location && e.location.toLowerCase().includes("full text")).length;
  if (allEvidence.length && fullText === 0) {
    bullets.push("No full-text spans used — abstract-only verification");
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
