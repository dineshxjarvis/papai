import { normalizeClaim } from "../types/claim";

export async function detectClaims(windows, options = {}) {
  const {
    apiBase = import.meta.env.VITE_API_BASE || "http://localhost:8000",
    confidenceThreshold = 0.65,
    source = "live",
  } = options;

  if (!windows || windows.length === 0) return [];

  const payload = {
    sentences: windows.map((w, i) => ({
      id: `s_${w.index || i}`,
      prev: w.prev,
      current: w.current,
      next: w.next,
    })),
  };

  let rawResults = [];
  try {
    const res = await fetch(`${apiBase}/api/detect-claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Claim detection API failed: ${res.status}`);
    const data = await res.json();
    rawResults = data.results || [];
  } catch (err) {
    console.error("[ClaimDetector] Backend API unavailable:", err.message);
    return [];
  }

  const claims = [];

  for (let i = 0; i < rawResults.length; i++) {
    const r = rawResults[i];
    
    // Backend returns null for non-claims
    if (!r) continue;

    const conf =
      typeof r.confidence === "number"
        ? r.confidence <= 1
          ? r.confidence
          : r.confidence / 100
        : 0;

    // We can filter by confidence, though backend heuristics may return 0.5
    // so we lower the threshold if needed, but let's stick to simple logic
    if (conf < 0.4) continue;

    // Map it back to the window
    const window =
      windows[i] || windows.find((w) => `s_${w.index}` === r.claim_id) || windows[0];

    claims.push(
      normalizeClaim(
        {
          ...r,
          text: r.claim_text || window?.current,
          claim_type: r.claim_type,
          confidence: conf,
          status: "detected",
          from: window?.from ?? null,
          to: window?.to ?? null,
        },
        source
      )
    );
  }

  return claims;
}
