import { buildPhase4ViewModel } from "../src/phase4/buildPhase4ViewModel.js";
import { createClaimRun, isClaimStale, hashClaimText } from "../src/phase4/claimRunGuard.js";
import { suggestAlternatives } from "../src/phase4/suggestAlternatives.js";

let passed = 0;
let failed = 0;

function assert(cond, name, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`);
  }
}

console.log("\n========== PHASE 4 TEST SUITE ==========\n");

// 1. Hash & Run Guard
console.log("1) claimRunGuard");
const claim1 = { id: "c1", text: "ResNet-50 achieves 76.3% top-1 accuracy on ImageNet." };
const run1 = createClaimRun(claim1);
assert(run1.claimId === "c1", "runId has claimId");
assert(!isClaimStale(run1, claim1), "same text is not stale");
const claim1Edited = { id: "c1", text: "ResNet-50 achieves 80.0% top-1 accuracy on ImageNet." };
assert(isClaimStale(run1, claim1Edited), "edited text detected as stale");

// 2. ViewModel Build
console.log("\n2) buildPhase4ViewModel");
const mockResult = {
  verdict: "partially_supported",
  evidenceQuality: "moderate",
  verificationConfidence: "medium",
  papers: [{ paperId: "p1", title: "Paper 1", url: "https://arxiv.org/abs/2308.0001" }],
  evidence: [
    {
      paperId: "p1",
      supportsClaim: "yes",
      evidenceQuality: "moderate",
      evidenceSource: "full_text",
      evidenceSpan: "ResNet-50 achieves 76.3% top-1 accuracy on ImageNet.",
      paper: { title: "Paper 1", url: "https://arxiv.org/abs/2308.0001" },
    },
    {
      paperId: "p2",
      supportsClaim: "no",
      channel: "adversarial",
      evidenceQuality: "weak",
      evidenceSource: "abstract",
      evidenceSpan: "Performance improvement of ResNet-50 is not statistically significant.",
      paper: { title: "Paper 2", url: "https://example.org/p2" },
    },
  ],
  entities: { method: "ResNet-50", dataset: "ImageNet", metric: "accuracy", value: "76.3%" },
  evidenceCoverage: { matched: 3, total: 4, ratio: 0.75 },
  atomicClaims: ["ResNet-50 on ImageNet"],
  queries: [{ q: "ResNet-50 ImageNet", channel: "support" }, { q: "ResNet-50 limitations", channel: "adversarial" }],
  trace: [{ agent: "Adversarial Critic", status: "completed", detail: "found limitations" }],
};

const vm = buildPhase4ViewModel(claim1, mockResult);
assert(vm !== null, "view model generated");
assert(vm.verdictLabel === "PARTIALLY SUPPORTED", "verdict label mapped");
assert(vm.tone === "yellow", "tone mapped to yellow");
assert(vm.scope.papersAnalyzed === 1, "papersAnalyzed count");
assert(vm.scope.fullText === 1, "fullText count");
assert(vm.scope.supporting === 1, "supporting count");
assert(vm.scope.contradicting === 1, "contradicting count");
assert(vm.strength.level === "Moderate", "strength level");
assert(vm.strength.bars === 6, "strength bars count");
assert(vm.whyNot.show === true, "whyNot show true for partial support");
assert(vm.whyNot.bullets.length > 0, "whyNot bullets populated");
assert(vm.support.length === 1, "support list mapped");
assert(vm.contradict.length === 1, "contradict list mapped");

// 3. Alternatives
console.log("\n3) suggestAlternatives");
const alts = suggestAlternatives(claim1, mockResult);
assert(alts.length >= 2, "suggested alternative re-wordings generated");
assert(alts[0].label === "Safer wording", "has safer wording option");

console.log(`\n========== RESULTS ==========`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}\n`);

if (failed > 0) process.exit(1);
