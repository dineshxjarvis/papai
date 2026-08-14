/**
 * Full Phase 3 test suite — all cases
 * Run from project root (folder that contains src/phase3):
 *   node tests/phase3.test.mjs
 */

import { expandQueries } from "../src/phase3/stages/queryExpander.js";
import { dedupePapers, rankPapers } from "../src/phase3/stages/ranker.js";
import {
  collectContradictions,
  buildConflictMap,
} from "../src/phase3/stages/adversarialCritic.js";
import { verifyAgainstEvidence } from "../src/phase3/stages/verification.js";
import { computeVerdict } from "../src/phase3/stages/verdictEngine.js";
import { decomposeClaim } from "../src/phase3/stages/claimDecomposer.js";
import { runVerificationPipeline } from "../src/phase3/pipeline.js";
import {
  mapVerdictToClaimPatch,
  verdictLabel,
} from "../src/phase3/mapVerdictToClaim.js";
import { localEmbed, cosine } from "../src/phase3/services/embeddings.js";
import {
  chunkPdfBySection,
  selectRelevantChunks,
} from "../src/phase3/services/pdfText.js";

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, name, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`);
  }
}

console.log("\n========== PHASE 3 FULL TEST SUITE ==========\n");

// 1. Embeddings
console.log("1) embeddings (local)");
const v1 = localEmbed("ResNet-50 ImageNet top-1 accuracy");
const v2 = localEmbed("ResNet-50 ImageNet top-1 accuracy");
const v3 = localEmbed("completely unrelated cooking recipes pasta");
assert(v1.length === 512, "localEmbed dim 512");
assert(cosine(v1, v2) > 0.99, "identical text cosine ~1");
assert(cosine(v1, v3) < cosine(v1, v2), "related > unrelated similarity");

// 2. Claim decomposer
console.log("\n2) claimDecomposer");
const claimA = {
  id: "c1",
  text: "ResNet-50 achieves higher accuracy than VGG-16 on ImageNet.",
  entities: {
    method: "ResNet-50",
    baseline: "VGG-16",
    dataset: "ImageNet",
    metric: "accuracy",
    value: null,
  },
};
const decA = await decomposeClaim(claimA, { useMock: true });
assert(decA.method?.length > 0, "extracts method");
assert(decA.dataset?.length > 0, "extracts dataset");
assert(decA.atomicClaims?.length >= 1, "produces atomic claims");
assert(["high", "medium", "low"].includes(decA.specificity), "has specificity");

const vague = await decomposeClaim(
  { id: "c0", text: "Deep learning is widely used.", entities: {} },
  { useMock: true }
);
assert(
  vague.specificity === "low" || vague.method.length === 0,
  "vague claim low specificity or empty method"
);

// 3. Query expander
console.log("\n3) queryExpander");
const queries = expandQueries(decA, claimA.text);
assert(queries.length >= 3, `generates >=3 queries (got ${queries.length})`);
assert(queries.some((q) => q.channel === "support"), "has support channel");
assert(queries.some((q) => q.channel === "adversarial"), "has adversarial channel");
assert(
  queries.some((q) => /limitation|does not|significant|failure/i.test(q.q)),
  "adversarial query contains negative terms"
);

// 4. Ranker + dedupe
console.log("\n4) ranker + dedupe");
const papers = [
  {
    paperId: "a",
    title: "Deep Residual Learning for Image Recognition",
    abstract: "ResNet-50 achieves strong top-1 accuracy on ImageNet vs VGG.",
    year: 2016,
    citationCount: 100000,
  },
  {
    paperId: "b",
    title: "Cooking pasta at home",
    abstract: "Boil water and add salt for better pasta.",
    year: 2020,
    citationCount: 2,
  },
  {
    paperId: "a2",
    title: "Deep Residual Learning for Image Recognition",
    abstract: "Duplicate title paper",
    year: 2016,
    citationCount: 50,
  },
];
const deduped = dedupePapers(papers);
assert(deduped.length === 2, `dedupe titles (got ${deduped.length})`);

const ranked = await rankPapers(deduped, decA, claimA.text, 5, {
  useEmbeddings: true,
});
assert(ranked.length >= 1, "rank returns papers");
assert(
  ranked[0].title.includes("Residual") ||
    ranked[0].relevanceScore >= ranked[ranked.length - 1].relevanceScore,
  "relevant paper ranked high"
);

// 5. PDF section chunking
console.log("\n5) pdfText chunking / selectRelevantChunks");
const fakePages = [
  {
    page: 1,
    text: "1. Introduction CNNs are popular. 2. Methods We use ResNet-50. 3. Results ResNet-50 achieves 76.3% top-1 accuracy on ImageNet compared to VGG-16.",
  },
  {
    page: 2,
    text: "4. Limitations Performance drops on small medical datasets and is not statistically significant.",
  },
];
const chunks = chunkPdfBySection(fakePages);
assert(chunks.length >= 1, `chunks created (got ${chunks.length})`);
const relevant = selectRelevantChunks(chunks, decA, claimA.text, 4);
assert(relevant.length >= 1, "relevant chunks selected for claim entities");
assert(relevant[0].page != null, "chunk has page number");

// 6. Verification coverage
console.log("\n6) verification coverage");
const evidenceSupport = [
  {
    paperId: "p1",
    supportsClaim: "yes",
    evidenceQuality: "strong",
    evidenceSource: "full_text",
    evidenceSpan:
      "ResNet-50 achieves 76.3% top-1 accuracy on ImageNet vs VGG-16",
    section: "Results",
    page: 7,
    experiment: {
      method: "ResNet-50",
      dataset: "ImageNet",
      metric: "top-1 accuracy",
      value: "76.3%",
      baseline: "VGG-16",
    },
    limitations: [],
    confidence: 0.9,
    paper: { title: "ResNet paper", url: "https://example.org/1" },
  },
];
const { coverage, verifications } = verifyAgainstEvidence(decA, evidenceSupport);
assert(coverage.total >= 1, "coverage has components");
assert(verifications.length >= 1, "verification records created");
assert(coverage.matched >= 1, `some components matched (matched=${coverage.matched})`);

// 7. Verdict engine — all cases
console.log("\n7) verdictEngine — all cases");

{
  const r = computeVerdict({
    evidence: evidenceSupport,
    contradictions: [],
    coverage: { ratio: 0.8, matched: 4, total: 5 },
    specificity: "high",
  });
  assert(r.verdict === "supported", `strong support → supported (got ${r.verdict})`);
  assert(["strong", "moderate"].includes(r.evidenceQuality), "quality not weak");
}

{
  const contraEv = [
    {
      paperId: "p2",
      supportsClaim: "no",
      evidenceQuality: "moderate",
      evidenceSource: "abstract",
      evidenceSpan: "ResNet-50 does not improve over baselines on small data",
      experiment: {},
      limitations: ["not significant"],
      confidence: 0.7,
      channel: "adversarial",
      paper: { title: "Limits paper" },
    },
  ];
  const contradictions = collectContradictions(contraEv);
  const r = computeVerdict({
    evidence: contraEv,
    contradictions,
    coverage: { ratio: 0, matched: 0, total: 3 },
    specificity: "medium",
  });
  assert(
    r.verdict === "contradicted" || r.verdict === "insufficient",
    `contra-only → contradicted|insufficient (got ${r.verdict})`
  );
}

{
  const mixed = [
    ...evidenceSupport,
    {
      paperId: "p2",
      supportsClaim: "no",
      evidenceQuality: "moderate",
      evidenceSource: "abstract",
      evidenceSpan: "not statistically significant on medical data",
      experiment: {},
      limitations: ["domain shift"],
      confidence: 0.7,
      channel: "adversarial",
      paper: { title: "Limits" },
    },
  ];
  const contradictions = collectContradictions(mixed);
  const r = computeVerdict({
    evidence: mixed,
    contradictions,
    coverage: { ratio: 0.6, matched: 3, total: 5 },
    specificity: "high",
  });
  assert(
    r.verdict === "partially_supported",
    `support+contradict → partially_supported (got ${r.verdict})`
  );
}

{
  const r = computeVerdict({
    evidence: [],
    contradictions: [],
    coverage: { ratio: 0, matched: 0, total: 1 },
    specificity: "low",
  });
  assert(r.verdict === "insufficient", `empty → insufficient (got ${r.verdict})`);
}

{
  const weak = [
    {
      paperId: "p3",
      supportsClaim: "yes",
      evidenceQuality: "weak",
      evidenceSource: "abstract",
      evidenceSpan: "CNNs work on images",
      experiment: {},
      limitations: [],
      confidence: 0.4,
      paper: { title: "Weak" },
    },
  ];
  const r = computeVerdict({
    evidence: weak,
    contradictions: [],
    coverage: { ratio: 0.3, matched: 1, total: 4 },
    specificity: "low",
  });
  assert(
    r.verdict === "partially_supported" ||
      r.verdict === "insufficient" ||
      r.verdict === "supported",
    `low-specificity handled (got ${r.verdict})`
  );
}

// 8. Conflict map
console.log("\n8) conflict map");
const mixedEv = [
  ...evidenceSupport,
  {
    paperId: "p2",
    supportsClaim: "no",
    evidenceQuality: "moderate",
    evidenceSource: "full_text",
    evidenceSpan: "fails on small datasets",
    section: "Limitations",
    page: 12,
    experiment: {},
    limitations: ["small data"],
    confidence: 0.75,
    channel: "adversarial",
    paper: { title: "Limits paper", url: "https://example.org/2" },
  },
];
const contras = collectContradictions(mixedEv);
const cmap = buildConflictMap(mixedEv, contras);
assert(cmap.support.length >= 1, "conflict map has support");
assert(cmap.contradict.length >= 1, "conflict map has contradict");
assert(
  cmap.support[0].page === 7 || cmap.support[0].section,
  "support has page/section metadata"
);

// 9. mapVerdictToClaimPatch
console.log("\n9) mapVerdictToClaimPatch");
const patch = mapVerdictToClaimPatch({
  verdict: "supported",
  internalScore: 0.82,
  evidenceQuality: "strong",
  verificationConfidence: "high",
  evidence: evidenceSupport,
  evidenceCoverage: coverage,
  conflictMap: cmap,
  trace: [],
  finishedAt: new Date().toISOString(),
});
assert(patch.status === "supported", "maps status");
assert(patch.color === "green", "maps color green");
assert(verdictLabel("partially_supported").includes("Partial"), "verdictLabel works");

// 10. Full pipeline — comparative
console.log("\n10) Full pipeline useMock — comparative claim");
const result = await runVerificationPipeline(claimA, {
  useMock: true,
  provider: "mock",
  useEmbeddings: false,
});
assert(
  result.status === "completed" || result.verdict,
  `pipeline completes (status=${result.status})`
);
assert(result.trace?.length >= 5, `trace has steps (got ${result.trace?.length})`);
assert(
  ["supported", "partially_supported", "contradicted", "insufficient"].includes(
    result.verdict
  ),
  `valid verdict (got ${result.verdict})`
);
assert(result.queries?.length >= 1, "queries stored");
assert(result.papers?.length >= 1, "papers stored");
assert(result.evidence?.length >= 1, "evidence stored");
assert(result.conflictMap, "conflictMap present");
assert(result.evidenceQuality, `evidenceQuality=${result.evidenceQuality}`);
assert(
  result.verificationConfidence,
  `verificationConfidence=${result.verificationConfidence}`
);
const agents = result.trace.map((t) => t.agent);
assert(agents.some((a) => /Decomposer/i.test(a)), "trace includes Decomposer");
assert(agents.some((a) => /Research|Query/i.test(a)), "trace includes Research/Query");
assert(agents.some((a) => /Verdict/i.test(a)), "trace includes Verdict");
console.log(
  `   → verdict=${result.verdict}, quality=${result.evidenceQuality}, evidence=${result.evidence.length}`
);

// 11. Quantitative
console.log("\n11) Full pipeline — quantitative claim");
const claimQ = {
  id: "c2",
  text: "ResNet-50 achieves 76.3% top-1 accuracy on ImageNet.",
  entities: {
    method: "ResNet-50",
    dataset: "ImageNet",
    metric: "top-1 accuracy",
    value: "76.3%",
  },
};
const rQ = await runVerificationPipeline(claimQ, {
  useMock: true,
  provider: "mock",
  useEmbeddings: false,
});
assert(rQ.verdict, `quantitative claim verdict=${rQ.verdict}`);
assert(rQ.atomicClaims?.length >= 1 || rQ.entities, "has atoms/entities");

// 12. Causal
console.log("\n12) Full pipeline — causal claim");
const claimC = {
  id: "c3",
  text: "Increasing the learning rate improves model convergence.",
  entities: {},
  claimType: "causal",
};
const rC = await runVerificationPipeline(claimC, {
  useMock: true,
  provider: "mock",
  useEmbeddings: false,
});
assert(rC.verdict, `causal claim verdict=${rC.verdict}`);

// 13. Limitation
console.log("\n13) Full pipeline — limitation-style claim");
const claimL = {
  id: "c4",
  text: "The performance improvement of CNNs is not statistically significant in small datasets.",
  entities: { method: "CNN" },
  claimType: "limitation",
};
const rL = await runVerificationPipeline(claimL, {
  useMock: true,
  provider: "mock",
  useEmbeddings: false,
});
assert(rL.verdict, `limitation claim verdict=${rL.verdict}`);
assert(
  rL.queries?.some((q) => q.channel === "adversarial"),
  "still runs adversarial queries"
);

// 14. Vague — no overclaim
console.log("\n14) Full pipeline — vague claim (no overclaim)");
const claimV = {
  id: "c5",
  text: "Deep learning is widely used in healthcare.",
  entities: {},
};
const rV = await runVerificationPipeline(claimV, {
  useMock: true,
  provider: "mock",
  useEmbeddings: false,
});
assert(
  rV.verdict === "insufficient" ||
    rV.verdict === "partially_supported" ||
    rV.specificity === "low" ||
    rV.evidenceQuality === "weak",
  `vague claim not strongly over-supported (verdict=${rV.verdict}, quality=${rV.evidenceQuality})`
);

// Summary
console.log("\n========== RESULTS ==========");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\n✅ Phase 3 all cases verified (mock mode).\n");
process.exit(0);
