export function suggestAlternatives(claim, result = {}) {
  const verdict = result.verdict || "";
  if (verdict === "supported") return [];

  const text = (claim?.text || "").trim();
  if (!text) return [];

  const ents = { ...(claim.entities || {}), ...(result.entities || {}) };
  const method = ents.method || "this method";
  const baseline = ents.baseline || "prior baselines";
  const dataset = ents.dataset || "standard benchmarks";
  const metric = ents.metric || "reported metrics";

  if (verdict === "partially_supported") {
    return [
      {
        id: "partial-hedge",
        label: "Safer wording",
        text: `Prior studies suggest that ${method} can outperform ${baseline} on ${dataset} under common evaluation settings, though results may vary with training setup.`,
      },
      {
        id: "partial-scope",
        label: "Scoped claim",
        text: `On ${dataset}, ${method} has been reported to improve ${metric} relative to ${baseline} in some studies, with limitations noted in others.`,
      },
    ];
  }

  if (verdict === "contradicted") {
    return [
      {
        id: "contra-balance",
        label: "Balanced wording",
        text: `Some studies report improved ${metric} for ${method}, while others find limited or non-significant gains depending on data regime and setup.`,
      },
      {
        id: "contra-limit",
        label: "Limitation-aware",
        text: `Evidence for ${method} outperforming ${baseline} is mixed; gains are not consistently significant across all datasets and configurations.`,
      },
    ];
  }

  return [
    {
      id: "insuff-hedge",
      label: "Hedged wording",
      text: `Existing work has investigated ${method} on ${dataset}; stronger claims would require clearer experimental support.`,
    },
    {
      id: "insuff-cite",
      label: "Cite-first wording",
      text: `Several studies examine ${method} for ${metric}; the literature available in this check was insufficient to fully support the original claim.`,
    },
  ];
}
