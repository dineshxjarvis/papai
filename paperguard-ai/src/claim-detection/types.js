/**
 * Canonical Claim schema used across the entire Phase 2 pipeline.
 */

export const CLAIM_TYPES = [
  "comparative",
  "quantitative",
  "causal",
  "performance",
  "limitation",
  "none",
];

export const POLARITIES = ["positive", "negative", "neutral"];

export const CLAIM_STATUSES = [
  "detected",
  "confirmed",
  "dismissed",
  "analyzing",
  "supported",
  "partially_supported",
  "contradicted",
  "inconclusive",
];

export const CONFIDENCE_THRESHOLD = 0.65;

export function createEmptyClaim(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    text: "",
    start: 0,
    end: 0,
    claim_type: "none",
    confidence: 0,
    polarity: "neutral",
    entities: {},
    section: null,
    status: "detected",
    reason: "",
    detected_at: new Date().toISOString(),
    source: "live",
    ...overrides,
  };
}

export function claimTypeToColor(claim) {
  if (claim.status === "supported") return "green";
  if (claim.status === "contradicted") return "red";
  if (
    claim.status === "partially_supported" ||
    claim.status === "inconclusive"
  ) {
    return "yellow";
  }
  if (claim.claim_type === "limitation") return "red";

  const conf = claim.confidence ?? 0;
  if (conf >= 0.8) return "green";
  if (conf >= 0.65) return "yellow";

  // Manual / below-threshold claims only
  return "gray";
}

export function statusLabel(status) {
  const map = {
    detected: "Detected",
    confirmed: "Confirmed",
    dismissed: "Dismissed",
    analyzing: "Analyzing…",
    supported: "Supported",
    partially_supported: "Partially Supported",
    contradicted: "Contradicted",
    inconclusive: "Inconclusive",
  };
  return map[status] || status;
}
