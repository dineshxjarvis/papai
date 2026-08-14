import { createEmptyClaim } from "../types.js";

const METRIC_ALIASES = {
  "top-1 accuracy": "top1_accuracy",
  "top1 accuracy": "top1_accuracy",
  "top-5 accuracy": "top5_accuracy",
  "f1-score": "f1",
  "f1 score": "f1",
  "f-measure": "f1",
  "area under the curve": "auc",
  auroc: "auc",
  "mean average precision": "map",
  "bleu score": "bleu",
  "rouge-l": "rouge_l",
};

function normalizeMetric(metric) {
  if (!metric) return null;
  const key = metric.toLowerCase().trim();
  return METRIC_ALIASES[key] || key.replace(/\s+/g, "_");
}

function normalizeName(name) {
  if (!name) return null;
  return name.trim().replace(/\s+/g, " ");
}

export function structureClaim(candidate, classification, source = "live") {
  if (!classification.is_claim) return null;

  const text = classification.claim_span || candidate.text;

  return createEmptyClaim({
    text,
    start: candidate.start ?? 0,
    end: candidate.end ?? text.length,
    claim_type: classification.claim_type,
    confidence: classification.confidence,
    polarity: classification.polarity,
    entities: {
      method: normalizeName(classification.entities?.method),
      baseline: normalizeName(classification.entities?.baseline),
      metric: normalizeMetric(classification.entities?.metric),
      value: classification.entities?.value || null,
      dataset: normalizeName(classification.entities?.dataset),
    },
    section: candidate.section || "Body",
    status: "detected",
    reason: classification.reason,
    source,
  });
}

export function structureClaims(pairs, source = "live") {
  return pairs
    .map(({ candidate, classification }) =>
      structureClaim(candidate, classification, source)
    )
    .filter(Boolean);
}
