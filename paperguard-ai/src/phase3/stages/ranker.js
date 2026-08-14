import { embedText, cosine } from "../services/embeddings.js";

function tokens(s) {
  return new Set(
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function includesAny(text, list) {
  const t = (text || "").toLowerCase();
  return (list || []).some((x) => x && t.includes(String(x).toLowerCase()));
}

export function scorePaperHeuristic(paper, decomposition, claimText) {
  const blob = `${paper.title} ${paper.abstract}`;
  const semantic = jaccard(tokens(claimText), tokens(blob));
  const { method = [], baseline = [], dataset = [], metric = [] } = decomposition;
  const entityList = [...method, ...baseline, ...dataset, ...metric].filter(Boolean);
  const entityHits = entityList.filter((e) => includesAny(blob, [e]));
  const entityOverlap = entityHits.length / Math.max(1, entityList.length);
  const datasetMatch = includesAny(blob, dataset) ? 1 : 0;
  const metricMatch = includesAny(blob, metric) ? 1 : 0;
  const methodMatch =
    includesAny(blob, method) || includesAny(blob, baseline) ? 1 : 0;
  const year = paper.year || 2000;
  const recency = Math.min(1, Math.max(0, (year - 2015) / 10));
  const cites = Math.log(1 + (paper.citationCount || 0)) / Math.log(1 + 5000);
  const quality = 0.5 * recency + 0.5 * Math.min(1, cites);

  return { semantic, entityOverlap, datasetMatch, metricMatch, methodMatch, quality };
}

export async function rankPapers(
  papers,
  decomposition,
  claimText,
  topK = 10,
  { signal, useEmbeddings = true } = {}
) {
  let claimVec = null;
  if (useEmbeddings) {
    try {
      claimVec = await embedText(claimText, { signal });
    } catch {
      claimVec = null;
    }
  }

  const scored = [];
  for (const paper of papers) {
    if (signal?.aborted) break;
    const blob = `${paper.title}\n${paper.abstract || ""}`;
    const h = scorePaperHeuristic(paper, decomposition, claimText);

    let embSim = h.semantic;
    if (claimVec) {
      try {
        const pVec = await embedText(blob.slice(0, 4000), { signal });
        embSim = cosine(claimVec, pVec);
      } catch {
        /* keep heuristic */
      }
    }

    const relevanceScore =
      0.35 * embSim +
      0.25 * h.entityOverlap +
      0.15 * h.datasetMatch +
      0.1 * h.metricMatch +
      0.1 * h.methodMatch +
      0.05 * h.quality;

    scored.push({
      ...paper,
      relevanceScore,
      embeddingSim: embSim,
      entityOverlap: h.entityOverlap,
    });
  }

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return scored.slice(0, topK);
}

export function dedupePapers(papers) {
  const byKey = new Map();
  for (const p of papers) {
    const key = (p.arxivId || p.paperId || p.title || "")
      .toLowerCase()
      .slice(0, 120);
    const prev = byKey.get(key);
    if (!prev || (p.citationCount || 0) > (prev.citationCount || 0)) {
      byKey.set(key, p);
    }
  }
  const list = [...byKey.values()];
  const kept = [];
  for (const p of list) {
    const t = tokens(p.title);
    const dup = kept.some((k) => jaccard(tokens(k.title), t) >= 0.85);
    if (!dup) kept.push(p);
  }
  return kept;
}
