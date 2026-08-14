import { useState, useCallback, useRef } from "react";
import { runVerification } from "../phase3/runVerificationWithLangGraph.js";

export default function useClaimVerification(options = {}) {
  const { provider = "auto", useMock = false } = options;
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeRun, setActiveRun] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const abortRef = useRef(null);

  const verifyClaim = useCallback(
    async (claim, { onProgress } = {}) => {
      if (!claim?.text) return null;
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsVerifying(true);
      setActiveRun({ claimId: claim.id, status: "running" });

      try {
        const result = await runVerification(claim, {
          signal: controller.signal,
          provider,
          useMock,
          onProgress: (evt) => {
            setActiveRun({ claimId: claim.id, ...evt });
            onProgress?.(evt);
          },
        });
        setLastResult(result);
        setActiveRun({
          claimId: claim.id,
          status: result.status,
          verdict: result.verdict,
        });
        return result;
      } catch (e) {
        setActiveRun({ claimId: claim.id, status: "failed", error: e.message });
        return null;
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

  return { verifyClaim, cancel, isVerifying, activeRun, lastResult };
}
