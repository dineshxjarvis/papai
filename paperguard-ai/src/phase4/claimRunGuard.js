export function hashClaimText(text) {
  const s = String(text || "").trim().replace(/\s+/g, " ");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function createClaimRun(claim) {
  return {
    runId: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    claimId: claim.id,
    textSnapshot: claim.text,
    textHash: hashClaimText(claim.text),
    startedAt: new Date().toISOString(),
  };
}

export function isClaimStale(run, currentClaim) {
  if (!run || !currentClaim) return false;
  if (run.claimId && currentClaim.id && run.claimId !== currentClaim.id) return true;
  return run.textHash !== hashClaimText(currentClaim.text);
}
