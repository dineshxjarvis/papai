import { CONFIDENCE_THRESHOLD } from "../types.js";

function polarityConflict(a, b) {
  if (!a.polarity || !b.polarity) return false;
  return (
    (a.polarity === "positive" && b.polarity === "negative") ||
    (a.polarity === "negative" && b.polarity === "positive")
  );
}

function isSameClaim(a, b) {
  // Swapped method/baseline → different claim
  if (
    a.entities?.method &&
    b.entities?.method &&
    a.entities?.baseline &&
    b.entities?.baseline &&
    a.entities.method === b.entities.baseline &&
    a.entities.baseline === b.entities.method
  ) {
    return false;
  }

  if (polarityConflict(a, b)) return false;

  // Bigram Jaccard (order-sensitive)
  const bigrams = (t) => {
    const w = t.toLowerCase().split(/\W+/).filter(Boolean);
    const s = new Set();
    for (let i = 0; i < w.length - 1; i++) s.add(w[i] + " " + w[i + 1]);
    return s;
  };
  const A = bigrams(a.text);
  const B = bigrams(b.text);
  if (A.size === 0 || B.size === 0) return false;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const j = inter / (A.size + B.size - inter);
  return j >= 0.72;
}

export function calibrateAndDedup(claims, threshold = CONFIDENCE_THRESHOLD) {
  let filtered = claims.filter((c) => c.confidence >= threshold);
  filtered.sort((a, b) => b.confidence - a.confidence);

  const kept = [];
  for (const claim of filtered) {
    const isDup = kept.some((k) => isSameClaim(k, claim));
    if (!isDup) kept.push(claim);
  }

  const rank = {
    quantitative: 5,
    comparative: 4,
    performance: 3,
    causal: 2,
    limitation: 1,
    none: 0,
  };

  kept.sort((a, b) => {
    const ra = rank[a.claim_type] || 0;
    const rb = rank[b.claim_type] || 0;
    if (rb !== ra) return rb - ra;
    return b.confidence - a.confidence;
  });

  return kept;
}
