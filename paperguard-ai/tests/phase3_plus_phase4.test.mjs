/**
 * Combined Phase 3 + Phase 4 tests
 * Requires:
 *   src/phase3/**
 *   src/phase4/**
 *   tests/phase3.test.mjs
 *   tests/phase4.test.mjs
 *
 * Run:
 *   node tests/phase3_plus_phase4.test.mjs
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { buildPhase4ViewModel } from "../src/phase4/buildPhase4ViewModel.js";
import { createClaimRun, isClaimStale } from "../src/phase4/claimRunGuard.js";
import { runVerificationPipeline } from "../src/phase3/pipeline.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

function runNodeTest(relPath) {
  return new Promise((resolve) => {
    const child = spawn("node", [join(root, relPath)], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
      process.stdout.write(d);
    });
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("close", (code) => resolve({ code, out }));
  });
}

console.log("\n╔════════════════════════════════════════════╗");
console.log("║   COMBINED PHASE 3 + PHASE 4 TEST SUITE   ║");
console.log("╚════════════════════════════════════════════╝\n");

// A. Phase 3 suite
console.log("──────── A) PHASE 3 SUITE ────────");
const p3 = await runNodeTest("tests/phase3.test.mjs");
assert(p3.code === 0, "Phase 3 suite exit 0");
assert(/Passed:\s*\d+/i.test(p3.out), "Phase 3 printed pass count");
assert(!/Failed:\s*[1-9]/i.test(p3.out), "Phase 3 has 0 failures");

// B. Phase 4 suite
console.log("\n──────── B) PHASE 4 SUITE ────────");
const p4 = await runNodeTest("tests/phase4.test.mjs");
assert(p4.code === 0, "Phase 4 suite exit 0");
assert(/Passed:\s*\d+/i.test(p4.out), "Phase 4 printed pass count");
assert(!/Failed:\s*[1-9]/i.test(p4.out), "Phase 4 has 0 failures");

// C. Integration: Phase 3 result → Phase 4 view model
console.log("\n──────── C) INTEGRATION P3 → P4 ────────");

const claim = {
  id: "c-int",
  text: "ResNet-50 achieves higher accuracy than VGG-16 on ImageNet.",
  entities: {
    method: "ResNet-50",
    baseline: "VGG-16",
    dataset: "ImageNet",
    metric: "accuracy",
  },
};

const run = createClaimRun(claim);
assert(run.textHash, "run has textHash");
assert(isClaimStale(run, claim) === false, "run not stale for same claim");

const result = await runVerificationPipeline(claim, {
  useMock: true,
  provider: "mock",
  useEmbeddings: false,
});

assert(result.verdict, `P3 verdict=${result.verdict}`);
assert(Array.isArray(result.trace), "P3 trace array");
assert(result.conflictMap, "P3 conflictMap");

const vm = buildPhase4ViewModel(claim, result);
assert(vm != null, "P4 view model built");
assert(vm.verdict === result.verdict, "vm verdict matches P3");
assert(vm.verdictLabel, "vm has label");
assert(vm.scope, "vm has scope");
assert(vm.coverage, "vm has coverage");
assert(vm.strength?.bars >= 1, "vm has strength bars");
assert(vm.audit?.claimText === claim.text, "vm audit claim text");
assert(["green", "yellow", "red", "gray"].includes(vm.tone), `tone=${vm.tone}`);

if (result.verdict === "supported") {
  assert(vm.alternatives.length === 0, "no alts when supported");
  assert(vm.whyNot.show === false, "no whyNot when supported");
} else {
  assert(vm.whyNot.show === true, "whyNot for non-supported");
  assert(vm.alternatives.length >= 1, "alts for non-supported");
}

// stale after edit
assert(
  isClaimStale(run, { ...claim, text: claim.text + " (edited)" }) === true,
  "stale after text edit"
);

console.log(`   → P3 verdict=${result.verdict} → P4 tone=${vm.tone}`);

// Summary
console.log("\n╔════════════════════════════════════════════╗");
console.log("║              FINAL RESULTS                 ║");
console.log("╚════════════════════════════════════════════╝");
console.log(`Combined asserts Passed: ${passed}`);
console.log(`Combined asserts Failed: ${failed}`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\n✅ Phase 3 + Phase 4 combined testing PASSED.\n");
process.exit(0);
