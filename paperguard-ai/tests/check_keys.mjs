import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");

let groqKey = "";
let geminiKey = "";

envContent.split("\n").forEach((line) => {
  if (line.startsWith("VITE_GROQ_API_KEY=")) {
    groqKey = line.split("=")[1].trim();
  }
  if (line.startsWith("VITE_GEMINI_API_KEY=")) {
    geminiKey = line.split("=")[1].trim();
  }
});

console.log("\n================ API KEY LIVE VERIFICATION ================\n");
console.log(`Gemini Key loaded: ${geminiKey.slice(0, 15)}... (${geminiKey.length} chars)`);

async function testGeminiVariant(model, headerAuth = false, version = "v1beta") {
  const modeLabel = headerAuth ? "x-goog-api-key header" : "url param ?key=";
  console.log(`Testing Gemini (${model}) [${version}] via ${modeLabel}...`);
  try {
    const url = headerAuth
      ? `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`
      : `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${geminiKey}`;

    const headers = { "Content-Type": "application/json" };
    if (headerAuth) headers["x-goog-api-key"] = geminiKey;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Ping test" }] }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`  ✅ Gemini (${model}) SUCCESS!`);
      console.log(
        `     Response: "${data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}"`
      );
      return true;
    } else {
      const err = await res.text();
      console.log(`  ❌ Error ${res.status}: ${err.slice(0, 150)}`);
      return false;
    }
  } catch (e) {
    console.log(`  ❌ Network Error: ${e.message}`);
    return false;
  }
}

// Test model candidates
const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp", "gemini-2.5-flash"];

for (const m of models) {
  const ok1 = await testGeminiVariant(m, false, "v1beta");
  if (ok1) break;
  const ok2 = await testGeminiVariant(m, true, "v1beta");
  if (ok2) break;
  const ok3 = await testGeminiVariant(m, false, "v1");
  if (ok3) break;
}

console.log("\n===========================================================\n");
