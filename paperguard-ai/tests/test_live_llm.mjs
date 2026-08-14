import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { classifyWithLLM } from "../src/claim-detection/llm.js";
import { phase3LLM } from "../src/phase3/services/llm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
const envLines = fs.readFileSync(envPath, "utf8").split("\n");

envLines.forEach((line) => {
  const [k, v] = line.split("=");
  if (k && v) {
    process.env[k.trim()] = v.trim();
    if (!import.meta.env) import.meta.env = {};
    import.meta.env[k.trim()] = v.trim();
  }
});

console.log("\n================ LIVE END-TO-END LLM VERIFICATION ================\n");

async function testGroqLive() {
  console.log("1. Testing Groq (llama-3.3-70b-versatile) for Claim Classification...");
  try {
    const res = await classifyWithLLM(
      "ResNet-50 achieves 76.3% top-1 accuracy on ImageNet.",
      null,
      "groq"
    );
    console.log("  ✅ Groq LLM Response:");
    console.log(`     is_claim: ${res.is_claim}, claim_type: ${res.claim_type}`);
    console.log(`     entities: ${JSON.stringify(res.entities)}`);
  } catch (e) {
    console.log(`  ❌ Groq Error: ${e.message}`);
  }
}

async function testGeminiLive() {
  console.log("\n2. Testing Gemini (gemini-2.5-flash) for Claim Classification...");
  try {
    const res = await classifyWithLLM(
      "ResNet-50 achieves 76.3% top-1 accuracy on ImageNet.",
      null,
      "gemini"
    );
    console.log("  ✅ Gemini 2.5 Flash LLM Response:");
    console.log(`     is_claim: ${res.is_claim}, claim_type: ${res.claim_type}`);
    console.log(`     entities: ${JSON.stringify(res.entities)}`);
  } catch (e) {
    console.log(`  ❌ Gemini Error: ${e.message}`);
  }
}

async function testPhase3Gemini() {
  console.log("\n3. Testing Gemini 2.5 Flash for Phase 3 LLM Decomposition...");
  try {
    const res = await phase3LLM(
      "Return ONLY JSON: {\"status\": \"ok\", \"model\": \"gemini-2.5-flash\"}",
      "Decompose ResNet-50 vs VGG-16",
      null,
      "gemini"
    );
    console.log("  ✅ Phase 3 Gemini Response:", JSON.stringify(res));
  } catch (e) {
    console.log(`  ❌ Phase 3 Gemini Error: ${e.message}`);
  }
}

await testGroqLive();
await testGeminiLive();
await testPhase3Gemini();

console.log("\n=================================================================\n");
