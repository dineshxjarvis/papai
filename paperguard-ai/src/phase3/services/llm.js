/**
 * Shared LLM client for Phase 3 (Groq → Gemini fallback)
 */

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function env(name) {
  try {
    return import.meta.env?.[name] || "";
  } catch {
    return "";
  }
}

async function withBackoff(fn, { retries = 3, baseMs = 600 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = String(err.message || err);
      if (err?.name === "AbortError" || /aborted/i.test(msg)) {
        throw err;
      }
      if (!/429|503|timeout|network|fetch/i.test(msg) || i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, baseMs * 2 ** i + Math.random() * 200));
    }
  }
  throw lastErr;
}

function assertObject(raw) {
  if (!raw || typeof raw !== "object") throw new Error("off-schema: not object");
  return raw;
}

async function callGemini(system, user, signal) {
  const key = env("VITE_GEMINI_API_KEY");
  if (!key) throw new Error("VITE_GEMINI_API_KEY not set");
  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini empty");
  return assertObject(JSON.parse(text));
}

async function callGroq(system, user, signal) {
  const key = env("VITE_GROQ_API_KEY");
  if (!key) throw new Error("VITE_GROQ_API_KEY not set");
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    signal,
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq empty");
  return assertObject(JSON.parse(text));
}

export async function phase3LLM(system, user, signal, provider = "auto") {
  const tryGroq = provider === "auto" || provider === "groq";
  const tryGemini = provider === "auto" || provider === "gemini";

  if (tryGroq && env("VITE_GROQ_API_KEY")) {
    try {
      return await withBackoff(() => callGroq(system, user, signal));
    } catch (e) {
      const msg = String(e?.message || e);
      if (e?.name === "AbortError" || /aborted/i.test(msg)) {
        throw e;
      }
      if (provider === "groq") throw e;
      console.warn("[phase3 llm] Groq failed:", msg);
    }
  }
  if (tryGemini && env("VITE_GEMINI_API_KEY")) {
    return await withBackoff(() => callGemini(system, user, signal));
  }
  throw new Error("No LLM provider for Phase 3");
}
