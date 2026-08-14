import { useMemo, useState, useCallback } from "react";
import { buildPhase4ViewModel } from "./buildPhase4ViewModel.js";
import { createClaimRun, isClaimStale } from "./claimRunGuard.js";

export function usePhase4Result() {
  const [result, setResult] = useState(null);
  const [claim, setClaim] = useState(null);
  const [run, setRun] = useState(null);
  const [showWhy, setShowWhy] = useState(false);

  const beginVerify = useCallback((activeClaim) => {
    const r = createClaimRun(activeClaim);
    setClaim(activeClaim);
    setRun(r);
    setResult(null);
    setShowWhy(false);
    return r;
  }, []);

  const completeVerify = useCallback((activeClaim, phase3Result, startedRun) => {
    setClaim(activeClaim);
    setResult(phase3Result);
    if (startedRun) setRun(startedRun);
  }, []);

  const stale = useMemo(() => isClaimStale(run, claim), [run, claim]);
  const vm = useMemo(
    () => (result && claim ? buildPhase4ViewModel(claim, result) : null),
    [result, claim]
  );

  return {
    vm,
    result,
    claim,
    run,
    stale,
    showWhy,
    setShowWhy,
    beginVerify,
    completeVerify,
  };
}
