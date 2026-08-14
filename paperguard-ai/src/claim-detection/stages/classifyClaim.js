import { classifyWithLLM } from "../llm.js";

function buildPrompt(candidate) {
  return `Previous sentence: "${candidate.prev || "(none)"}"
Current sentence: "${candidate.current || candidate.text}"
Next sentence: "${candidate.next || "(none)"}"
Section: ${candidate.section || "Body"}

Classify the CURRENT sentence.`;
}

function normalizeLLMResult(raw, originalText) {
  const result = {
    is_claim: Boolean(raw.is_claim),
    claim_type: raw.claim_type || "none",
    confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0)),
    claim_span: (raw.claim_span || originalText || "").trim(),
    entities: {
      method: raw.entities?.method || null,
      baseline: raw.entities?.baseline || null,
      metric: raw.entities?.metric || null,
      value: raw.entities?.value || null,
      dataset: raw.entities?.dataset || null,
    },
    polarity: raw.polarity || "neutral",
    reason: raw.reason || "",
  };

  if (!result.is_claim) {
    result.claim_type = "none";
    result.confidence = Math.min(result.confidence, 0.4);
  }

  return result;
}

function extractEntitiesLight(text) {
  const method =
    text.match(
      /\b(ResNet-?\d*|VGG-?\d*|BERT|RoBERTa|GPT-?\d*|LSTM|Transformer|CNN|YOLO|U-Net|EfficientNet|DenseNet-?\d*)\b/i
    )?.[0] || null;
  const value = text.match(/(\d+(?:\.\d+)?\s*%)/)?.[1] || null;
  const metric =
    text.match(
      /\b(top-1 accuracy|top-5 accuracy|accuracy|f1(?:-score)?|bleu|rouge|auc|precision|recall)\b/i
    )?.[0] || null;
  const dataset =
    text.match(
      /\b(ImageNet|CIFAR-?\d*|COCO|SQuAD|GLUE|MNIST|WikiText|ChestX-ray\d*)\b/i
    )?.[0] || null;
  const baselineMatch = text.match(
    /\b(?:than|versus|vs\.?)\s+([A-Z][A-Za-z0-9\-]{1,30})/
  );
  return {
    method,
    baseline: baselineMatch ? baselineMatch[1] : null,
    metric,
    value,
    dataset,
  };
}

/** Offline structured classifier for tests only (production uses LLM) */
export function mockClassifyStructured(candidate) {
  const text = candidate.text || candidate.current || "";

  // FIXED: higher \w+ than  → matches "higher accuracy than"
  const hasComp =
    /\b(outperform|better than|higher than|higher \w+ than|more \w+ than|compared|versus)\b/i.test(
      text
    );
  const hasQuant =
    /\d+(\.\d+)?\s*%/.test(text) || /\b(accuracy|f1|bleu|auc)\b/i.test(text);
  const hasCausal =
    /\b(improves?|reduces?|increases?|leads to|results in)\b/i.test(text);
  const hasLim =
    /\bnot statistically significant|fails? to|does not improve\b/i.test(text);
  const isBg =
    /\bwidely used\b/i.test(text) && !hasComp && !hasQuant;
  const isMeta =
    /^(in this (paper|work|study)|we propose|we present)/i.test(text.trim());

  if (isBg || isMeta) {
    return normalizeLLMResult(
      { is_claim: false, claim_type: "none", confidence: 0.1, reason: "background/meta" },
      text
    );
  }
  if (hasLim) {
    return normalizeLLMResult(
      {
        is_claim: true,
        claim_type: "limitation",
        confidence: 0.82,
        polarity: "negative",
        reason: "limitation",
        entities: extractEntitiesLight(text),
      },
      text
    );
  }
  if (hasComp && hasQuant) {
    return normalizeLLMResult(
      {
        is_claim: true,
        claim_type: "comparative",
        confidence: 0.9,
        polarity: "positive",
        entities: extractEntitiesLight(text),
        reason: "comparative+quant",
      },
      text
    );
  }
  if (hasComp) {
    return normalizeLLMResult(
      {
        is_claim: true,
        claim_type: "comparative",
        confidence: 0.84,
        polarity: "positive",
        entities: extractEntitiesLight(text),
        reason: "comparative",
      },
      text
    );
  }
  if (hasQuant) {
    return normalizeLLMResult(
      {
        is_claim: true,
        claim_type: "quantitative",
        confidence: 0.88,
        polarity: "positive",
        entities: extractEntitiesLight(text),
        reason: "quantitative",
      },
      text
    );
  }
  if (hasCausal) {
    return normalizeLLMResult(
      {
        is_claim: true,
        claim_type: "causal",
        confidence: 0.8,
        polarity: "positive",
        entities: extractEntitiesLight(text),
        reason: "causal",
      },
      text
    );
  }

  return normalizeLLMResult(
    { is_claim: false, claim_type: "none", confidence: 0.2, reason: "no structure" },
    text
  );
}

export async function classifyCandidate(
  candidate,
  signal,
  provider = "auto",
  useMock = false
) {
  if (useMock || provider === "mock") {
    return mockClassifyStructured(candidate);
  }
  const prompt = buildPrompt(candidate);
  const raw = await classifyWithLLM(prompt, signal, provider);
  return normalizeLLMResult(raw, candidate.text);
}

export async function classifyCandidates(candidates, options = {}) {
  const {
    concurrency = 3,
    signal,
    provider = "auto",
    onProgress,
    useMock = false,
  } = options;

  if (!candidates.length) return [];

  const n = Math.min(concurrency, candidates.length);
  const chunks = Array.from({ length: n }, () => []);
  candidates.forEach((c, i) => chunks[i % n].push({ c, i }));

  const results = new Array(candidates.length);

  await Promise.all(
    chunks.map(async (chunk) => {
      for (const { c, i } of chunk) {
        if (signal?.aborted) break;
        try {
          const classification = await classifyCandidate(
            c,
            signal,
            provider,
            useMock
          );
          results[i] = { candidate: c, classification };
        } catch (err) {
          if (signal?.aborted) break;
          console.error("[classifyClaim]", c.text?.slice(0, 80), err);
          results[i] = {
            candidate: c,
            classification: {
              is_claim: false,
              claim_type: "none",
              confidence: 0,
              claim_span: c.text,
              entities: {},
              polarity: "neutral",
              reason: "classification_error_retryable",
            },
          };
        }
        onProgress?.(results.filter(Boolean).length, candidates.length);
      }
    })
  );

  return results.filter(Boolean);
}
