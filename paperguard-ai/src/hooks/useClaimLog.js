import { useState, useCallback, useRef, useMemo } from "react";
import { claimTypeToColor, statusLabel } from "../claim-detection/types.js";

export default function useClaimLog(initial = []) {
  const [claims, setClaims] = useState(initial);
  const [activeClaimId, setActiveClaimId] = useState(null);
  const claimsRef = useRef(claims);
  claimsRef.current = claims;

  const addClaims = useCallback((newClaims) => {
    if (!Array.isArray(newClaims) || newClaims.length === 0) return [];

    setClaims((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const unique = newClaims.filter((c) => {
        if (!c.id) return false;
        return !existingIds.has(c.id);
      });
      if (unique.length === 0) return prev;
      return [...unique, ...prev];
    });

    return newClaims;
  }, []);

  const updateClaim = useCallback((id, patch) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }, []);

  const dismissClaim = useCallback((id) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "dismissed" } : c))
    );
  }, []);

  const removeClaim = useCallback((id) => {
    setClaims((prev) => prev.filter((c) => c.id !== id));
    setActiveClaimId((curr) => (curr === id ? null : curr));
  }, []);

  const clearClaims = useCallback(() => {
    setClaims([]);
    setActiveClaimId(null);
  }, []);

  const uiClaims = useMemo(
    () =>
      claims
        .filter((c) => c.status !== "dismissed")
        .map((c) => {
          const conf =
            typeof c.confidence === "number"
              ? c.confidence <= 1
                ? Math.round(c.confidence * 100)
                : Math.round(c.confidence)
              : 0;
          return {
            id: c.id,
            text: c.text,
            status: statusLabel(c.status),
            confidence: conf,
            type: claimTypeToColor(c),
            color: claimTypeToColor(c),
            evidenceCount: c.evidenceCount || 0,
            raw: c,
          };
        }),
    [claims]
  );

  return {
    claims,
    uiClaims,
    activeClaimId,
    setActiveClaimId,
    addClaims,
    updateClaim,
    dismissClaim,
    removeClaim,
    clearClaims,
    claimsRef,
  };
}
