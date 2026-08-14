/**
 * Phase 3 — Evidence Verification types (LOCKED)
 */

export const VERDICTS = [
  "supported",
  "partially_supported",
  "contradicted",
  "insufficient",
];

export const EVIDENCE_QUALITY = ["strong", "moderate", "weak"];
export const VERIFICATION_CONFIDENCE = ["high", "medium", "low"];
export const STANCES = ["yes", "no", "partial", "unclear"];

export function createEmptyVerificationState(claim, overrides = {}) {
  return {
    runId: crypto.randomUUID?.() || `run_${Date.now()}`,
    claimId: claim.id,
    claimText: claim.text,
    claimTextHash: simpleHash(claim.text),
    entities: {
      method: [],
      baseline: [],
      dataset: [],
      metric: [],
      value: [],
      polarity: null,
      relationship: null,
      ...(claim.entities || {}),
    },
    atomicClaims: [],
    queries: [],
    papers: [],
    evidence: [],
    contradictions: [],
    verifications: [],
    evidenceCoverage: null,
    verdict: null,
    evidenceQuality: null,
    verificationConfidence: null,
    internalScore: null,
    trace: [],
    errors: [],
    status: "pending",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    ...overrides,
  };
}

export function simpleHash(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return String(h);
}

export function pushTrace(state, agent, status, detail = "") {
  state.trace.push({
    agent,
    status,
    detail,
    timestamp: new Date().toISOString(),
  });
  return state;
}

export function scoreToEvidenceQuality(score) {
  if (score >= 0.75) return "strong";
  if (score >= 0.5) return "moderate";
  return "weak";
}

export function scoreToVerificationConfidence(score) {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}
