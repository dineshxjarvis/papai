import { createEmptyVerificationState, pushTrace } from "./types.js";
import { decomposeClaim } from "./stages/claimDecomposer.js";
import { expandQueries } from "./stages/queryExpander.js";
import { searchSemanticScholar } from "./services/semanticScholar.js";
import { searchArxiv } from "./services/arxiv.js";
import { dedupePapers, rankPapers } from "./stages/ranker.js";
import { extractEvidenceBatch } from "./stages/evidenceExtractor.js";
import { enrichWithFullText } from "./stages/fullTextEvidence.js";
import {
  collectContradictions,
  buildConflictMap,
} from "./stages/adversarialCritic.js";
import { verifyAgainstEvidence } from "./stages/verification.js";
import { computeVerdict } from "./stages/verdictEngine.js";

export async function runVerificationPipeline(claim, options = {}) {
  const {
    signal,
    provider = "auto",
    useMock = false,
    onProgress,
    topK = 10,
    topFullText = 3,
    useEmbeddings = true,
  } = options;

  const state = createEmptyVerificationState(claim);
  state.status = "running";

  const progress = (agent, detail) => {
    pushTrace(state, agent, "running", detail);
    onProgress?.({ agent, status: "running", detail, trace: state.trace });
  };
  const done = (agent, detail) => {
    pushTrace(state, agent, "completed", detail);
    onProgress?.({ agent, status: "completed", detail, trace: state.trace });
  };
  const fail = (agent, detail) => {
    pushTrace(state, agent, "error", detail);
    state.errors.push({ agent, detail });
    onProgress?.({ agent, status: "error", detail, trace: state.trace });
  };

  try {
    progress("Claim Decomposer", "Decomposing claim into atoms…");
    const decomposition = await decomposeClaim(claim, {
      signal,
      provider,
      useMock,
    });
    state.entities = {
      method: decomposition.method,
      baseline: decomposition.baseline,
      dataset: decomposition.dataset,
      metric: decomposition.metric,
      value: decomposition.value,
      polarity: decomposition.polarity,
      relationship: decomposition.relationship,
    };
    state.atomicClaims = decomposition.atomicClaims;
    state.specificity = decomposition.specificity;
    done(
      "Claim Decomposer",
      `specificity=${decomposition.specificity}; atoms=${decomposition.atomicClaims.length}`
    );

    progress("Query Expander", "Building support + adversarial queries…");
    const queries = expandQueries(decomposition, claim.text);
    state.queries = queries;
    done("Query Expander", `Generated ${queries.length} queries`);

    progress("Research Agent", "Retrieving from Semantic Scholar + arXiv…");
    let papers = [];
    if (!useMock && queries.length) {
      const concurrency = 3;
      let qIdx = 0;
      const bags = new Array(queries.length);

      async function retrieveWorker() {
        while (qIdx < queries.length) {
          if (signal?.aborted) break;
          const i = qIdx++;
          const { q, channel } = queries[i];
          const found = [];
          try {
            const s2 = await searchSemanticScholar(q, {
              limit: 5,
              signal,
            }).catch((e) => {
              state.errors.push({
                agent: "Research Agent",
                detail: `S2: ${e.message}`,
              });
              return [];
            });
            s2.forEach((p) => {
              p._channel = channel;
              found.push(p);
            });
          } catch (e) {
            state.errors.push({
              agent: "Research Agent",
              detail: `S2: ${e.message}`,
            });
          }
          try {
            const ax = await searchArxiv(q, { limit: 3, signal }).catch((e) => {
              state.errors.push({
                agent: "Research Agent",
                detail: `arXiv: ${e.message}`,
              });
              return [];
            });
            ax.forEach((p) => {
              p._channel = channel;
              found.push(p);
            });
          } catch (e) {
            state.errors.push({
              agent: "Research Agent",
              detail: `arXiv: ${e.message}`,
            });
          }
          bags[i] = found;
        }
      }

      const n = Math.min(concurrency, queries.length);
      await Promise.all(Array.from({ length: n }, () => retrieveWorker()));
      for (const bag of bags) {
        if (bag?.length) papers.push(...bag);
      }
    }

    if (useMock || papers.length === 0) {
      papers = mockPapersForClaim(claim, decomposition);
    }

    papers = dedupePapers(papers);
    done("Research Agent", `${papers.length} papers after fetch/dedup`);

    progress("Relevance Ranker", "Embedding similarity + entity scoring…");
    const ranked = await rankPapers(papers, decomposition, claim.text, topK, {
      signal,
      useEmbeddings: useEmbeddings && !useMock,
    });
    state.papers = ranked;
    done(
      "Relevance Ranker",
      `Top ${ranked.length} selected (embeddings=${useEmbeddings && !useMock})`
    );

    progress("Evidence Extractor", "Full-text PDF extraction (top papers)…");
    let fullTextEvidence = [];
    let papersWithFullText = new Set();
    if (!useMock) {
      try {
        const ft = await enrichWithFullText(ranked, claim, decomposition, {
          signal,
          provider,
          useMock,
          topFullText,
        });
        fullTextEvidence = ft.fullTextEvidence;
        papersWithFullText = ft.papersWithFullText;
      } catch (e) {
        state.errors.push({
          agent: "Evidence Extractor",
          detail: `full-text: ${e.message}`,
        });
      }
    }
    done(
      "Evidence Extractor",
      `Full-text spans: ${fullTextEvidence.length} from ${papersWithFullText.size} papers`
    );

    progress("Evidence Extractor", "Abstract evidence extraction…");
    const needAbstract = ranked.filter((p) => !papersWithFullText.has(p.paperId));
    const abstractEvidence = await extractEvidenceBatch(
      needAbstract.length ? needAbstract : ranked,
      claim,
      decomposition,
      { signal, provider, useMock }
    );
    const evidence = [...fullTextEvidence, ...abstractEvidence];
    state.evidence = evidence;
    done(
      "Evidence Extractor",
      `Total evidence: ${evidence.length} (full_text=${fullTextEvidence.length}, abstract=${abstractEvidence.length})`
    );

    progress("Adversarial Critic", "Collecting contradictions…");
    const contradictions = collectContradictions(evidence);
    state.contradictions = contradictions;
    state.conflictMap = buildConflictMap(evidence, contradictions);
    done("Adversarial Critic", `${contradictions.length} contradiction signals`);

    progress("Verification", "Checking atomic coverage + constraints…");
    const { coverage, verifications } = verifyAgainstEvidence(
      decomposition,
      evidence
    );
    state.evidenceCoverage = coverage;
    state.verifications = verifications;
    done(
      "Verification",
      `coverage ${coverage.matched}/${coverage.total} components`
    );

    progress("Verdict Engine", "Applying verdict policy…");
    const verdictResult = computeVerdict({
      evidence,
      contradictions,
      coverage,
      specificity: decomposition.specificity,
    });
    state.verdict = verdictResult.verdict;
    state.evidenceQuality = verdictResult.evidenceQuality;
    state.verificationConfidence = verdictResult.verificationConfidence;
    state.internalScore = verdictResult.internalScore;
    state.verdictReasons = verdictResult.reasons;
    done(
      "Verdict Engine",
      `${verdictResult.verdict} (${verdictResult.evidenceQuality})`
    );

    state.status = "completed";
    state.finishedAt = new Date().toISOString();
    return state;
  } catch (err) {
    fail("Orchestrator", err.message);
    state.status = "failed";
    state.finishedAt = new Date().toISOString();
    state.verdict = state.verdict || "insufficient";
    state.evidenceQuality = state.evidenceQuality || "weak";
    state.verificationConfidence = "low";
    return state;
  }
}

function mockPapersForClaim(claim, decomposition) {
  const m = decomposition.method[0] || "ResNet-50";
  const d = decomposition.dataset[0] || "ImageNet";
  const b = decomposition.baseline[0] || "VGG-16";
  return [
    {
      paperId: "mock-he2016",
      title: "Deep Residual Learning for Image Recognition",
      abstract: `${m} achieves strong results on ${d}. Compared with ${b}, residual networks reach higher top-1 accuracy under standard evaluation.`,
      year: 2016,
      citationCount: 150000,
      url: "https://arxiv.org/abs/1512.03385",
      pdfUrl: "https://arxiv.org/pdf/1512.03385.pdf",
      venue: "CVPR",
      source: "mock",
      _channel: "support",
    },
    {
      paperId: "mock-limit",
      title: "Limitations of Deep CNNs on Small Medical Datasets",
      abstract: `We find that ${m} does not significantly outperform stronger baselines on small medical datasets. Gains are not statistically significant.`,
      year: 2021,
      citationCount: 80,
      url: "https://example.org/mock-limit",
      pdfUrl: null,
      venue: "Workshop",
      source: "mock",
      _channel: "adversarial",
    },
  ];
}
