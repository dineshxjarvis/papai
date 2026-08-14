import { useState, useCallback, useRef } from "react";
import { runVerification } from "../phase3/runVerificationWithLangGraph.js";

export default function useClaimVerification(options = {}) {
  const { provider = "auto", useMock = false } = options;
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeRuns, setActiveRuns] = useState({});
  const [resultsByClaimId, setResultsByClaimId] = useState({});
  const abortRef = useRef(null);

  const verifyClaim = useCallback(
    async (claim, { onProgress } = {}) => {
      if (!claim?.text || !claim?.id) return null;
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsVerifying(true);
      setActiveRuns((prev) => ({ ...prev, [claim.id]: { status: "running" } }));

      try {
        const result = await runVerification(claim, {
          signal: controller.signal,
          provider,
          useMock,
          onProgress: (evt) => {
            setActiveRuns((prev) => ({ ...prev, [claim.id]: { ...prev[claim.id], ...evt } }));
            onProgress?.(evt);
          },
        });
        
        // Ensure result has claim_id to map correctly
        const finalResult = { ...result, claim_id: claim.id, claimId: claim.id };
        setResultsByClaimId((prev) => ({ ...prev, [claim.id]: finalResult }));
        
        setActiveRuns((prev) => ({
          ...prev,
          [claim.id]: { status: result.status, verdict: result.verdict }
        }));
        return finalResult;
      } catch (e) {
        // Silently ignore aborts (user switched claims) — don't mark as failed
        if (e.name === 'AbortError' || /abort/i.test(e.message)) {
          setActiveRuns((prev) => ({ ...prev, [claim.id]: { status: "cancelled" } }));
          return { status: "cancelled", claim_id: claim.id };
        }
        console.error("Verification error:", e);
        setActiveRuns((prev) => ({ ...prev, [claim.id]: { status: "failed", error: e.message } }));
        return { status: "failed", error: e.message };
      } finally {
        setIsVerifying(false);
      }
    },
    [provider, useMock]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsVerifying(false);
  }, []);

  return { verifyClaim, cancel, isVerifying, activeRuns, resultsByClaimId };
}
