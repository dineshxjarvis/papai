/**
 * @typedef {"comparative" | "quantitative" | "causal" | "performance" | "limitation" | "other"} ClaimType
 * @typedef {"detected" | "analyzing" | "supported" | "partial" | "contradicted" | "insufficient"} ClaimStatus
 * @typedef {"live" | "upload" | "selection"} ClaimSource
 * @typedef {"positive" | "negative" | "neutral"} ClaimPolarity
 *
 * @typedef {Object} ClaimEntities
 * @property {string|null} method
 * @property {string|null} baseline
 * @property {string|null} metric
 * @property {string|null} value
 * @property {string|null} dataset
 *
 * @typedef {Object} Claim
 * @property {string} id
 * @property {string} text
 * @property {ClaimType} claimType
 * @property {number} confidence
 * @property {ClaimStatus} status
 * @property {ClaimSource} source
 * @property {ClaimPolarity} polarity
 * @property {ClaimEntities} entities
 * @property {string} reason
 * @property {string} [color]
 * @property {string} [type]
 * @property {number|null} [from]
 * @property {number|null} [to]
 * @property {number|null} [pageNumber]
 * @property {string} detectedAt
 * @property {number} [evidenceCount]
 */

export function statusToColor(status) {
  switch (status) {
    case "supported":
      return "green";
    case "partial":
    case "detected":
    case "analyzing":
      return "yellow";
    case "contradicted":
      return "red";
    default:
      return "yellow";
  }
}

export function statusToLabel(status) {
  switch (status) {
    case "supported":
      return "Supported";
    case "partial":
      return "Partially Supported";
    case "contradicted":
      return "Contradicted";
    case "insufficient":
      return "Insufficient Evidence";
    case "analyzing":
      return "Analyzing...";
    case "detected":
    default:
      return "Detected";
  }
}

function generateStableClaimId(text) {
  const clean = (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
  }
  return `c_${Math.abs(hash).toString(16)}`;
}

export function normalizeClaim(raw, source = "live") {
  const status = raw.status || "detected";
  const color = statusToColor(status);
  const text = (raw.text || raw.claim_text || raw.claim_span || "").trim();

  return {
    id: generateStableClaimId(text),
    text,
    claimType: raw.claim_type || raw.claimType || "other",
    confidence:
      typeof raw.confidence === "number"
        ? raw.confidence <= 1
          ? Math.round(raw.confidence * 100)
          : Math.round(raw.confidence)
        : 70,
    status,
    source,
    polarity: raw.polarity || "neutral",
    entities: {
      method: raw.subject || raw.entities?.method || null,
      baseline: raw.comparison_target || raw.entities?.baseline || null,
      metric: raw.metric || raw.entities?.metric || null,
      value: raw.value || raw.entities?.value || null,
      dataset: raw.entities?.dataset || null,
    },
    reason: raw.predicate ? `${raw.subject} ${raw.predicate} ${raw.value || ''}` : (raw.reason || ""),
    color,
    type: color,
    from: raw.from ?? null,
    to: raw.to ?? null,
    pageNumber: raw.pageNumber ?? null,
    detectedAt: raw.detectedAt || new Date().toISOString(),
    evidenceCount: raw.evidenceCount ?? 0,
  };
}
