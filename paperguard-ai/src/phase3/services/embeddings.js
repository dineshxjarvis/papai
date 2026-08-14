function getGeminiKey() {
  try {
    return import.meta.env?.VITE_GEMINI_API_KEY || "";
  } catch {
    return "";
  }
}

const EMBED_MODELS = [
  "text-embedding-004",
  "embedding-001",
  "gemini-embedding-001",
];

export function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

export function localEmbed(text, dim = 512) {
  const vec = new Array(dim).fill(0);
  const tokens = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
  for (const t of tokens) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % dim;
    vec[idx] += h & 1 ? 1 : -1;
  }
  let n = 0;
  for (let i = 0; i < dim; i++) n += vec[i] * vec[i];
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < dim; i++) vec[i] /= n;
  return vec;
}

async function embedWithModel(key, model, text, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text }] },
    }),
  });
  if (!res.ok) throw new Error(`embed ${res.status} ${model}`);
  const data = await res.json();
  const values = data?.embedding?.values;
  if (!values?.length) throw new Error("empty embedding");
  return values;
}

export async function embedText(text, { signal } = {}) {
  const key = getGeminiKey();
  const truncated = String(text || "").slice(0, 8000);
  if (!key) return localEmbed(truncated);

  let lastErr;
  for (const model of EMBED_MODELS) {
    try {
      return await embedWithModel(key, model, truncated, signal);
    } catch (e) {
      lastErr = e;
      if (signal?.aborted) throw e;
    }
  }
  console.warn("[embeddings] Gemini failed, local fallback:", lastErr?.message);
  return localEmbed(truncated);
}

export async function embedBatch(texts, { signal, concurrency = 4 } = {}) {
  const results = new Array(texts.length);
  let idx = 0;
  async function worker() {
    while (idx < texts.length) {
      if (signal?.aborted) break;
      const i = idx++;
      results[i] = await embedText(texts[i], { signal });
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, texts.length)) },
      () => worker()
    )
  );
  return results;
}
