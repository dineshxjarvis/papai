/**
 * Evidence Extraction Agent
 * LLM extracts structured evidence from title+abstract (full text later)
 */

import { phase3LLM } from "../services/llm.js";

const SYSTEM = `You extract experimental evidence relevant to a scientific claim from a paper title and abstract.
Return ONLY JSON:
{
  "supportsClaim": "yes"|"no"|"partial"|"unclear",
  "evidenceQuality": "strong"|"moderate"|"weak",
  "evidenceSource": "abstract",
  "evidenceSpan": "exact quote from abstract or empty",
  "section": "Abstract",
  "page": null,
  "experiment": {
    "method": string|null,
    "dataset": string|null,
    "metric": string|null,
    "value": string|null,
    "baseline": string|null
  },
  "limitations": string[],
  "confidence": number
}
Rules:
- supportsClaim=yes only if abstract directly backs the claim components.
- If only loosely related, use unclear or partial.
- evidenceSpan must be copied from the abstract when possible.
- Do not invent numbers.`;

function heuristicExtract(paper, claimText, decomposition) {
  const blob = `${paper.title}. ${paper.abstract || ""}`;
  const lower = blob.toLowerCase();
  const { method = [], dataset = [], metric = [], value = [], baseline = [] } = decomposition;

  const hitMethod = method.some((m) => lower.includes(String(m).toLowerCase()));
  const hitData = dataset.some((d) => lower.includes(String(d).toLowerCase()));
  const hitMetric = metric.some((m) => lower.includes(String(m).toLowerCase()));
  const hitVal = value.some((v) => lower.includes(String(v).toLowerCase().replace(/\s/g, "")));
  const hitBase = baseline.some((b) => lower.includes(String(b).toLowerCase()));

  const hits = [hitMethod, hitData, hitMetric, hitVal, hitBase].filter(Boolean).length;
  let supportsClaim = "unclear";
  if (hits >= 3) supportsClaim = "yes";
  else if (hits >= 2) supportsClaim = "partial";
  else if (hits === 0) supportsClaim = "unclear";

  const neg = /not significant|fail|limitation|does not improve|poor performance/i.test(blob);
  if (neg && hits >= 1) supportsClaim = "no";

  // span: first sentence containing a method token
  let evidenceSpan = "";
  const sentences = blob.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
  for (const s of sentences) {
    if (method.some((m) => s.toLowerCase().includes(String(m).toLowerCase()))) {
      evidenceSpan = s.slice(0, 280);
      break;
    }
  }
  if (!evidenceSpan) evidenceSpan = (paper.abstract || paper.title || "").slice(0, 200);

  return {
    paperId: paper.paperId,
    supportsClaim,
    evidenceQuality: hits >= 3 ? "moderate" : "weak",
    evidenceSource: "abstract",
    evidenceSpan,
    section: "Abstract",
    page: null,
    experiment: {
      method: method.find((m) => lower.includes(String(m).toLowerCase())) || null,
      dataset: dataset.find((d) => lower.includes(String(d).toLowerCase())) || null,
      metric: metric.find((m) => lower.includes(String(m).toLowerCase())) || null,
      value: value.find((v) => lower.includes(String(v).toLowerCase().replace(/\s/g, ""))) || null,
      baseline: baseline.find((b) => lower.includes(String(b).toLowerCase())) || null,
    },
    limitations: neg ? ["Possible limitation language in abstract"] : [],
    confidence: Math.min(0.7, 0.25 + hits * 0.12),
    channel: paper._channel || "support",
    paper,
  };
}

export async function extractEvidenceForPaper(paper, claim, decomposition, { signal, provider = "auto", useMock = false } = {}) {
  if (useMock || provider === "mock" || !paper.abstract) {
    return heuristicExtract(paper, claim.text, decomposition);
  }
  try {
    const raw = await phase3LLM(
      SYSTEM,
      `Claim: "${claim.text}"\nAtoms: ${JSON.stringify(decomposition.atomicClaims || [])}\nEntities: ${JSON.stringify(decomposition)}\n\nTitle: ${paper.title}\nAbstract: ${paper.abstract}`,
      signal,
      provider
    );
    return {
      paperId: paper.paperId,
      supportsClaim: raw.supportsClaim || "unclear",
      evidenceQuality: raw.evidenceQuality || "weak",
      evidenceSource: "abstract",
      evidenceSpan: raw.evidenceSpan || "",
      section: raw.section || "Abstract",
      page: raw.page ?? null,
      experiment: {
        method: raw.experiment?.method ?? null,
        dataset: raw.experiment?.dataset ?? null,
        metric: raw.experiment?.metric ?? null,
        value: raw.experiment?.value ?? null,
        baseline: raw.experiment?.baseline ?? null,
      },
      limitations: raw.limitations || [],
      confidence: Number(raw.confidence) || 0.5,
      channel: paper._channel || "support",
      paper,
    };
  } catch (e) {
    console.warn("[EvidenceExtractor] fallback:", e.message);
    return heuristicExtract(paper, claim.text, decomposition);
  }
}

export async function extractEvidenceBatch(papers, claim, decomposition, opts = {}) {
  const { concurrency = 3, signal } = opts;
  const list = papers || [];
  if (!list.length) return [];

  const results = new Array(list.length);
  let next = 0;
  const n = Math.min(Math.max(1, concurrency), list.length);

  async function worker() {
    while (next < list.length) {
      if (signal?.aborted) break;
      const i = next++;
      try {
        results[i] = await extractEvidenceForPaper(
          list[i],
          claim,
          decomposition,
          opts
        );
      } catch (e) {
        console.warn("[EvidenceExtractor] batch item failed:", e.message);
        results[i] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: n }, () => worker()));
  return results.filter(Boolean);
}
