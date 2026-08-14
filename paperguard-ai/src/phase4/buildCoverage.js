export function buildClaimCoverage(result = {}, claim = {}) {
  const ents = {
    ...(claim.entities || {}),
    ...(result.entities || {}),
  };
  const coverage = result.evidenceCoverage || result.coverage || {};
  const evidence = result.evidence || [];
  const blob = evidence
    .map((e) => `${e.evidenceSpan || ""} ${JSON.stringify(e.experiment || {})}`)
    .join(" ")
    .toLowerCase();

  const rows = [];
  const push = (key, label, value) => {
    if (!value) {
      rows.push({ key, label, value: null, status: "missing" });
      return;
    }
    const hit = blob.includes(String(value).toLowerCase());
    rows.push({
      key,
      label,
      value: String(value),
      status: hit ? "matched" : "unchecked",
    });
  };

  push("method", "Method", ents.method);
  push("baseline", "Baseline", ents.baseline);
  push("dataset", "Dataset", ents.dataset);
  push("metric", "Metric", ents.metric || ents.metric_name);

  const direction =
    ents.relationship ||
    (/(higher|outperform|better)/i.test(claim.text || "") ? "Higher" : null);
  if (direction) {
    const hit = /higher|outperform|better|accuracy/.test(blob);
    rows.push({
      key: "direction",
      label: "Direction",
      value: direction,
      status: hit ? "matched" : "unchecked",
    });
  }

  const matched = rows.filter((r) => r.status === "matched").length;
  const total = rows.filter((r) => r.status !== "missing").length || rows.length;
  const ratio =
    typeof coverage.ratio === "number" ? coverage.ratio : total ? matched / total : 0;

  return {
    rows,
    matched: coverage.matched ?? matched,
    total: coverage.total ?? total,
    ratio,
  };
}
