import { mapVerdictToClaimPatch } from "./mapVerdictToClaim.js";

export function createPhase3Handlers({
  claimLog,
  verifyClaim,
  setTracesByClaimId,
  setRightPanelOpen,
  setIsScanning,
  showToast,
}) {
  async function handleVerifyClaim(claimOrId) {
    let claim = null;
    if (typeof claimOrId === "object" && claimOrId?.text) {
      claim = claimOrId;
    } else {
      claim = claimLog.uiClaims?.find((c) => c.id === claimOrId) || 
              claimLog.claims?.find((c) => c.id === claimOrId);
    }

    const claimText = claim?.text || claim?.claim_text || claim?.claim_span;
    if (!claimText) {
      showToast?.("Select a claim to verify");
      return null;
    }

    setRightPanelOpen?.(true);
    setIsScanning?.(true);
    
    // Clear trace for this specific claim ID before running
    setTracesByClaimId?.((prev) => ({ ...prev, [claim.id]: [] }));
    
    showToast?.("Running evidence verification agents…");
    claimLog.updateClaim?.(claim.id, { status: "analyzing" });

    const result = await verifyClaim(claim, {
      onProgress: (evt) => {
        if (evt.trace) {
          setTracesByClaimId?.((prev) => ({ ...prev, [claim.id]: [...evt.trace] }));
        } else if (evt.agent) {
          setTracesByClaimId?.((prev) => {
            const currentTrace = prev[claim.id] || [];
            return {
              ...prev,
              [claim.id]: [
                ...currentTrace,
                {
                  agent: evt.agent,
                  status: evt.status,
                  detail: evt.detail,
                  timestamp: new Date().toISOString(),
                },
              ]
            };
          });
        }
      },
    });

    setIsScanning?.(false);

    if (!result || result.status === "failed") {
      claimLog.updateClaim?.(claim.id, { status: "detected" });
      const errMsg = result?.error || "check backend connection";
      showToast?.(`Verification failed: ${errMsg}`);
      return null;
    }

    if (result.status === "cancelled") {
      claimLog.updateClaim?.(claim.id, { status: "detected" });
      return null;
    }

    claimLog.updateClaim?.(claim.id, mapVerdictToClaimPatch(result));
    claimLog.setActiveClaimId?.(claim.id);
    setTracesByClaimId?.((prev) => ({ ...prev, [claim.id]: result.audit_trace || [] }));
    
    const verdict = String(result.verdict || "").replace(/_/g, " ");
    const confidence = result.confidence_score ? ` · ${Math.round(result.confidence_score)}% confidence` : "";
    showToast?.(`✓ ${verdict}${confidence}`);
    return result;
  }

  return { handleVerifyClaim };
}
