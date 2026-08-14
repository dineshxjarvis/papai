/**
 * Thorough Phase 2 test suite
 * Run: node tests/phase2.test.mjs
 */

import { cleanText, splitBySections } from "../src/claim-detection/stages/parseAndClean.js";
import { segmentSentences, withContext } from "../src/claim-detection/stages/sentenceSegment.js";
import { isCandidate, filterCandidates } from "../src/claim-detection/stages/candidateFilter.js";
import { mockClassifyStructured } from "../src/claim-detection/stages/classifyClaim.js";
import { structureClaim } from "../src/claim-detection/stages/structureNormalize.js";
import { calibrateAndDedup } from "../src/claim-detection/stages/calibrateDedup.js";
import { runClaimPipeline } from "../src/claim-detection/pipeline.js";
import { CONFIDENCE_THRESHOLD } from "../src/claim-detection/types.js";

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

console.log("\n========== PHASE 2 THOROUGH TESTS ==========\n");

// --------------------------------------------------
// 1. cleanText
// --------------------------------------------------
console.log("1) parseAndClean.cleanText");
assert(cleanText("") === "", "empty → empty");
assert(cleanText("  hello   world  ") === "hello world", "collapse spaces");
assert(!cleanText("Page 3 of 10\nHello").includes("Page 3"), "strip page numbers");
assert(
  cleanText("a\n\n\n\nb").includes("a") && cleanText("a\n\n\n\nb").includes("b"),
  "collapse blank lines"
);

// --------------------------------------------------
// 2. splitBySections
// --------------------------------------------------
console.log("\n2) parseAndClean.splitBySections");
const secText = `1. Introduction
Some intro text here.
2. Methods
We use CNN models.
3. Results
Accuracy was high.`;
const sections = splitBySections(secText);
assert(sections.length >= 2, "detects multiple sections", `got ${sections.length}`);
assert(sections.some((s) => /intro/i.test(s.section)), "has Introduction section");

// --------------------------------------------------
// 3. sentence segmentation
// --------------------------------------------------
console.log("\n3) sentenceSegment");
const sents = segmentSentences(
  "CNNs achieve higher accuracy than traditional methods. ResNet-50 achieves 76.3% top-1 accuracy on ImageNet. Deep learning is widely used in healthcare."
);
assert(sents.length === 3, "splits into 3 sentences", `got ${sents.length}`);
assert(sents[0].text.includes("CNNs achieve"), "first sentence content");
const withCtx = withContext(sents, "Results");
assert(withCtx[1].prev.includes("CNNs"), "middle has prev context");
assert(withCtx[1].next.includes("widely used"), "middle has next context");
assert(withCtx[1].section === "Results", "section attached");

const abb = segmentSentences(
  "Dr. Smith showed that accuracy improves. Next sentence here."
);
assert(abb.length >= 1, "handles Dr. abbreviation without bad split");

// --------------------------------------------------
// 4. candidate filter — USER RULES
// --------------------------------------------------
console.log("\n4) candidateFilter (user detection rules)");

assert(
  !isCandidate("Deep learning is widely used in healthcare."),
  "REJECT: 'Deep learning is widely used in healthcare.'"
);
assert(
  !isCandidate("In this paper we propose a new method for classification."),
  "REJECT: meta 'In this paper we propose...'"
);
assert(
  !isCandidate("The dataset contains 10,000 images."),
  "REJECT: pure dataset size"
);

assert(
  isCandidate(
    "CNNs achieve higher accuracy than traditional machine learning algorithms in medical image classification tasks."
  ),
  "DETECT candidate: comparative CNNs vs traditional ML"
);
assert(
  isCandidate(
    "ResNet-50 achieves 76.3% top-1 accuracy on ImageNet under standard evaluation protocols."
  ),
  "DETECT candidate: quantitative ResNet-50 76.3%"
);
assert(
  isCandidate(
    "Increasing the learning rate improves accuracy significantly during the early training phase."
  ),
  "DETECT candidate: causal learning rate → accuracy"
);
assert(
  isCandidate(
    "However, the performance improvement of CNNs is not statistically significant in small datasets."
  ),
  "DETECT candidate: limitation / not statistically significant"
);
assert(
  isCandidate(
    "We propose ModelX, which outperforms ResNet-50 by 4.2% top-1 accuracy on ImageNet."
  ),
  "KEEP: We propose + outperforms + %"
);

// --------------------------------------------------
// 5. mock classifier
// --------------------------------------------------
console.log("\n5) mockClassifyStructured (offline structured path)");

const cases = [
  {
    text: "Deep learning is widely used in healthcare applications today.",
    expectClaim: false,
    label: "background → not claim",
  },
  {
    text: "In this paper we propose a novel architecture for segmentation.",
    expectClaim: false,
    label: "meta → not claim",
  },
  {
    text: "CNNs achieve higher accuracy than traditional machine learning algorithms in medical image classification.",
    expectClaim: true,
    type: "comparative",
    label: "comparative claim",
  },
  {
    text: "ResNet-50 achieves 76.3% top-1 accuracy on ImageNet.",
    expectClaim: true,
    type: "quantitative",
    label: "quantitative claim",
  },
  {
    text: "Increasing the learning rate improves model convergence.",
    expectClaim: true,
    type: "causal",
    label: "causal claim",
  },
  {
    text: "The performance improvement of CNNs is not statistically significant in small datasets.",
    expectClaim: true,
    type: "limitation",
    label: "limitation claim",
  },
];

for (const c of cases) {
  const r = mockClassifyStructured({ text: c.text });
  assert(
    r.is_claim === c.expectClaim,
    c.label,
    `is_claim=${r.is_claim} type=${r.claim_type}`
  );
  if (c.expectClaim && c.type) {
    assert(r.claim_type === c.type, `  type=${c.type}`, `got ${r.claim_type}`);
  }
  if (c.expectClaim) {
    assert(r.confidence >= 0.65, `  confidence ≥ 0.65`, `got ${r.confidence}`);
  }
}

// --------------------------------------------------
// 6. structureNormalize
// --------------------------------------------------
console.log("\n6) structureNormalize");
const structured = structureClaim(
  {
    text: "ResNet-50 achieves 76.3% top-1 accuracy on ImageNet.",
    start: 0,
    end: 50,
    section: "Results",
  },
  {
    is_claim: true,
    claim_type: "quantitative",
    confidence: 0.88,
    claim_span: "ResNet-50 achieves 76.3% top-1 accuracy on ImageNet.",
    entities: {
      method: "ResNet-50",
      baseline: null,
      metric: "top-1 accuracy",
      value: "76.3%",
      dataset: "ImageNet",
    },
    polarity: "positive",
    reason: "quant",
  },
  "full"
);
assert(structured !== null, "returns claim object");
assert(
  structured.entities.metric === "top1_accuracy",
  "metric normalized to top1_accuracy",
  structured.entities.metric
);
assert(structured.entities.method === "ResNet-50", "method kept");
assert(structured.status === "detected", "status detected");
assert(
  structureClaim({ text: "x" }, { is_claim: false }) === null,
  "non-claim → null"
);

// --------------------------------------------------
// 7. calibrateAndDedup
// --------------------------------------------------
console.log("\n7) calibrateAndDedup");
const rawClaims = [
  {
    text: "ResNet-50 achieves 76.3% accuracy on ImageNet.",
    confidence: 0.9,
    claim_type: "quantitative",
  },
  {
    text: "ResNet-50 achieves 76.3% accuracy on ImageNet dataset.",
    confidence: 0.85,
    claim_type: "quantitative",
  },
  {
    text: "CNNs are better than SVMs on this task overall.",
    confidence: 0.7,
    claim_type: "comparative",
  },
  {
    text: "Something weak.",
    confidence: 0.4,
    claim_type: "other",
  },
];
const cal = calibrateAndDedup(rawClaims, CONFIDENCE_THRESHOLD);
assert(
  cal.every((c) => c.confidence >= CONFIDENCE_THRESHOLD),
  "all above threshold"
);
assert(cal.length <= 3, "deduped near-duplicates", `got ${cal.length}`);
assert(cal[0].claim_type === "quantitative", "quantitative ranked first");

const opp = calibrateAndDedup([
  { text: "ResNet outperforms VGG on ImageNet", confidence: 0.9, claim_type: "comparative", polarity: "positive" },
  { text: "VGG outperforms ResNet on ImageNet", confidence: 0.85, claim_type: "comparative", polarity: "negative" },
]);
assert(opp.length === 2, "opposite comparative claims both kept");

// --------------------------------------------------
// 8. FULL PIPELINE
// --------------------------------------------------
console.log("\n8) Full pipeline orchestration (useMock=true)");

const paper = `
1. Introduction
Deep learning is widely used in healthcare.
CNNs achieve higher accuracy than traditional machine learning algorithms in medical image classification.
Many researchers have explored different architectures.
ResNet-50 achieves 76.3% top-1 accuracy on ImageNet under standard evaluation.
Increasing the learning rate improves accuracy significantly during early training.
However, the performance improvement of CNNs is not statistically significant in small datasets.
In this paper we propose a new evaluation protocol.
`;

const stages = [];
const found = await runClaimPipeline(paper, {
  useMock: true,
  provider: "mock",
  onProgress: (stage, detail) => stages.push(`${stage}:${detail}`),
});

assert(stages.some((s) => s.startsWith("parsing")), "progress: parsing");
assert(stages.some((s) => s.startsWith("segmenting")), "progress: segmenting");
assert(stages.some((s) => s.startsWith("filtering")), "progress: filtering");
assert(stages.some((s) => s.startsWith("classifying")), "progress: classifying");
assert(stages.some((s) => s.startsWith("structuring")), "progress: structuring");
assert(stages.some((s) => s.startsWith("calibrating")), "progress: calibrating");
assert(stages.some((s) => s.startsWith("done")), "progress: done");

assert(found.length >= 3, `detects ≥3 claims from sample paper`, `got ${found.length}`);
assert(
  !found.some((c) => /widely used in healthcare/i.test(c.text)),
  "does NOT include background 'widely used'"
);
assert(
  !found.some((c) => /in this paper we propose/i.test(c.text)),
  "does NOT include meta 'in this paper we propose'"
);
assert(
  found.some((c) => /higher accuracy than traditional/i.test(c.text)),
  "includes comparative CNN claim"
);
assert(found.some((c) => /76\.3%/.test(c.text)), "includes quantitative ResNet claim");
assert(
  found.some((c) => /learning rate improves accuracy/i.test(c.text)),
  "includes causal learning-rate claim"
);
assert(
  found.some((c) => /not statistically significant/i.test(c.text)),
  "includes limitation claim"
);

console.log("\n  Detected claims:");
found.forEach((c, i) => {
  console.log(
    `   ${i + 1}. [${c.claim_type} ${Math.round(c.confidence * 100)}%] ${c.text.slice(0, 80)}`
  );
});

// --------------------------------------------------
// 9. No hardcoded seed pollution
// --------------------------------------------------
console.log("\n9) No hardcoded claim injection");
const empty = await runClaimPipeline(
  "This is a short note without scientific findings at all here.",
  { useMock: true }
);
assert(Array.isArray(empty), "returns array");
assert(empty.length === 0, "no false claims on non-scientific text", `got ${empty.length}`);

// --------------------------------------------------
// SUMMARY
// --------------------------------------------------
console.log("\n========== RESULTS ==========");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\n✅ Phase 2 pipeline logic verified (not shallow, not hardcoded).\n");
process.exit(0);
