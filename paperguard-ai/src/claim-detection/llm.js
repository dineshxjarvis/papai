/**
 * LLM client – Groq (fast) + Gemini 2.5 Flash (fallback).
 * Keys: VITE_GROQ_API_KEY, VITE_GEMINI_API_KEY
 */

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function getGroqKey() {
  try {
    return import.meta.env?.VITE_GROQ_API_KEY || "";
  } catch {
    return "";
  }
}

function getGeminiKey() {
  try {
    return import.meta.env?.VITE_GEMINI_API_KEY || "";
  } catch {
    return "";
  }
}

const SYSTEM_PROMPT = `You are a scientific claim detector for research papers.
Your job is to decide whether a given sentence is an empirical, quantitative, comparative, causal, performance, or limitation claim that could later be verified against papers.

Rules:
- Only mark is_claim=true when the sentence asserts something that can be supported or contradicted by evidence.
- Extract entities when present (method, baseline, metric, value, dataset).
- Be strict. Method descriptions, paper outlines, and pure opinions are NOT claims.
- Return ONLY valid JSON matching the schema. No markdown, no extra text.`;

const RESPONSE_SCHEMA_INSTRUCTION = `
Return a JSON object with exactly these fields:
{
  "is_claim": boolean,
  "claim_type": "comparative" | "quantitative" | "causal" | "performance" | "limitation" | "none",
  "confidence": number between 0 and 1,
  "claim_span": "exact text of the claim or empty string",
  "entities": {
    "method": string or null,
    "baseline": string or null,
    "metric": string or null,
    "value": string or null,
    "dataset": string or null
  },
  "polarity": "positive" | "negative" | "neutral",
  "reason": "one short sentence explaining the decision"
}`;

async function withBackoff(fn, { retries = 3, baseMs = 500 } = {}) {
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
      const retriable = /429|503|timeout|network|fetch/i.test(msg);
      if (!retriable || i === retries - 1) throw err;
      const wait = baseMs * Math.pow(2, i) + Math.random() * 200;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

function assertClaimSchema(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("off-schema: not an object");
  }
  if (!("is_claim" in raw)) {
    throw new Error("off-schema: missing is_claim");
  }
  if (!("claim_type" in raw) && raw.is_claim) {
    throw new Error("off-schema: missing claim_type");
  }
  return raw;
}

async function callGemini(userContent, signal) {
  const key = getGeminiKey();
  if (!key) throw new Error("VITE_GEMINI_API_KEY is not set");

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\n${RESPONSE_SCHEMA_INSTRUCTION}\n\n${userContent}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty content");
  return assertClaimSchema(JSON.parse(text));
}

async function callGroq(userContent, signal) {
  const key = getGroqKey();
  if (!key) throw new Error("VITE_GROQ_API_KEY is not set");

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
        {
          role: "system",
          content: SYSTEM_PROMPT + "\n" + RESPONSE_SCHEMA_INSTRUCTION,
        },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned empty content");
  return assertClaimSchema(JSON.parse(text));
}

export async function classifyWithLLM(
  userContent,
  signal,
  provider = "auto"
) {
  const tryGroq = provider === "auto" || provider === "groq";
  const tryGemini = provider === "auto" || provider === "gemini";

  if (tryGroq && getGroqKey()) {
    try {
      return await withBackoff(() => callGroq(userContent, signal));
    } catch (e) {
      const msg = String(e?.message || e);
      if (e?.name === "AbortError" || /aborted/i.test(msg)) {
        throw e;
      }
      if (provider === "groq") throw e;
      console.warn(
        "[claim-detection] Groq failed, falling back to Gemini:",
        msg
      );
    }
  }

  if (tryGemini && getGeminiKey()) {
    return await withBackoff(() => callGemini(userContent, signal));
  }

  throw new Error("No LLM provider available (set VITE_GROQ_API_KEY or VITE_GEMINI_API_KEY)");
}
