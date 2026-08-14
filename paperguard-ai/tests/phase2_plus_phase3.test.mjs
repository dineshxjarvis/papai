/**
 * Combined Phase 2 + Phase 3 test suite
 * Requires:
 *   src/claim-detection/**
 *   src/phase3/**
 *   tests/phase2.test.mjs
 *   tests/phase3.test.mjs
 *
 * Run from project root:
 *   node tests/phase2_plus_phase3.test.mjs
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { runClaimPipeline } from "../src/claim-detection/pipeline.js";
import { runVerificationPipeline } from "../src/phase3/pipeline.js";
import { mapVerdictToClaimPatch } from "../src/phase3/mapVerdictToClaim.js";

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
    let err = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
      process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      err += d.toString();
      process.stderr.write(d);
    });
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

console.log("\n╔════════════════════════════════════════════╗");
console.log("║  COMBINED PHASE 2 + PHASE 3 TEST SUITE    ║");
console.log("╚════════════════════════════════════════════╝\n");

// A. Phase 2 suite
console.log("──────── A) PHASE 2 SUITE ────────");
const p2 = await runNodeTest("tests/phase2.test.mjs");
assert(p2.code === 0, "Phase 2 suite exit 0");
assert(/Passed:\s*\d+/i.test(p2.out), "Phase 2 printed pass count");
assert(!/Failed:\s*[1-9]/i.test(p2.out), "Phase 2 has 0 failures");

// B. Phase 3 suite
console.log("\n──────── B) PHASE 3 SUITE ────────");
const p3 = await runNodeTest("tests/phase3.test.mjs");
assert(p3.code === 0, "Phase 3 suite exit 0");
assert(/Passed:\s*\d+/i.test(p3.out), "Phase 3 printed pass count");
assert(!/Failed:\s*[1-9]/i.test(p3.out), "Phase 3 has 0 failures");

// C. Integration: Phase 2 detect → Phase 3 verify
console.log("\n──────── C) INTEGRATION P2 → P3 ────────");

const paper = `
1. Introduction
Deep learning is widely used in healthcare.
CNNs achieve higher accuracy than traditional machine learning algorithms in medical image classification.
ResNet-50 achieves 76.3% top-1 accuracy on ImageNet under standard evaluation.
Increasing the learning rate improves model convergence during early training.
However, the performance improvement of CNNs is not statistically significant in small datasets.
In this paper we propose a new evaluation protocol.
`;

const detected = await runClaimPipeline(paper, {
  useMock: true,
  provider: "mock",
});

assert(Array.isArray(detected), "Phase 2 returns array");
assert(detected.length >= 2, `Phase 2 detects >=2 claims (got ${detected.length})`);
assert(
  !detected.some((c) => /widely used in healthcare/i.test(c.text)),
  "Phase 2 rejects background sentence"
);
assert(
  !detected.some((c) => /in this paper we propose/i.test(c.text)),
  "Phase 2 rejects meta sentence"
);

console.log(`  Detected ${detected.length} claims from sample paper:`);
detected.forEach((c, i) => {
  console.log(
    `    ${i + 1}. [${c.claim_type || c.claimType}] ${String(c.text).slice(0, 70)}`
  );
});

const verificationResults = [];
for (const claim of detected.slice(0, 5)) {
  const claimObj = {
    id: claim.id || `claim_${verificationResults.length}`,
    text: claim.text || claim.claim_span,
    entities: claim.entities || {},
    claimType: claim.claim_type || claim.claimType,
    polarity: claim.polarity,
  };

  const v = await runVerificationPipeline(claimObj, {
    useMock: true,
    provider: "mock",
    useEmbeddings: false,
  });

  verificationResults.push({ claim: claimObj, result: v });

  assert(
    ["supported", "partially_supported", "contradicted", "insufficient"].includes(
      v.verdict
    ),
    `P3 verdict valid for: ${claimObj.text.slice(0, 40)}… → ${v.verdict}`
  );
  assert(v.trace?.length >= 3, `P3 trace present (${v.trace?.length} steps)`);
  assert(v.conflictMap, "P3 conflictMap present");

  const patch = mapVerdictToClaimPatch(v);
  assert(patch.status, `claim log patch status=${patch.status}`);
  assert(patch.color, `claim log patch color=${patch.color}`);
}

assert(verificationResults.length >= 2, "verified multiple detected claims");

const verdicts = new Set(verificationResults.map((x) => x.result.verdict));
assert(verdicts.size >= 1, `verdict set size ${verdicts.size}`);

console.log("\n  Integration verdicts:");
verificationResults.forEach(({ claim, result }) => {
  console.log(
    `    • ${result.verdict.padEnd(22)} | ${claim.text.slice(0, 60)}`
  );
});

// D. UI contract
console.log("\n──────── D) UI CONTRACT ────────");
const sample = verificationResults[0]?.result;
assert(sample?.evidenceQuality, "exposes evidenceQuality");
assert(sample?.verificationConfidence, "exposes verificationConfidence");
assert(
  sample?.evidenceCoverage != null || sample?.evidence,
  "exposes coverage/evidence"
);
assert(Array.isArray(sample?.trace), "exposes agent trace array");
assert(
  sample.trace.every((t) => t.agent && t.timestamp),
  "trace entries have agent + timestamp"
);

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
console.log("\n✅ Phase 2 + Phase 3 combined testing PASSED.\n");
process.exit(0);
