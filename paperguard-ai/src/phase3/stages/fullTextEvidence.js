import {
  extractPdfText,
  chunkPdfBySection,
  selectRelevantChunks,
} from "../services/pdfText.js";
import { phase3LLM } from "../services/llm.js";

const SYSTEM = `You extract experimental evidence from paper text chunks relevant to a scientific claim.
Return ONLY JSON:
{
  "supportsClaim": "yes"|"no"|"partial"|"unclear",
  "evidenceQuality": "strong"|"moderate"|"weak",
  "evidenceSpan": "exact quote from the provided chunk",
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
- evidenceSpan MUST be copied from the chunk when possible.
- Do not invent numbers not present in the chunk.
- supportsClaim=yes only if chunk directly backs claim components.`;

function heuristicFromChunk(chunk, paper, decomposition) {
  const lower = chunk.text.toLowerCase();
  const { method = [], dataset = [], metric = [], value = [], baseline = [] } =
    decomposition;
  const hits = [method, dataset, metric, value, baseline]
    .map((list) => list.some((x) => lower.includes(String(x).toLowerCase())))
    .filter(Boolean).length;

  let supportsClaim = "unclear";
  if (hits >= 3) supportsClaim = "yes";
  else if (hits >= 2) supportsClaim = "partial";
  const neg =
    /not significant|fail|limitation|does not improve|poor performance/i.test(
      chunk.text
    );
  if (neg && hits >= 1) supportsClaim = "no";

  return {
    paperId: paper.paperId,
    supportsClaim,
    evidenceQuality:
      hits >= 3 && /result|experiment/i.test(chunk.section || "")
        ? "strong"
        : hits >= 2
          ? "moderate"
          : "weak",
    evidenceSource: "full_text",
    evidenceSpan: chunk.text.slice(0, 400),
    section: chunk.section || "Body",
    page: chunk.page ?? null,
    experiment: {
      method: method.find((m) => lower.includes(String(m).toLowerCase())) || null,
      dataset:
        dataset.find((d) => lower.includes(String(d).toLowerCase())) || null,
      metric: metric.find((m) => lower.includes(String(m).toLowerCase())) || null,
      value:
        value.find((v) =>
          lower.includes(String(v).toLowerCase().replace(/\s/g, ""))
        ) || null,
      baseline:
        baseline.find((b) => lower.includes(String(b).toLowerCase())) || null,
    },
    limitations: neg ? ["Limitation language in full text"] : [],
    confidence: Math.min(0.92, 0.4 + hits * 0.12),
    channel: paper._channel || "support",
    paper,
  };
}

async function llmFromChunk(chunk, paper, claim, decomposition, opts) {
  try {
    const raw = await phase3LLM(
      SYSTEM,
      `Claim: "${claim.text}"\nEntities: ${JSON.stringify(decomposition)}\n\nPage: ${chunk.page}\nSection: ${chunk.section}\nChunk:\n${chunk.text}`,
      opts.signal,
      opts.provider
    );
    return {
      paperId: paper.paperId,
      supportsClaim: raw.supportsClaim || "unclear",
      evidenceQuality: raw.evidenceQuality || "moderate",
      evidenceSource: "full_text",
      evidenceSpan: raw.evidenceSpan || chunk.text.slice(0, 300),
      section: chunk.section || "Body",
      page: chunk.page ?? null,
      experiment: {
        method: raw.experiment?.method ?? null,
        dataset: raw.experiment?.dataset ?? null,
        metric: raw.experiment?.metric ?? null,
        value: raw.experiment?.value ?? null,
        baseline: raw.experiment?.baseline ?? null,
      },
      limitations: raw.limitations || [],
      confidence: Number(raw.confidence) || 0.7,
      channel: paper._channel || "support",
      paper,
    };
  } catch {
    return heuristicFromChunk(chunk, paper, decomposition);
  }
}

export async function extractFullTextEvidence(
  paper,
  claim,
  decomposition,
  {
    signal,
    provider = "auto",
    useMock = false,
    maxPages = 15,
    topChunks = 4,
  } = {}
) {
  if (useMock || !paper.pdfUrl) return [];

  const extracted = await extractPdfText(paper.pdfUrl, { signal, maxPages });
  if (!extracted?.pages?.length) return [];

  const chunks = chunkPdfBySection(extracted.pages);
  const relevant = selectRelevantChunks(
    chunks,
    decomposition,
    claim.text,
    topChunks
  );
  if (!relevant.length) return [];

  const out = [];
  for (const chunk of relevant) {
    if (signal?.aborted) break;
    if (provider === "mock" || useMock) {
      out.push(heuristicFromChunk(chunk, paper, decomposition));
    } else {
      out.push(
        await llmFromChunk(chunk, paper, claim, decomposition, {
          signal,
          provider,
        })
      );
    }
  }
  return out;
}

export async function enrichWithFullText(
  rankedPapers,
  claim,
  decomposition,
  opts = {}
) {
  const { topFullText = 3, signal } = opts;
  const fullTextEvidence = [];
  const papersWithFullText = new Set();

  const candidates = rankedPapers
    .filter((p) => p.pdfUrl)
    .slice(0, topFullText);

  const concurrency = opts.concurrency ?? 3;
  const perPdfTimeoutMs = opts.pdfTimeoutMs ?? 8000;

  async function withTimeout(promise, ms) {
    let t;
    const timeout = new Promise((_, rej) => {
      t = setTimeout(() => rej(new Error("pdf_timeout")), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(t);
    }
  }

  let idx = 0;
  const results = new Array(candidates.length);
  const n = Math.min(
    Math.max(1, concurrency),
    Math.max(1, candidates.length)
  );

  async function worker() {
    while (idx < candidates.length) {
      if (signal?.aborted) break;
      const i = idx++;
      const paper = candidates[i];
      try {
        const evs = await withTimeout(
          extractFullTextEvidence(paper, claim, decomposition, opts),
          perPdfTimeoutMs
        );
        results[i] = { paperId: paper.paperId, evs: evs || [] };
      } catch (e) {
        console.warn("[fullText]", paper.paperId, e.message);
        results[i] = { paperId: paper.paperId, evs: [] };
      }
    }
  }

  if (candidates.length) {
    await Promise.all(Array.from({ length: n }, () => worker()));
  }

  for (const r of results.filter(Boolean)) {
    if (r.evs?.length) {
      papersWithFullText.add(r.paperId);
      fullTextEvidence.push(...r.evs);
    }
  }

  return { fullTextEvidence, papersWithFullText };
}
