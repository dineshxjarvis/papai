import { mapVerdictToClaimPatch } from "./mapVerdictToClaim.js";

export function createPhase3Handlers({
  claimLog,
  verifyClaim,
  setAgentTrace,
  setRightPanelOpen,
  setIsScanning,
  showToast,
}) {
  async function handleVerifyClaim(claimOrId) {
    const claim =
      typeof claimOrId === "object" && claimOrId?.text
        ? claimOrId.raw || claimOrId
        : claimLog.claims?.find((c) => c.id === claimOrId) ||
          claimLog.uiClaims?.find((c) => c.id === claimOrId)?.raw;

    if (!claim?.text) {
      showToast?.("Select a claim to verify");
      return null;
    }

    setRightPanelOpen?.(true);
    setIsScanning?.(true);
    setAgentTrace?.([]);
    showToast?.("Running evidence verification agents…");
    claimLog.updateClaim?.(claim.id, { status: "analyzing" });

    const result = await verifyClaim(claim, {
      onProgress: (evt) => {
        if (evt.trace) setAgentTrace?.([...evt.trace]);
        else if (evt.agent) {
          setAgentTrace?.((prev) => [
            ...(prev || []),
            {
              agent: evt.agent,
              status: evt.status,
              detail: evt.detail,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      },
    });

    setIsScanning?.(false);

    if (!result) {
      showToast?.("Verification failed");
      return null;
    }

    claimLog.updateClaim?.(claim.id, mapVerdictToClaimPatch(result));
    claimLog.setActiveClaimId?.(claim.id);
    setAgentTrace?.(result.trace || []);
    showToast?.(
      `Verdict: ${String(result.verdict).replace(/_/g, " ")} · ${result.evidenceQuality} evidence`
    );
    return result;
  }

  return { handleVerifyClaim };
}
