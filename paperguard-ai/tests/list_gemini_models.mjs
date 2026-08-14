import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");

let geminiKey = "";
envContent.split("\n").forEach((line) => {
  if (line.startsWith("VITE_GEMINI_API_KEY=")) {
    geminiKey = line.split("=")[1].trim();
  }
});

console.log(`Querying ListModels with key: ${geminiKey.slice(0, 15)}...`);

async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
    if (res.ok) {
      const data = await res.json();
      console.log("\n  ✅ SUCCESS! Available Gemini models for this key:");
      (data.models || []).forEach((m) => {
        if (m.supportedGenerationMethods?.includes("generateContent")) {
          console.log(`    • ${m.name.replace("models/", "")} (${m.displayName})`);
        }
      });
    } else {
      const err = await res.text();
      console.log(`\n  ❌ ListModels HTTP ${res.status}: ${err}`);
    }
  } catch (e) {
    console.log(`\n  ❌ Error: ${e.message}`);
  }
}

await listModels();
